import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { ManagementStore } from './management.store';

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
});
