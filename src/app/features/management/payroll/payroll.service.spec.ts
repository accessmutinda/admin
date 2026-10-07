import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { DEMO_USER } from '../../../core/auth/fixtures';
import { AppUser } from '../../../core/auth/models/user';
import { ManagementStore } from '../shared/management.store';
import {
  Contractor,
  Invoice,
  invoiceBalance,
  invoiceTotal,
  PayProfile,
  PayRun,
  WorkRecord,
} from './payroll.models';
import { PayrollService } from './payroll.service';

const profile = (id = 'profile', personId = 'james'): PayProfile => ({
  id,
  personId,
  basis: 'Hourly',
  rate: 12.5,
  weeklyHours: 37.5,
  effective: '2026-10-01',
  frequency: 'Monthly',
});
const work = (id = 'work', kind: WorkRecord['kind'] = 'Regular'): WorkRecord => ({
  id,
  personId: 'james',
  date: '2026-10-04',
  hours: 8,
  actualHours: 0,
  rate: 0,
  kind,
  category: '',
  reason: 'Confirmed care shift',
  status: 'Requested',
  audit: [],
});
const contractor = (): Contractor => ({
  id: 'supplier',
  name: 'Care Cover',
  email: 'supplier@example.com',
  type: 'Agency',
  rate: 20,
  unit: 'Hour',
  terms: 30,
  start: '2026-01-01',
  end: '',
  reference: 'contract-1',
  managerId: 'u1',
});
const invoice = (): Invoice => ({
  id: 'invoice',
  contractorId: 'supplier',
  number: 'INV-1',
  issued: '2026-10-01',
  due: '2026-10-31',
  start: '2026-10-01',
  end: '2026-10-01',
  lines: [{ description: 'Cover', quantity: 2, rate: 20, vat: 20 }],
  status: 'Recorded',
  createdBy: '',
  audit: [],
  payments: [],
});
const run = (id = 'run'): PayRun => ({
  id,
  name: 'October payroll',
  start: '2026-10-01',
  end: '2026-10-31',
  cutoff: '2026-10-31',
  payday: '2026-11-01',
  frequency: 'Monthly',
  status: 'Draft',
  createdBy: '',
  lines: [],
  audit: [],
});

