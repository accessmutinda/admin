import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component, input, output, signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { MatDialog, MAT_DIALOG_DEFAULT_OPTIONS } from '@angular/material/dialog';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiError } from '../../../core/auth/auth-api';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { RiskAssessments } from './risk-assessments';
import { RiskApi } from './risk-api.service';
import { CareHeader } from './care-header';
import { blankRisk, riskLevel } from './risk-assessment.models';

@Component({ selector: 'cv-care-header', template: '' })
class HeaderStub {
  client = input<any>();
  active = input('');
  printManaged = input(false);
  printBusy = input(false);
  printRequested = output<void>();
}
function record() {
  return {
    ...blankRisk('General'),
    id: 'risk-1',
    groupId: 'risk-1',
    company_id: 'north',
    service_user_id: 'person-1',
    source_version: 1,
    etag: '"v1"',
    specific: 'Falls near stairs',
    date: '2026-11-10',
    review: '2027-01-01',
    author: 'Recording worker',
    authorId: 'worker-1',
    fields: {
      description: 'Recorded risk',
      controls: 'Clear route',
      instructions: 'Follow plan',
      escalation: 'Contact manager',
    },
  };
}
async function settle(fixture: ComponentFixture<RiskAssessments>) {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}
describe('Risk assessments backend workflow', () => {
  let fixture: ComponentFixture<RiskAssessments>,
    editor: any,
    request: ReturnType<typeof vi.fn>,
    scope: ReturnType<typeof signal<string>>,
    permissions: Set<string>,
    workspace: any,
    params: BehaviorSubject<any>;
  beforeEach(() => {
    scope = signal('north:actor:1');
    permissions = new Set(['read', 'create', 'edit', 'approve', 'export']);
    params = new BehaviorSubject(convertToParamMap({ id: 'person-1' }));
    workspace = {
      company_id: 'north',
      service_user_id: 'person-1',
      local_date: '2026-11-11',
      assessments: [record()],
      history: [],
      legacy: [],
      documents: [],
      incidents_available: false,
      company_name: 'North Care',
    };
    request = vi.fn(async (path: string, body?: any, method?: string) => {
      if ((path.endsWith('/risk-assessments') && !method) || path.endsWith('/print'))
        return structuredClone(workspace);
      if (path.endsWith('/risk-assessments') && method === 'POST') return { ...record(), ...body };
      if (path.endsWith('/risk-1'))
        return {
          ...record(),
          ...body,
          source_version: method === 'PATCH' ? 2 : 1,
          etag: method === 'PATCH' ? '"v2"' : '"v1"',
        };
      for (const [command, status] of [
        ['submit', 'In review'],
        ['return', 'Draft'],
        ['approve', 'Approved'],
        ['review', 'Draft'],
      ])
        if (path.endsWith('/' + command))
          return {
            ...record(),
            status,
            source_version: 3,
            etag: '"v3"',
            version: command === 'review' ? 2 : 1,
          };
      throw Error('Unexpected request ' + path);
    });
    const selected = signal<any>({
      id: 'person-1',
      name: 'Alex Citizen',
      address: '1 Road',
      postcode: 'AB1 2CD',
      file: { details: { dob: '1950-01-01' }, contacts: [] },
    });
    const records = {
      scope,
      selected,
      detailPending() {
        return this.detailLoading();
      },
      detailLoading: signal(false),
      error: signal(''),
      detail: vi.fn().mockResolvedValue(undefined),
      allowed: signal(true),
      companyId: signal('north'),
      access: { can: (_m: string, _s: string, a: string) => permissions.has(a) },
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { api: request, currentUser: () => ({ id: 'worker-1' }) },
        },
        { provide: ServiceUsersApi, useValue: records },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: params, snapshot: { paramMap: params.value, data: {} } },
        },
        {
          provide: MAT_DIALOG_DEFAULT_OPTIONS,
          useValue: { enterAnimationDuration: 0, exitAnimationDuration: 0 },
        },
      ],
    });
    TestBed.overrideComponent(RiskAssessments, {
      remove: { imports: [CareHeader], providers: [ServiceUsersApi] },
      add: { imports: [HeaderStub] },
    });
    fixture = TestBed.createComponent(RiskAssessments);
    editor = fixture.componentInstance;
  });
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    vi.restoreAllMocks();
  });
  it('loads authorized backend records and computes score boundaries without browser storage', async () => {
    const storage = vi.spyOn(Storage.prototype, 'getItem');
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('Falls near stairs');
    expect(storage).not.toHaveBeenCalled();
    expect([4, 9, 15, 16, 25].map(riskLevel)).toEqual([
      'Low',
      'Medium',
      'High',
      'Critical',
      'Critical',
    ]);
  });
  it('saves the existing creation form with allowlisted input and an idempotency key', async () => {
    await settle(fixture);
    editor.start('General');
    editor.selected().specific = 'New risk';
    editor.reason = 'Initial assessment';
    await editor.save();
    const call = request.mock.calls.find((c: any[]) => c[2] === 'POST')!;
    expect(call[0]).toBe('/companies/north/service-users/person-1/risk-assessments');
    expect(call[1]).toMatchObject({
      specific: 'New risk',
      reason: 'Initial assessment',
      date: '2026-11-11',
      review: null,
    });
    for (const key of ['id', 'groupId', 'status', 'author', 'authorId', 'version', 'etag'])
      expect(call[1]).not.toHaveProperty(key);
    expect(call[3]['Idempotency-Key']).toBeTruthy();
  });
  it('opens a fresh prefilled branded popup and preserves the overview behind it', async () => {
    await settle(fixture);
    await editor.open(record());
    await settle(fixture);
    expect(document.querySelector('.service-user-dialog [role="dialog"]')).toBeTruthy();
    expect(editor.selected().specific).toBe('Falls near stairs');
    expect(editor.page()).toBe('overview');
    editor.selected().specific = 'Updated risk';
    editor.reason = 'Updated controls';
    await editor.save();
    const call = request.mock.calls.find((c: any[]) => c[2] === 'PATCH')!;
    expect(call[3]).toEqual({ 'If-Match': '"v1"' });
    expect(call[1].specific).toBe('Updated risk');
  });
  it('saves source inputs before submitting through the named command with the new ETag', async () => {
    await settle(fixture);
    await editor.open(record());
    editor.reason = 'Submit for review';
    await editor.save('In review');
    const call = request.mock.calls.find((c: any[]) => c[0].endsWith('/submit'))!;
    expect(call[1]).toEqual({ reason: 'Submit for review' });
    expect(call[3]['If-Match']).toBe('"v2"');
    expect(editor.selected().status).toBe('In review');
  });
  it('approves a submitted source without accepting edited approval input', async () => {
    await settle(fixture);
    request.mockImplementationOnce(async () => ({
      ...record(),
      status: 'In review',
      authorId: 'another-worker',
    }));
    await editor.open(record());
    editor.reason = 'Independent review';
    await editor.save('Approved');
    expect(request.mock.calls.find((c: any[]) => c[0].endsWith('/approve'))?.[1]).toEqual({
      reason: 'Independent review',
    });
    expect(request.mock.calls.some((c: any[]) => c[2] === 'PATCH')).toBe(false);
  });
  it('retains stale edits and reports a conflict', async () => {
    await settle(fixture);
    await editor.open(record());
    editor.selected().specific = 'Keep this draft';
    editor.reason = 'Update';
    request.mockRejectedValueOnce(
      new ApiError('This record changed. Reload and retry.', 412, 'stale_version'),
    );
    await editor.save();
    expect(editor.selected().specific).toBe('Keep this draft');
    expect(editor.error()).toContain('changed');
    expect(editor.popupOpen()).toBe(true);
  });
  it('clears patient data and closes editors when access changes', async () => {
    await settle(fixture);
    await editor.open(record());
    permissions.clear();
    scope.set('north:revoked');
    await settle(fixture);
    expect(editor.data()).toBeNull();
    expect(editor.selected()).toBeNull();
    expect(editor.popupOpen()).toBe(false);
  });
  it('discards a late response after switching patient', async () => {
    await settle(fixture);
    let resolve!: (value: any) => void;
    request.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const pending = editor.open(record());
    params.next(convertToParamMap({ id: 'person-2' }));
    await settle(fixture);
    resolve(record());
    await pending;
    expect(editor.popupOpen()).toBe(false);
    expect(editor.selected()).toBeNull();
  });
  it('shows an unavailable state on backend failure without demo records', async () => {
    request.mockRejectedValueOnce(new Error('Backend unavailable'));
    await settle(fixture);
    expect(editor.data()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Risk assessments are unavailable');
    expect(fixture.nativeElement.textContent).not.toContain('Falls near stairs');
  });
  it('revalidates export before printing and uses the server company name', async () => {
    await settle(fixture);
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    editor.print();
    await settle(fixture);
    expect(request.mock.calls.some((c: any[]) => c[0].endsWith('/print'))).toBe(true);
    expect(print).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('North Care');
  });
  it('allows read-only access without draft creation or edits', async () => {
    permissions = new Set(['read']);
    await settle(fixture);
    expect(editor.allowed()).toBe(true);
    editor.start('General');
    expect(editor.selected()).toBeNull();
    await editor.open(record());
    expect(editor.editable).toBe(false);
  });
  it('opens every domain in the existing assessment structure', async () => {
    await settle(fixture);
    for (const [domain] of editor.domains) {
      editor.start(domain);
      expect(editor.page()).toBe('assessment');
      expect(editor.selected().domain).toBe(domain);
    }
    editor.start('Diabetes');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Recorded diabetes management needs');
  });
  it('persists checked voice text and links the source before saving a draft', async () => {
    await settle(fixture);
    editor.go('voice');
    editor.voiceTranscript = 'Observed difficulty on stairs';
    editor.voiceSpecific = 'Stair safety';
    request.mockImplementationOnce(async () => ({
      id: 'voice-1',
      company_id: 'north',
      service_user_id: 'person-1',
      domain: 'General',
      transcript: 'Observed difficulty on stairs',
      state: 'clean',
      size: 0,
      content_type: '',
    }));
    await editor.voiceDraft();
    expect(editor.selected().voice_note_id).toBe('voice-1');
    expect(editor.selected().fields.description).toBe('Observed difficulty on stairs');
    expect(editor.page()).toBe('assessment');
    const call = request.mock.calls.find((c: any[]) => c[0].endsWith('/voice-notes'))!;
    expect(call[1]).toBeInstanceOf(FormData);
    expect(call[1].get('transcript')).toBe('Observed difficulty on stairs');
  });
  it('holds a voice draft until its audio scan is clean', async () => {
    await settle(fixture);
    editor.go('voice');
    editor.voiceTranscript = 'Checked text';
    editor.voiceSpecific = 'Stair safety';
    const note = {
      id: 'voice-1',
      company_id: 'north',
      service_user_id: 'person-1',
      domain: 'General',
      transcript: 'Checked text',
      state: 'quarantined',
      size: 8,
      content_type: 'audio/ogg',
    };
    request.mockImplementationOnce(async () => note).mockImplementationOnce(async () => note);
    await editor.voiceDraft();
    expect(editor.selected()).toBeNull();
    expect(editor.voiceStatus()).toContain('waiting for scanning');
    expect(editor.page()).toBe('voice');
  });
  it('provides a usable transcript route when local dictation is unavailable', async () => {
    await settle(fixture);
    await editor.dictate();
    expect(editor.voiceStatus()).toContain('On-device dictation is unavailable');
    expect(editor.voiceTranscript).toBe('');
  });
  it('records review decisions through the server and opens the returned source', async () => {
    await settle(fixture);
    editor.reviewReason = 'Review current controls';
    const suggestion = {
      id: 'overdue:risk-1:1',
      source_id: 'risk-1',
      source_kind: 'overdue',
      source_version: 1,
      assessment_id: 'risk-1',
      title: 'Review date has passed',
      detail: 'Check the current controls',
    };
    request.mockImplementationOnce(async () => ({
      id: 'decision-1',
      company_id: 'north',
      service_user_id: 'person-1',
      assessment: record(),
    }));
    const load = vi.spyOn(editor, 'load').mockResolvedValue(undefined);
    const review = vi.spyOn(editor, 'loadReview').mockResolvedValue(undefined);
    await editor.decide(suggestion, 'accepted');
    const call = request.mock.calls.find((c: any[]) => c[0].endsWith('/review-decisions'))!;
    expect(call[1]).toMatchObject({
      suggestion_id: suggestion.id,
      decision: 'accepted',
      reason: 'Review current controls',
    });
    expect(editor.selected().id).toBe('risk-1');
    expect(editor.popupOpen()).toBe(true);
    expect(load).toHaveBeenCalled();
    expect(review).toHaveBeenCalled();
  });
  it('keeps approved audio downloadable while linked-record edits remain read-only', async () => {
    permissions = new Set(['read', 'export']);
    await settle(fixture);
    request.mockResolvedValueOnce({
      ...record(),
      status: 'Approved',
      voice_note_id: 'voice-1',
      voice_audio: true,
      voice_transcript: 'Checked observations',
    });
    await editor.open(record());
    editor.tab.set('Linked records');
    await settle(fixture);
    const api = fixture.debugElement.injector.get(RiskApi),
      download = vi.spyOn(api, 'downloadVoice').mockResolvedValue();
    const button = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button'),
    ).find((b) => b.textContent?.includes('Download retained audio'))!;
    expect(button.matches(':disabled')).toBe(false);
    button.click();
    await settle(fixture);
    expect(download).toHaveBeenCalledWith('person-1', 'voice-1');
    expect(
      document.querySelector<HTMLSelectElement>('[role="dialog"] select')!.matches(':disabled'),
    ).toBe(true);
  });
  it('does not reopen a pending editor after selecting another section', async () => {
    await settle(fixture);
    let resolve!: (value: any) => void;
    request.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const pending = editor.open(record());
    editor.go('summary');
    resolve(record());
    await pending;
    await settle(fixture);
    expect(editor.popupOpen()).toBe(false);
    expect(editor.page()).toBe('summary');
    expect(editor.selected()).toBeNull();
  });
  it('does not overwrite a new draft with a late editor response', async () => {
    await settle(fixture);
    let resolve!: (value: any) => void;
    request.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const pending = editor.open(record());
    editor.start('Diabetes');
    editor.selected().specific = 'Keep this draft';
    resolve(record());
    await pending;
    expect(editor.popupOpen()).toBe(false);
    expect(editor.selected().specific).toBe('Keep this draft');
  });
  it('cancels a pending print when the section changes', async () => {
    await settle(fixture);
    let resolve!: (value: any) => void;
    request.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    editor.print();
    editor.go('summary');
    resolve(structuredClone(workspace));
    await settle(fixture);
    expect(print).not.toHaveBeenCalled();
    expect(editor.printBusy()).toBe(false);
    expect(editor.page()).toBe('summary');
  });
  it('does not let an older review request replace a refreshed review', async () => {
    await settle(fixture);
    let resolve!: (value: any) => void;
    request.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const pending = editor.loadReview();
    const fresh = {
      company_id: 'north',
      service_user_id: 'person-1',
      as_of: '2026-11-11T10:00:00Z',
      suggestions: [],
      decisions: [],
      unavailable_sources: ['Latest request'],
    };
    request.mockResolvedValueOnce(fresh);
    await editor.loadReview();
    resolve({ ...fresh, unavailable_sources: ['Older request'] });
    await pending;
    expect(editor.reviewData().unavailable_sources).toEqual(['Latest request']);
  });
});
