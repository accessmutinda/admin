import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { DEMO_USER } from '../../../core/auth/fixtures';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { ManagementStore } from '../shared/management.store';
import { londonDate } from '../rota/rota.models';
import { RotaService } from '../rota/rota.service';
import { emptyClientFile } from '../clients/client-file.models';
import { CareService } from './care.service';
import {
  Administration,
  FamilyAccess,
  Prescription,
  blankPrescription,
  age,
  csv,
  medicationDue,
  prescriptionError,
} from './care.models';

describe('Structured care records', () => {
  let care: CareService, store: ManagementStore, rota: RotaService;
  const actor = signal({
    ...DEMO_USER,
    roleCode: 'CA' as typeof DEMO_USER.roleCode,
    name: 'Care administrator',
  });
  const workspace = 'lqcs';
  const version = () => care.client('client')?.file?.updatedAt ?? '';
  const prescription = (overrides: Partial<Prescription> = {}): Prescription => ({
    ...blankPrescription(),
    name: 'Test medication',
    strength: '500mg',
    dose: '1 tablet',
    prescriber: 'Dr Test',
    pharmacy: 'Test Pharmacy',
    indication: 'Recorded indication',
    start: '2026-01-01',
    times: ['08:00'],
    stock: 20,
    ...overrides,
  });
  const record = (
    m: Prescription,
    overrides: Partial<Omit<Administration, 'id' | 'at' | 'by' | 'userId'>> = {},
  ) => ({
    medicationId: m.id,
    date: '2026-02-10',
    time: '08:00',
    outcome: 'Given' as const,
    doseUnits: 1,
    reason: '',
    response: '',
    witness: '',
    ...overrides,
  });
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    const auth = TestBed.inject(AuthService);
    auth.signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace(workspace);
    actor.set({ ...DEMO_USER, roleCode: 'CA', name: 'Care administrator' });
    vi.spyOn(auth, 'currentUser').mockImplementation(() => actor());
    store = TestBed.inject(ManagementStore);
    rota = TestBed.inject(RotaService);
    care = TestBed.inject(CareService);
    expect(
      rota.saveClient({
        id: 'client',
        name: 'Service user',
        reference: 'C1',
        address: '1 Test Road',
        postcode: 'HA1 1AA',
        active: true,
        funding: 'Private',
        priority: 'Standard',
        file: emptyClientFile(),
      }),
    ).toBeNull();
  });
  it('validates prescriptions and selected-day schedules', () => {
    const m = prescription({ frequency: 'Selected days', weekdays: [2] });
    expect(prescriptionError(m)).toBeNull();
    expect(medicationDue(m, '2026-02-10')).toBe(true);
    expect(medicationDue(m, '2026-02-11')).toBe(false);
    expect(prescriptionError({ ...m, times: ['25:00'] })).toContain('times');
    expect(prescriptionError({ ...m, end: '2025-01-01' })).toContain('dates');
  });
  it('saves structured medication without deleting the legacy register', () => {
    const client = structuredClone(care.client('client')!);
    client.file!.entries['medication'] = [
      {
        id: 'legacy',
        name: 'Historical medication',
        detail: 'Retained',
        date: '2026-01-01',
        level: 'Low',
        status: 'Inactive',
      },
    ];
    rota.saveClient(client);
    const m = prescription();
    expect(care.saveMedication('client', workspace, m, version())).toBeNull();
    expect(care.client('client')!.file!.entries['medication']).toHaveLength(1);
    expect(care.client('client')!.file!.medications).toEqual([m]);
  });
  it('records a scheduled dose, deducts stock and rejects duplicate administration', () => {
    const m = prescription();
    care.saveMedication('client', workspace, m, version());
    expect(care.record('client', workspace, record(m))).toBeNull();
    expect(care.client('client')!.file!.medications![0].stock).toBe(19);
    expect(care.record('client', workspace, record(m))).toContain('already');
    expect(care.client('client')!.file!.administrations).toHaveLength(1);
  });
  it('requires exception reasons and rejects doses outside the schedule or in the future', () => {
    const m = prescription();
    care.saveMedication('client', workspace, m, version());
    expect(care.record('client', workspace, record(m, { outcome: 'Refused' }))).toContain('reason');
    expect(care.record('client', workspace, record(m, { time: '09:00' }))).toContain('not due');
    expect(care.record('client', workspace, record(m, { date: '2099-01-01' }))).toContain('future');
  });
  it('keeps original MAR entries when corrected and reconciles stock', () => {
    const m = prescription();
    care.saveMedication('client', workspace, m, version());
    care.record('client', workspace, record(m));
    const original = care.client('client')!.file!.administrations![0];
    expect(
      care.record(
        'client',
        workspace,
        record(m, {
          outcome: 'Omitted',
          reason: 'Correction after review',
          correctionOf: original.id,
        }),
      ),
    ).toBeNull();
    expect(care.client('client')!.file!.administrations).toHaveLength(2);
    expect(care.client('client')!.file!.administrations![0]).toEqual(original);
    expect(care.client('client')!.file!.medications![0].stock).toBe(20);
    expect(
      care.record(
        'client',
        workspace,
        record(m, { reason: 'Stale correction', correctionOf: original.id }),
      ),
    ).toContain('current MAR');
  });
  it('enforces PRN rolling limits and minimum intervals, including backdated entries', () => {
    const m = prescription({
      frequency: 'PRN',
      prnIndication: 'As recorded',
      prnMax: 2,
      prnInterval: 4,
    });
    care.saveMedication('client', workspace, m, version());
    expect(care.record('client', workspace, record(m))).toBeNull();
    expect(care.record('client', workspace, record(m, { time: '10:00' }))).toContain(
      'minimum interval',
    );
    expect(care.record('client', workspace, record(m, { time: '12:00' }))).toBeNull();
    expect(care.record('client', workspace, record(m, { time: '16:00' }))).toContain('rolling 24');
    expect(care.record('client', workspace, record(m, { time: '07:00' }))).toContain(
      'minimum interval',
    );
  });
  it('requires a different witness for controlled drugs and prevents negative stock', () => {
    const m = prescription({ controlled: true, stock: 1 });
    care.saveMedication('client', workspace, m, version());
    expect(care.record('client', workspace, record(m))).toContain('witness');
    expect(care.record('client', workspace, record(m, { witness: actor().name }))).toContain(
      'witness',
    );
    expect(
      care.record('client', workspace, record(m, { witness: 'Witness', doseUnits: 2 })),
    ).toContain('stock');
    expect(care.record('client', workspace, record(m, { witness: 'Witness' }))).toBeNull();
  });
  it('locks prescriptions with recorded administrations while allowing audited stock changes', () => {
    const m = prescription();
    care.saveMedication('client', workspace, m, version());
    care.record('client', workspace, record(m));
    expect(
      care.saveMedication('client', workspace, { ...m, dose: '2 tablets' }, version()),
    ).toContain('Discontinue');
    expect(care.adjustStock('client', workspace, m.id, 5, 'Delivery reconciled')).toBeNull();
    expect(care.client('client')!.file!.medications![0].stock).toBe(24);
    expect(care.discontinue('client', workspace, m.id, 'Prescriber stopped')).toBeNull();
    expect(care.client('client')!.file!.medications![0].discontinuedReason).toBe(
      'Prescriber stopped',
    );
  });
  it('rejects stale edits, workspace changes and revoked permissions', () => {
    const v = version();
    const m = prescription();
    care.saveMedication('client', workspace, m, v);
    expect(care.saveMedication('client', workspace, prescription(), v)).toContain('changed');
    expect(care.saveMedication('client', 'other', m, version())).toContain('workspace');
    vi.spyOn(rota, 'can').mockReturnValue(false);
    expect(care.saveMedication('client', workspace, m, version())).toContain('permission');
  });
  it('does not mutate records or audit on storage failure', () => {
    const previous = structuredClone(care.client('client'));
    vi.spyOn(store, 'saveWorkspace').mockReturnValue(false);
    expect(care.saveMedication('client', workspace, prescription(), version())).toContain(
      'Could not save',
    );
    expect(care.client('client')).toEqual(previous);
  });
  it('keeps only one additional next-of-kin contact and validates email', () => {
    const contact = {
      id: 'a',
      name: 'Family One',
      relationship: 'Daughter',
      phone: '07000',
      email: '',
      type: 'Family' as const,
      nextOfKin: true,
    };
    expect(care.saveContact('client', workspace, contact, version())).toBeNull();
    expect(
      care.saveContact('client', workspace, { ...contact, id: 'b', name: 'Family Two' }, version()),
    ).toBeNull();
    expect(care.client('client')!.file!.contacts!.filter((c) => c.nextOfKin)).toHaveLength(1);
    expect(
      care.saveContact('client', workspace, { ...contact, email: 'invalid' }, version()),
    ).toContain('email');
  });
  it('requires sharing agreement and applies family scopes before returning a view', () => {
    const access: FamilyAccess = {
      id: 'family',
      name: 'Family member',
      email: actor().email,
      relationship: 'Daughter',
      status: 'Active',
      scopes: ['Visits', 'Notes'],
      at: '',
    };
    expect(care.saveAccess('client', workspace, access, version())).toContain('agreement');
    const c = structuredClone(care.client('client')!);
    c.file!.sections['consent'] = { family: 'Agreed' };
    c.file!.sections['family'] = { approved: 'Approved update' };
    rota.saveClient(c);
    expect(care.saveAccess('client', workspace, access, version())).toBeNull();
    const view = care.familyRecord('client', 'family');
    expect(view?.notes).toBe('Approved update');
    expect(view?.medication).toBeNull();
    expect(view?.plan).toBeNull();
    expect(view?.invoices).toBeNull();
    actor.update((a) => ({ ...a, email: 'someone-else@example.com' }));
    expect(care.familyRecord('client', 'family')).toBeNull();
    expect(care.familyRecord('client', 'family', true)).not.toBeNull();
    expect(
      care.saveAccess('client', workspace, { ...access, status: 'Revoked' }, version()),
    ).toBeNull();
    expect(care.familyRecord('client', 'family', true)).toBeNull();
  });
  it('revokes family views immediately when sharing agreement is withdrawn', () => {
    const c = structuredClone(care.client('client')!);
    c.file!.sections['consent'] = { family: 'Agreed' };
    rota.saveClient(c);
    const a: FamilyAccess = {
      id: 'f',
      name: 'Family',
      email: actor().email,
      relationship: 'Son',
      status: 'Active',
      scopes: ['Messages'],
      at: '',
    };
    care.saveAccess('client', workspace, a, version());
    expect(care.message('client', workspace, 'f', 'Hello', true)).toBeNull();
    const next = structuredClone(care.client('client')!);
    next.file!.sections['consent']['family'] = 'Declined';
    rota.saveClient(next);
    expect(care.familyRecord('client', 'f', true)).toBeNull();
    expect(care.message('client', workspace, 'f', 'Hello', true)).toContain('permission');
  });
  it('does not expose key safe codes, internal notes or contacts in family views', () => {
    const c = structuredClone(care.client('client')!);
    c.file!.sections['consent'] = { family: 'Agreed' };
    c.file!.sections['access'] = { code: 'SECRET-CODE' };
    c.file!.sections['diagnoses'] = { communication: 'Internal clinical guidance' };
    rota.saveClient(c);
    care.saveAccess(
      'client',
      workspace,
      {
        id: 'f',
        name: 'Family',
        email: actor().email,
        relationship: 'Son',
        status: 'Active',
        scopes: ['Care plan', 'Visits', 'Notes'],
        at: '',
      },
      version(),
    );
    expect(JSON.stringify(care.familyRecord('client', 'f'))).not.toContain('SECRET-CODE');
    expect(JSON.stringify(care.familyRecord('client', 'f'))).not.toContain('Internal clinical');
  });
  it('shares only approved documents and keeps photo consent and scopes independent', () => {
    const c = structuredClone(care.client('client')!);
    c.file!.sections['consent'] = { family: 'Agreed', photo: 'Agreed' };
    c.file!.photo = 'data:image/png;base64,cHJvZmlsZQ==';
    c.file!.documents = [
      {
        id: 'private',
        name: 'Internal report',
        category: 'Clinical',
        version: '1',
        data: 'data:application/pdf;base64,cGRm',
        mime: 'application/pdf',
        size: 3,
        at: '',
        by: 'Team',
      },
      {
        id: 'shared',
        name: 'Care plan',
        category: 'Care plan',
        version: '1',
        data: 'data:application/pdf;base64,cGRm',
        mime: 'application/pdf',
        size: 3,
        at: '',
        by: 'Team',
        familyShared: true,
      },
      {
        id: 'photo',
        name: 'Garden visit',
        category: 'Other',
        version: '1',
        data: 'data:image/jpeg;base64,cGhvdG8=',
        mime: 'image/jpeg',
        size: 5,
        at: '',
        by: 'Team',
        familyShared: true,
      },
    ];
    rota.saveClient(c);
    const access: FamilyAccess = {
      id: 'f',
      name: 'Family',
      email: actor().email,
      relationship: 'Son',
      status: 'Active',
      scopes: ['Documents'],
      at: '',
    };
    expect(care.saveAccess('client', workspace, access, version())).toBeNull();
    expect(care.familyRecord('client', 'f')?.documents?.map((d) => d.id)).toEqual(['shared']);
    expect(care.familyRecord('client', 'f')?.photos).toBeNull();
    expect(
      care.saveAccess('client', workspace, { ...access, scopes: ['Photos'] }, version()),
    ).toBeNull();
    expect(care.familyRecord('client', 'f')?.documents).toBeNull();
    expect(care.familyRecord('client', 'f')?.photos?.map((d) => d.id)).toEqual(['photo']);
    const next = structuredClone(care.client('client')!);
    next.file!.sections['consent']['photo'] = 'Declined';
    rota.saveClient(next);
    expect(care.familyRecord('client', 'f')?.photos).toBeNull();
    expect(care.familyRecord('client', 'f')?.profile.photo).toBe('');
  });
  it('persists document approval, revokes it immediately and rejects cross-workspace changes', () => {
    const doc = {
      id: 'doc',
      name: 'Plan',
      category: 'Care plan',
      version: '1',
      data: 'data:application/pdf;base64,cGRm',
      mime: 'application/pdf',
      size: 3,
      at: '',
      by: 'Team',
    };
    expect(care.saveDocument('client', workspace, doc)).toBeNull();
    expect(care.shareDocument('client', 'other-workspace', 'doc', true)).toContain(
      'workspace changed',
    );
    expect(care.client('client')?.file?.documents?.[0].familyShared).toBeUndefined();
    expect(care.shareDocument('client', workspace, 'doc', true)).toBeNull();
    expect(care.client('client')?.file?.documents?.[0].familyShared).toBe(true);
    expect(care.shareDocument('client', workspace, 'doc', false)).toBeNull();
    expect(care.client('client')?.file?.documents?.[0].familyShared).toBe(false);
  });
  it('provides full administrator preview without changing family consent or permissions', () => {
    const client = structuredClone(care.client('client')!);
    client.file!.sections['consent'] = { family: 'Declined', photo: 'Declined' };
    client.file!.familyAccess = [];
    client.file!.documents = [
      {
        id: 'private-doc',
        name: 'Report',
        category: 'Clinical',
        version: '1',
        data: 'data:application/pdf;base64,cGRm',
        mime: 'application/pdf',
        size: 3,
        at: '',
        by: 'Team',
      },
      {
        id: 'private-photo',
        name: 'Garden',
        category: 'Other',
        version: '1',
        data: 'data:image/jpeg;base64,cGhvdG8=',
        mime: 'image/jpeg',
        size: 5,
        at: '',
        by: 'Team',
      },
    ];
    rota.saveClient(client);
    const before = structuredClone(care.client('client'));
    const accessId = care.familyPreviewAccessId('client');
    const view = care.familyRecord('client', accessId, true);
    expect(view?.access.scopes).toContain('Documents');
    expect(view?.access.scopes).toContain('Photos');
    expect(view?.plan).not.toBeNull();
    expect(view?.medication).not.toBeNull();
    expect(view?.documents?.map((d) => d.id)).toEqual(['private-doc']);
    expect(view?.photos?.map((d) => d.id)).toEqual(['private-photo']);
    expect(care.client('client')).toEqual(before);
    expect(care.familyRecord('client', accessId)).toBeNull();
    expect(care.familyRecord('other-client', accessId, true)).toBeNull();
    expect(care.message('client', workspace, accessId, 'Hello', true)).toContain('permission');
    vi.spyOn(rota, 'can').mockImplementation((action) => action === 'view');
    expect(care.familyRecord('client', accessId, true)).toBeNull();
  });
  it('publishes dated family updates explicitly and preserves the existing approved summary', () => {
    const client = structuredClone(care.client('client')!);
    client.file!.sections['consent'] = { family: 'Agreed' };
    client.file!.sections['family'] = { approved: 'Existing approved summary' };
    client.file!.sections['diagnoses'] = { communication: 'Private clinical note' };
    rota.saveClient(client);
    const access: FamilyAccess = {
      id: 'f',
      name: 'Family',
      email: actor().email,
      relationship: 'Son',
      status: 'Active',
      scopes: ['Notes'],
      at: '',
    };
    care.saveAccess('client', workspace, access, version());
    expect(
      care.shareFamilyUpdate('client', workspace, {
        date: londonDate(),
        category: 'Wellbeing',
        text: 'A shared wellbeing update',
      }),
    ).toBeNull();
    const view = care.familyRecord('client', 'f');
    expect(view?.notes).toBe('Existing approved summary');
    expect(view?.updates?.[0].text).toBe('A shared wellbeing update');
    expect(view?.updates?.[0].by).toBe(actor().name);
    expect(JSON.stringify(view)).not.toContain('Private clinical note');
    expect(
      care.shareFamilyUpdate('client', 'wrong', {
        date: londonDate(),
        category: 'General',
        text: 'Do not publish',
      }),
    ).toContain('workspace changed');
    expect(
      care.shareFamilyUpdate('client', workspace, {
        date: '2099-01-01',
        category: 'General',
        text: 'Future',
      }),
    ).toContain('valid date');
    care.saveAccess('client', workspace, { ...access, scopes: [] }, version());
    expect(care.familyRecord('client', 'f')?.updates).toBeNull();
  });
  it('projects current MAR entries without superseded outcomes or internal administration notes', () => {
    const client = structuredClone(care.client('client')!);
    client.file!.sections['consent'] = { family: 'Agreed' };
    client.file!.medications = [prescription({ id: 'm' })];
    const original: Administration = {
      id: 'original',
      medicationId: 'm',
      date: londonDate(),
      time: '08:00',
      outcome: 'Given',
      doseUnits: 1,
      reason: 'Internal reason',
      response: 'Private response',
      at: '',
      by: 'Nurse',
      userId: 'staff',
      witness: 'Internal witness',
    };
    client.file!.administrations = [
      original,
      { ...original, id: 'correction', outcome: 'Refused', correctionOf: 'original' },
    ];
    rota.saveClient(client);
    const access: FamilyAccess = {
      id: 'f',
      name: 'Family',
      email: actor().email,
      relationship: 'Son',
      status: 'Active',
      scopes: ['Medication'],
      at: '',
    };
    care.saveAccess('client', workspace, access, version());
    const view = care.familyRecord('client', 'f');
    expect(view?.administrations?.map((a) => a.id)).toEqual(['correction']);
    expect(view?.administrations?.[0].outcome).toBe('Refused');
    expect(JSON.stringify(view)).not.toContain('Internal reason');
    expect(JSON.stringify(view)).not.toContain('Private response');
    care.saveAccess('client', workspace, { ...access, scopes: [] }, version());
    expect(care.familyRecord('client', 'f')?.administrations).toBeNull();
    expect(care.familyRecord('client', 'f')?.allergies).toBeNull();
  });
  it('shares assigned carer attendance without internal visit notes or GPS claims', () => {
    const client = structuredClone(care.client('client')!);
    client.file!.sections['consent'] = { family: 'Agreed' };
    rota.saveClient(client);
    const access: FamilyAccess = {
      id: 'f',
      name: 'Family',
      email: actor().email,
      relationship: 'Son',
      status: 'Active',
      scopes: ['Visits'],
      at: '',
    };
    care.saveAccess('client', workspace, access, version());
    const staffId = store.data().people[0].id;
    expect(
      store.saveWorkspace((data) => ({
        ...data,
        rota: {
          ...rota.data(),
          visits: [
            {
              id: 'visit',
              callId: 'call',
              clientId: 'client',
              clientName: client.name,
              address: client.address,
              callName: 'Morning care',
              date: '2026-01-01',
              start: '08:00',
              end: '09:00',
              carers: 1,
              skills: [],
              tasks: 'Private task detail',
              staffIds: [staffId],
              allocation: 'Regular',
              state: 'Published',
              priority: 'Standard',
              location: 'Home',
              exception: 'Private exception',
              attendance: [
                { personId: staffId, start: '2026-01-01T08:03:00Z', end: '2026-01-01T08:58:00Z' },
                { personId: 'unassigned', start: '', end: '' },
              ],
            },
          ],
        },
      })),
    ).toBe(true);
    const visit = care.familyRecord('client', 'f')?.visits?.[0];
    expect(visit?.completed).toBe(true);
    expect(visit?.attendance).toHaveLength(1);
    expect(visit?.attendance[0].duration).toBe(55);
    expect(visit?.location).toBe('Home');
    expect(JSON.stringify(visit)).not.toContain('Private exception');
    expect(JSON.stringify(visit)).not.toContain('Private task detail');
    expect(JSON.stringify(visit)).not.toContain('Verified');
  });
  it('calculates ages accurately and escapes spreadsheet formula cells', () => {
    expect(age('1936-08-14', '2026-08-13')).toBe(89);
    expect(age('1936-08-14', '2026-08-14')).toBe(90);
    expect(age('2026-02-30')).toBeNull();
    expect(csv([[' =CMD()', 'Name, quoted']])).toContain("' =CMD()");
  });
});
