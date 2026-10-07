import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { DEMO_USER } from '../../../core/auth/fixtures';
import { ManagementStore } from '../shared/management.store';
import { QualityService } from './quality.service';
import {
  Assessment,
  ASSESSMENT_TEMPLATES,
  CorrectiveAction,
  ukDate,
  ukTimestamp,
  dateValid,
} from './quality.models';

describe('Supervisor and quality workflows', () => {
  let service: QualityService;
  let store: ManagementStore;
  const actor = signal({ ...DEMO_USER, roleCode: 'CA' as typeof DEMO_USER.roleCode });
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    const auth = TestBed.inject(AuthService);
    auth.signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    actor.set({ ...DEMO_USER, roleCode: 'CA' });
    vi.spyOn(auth, 'currentUser').mockImplementation(() => actor());
    store = TestBed.inject(ManagementStore);
    service = TestBed.inject(QualityService);
  });
  function filled(type = 'spot'): Assessment {
    const a = service.newAssessment(type);
    a.subjectId = service.subjects(type)[0].id;
    a.context = 'Sample visit observation';
    a.answers = Object.fromEntries(
      ASSESSMENT_TEMPLATES.find((t) => t.id === type)!.fields.map((f) => [
        f.id,
        f.options?.[0] ?? 'Sample assessment notes',
      ]),
    );
    a.outcome = 'Practice reviewed';
    a.recommendations = 'No further action';
    return a;
  }
  it('enforces role and module permissions for reading, creating, editing and exporting', () => {
    actor.set({ ...DEMO_USER, roleCode: 'CW' });
    expect(service.can('view')).toBe(false);
    expect(service.saveAssessment(service.newAssessment('spot'), 'draft')).toContain('permission');
    actor.set({ ...DEMO_USER, roleCode: 'QA' });
    expect(service.can('create')).toBe(true);
    store.update((d) => ({
      ...d,
      permissions: { 'Quality Assurance:Quality & compliance': [true, false, false, false, false] },
    }));
    expect(service.can('view')).toBe(true);
    expect(service.can('create')).toBe(false);
    expect(service.can('export')).toBe(false);
    store.saveCompany({
      ...store.company()!,
      modules: store.company()!.modules.filter((m) => m !== 'Quality & compliance'),
    });
    expect(service.can('view')).toBe(false);
  });
  it('saves incomplete drafts, requires complete submissions and locks submitted records', () => {
    const a = service.newAssessment('spot');
    expect(service.saveAssessment(a, 'draft')).toBeNull();
    const draft = structuredClone(service.data().assessments[0]);
    expect(service.saveAssessment(draft, 'submit')).toContain('current person');
    const complete = { ...filled(), id: draft.id, revision: draft.revision };
    expect(service.saveAssessment(complete, 'submit')).toBeNull();
    expect(service.data().assessments[0].status).toBe('Submitted');
    expect(service.saveAssessment(service.data().assessments[0], 'draft')).toContain('locked');
    expect(service.data().assessments[0].audit.map((e) => e.action)).toEqual([
      'Draft saved',
      'Assessment submitted',
    ]);
  });
  it('records authenticated sign-off and requires a reason before reopening', () => {
    const a = filled();
    expect(service.saveAssessment(a, 'submit')).toBeNull();
    expect(service.signOff(a.id, 1, 'Someone else', true)).toContain('account name');
    expect(service.signOff(a.id, 1, actor().name, false)).toContain('declaration');
    expect(service.signOff(a.id, 1, actor().name, true)).toBeNull();
    expect(service.data().assessments[0].signature?.name).toBe(actor().name);
    expect(service.reopen(a.id, 2, '')).toContain('why');
    expect(service.reopen(a.id, 2, 'Additional observation needed')).toBeNull();
    expect(service.data().assessments[0].status).toBe('Draft');
    expect(service.data().assessments[0].signature).toBeUndefined();
    expect(service.data().assessments[0].audit).toHaveLength(3);
  });
  it('does not overwrite a newer version, including a write whose storage event has not arrived', () => {
    const a = filled();
    expect(service.saveAssessment(a, 'draft')).toBeNull();
    const stale = structuredClone(service.data().assessments[0]);
    const stored = JSON.parse(localStorage.getItem('cv_management_v1')!);
    stored.lqcs.quality.assessments[0].revision = 2;
    stored.lqcs.quality.assessments[0].outcome = 'Other reviewer update';
    localStorage.setItem('cv_management_v1', JSON.stringify(stored));
    expect(service.saveAssessment(stale, 'draft')).toContain('another tab');
    expect(service.data().assessments[0].outcome).toBe('Other reviewer update');
  });
  it('schedules future reviews but rejects future submissions and invalid review dates', () => {
    const a = filled();
    a.date = '2099-01-01';
    expect(service.saveAssessment(a, 'submit')).toContain('future');
    expect(service.saveAssessment(a, 'schedule')).toBeNull();
    const scheduled = structuredClone(service.data().assessments[0]);
    scheduled.reviewDate = '2098-12-31';
    expect(service.saveAssessment(scheduled, 'schedule')).toContain('on or after');
    expect(dateValid('2026-02-30')).toBe(false);
    expect(ukTimestamp('2026-06-01T23:30:00Z')).toContain('00:30');
    expect(ukTimestamp('2026-12-01T23:30:00Z')).toContain('23:30');
    expect(ukDate(new Date('2026-06-01T23:30:00Z'))).toBe('2026-06-02');
  });
  it('validates selected answers and evidence attachments', () => {
    const a = filled();
    a.answers['check0'] = 'Invented choice';
    expect(service.saveAssessment(a, 'submit')).toContain('recognised');
    a.answers['check0'] = 'Yes';
    a.evidence = [
      {
        id: 'file',
        name: 'too-large.png',
        type: 'image/png',
        size: 500001,
        content: 'data:image/png;base64,YQ==',
        caption: '',
      },
    ];
    expect(service.saveAssessment(a, 'draft')).toContain('500 KB');
    a.evidence[0].size = 1;
    expect(service.saveAssessment(a, 'submit')).toBeNull();
    expect(service.data().assessments[0].evidence[0].content).toContain('base64');
  });
  it('requires an action owner and completion resolution, preserves history and links the source', () => {
    const a = filled();
    service.saveAssessment(a, 'submit');
    const action: CorrectiveAction = {
      id: 'action',
      assessmentId: a.id,
      title: 'Improve records',
      ownerId: service.assessors()[0].id,
      due: service.today(),
      priority: 'High',
      status: 'Open',
      resolution: '',
      revision: 0,
      audit: [],
    };
    expect(service.saveAction({ ...action, ownerId: 'missing' })).toContain('active owner');
    expect(service.saveAction(action)).toBeNull();
    const saved = structuredClone(service.data().actions[0]);
    saved.status = 'Completed';
    expect(service.saveAction(saved)).toContain('resolution');
    saved.resolution = 'Records reviewed with the team';
    expect(service.saveAction(saved)).toBeNull();
    expect(service.data().actions[0].audit).toHaveLength(2);
    expect(service.saveAction({ ...saved, revision: 1 })).toContain('changed');
  });
  it('keeps workspaces isolated and leaves saved records untouched when storage fails', () => {
    service.saveAssessment(filled(), 'draft');
    TestBed.inject(WorkspaceService).switchWorkspace('riverside');
    expect(service.data().assessments).toHaveLength(0);
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    const before = structuredClone(service.data());
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(service.saveAssessment(filled(), 'draft')).toContain('Could not save');
    expect(service.data()).toEqual(before);
    spy.mockRestore();
  });
});
