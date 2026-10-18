import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { DEMO_USER } from '../../../core/auth/fixtures';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { ManagementStore } from '../shared/management.store';
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
  it('calculates ages accurately and escapes spreadsheet formula cells', () => {
    expect(age('1936-08-14', '2026-08-13')).toBe(89);
    expect(age('1936-08-14', '2026-08-14')).toBe(90);
    expect(age('2026-02-30')).toBeNull();
    expect(csv([[' =CMD()', 'Name, quoted']])).toContain("' =CMD()");
  });
});