describe('Payroll administration', () => {
  let service: PayrollService;
  let store: ManagementStore;
  const actor = signal<AppUser>({
    ...DEMO_USER,
    id: 'admin-a',
    roleCode: 'CA',
    name: 'Administrator A',
    email: 'admin-a@example.com',
  });
  const switchActor = (
    id: string,
    roleCode: AppUser['roleCode'] = 'CA',
    email = id + '@example.com',
  ) => actor.set({ ...DEMO_USER, id, roleCode, name: id, email });
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    const auth = TestBed.inject(AuthService);
    auth.signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    switchActor('admin-a');
    vi.spyOn(auth, 'currentUser').mockImplementation(() => actor());
    store = TestBed.inject(ManagementStore);
    service = TestBed.inject(PayrollService);
  });
  it('enforces role actions and Finance module permissions before writing records', () => {
    switchActor('worker', 'CW');
    expect(service.can('view')).toBe(false);
    expect(service.saveProfile(profile())).toContain('permission');
    expect(service.data().profiles).toHaveLength(0);
    store.update((d) => ({ ...d, payrollPermissions: { 'Care Worker': ['view'] } }));
    expect(service.can('view')).toBe(true);
    expect(service.can('approve')).toBe(false);
    store.update((d) => ({
      ...d,
      permissions: { 'Care Worker:Finance': [false, false, false, false, false] },
    }));
    expect(service.can('view')).toBe(false);
    switchActor('admin-a');
    store.update((d) => ({
      ...d,
      permissions: { ...d.permissions, 'Company Admin:Finance': [false, true, true, false, true] },
    }));
    expect(service.can('manage')).toBe(false);
    expect(service.can('export')).toBe(false);
    store.saveCompany({
      ...store.company()!,
      modules: store.company()!.modules.filter((m) => m !== 'Finance'),
    });
    expect(service.can('manage')).toBe(false);
  });
  it('requires a hired employee and retains effective rate history', () => {
    expect(service.saveProfile({ ...profile(), personId: 'sophie' })).toContain('hired');
    expect(service.saveProfile(profile())).toBeNull();
    expect(service.saveProfile({ ...profile('duplicate'), rate: 15 })).toContain('already');
    expect(
      service.saveProfile({ ...profile('new'), effective: '2026-11-01', rate: 15 }),
    ).toBeNull();
    expect(service.profile('james', '2026-10-31')?.rate).toBe(12.5);
    expect(service.profile('james', '2026-11-01')?.rate).toBe(15);
  });
  it('authorises overtime, confirms actual hours and approves the saved rate with an audit trail', () => {
    service.saveProfile(profile());
    expect(service.saveWork({ ...work('ot', 'Overtime'), hours: 2 })).toBeNull();
    expect(service.data().work[0].rate).toBe(18.75);
    expect(service.workDecision('ot', 'Approve', '', 2)).toContain('current stage');
    switchActor('james', 'CA', store.staff().find((p) => p.id === 'james')!.email);
    expect(service.workDecision('ot', 'Authorise', '', 2)).toContain('own work');
    switchActor('manager', 'RM');
    expect(service.workDecision('ot', 'Authorise', 'Cover approved', 2)).toBeNull();
    expect(service.workDecision('ot', 'Confirm', 'Worked extra cover', 3)).toBeNull();
    expect(service.workDecision('ot', 'Approve', '', 3)).toContain('configured reviewer');
    switchActor('finance', 'FN');
    expect(service.workDecision('ot', 'Approve', 'Actual hours checked', 3)).toBeNull();
    expect(service.data().work[0].actualHours).toBe(3);
    expect(service.data().work[0].audit.map((a) => a.action)).toEqual([
      'Recorded',
      'Authorise',
      'Confirm',
      'Approve',
    ]);
    expect(service.workDecision('ot', 'Confirm', 'Change', 4)).toContain('cannot be changed');
  });
  it('honours paused approval routes and the finance threshold', () => {
    service.saveProfile(profile());
    service.saveWork(work());
    store.update((d) => ({ ...d, workflows: { ...d.workflows, Timesheets: [] } }));
    expect(service.workDecision('work', 'Approve', '', 8)).toContain('configured reviewer');
    store.update((d) => ({
      ...d,
      workflows: { ...d.workflows, Timesheets: ['Registered Manager'] },
    }));
    service.saveSettings({ ...service.data().settings, approvalThreshold: 50 });
    switchActor('manager', 'RM');
    expect(service.workDecision('work', 'Approve', '', 8)).toContain('threshold');
    switchActor('finance', 'FN');
    expect(service.workDecision('work', 'Approve', 'Checked', 8)).toContain('configured reviewer');
    switchActor('admin-b');
    expect(service.workDecision('work', 'Approve', 'Checked', 8)).toBeNull();
  });
  it('prevents duplicate supplier invoices, self approval and payments above the balance', () => {
    expect(service.saveContractor(contractor())).toBeNull();
    expect(service.saveInvoice(invoice())).toBeNull();
    expect(service.saveInvoice({ ...invoice(), id: 'duplicate', number: ' inv-1 ' })).toContain(
      'already',
    );
    expect(service.invoiceDecision('invoice', 'Confirm work', 'Services checked')).toContain(
      'own submission',
    );
    switchActor('admin-b');
    expect(service.invoiceDecision('invoice', 'Approve', 'Checked')).toContain('current stage');
    expect(service.invoiceDecision('invoice', 'Confirm work', 'Services checked')).toBeNull();
    expect(service.invoiceDecision('invoice', 'Approve', 'Rates checked')).toBeNull();
    expect(invoiceTotal(service.data().invoices[0])).toBe(48);
    expect(service.recordInvoicePayment('invoice', '2026-11-01', 20, 'bank-1')).toBeNull();
    expect(invoiceBalance(service.data().invoices[0])).toBe(28);
    expect(service.recordInvoicePayment('invoice', '2026-11-01', 20, 'bank-1')).toContain(
      'already',
    );
    expect(service.recordInvoicePayment('invoice', '2026-11-01', 29, 'bank-2')).toContain(
      'balance',
    );
    expect(service.recordInvoicePayment('invoice', '2026-11-01', 28, 'bank-2')).toBeNull();
    expect(invoiceBalance(service.data().invoices[0])).toBe(0);
    expect(service.invoiceDecision('invoice', 'Cancel', 'Cancel')).toContain('cannot be changed');
  });
  it('snapshots approved work, blocks overlapping runs and requires independent finalisation', () => {
    service.saveProfile(profile());
    service.saveWork(work());
    service.workDecision('work', 'Approve', 'Confirmed', 8);
    service.saveWork({ ...work('ot', 'Overtime'), hours: 2 });
    service.workDecision('ot', 'Authorise', 'Approved', 2);
    service.workDecision('ot', 'Confirm', 'Actually worked', 3);
    service.workDecision('ot', 'Approve', 'Checked', 3);
    expect(service.buildRun(run())).toBeNull();
    expect(service.data().runs[0].lines[0].total).toBe(156.25);
    expect(service.buildRun(run('overlap'))).toContain('overlapping');
    expect(service.saveProfile({ ...profile(), rate: 15 })).toContain('used in a pay run');
    expect(service.adjustRun('run', 'james', 10, 'Extra agreed allowance')).toBeNull();
    expect(service.runDecision('run', 'Lock')).toContain('Another');
    switchActor('admin-b');
    expect(service.runDecision('run', 'Lock')).toBeNull();
    expect(service.adjustRun('run', 'james', 20, 'Change')).toContain('draft');
    vi.spyOn(store, 'download').mockImplementation(() => {});
    expect(service.runDecision('run', 'Export')).toBeNull();
    expect(store.download).toHaveBeenCalledWith(
      'payroll-2026-10-01.csv',
      expect.stringContaining('166.25'),
      'text/csv',
    );
    expect(service.data().runs[0].status).toBe('Exported');
    expect(service.runDecision('run', 'Pay', '2026-11-01', 'external-payment')).toBeNull();
    expect(service.data().runs[0].status).toBe('Paid');
  });
  it('releases reserved work when a draft is cancelled and blocks incomplete hourly runs', () => {
    service.saveProfile(profile());
    service.saveWork(work());
    service.workDecision('work', 'Approve', 'Confirmed', 8);
    service.buildRun(run());
    expect(service.data().work[0].runId).toBe('run');
    expect(service.runDecision('run', 'Cancel')).toBeNull();
    expect(service.data().work[0].runId).toBeUndefined();
    expect(service.buildRun(run('replacement'))).toBeNull();
    expect(service.data().work[0].runId).toBe('replacement');
    service.saveProfile(profile('aisha-profile', 'aisha'));
    service.runDecision('replacement', 'Cancel');
    service.buildRun(run('incomplete'));
    switchActor('admin-b');
    expect(service.runDecision('incomplete', 'Lock')).toContain('approved regular hours');
  });
  it('isolates workspaces and preserves existing records after a failed save', () => {
    service.saveProfile(profile());
    TestBed.inject(WorkspaceService).switchWorkspace('riverside');
    expect(service.data().profiles).toHaveLength(0);
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    expect(service.data().profiles).toHaveLength(1);
    const before = structuredClone(service.data());
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Full');
    });
    expect(service.saveSettings({ ...service.data().settings, overtimeMultiplier: 2 })).toContain(
      'Could not save',
    );
    expect(service.data()).toEqual(before);
    spy.mockRestore();
  });
  it('requires authorisation again when a planned overtime request is returned', () => {
    service.saveProfile(profile());
    service.saveWork({ ...work('returned', 'Overtime'), hours: 2 });
    expect(service.workDecision('returned', 'Return', 'Explain the cover', 2)).toBeNull();
    expect(service.workDecision('returned', 'Confirm', 'Actual work', 2)).toContain(
      'current stage',
    );
    expect(service.workDecision('returned', 'Authorise', 'Clarified', 2)).toBeNull();
    expect(service.workDecision('returned', 'Confirm', 'Actual work confirmed', 2)).toBeNull();
  });
  it('checks combined daily hours and preserves allowance rates when settings change', () => {
    service.saveProfile(profile());
    service.saveWork({ ...work(), hours: 20 });
    expect(service.saveWork({ ...work('long-overtime', 'Overtime'), hours: 5 })).toContain(
      '24 hours',
    );
    expect(service.saveWork({ ...work('overtime', 'Overtime'), hours: 2 })).toBeNull();
    service.workDecision('overtime', 'Authorise', 'Cover approved', 2);
    expect(service.workDecision('overtime', 'Confirm', 'Cover lasted longer', 5)).toContain(
      '24 hours',
    );
    service.saveSettings({
      ...service.data().settings,
      allowances: service
        .data()
        .settings.allowances.map((a) => (a.id === 'mileage' ? { ...a, rate: 0.45 } : a)),
    });
    service.saveWork({ ...work('mileage', 'Allowance'), category: 'mileage', hours: 10 });
    service.saveSettings({
      ...service.data().settings,
      allowances: service
        .data()
        .settings.allowances.map((a) => (a.id === 'mileage' ? { ...a, rate: 0.5 } : a)),
    });
    expect(service.data().work.find((w) => w.id === 'mileage')?.rate).toBe(0.45);
  });
});
