import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { ManagementStore, WorkspaceData } from './management.store';

const empty = (): WorkspaceData => ({
  permissionDefaultsVersion: 2,
  people: [],
  vacancies: [],
  members: [],
  permissions: {},
  workflows: {},
  backup: false,
  leaves: [],
  reviews: [],
  cpd: [],
});

describe('Platform role company boundaries', () => {
  const role = signal('CA');
  const company = signal('company-1');
  const authenticated = signal(true);
  const selected = signal<string | null>('company-1');
  let store: ManagementStore;
  beforeEach(() => {
    role.set('CA');
    company.set('company-1');
    authenticated.set(true);
    selected.set('company-1');
    localStorage.clear();
    localStorage.setItem(
      'cv_companies_v1',
      JSON.stringify([
        {
          id: 'company-1',
          name: 'Old Demo',
          sector: 'Sample sector',
          registration: 'DEMO-REG',
          modules: ['Finance'],
        },
      ]),
    );
    localStorage.setItem(
      'cv_management_v1',
      JSON.stringify({
        'company-1': { ...empty(), people: [{ id: 'sample-person', name: 'Old Demo Person' }] },
      }),
    );
    localStorage.setItem(
      'cv_api_company_data_v1',
      JSON.stringify({ 'company-1': { ...empty(), backup: true }, 'company-2': empty() }),
    );
    localStorage.setItem(
      'cv_api_company_details_v1',
      JSON.stringify([{ id: 'company-2', name: 'Stale cached name', code: 'CACHED', modules: [] }]),
    );
    const auth = {
      isSuperAdmin: () => authenticated() && role() === 'PO',
      canAccessCompany: (id: string) =>
        authenticated() && !!id && (role() === 'PO' || id === company()),
      profile: () =>
        authenticated() ? { company_id: company(), company_entry_state: 'ready' } : null,
      session: () => (authenticated() ? { workspaceId: selected() } : null),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        {
          provide: WorkspaceService,
          useValue: {
            allWorkspaces: () => [
              { id: 'company-1', name: 'Company One', shortCode: 'ONE', lifecycle: 'active' },
              { id: 'company-2', name: 'Company Two', shortCode: 'TWO', lifecycle: 'suspended' },
            ],
            currentWorkspace: () => ({ id: 'company-2' }),
            registerWorkspace: () => {},
          },
        },
      ],
    });
    store = TestBed.inject(ManagementStore);
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
  });
  it('exposes only the assigned company and ignores a foreign selected workspace', () => {
    selected.set('company-2');
    expect(store.companyId()).toBe('company-1');
    expect(store.companies().map((c) => c.id)).toEqual(['company-1']);
    expect(Object.keys(store.records())).toEqual(['company-1']);
    expect(store.data().backup).toBe(true);
    expect(store.saveCompany({ id: 'company-2' } as never)).toBe(false);
    expect(store.saveCompany({ id: 'new-company' } as never)).toBe(false);
  });
  it('allows Super Admin to see every API company and switch its data context', () => {
    role.set('PO');
    expect(store.companies().map((c) => c.name)).toEqual(['Company One', 'Company Two']);
    expect(store.companies().map((c) => c.active)).toEqual([true, false]);
    expect(Object.keys(store.records())).toHaveLength(2);
    selected.set('company-2');
    expect(store.companyId()).toBe('company-2');
    expect(store.data().backup).toBe(false);
    selected.set(null);
    expect(store.companyId()).toBe('');
    expect(store.company()).toBeUndefined();
    expect(store.data().people).toEqual([]);
  });
  it('hides all company data after logout without falling back to a sample company', () => {
    authenticated.set(false);
    expect(store.companies()).toEqual([]);
    expect(store.records()).toEqual({});
    expect(store.companyId()).toBe('');
    expect(store.data().people).toEqual([]);
  });
  it('preserves other company records when an assigned company is edited', () => {
    store.update((data) => ({ ...data, backup: false }));
    const saved = JSON.parse(localStorage.getItem('cv_api_company_data_v1')!);
    expect(saved['company-1'].backup).toBe(false);
    expect(saved['company-2']).toBeDefined();
  });
  it('does not reuse legacy demo company details or records for an API company with the same id', () => {
    expect(store.company()?.name).toBe('Company One');
    expect(store.company()?.sector).toBe('');
    expect(store.company()?.registration).toBe('');
    expect(store.company()?.modules).toEqual([]);
    expect(store.data().people).toEqual([]);
    window.dispatchEvent(new StorageEvent('storage', { key: 'cv_management_v1' }));
    expect(store.data().people).toEqual([]);
  });
});
