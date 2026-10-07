import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { DEMO_USER } from '../../../core/auth/fixtures';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { ManagementStore } from '../shared/management.store';
import { RotaVisit, londonInstant } from '../rota/rota.models';
import { EcmService } from './ecm.service';
import { emptyEcm } from './ecm.models';
const v: RotaVisit = {
  id: 'visit',
  callId: 'call',
  clientId: 'client',
  clientName: 'Mary Smith',
  address: 'London',
  callName: 'Morning',
  date: '2026-10-06',
  start: '08:00',
  end: '08:45',
  carers: 1,
  skills: [],
  tasks: '',
  staffIds: ['james'],
  allocation: 'Regular',
  state: 'Published',
  priority: 'High',
  attendance: [],
  exception: '',
};
const action = () => ({
  action: 'Manager note',
  note: 'Welfare check agreed',
  contact: '',
  outcome: '',
  eta: '',
  accepted: false,
  concern: false,
  followUp: '',
});
describe('ECM records', () => {
  let service: EcmService;
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
    service = TestBed.inject(EcmService);
    store.update((d) => ({
      ...d,
      rota: { clients: [], calls: [], visits: [structuredClone(v)], audit: [], travelMinutes: 15 },
    }));
  });
  it('persists follow-up and audit together and isolates workspaces', () => {
    expect(service.record('visit', action())).toBeNull();
    expect(service.data().records).toHaveLength(1);
    expect(service.rota.data().audit.at(-1)?.action).toBe('ECM action recorded');
    TestBed.inject(WorkspaceService).switchWorkspace('riverside');
    expect(service.data().records).toHaveLength(0);
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    expect(service.data().records).toHaveLength(1);
  });
  it('rejects missing contact outcomes, welfare follow-up and invalid settings', () => {
    expect(service.record('visit', { ...action(), action: 'Contact carer' })).toContain('outcome');
    expect(service.record('visit', { ...action(), concern: true })).toContain('follow-up');
    expect(service.settings({ ...emptyEcm(), riskMinutes: 3 })).toContain('late < risk');
    expect(
      service.settings({
        ...emptyEcm(),
        styles: { Morning: { background: '#ffffff', color: '#ffffff', label: 'Morning' } },
      }),
    ).toContain('contrast');
    expect(service.settings({ ...emptyEcm(), missedMinutes: 40 })).toBeNull();
  });
  it('stores the actual contact time separately from the record timestamp', () => {
    const contact = {
      ...action(),
      action: 'Contact carer',
      contact: 'James Carter',
      outcome: 'Arrival confirmed',
    };
    expect(service.record(v.id, contact)).toContain('actual contact');
    expect(service.record(v.id, { ...contact, contactAt: '2026-10-06T08:10' })).toBeNull();
    expect(service.data().records[0].contactAt).toBe(londonInstant('2026-10-06', '08:10'));
  });
  it('denies changes for a view-only role and leaves data unchanged on save failure', () => {
    vi.spyOn(store, 'saveWorkspace').mockReturnValue(false);
    expect(service.record('visit', action())).toContain('Could not save');
    expect(service.data().records).toHaveLength(0);
    actor.set({ ...actor(), roleCode: 'CW' });
    expect(service.record('visit', action())).toContain('cannot manage');
  });
  it('records check-in then verified check-out, locking completed attendance', () => {
    const start = londonInstant(v.date, '08:00')!,
      end = londonInstant(v.date, '08:45')!;
    expect(service.attendance(v.id, 'james', end, 'Check out', 'Verified')).toContain('check-in');
    expect(service.attendance(v.id, 'other', start, 'Check in', 'Verified')).toContain('allocated');
    expect(service.attendance(v.id, 'james', start, 'Check in', 'Verified')).toBeNull();
    expect(service.attendance(v.id, 'james', start, 'Check in', 'Verified')).toContain('already');
    expect(service.attendance(v.id, 'james', end, 'Check out', 'Verified')).toBeNull();
    expect(service.attendance(v.id, 'james', end, 'Check out', 'Verified')).toContain('locked');
  });
  it('requires photo permission and manager review, auditing photo views', () => {
    const evidence = {
      type: 'Safeguarding' as const,
      note: 'Sample concern',
      photo: 'data:image/png;base64,YQ==',
      photoName: 'sample.png',
    };
    expect(service.evidence(v.id, evidence, false)).toContain('confirm');
    expect(service.evidence(v.id, evidence, true)).toBeNull();
    const id = service.data().evidence[0].id;
    actor.set({ ...actor(), roleCode: 'CC' });
    expect(service.viewPhoto(id)).toContain('Manager');
    expect(service.reviewEvidence(id)).toContain('Manager');
    actor.set({ ...actor(), roleCode: 'CA' });
    expect(service.viewPhoto(id)).toBeNull();
    expect(service.reviewEvidence(id)).toBeNull();
    expect(service.data().evidence[0].reviewedAt).toBeTruthy();
    expect(service.rota.data().audit.some((a) => a.action === 'Visit photo viewed')).toBe(true);
  });
});
