import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { ManagementStore, MODULES } from './management.store';
import { ROLES } from '../../../core/auth/models/role';
import { ROTA_ACTIONS } from '../rota/rota.models';
import { PAYROLL_ACTIONS } from '../payroll/payroll.models';
import { RotaService } from '../rota/rota.service';
import { PayrollService } from '../payroll/payroll.service';
import { QualityService } from '../quality/quality.service';

describe('ManagementStore', () => {
  let store: ManagementStore;
  let workspaces: WorkspaceService;
  beforeEach(() => {
    for (const key of [
      'cv_session',
      'cv_companies_v1',
      'cv_management_v1',
      'cv_custom_workspaces_v1',
    ])
      localStorage.removeItem(key);
    TestBed.configureTestingModule({});
    TestBed.inject(AuthService).signInWithMicrosoft();
    workspaces = TestBed.inject(WorkspaceService);
    workspaces.switchWorkspace('lqcs');
    store = TestBed.inject(ManagementStore);
  });
  it('isolates changes between company workspaces', () => {
    const person = store.data().people[0];
    store.updatePerson({ ...person, notes: ['Interview follow-up'] });
    workspaces.switchWorkspace('riverside');
    expect(store.data().people[0].notes).toEqual([]);
    workspaces.switchWorkspace('lqcs');
    expect(store.data().people[0].notes).toEqual(['Interview follow-up']);
  });
  it('registers a new company as an accessible empty workspace', () => {
    store.saveCompany({ ...store.company()!, id: 'new-company', name: 'New Care', code: 'NC' });
    expect(workspaces.myWorkspaces().some((w) => w.id === 'new-company')).toBe(true);
    workspaces.switchWorkspace('new-company');
    expect(workspaces.currentWorkspace()?.name).toBe('New Care');
    expect(store.data().people).toEqual([]);
    expect(store.data().members).toEqual([]);
  });
  it('moves hired applicants into staff without losing their notes or checks', () => {
    const applicant = store.applicants()[0];
    store.updatePerson({ ...applicant, stage: 'Hired', notes: ['Offer accepted'] });
    expect(store.applicants().some((p) => p.id === applicant.id)).toBe(false);
    expect(store.staff().find((p) => p.id === applicant.id)?.notes).toEqual(['Offer accepted']);
    expect(store.staff().find((p) => p.id === applicant.id)?.checks).toEqual(applicant.checks);
  });
  it('persists edited records for the next session', () => {
    store.updatePerson({ ...store.data().people[0], notes: ['Saved record'] });
    expect(JSON.parse(localStorage.getItem('cv_management_v1')!)['lqcs'].people[0].notes).toEqual([
      'Saved record',
    ]);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    expect(TestBed.inject(ManagementStore).data().people[0].notes).toEqual(['Saved record']);
  });
  it('allows every role to use all module actions while still requiring sign-in', () => {
    const auth = TestBed.inject(AuthService);
    const user = auth.currentUser()!;
    const currentUser = signal(user);
    const actor = vi.spyOn(auth, 'currentUser').mockImplementation(() => currentUser());
    const rota = TestBed.inject(RotaService);
    const payroll = TestBed.inject(PayrollService);
    const quality = TestBed.inject(QualityService);
    for (const role of Object.values(ROLES)) {
      currentUser.set({ ...user, roleCode: role.code });
      for (const action of ROTA_ACTIONS) expect(rota.can(action.key)).toBe(true);
      for (const action of PAYROLL_ACTIONS) expect(payroll.can(action.key)).toBe(true);
      for (const action of ['view', 'create', 'edit', 'export'] as const)
        expect(quality.can(action)).toBe(true);
    }
    actor.mockRestore();
    auth.signOut();
    expect(rota.can('manage')).toBe(false);
    expect(payroll.can('pay')).toBe(false);
    expect(quality.can('create')).toBe(false);
  });

  it('grants full access to existing workspace permissions without changing their records', () => {
    const { permissionDefaultsVersion, ...legacy } = store.data();
    const records = {
      lqcs: {
        ...legacy,
        permissions: { 'Care Worker:Finance': [false, false, false, false, false] },
        rotaPermissions: { 'Care Worker': [] },
        payrollPermissions: { 'Care Worker': [] },
      },
      riverside: { ...legacy, people: [] },
    };
    localStorage.setItem('cv_management_v1', JSON.stringify(records));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const restored = TestBed.inject(ManagementStore);
    for (const data of Object.values(restored.records())) {
      expect(data.permissionDefaultsVersion).toBe(1);
      for (const role of Object.values(ROLES)) {
        for (const module of MODULES)
          expect(data.permissions[role.label + ':' + module]).toEqual([
            true,
            true,
            true,
            true,
            true,
          ]);
        expect(data.rotaPermissions?.[role.label]).toEqual(
          ROTA_ACTIONS.map((action) => action.key),
        );
        expect(data.payrollPermissions?.[role.label]).toEqual(
          PAYROLL_ACTIONS.map((action) => action.key),
        );
      }
    }
    expect(restored.records()['lqcs'].people).toEqual(legacy.people);
    expect(restored.records()['riverside'].people).toEqual([]);
    expect(restored.records()['lqcs'].members).toEqual(legacy.members);
    expect(JSON.parse(localStorage.getItem('cv_management_v1')!).lqcs.permissions).toEqual(
      restored.records()['lqcs'].permissions,
    );
  });

  it('retains restrictions saved after the full-access defaults were applied', () => {
    store.saveWorkspace((data) => ({
      ...data,
      permissions: { 'Care Worker:Finance': [true, false, false, false, false] },
      payrollPermissions: { 'Care Worker': ['view'] },
    }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const restored = TestBed.inject(ManagementStore);
    expect(restored.data().permissions['Care Worker:Finance']).toEqual([
      true,
      false,
      false,
      false,
      false,
    ]);
    expect(restored.data().payrollPermissions?.['Care Worker']).toEqual(['view']);
  });
});
