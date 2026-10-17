import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { ManagementStore } from '../shared/management.store';
import { HrService } from './hr.service';
import { newStaff, StaffDraft, staffRecord } from './hr.models';

describe('HR saved records and drafts', () => {
  let hr: HrService;
  let store: ManagementStore;
  let auth: AuthService;
  function person() {
    const p = newStaff();
    p.hr!.personal.firstName = 'New';
    p.hr!.personal.surname = 'Employee';
    p.email = 'new@example.org';
    p.role = 'Care Worker';
    p.location = 'London';
    p.start = '2026-10-17';
    p.hr!.employment.type = 'Permanent';
    return p;
  }
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    auth = TestBed.inject(AuthService);
    auth.signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    hr = TestBed.inject(HrService);
    store = TestBed.inject(ManagementStore);
  });
  afterEach(() => vi.restoreAllMocks());
  it('commits a new staff record once and excludes drafts from staff counts', () => {
    const p = person();
    const original = store.staff().length;
    const d: StaffDraft = {
      id: 'draft',
      companyId: 'lqcs',
      ownerId: auth.currentUser()!.id,
      savedAt: '',
      step: 2,
      person: p,
    };
    expect(hr.saveDraft(d)).toBeNull();
    expect(store.staff()).toHaveLength(original);
    expect(hr.drafts()[0].step).toBe(2);
    expect(hr.savePerson(p, 'lqcs', 'Created', { draftId: 'draft' })).toBeNull();
    expect(store.staff()).toHaveLength(original + 1);
    expect(hr.drafts()).toEqual([]);
    expect(hr.savePerson(p, 'lqcs', 'Created', { draftId: 'draft' })).toContain('already');
    expect(store.staff()).toHaveLength(original + 1);
  });
  it('keeps the original person ID and evidence during applicant conversion', () => {
    const original = store.data().people.find((p) => p.stage === 'Offer')!;
    const p = {
      ...person(),
      id: original.id,
      application: original.application,
      notes: original.notes,
      documents: original.documents,
    };
    const count = store.data().people.length;
    expect(hr.savePerson(p, 'lqcs', 'Hired', { sourceId: original.id })).toBeNull();
    expect(store.data().people).toHaveLength(count);
    expect(store.staff().some((v) => v.id === original.id)).toBe(true);
  });
  it('does not lose edits or announce success when browser storage fails', () => {
    const p = person();
    const count = store.staff().length;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Full');
    });
    expect(hr.savePerson(p, 'lqcs', 'Created')).toContain('could not be saved');
    expect(store.staff()).toHaveLength(count);
    expect(p.hr!.personal.firstName).toBe('New');
  });
  it('blocks readiness activation, evidence-free verification and duplicate references', () => {
    const p = person();
    p.hr!.status = 'Active';
    expect(hr.savePerson(p, 'lqcs', 'Created')).toContain('readiness');
    p.hr!.status = 'Onboarding';
    p.hr!.checks[0].status = 'Verified';
    expect(hr.savePerson(p, 'lqcs', 'Created')).toContain('evidence');
    p.hr!.checks[0].status = 'Pending';
    expect(hr.savePerson(p, 'lqcs', 'Created')).toBeNull();
    const second = person();
    second.hr!.reference = p.hr!.reference;
    expect(hr.savePerson(second, 'lqcs', 'Created')).toContain('reference');
  });
  it('links unambiguous legacy leave and reviews by ID when a staff member is renamed', () => {
    const original = store.staff()[0];
    const p = { ...original, hr: staffRecord(original) };
    p.hr.personal.firstName = 'Renamed';
    store.update((d) => ({
      ...d,
      leaves: [
        {
          id: 'l',
          person: original.name,
          type: 'Annual leave',
          start: '2026-01-01',
          end: '2026-01-02',
        },
      ],
      reviews: [
        {
          id: 'r',
          person: original.name,
          type: 'Supervision',
          date: '2026-01-01',
          status: 'Scheduled',
        },
      ],
    }));
    expect(hr.savePerson(p, 'lqcs', 'Renamed', { expectedAudit: '' })).toBeNull();
    expect(store.data().leaves[0].personId).toBe(original.id);
    expect(store.data().reviews[0].person).toContain('Renamed');
  });
  it('rejects stale edits using the latest persisted version, not only the current tab', () => {
    const p = person();
    expect(hr.savePerson(p, 'lqcs', 'Created')).toBeNull();
    const saved = store.data().people.find((v) => v.id === p.id)!;
    const baseline = saved.hr!.audit.at(-1)!.id;
    const persisted = JSON.parse(localStorage.getItem('cv_management_v1')!);
    persisted.lqcs.people
      .find((v: { id: string }) => v.id === p.id)
      .hr.audit.push({ id: 'another-tab', at: '', actor: 'Other user', action: 'Updated' });
    localStorage.setItem('cv_management_v1', JSON.stringify(persisted));
    expect(hr.savePerson(saved, 'lqcs', 'Stale edit', { expectedAudit: baseline })).toContain(
      'changed',
    );
    expect(
      JSON.parse(localStorage.getItem('cv_management_v1')!)
        .lqcs.people.find((v: { id: string }) => v.id === p.id)
        .hr.audit.at(-1).id,
    ).toBe('another-tab');
  });
  it('enforces view/edit permissions and company boundaries at mutation time', () => {
    const p = person();
    expect(hr.savePerson(p, 'different-company', 'Created')).toContain('workspace changed');
    store.update((d) => ({
      ...d,
      permissions: {
        ...d.permissions,
        'Care Worker:People & HR': [true, false, false, false, false],
      },
    }));
    expect(hr.can('view')).toBe(true);
    expect(hr.can('create')).toBe(false);
    expect(hr.savePerson(p, 'lqcs', 'Created')).toContain('cannot save');
  });
  it('saves related actions and their staff audit event atomically', () => {
    const id = store.staff()[0].id;
    expect(
      hr.related('lqcs', id, 'Leave requested', (d) => ({
        ...d,
        leaves: [
          ...d.leaves,
          {
            id: 'new-leave',
            personId: id,
            person: store.staff()[0].name,
            type: 'Annual leave',
            start: '2026-10-17',
            end: '2026-10-18',
            status: 'Pending',
          },
        ],
      })),
    ).toBeNull();
    expect(
      store
        .data()
        .people.find((p) => p.id === id)!
        .hr!.audit.at(-1)!.action,
    ).toBe('Leave requested');
    expect(store.data().leaves.some((l) => l.id === 'new-leave')).toBe(true);
  });
});
