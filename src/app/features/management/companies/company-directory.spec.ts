import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { ToastService } from '../../../shared/ui/toast.service';
import { Company, ManagementStore } from '../shared/management.store';
import { emptyCompanyContacts } from './company-contacts.models';
import { initialSubscription } from './company-modules.models';
import { Companies } from './companies';
import { CompanyDirectory } from './company-directory';

@Component({ template: '' })
class EmptyPage {}
interface DirectoryEditor {
  search(): string;
  setSearch(value: string): void;
  setFilter(key: string, value: string): void;
  clearFilters(): void;
  filtered(): Company[];
  sorted(): Company[];
  rows(): Company[];
  stats(): { value: number }[];
  page: { set(value: number): void };
  currentPage(): number;
  pageCount(): number;
  selectedIds(): string[];
  allPageSelected(): boolean;
  somePageSelected(): boolean;
  toggle(id: string): void;
  togglePage(): void;
  sort(key: string): void;
  exportList(selected?: boolean): void;
  changeStatus(active: boolean, ids?: string[]): void;
  error(): string;
}
describe('Company directory', () => {
  let store: ManagementStore;
  let harness: RouterTestingHarness;
  const toast = { success: vi.fn(), info: vi.fn(), error: vi.fn() };
  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'manage/companies/directory', component: CompanyDirectory },
          { path: 'manage/companies/new', component: EmptyPage },
          { path: 'manage/companies/:id', component: EmptyPage },
          { path: 'manage/companies', component: Companies },
        ]),
        { provide: ToastService, useValue: toast },
      ],
    });
    TestBed.inject(AuthService).signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    store = TestBed.inject(ManagementStore);
    harness = await RouterTestingHarness.create();
    vi.clearAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());
  function populate(count = 24) {
    const base = store.company()!;
    const all = Array.from({ length: count }, (_, i) => {
      const contacts = emptyCompanyContacts(base);
      contacts.addresses.registered.county = i % 2 ? 'Kent' : 'London';
      contacts.addresses.registered.city = i % 2 ? 'Maidstone' : 'London';
      const subscription = initialSubscription();
      subscription.plan = i % 2 ? 'Professional' : 'Not recorded';
      return {
        ...base,
        id: i === 0 ? 'lqcs' : 'directory-' + i,
        name: 'Care Company ' + String(i + 1).padStart(2, '0'),
        code: 'CC-' + i,
        sector: i % 2 ? 'Residential care' : 'Domiciliary care',
        active: i % 3 !== 0,
        logo: i % 4 === 0 ? '/brand/company-logo.png' : '',
        registration: i % 4 === 2 ? '' : base.registration,
        postcode: i % 4 === 2 ? '' : base.postcode,
        contacts,
        subscription,
        modifiedAt: i % 5 === 0 ? undefined : new Date(Date.now() - i * 2 * 86400000).toISOString(),
      };
    });
    store.companies.set(all);
    return all;
  }
  async function open(query = '') {
    return (await harness.navigateByUrl(
      '/manage/companies/directory' + query,
      CompanyDirectory,
    )) as unknown as DirectoryEditor;
  }
  it('shows a five-company preview and opens the full directory', async () => {
    populate();
    await harness.navigateByUrl('/manage/companies', Companies);
    expect(harness.routeNativeElement!.querySelectorAll('tbody tr')).toHaveLength(5);
    const link = harness.routeNativeElement!.querySelector(
      'a[href="/manage/companies/directory"]',
    ) as HTMLAnchorElement;
    expect(link).toBeTruthy();
    link.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/manage/companies/directory');
    expect(harness.routeNativeElement!.querySelectorAll('tbody tr')).toHaveLength(10);
    expect(harness.routeNativeElement!.textContent).toContain('Companies (24)');
  });
  it('paginates the entire list and calculates real overview totals', async () => {
    populate();
    const editor = await open();
    expect(editor.filtered()).toHaveLength(24);
    expect(editor.pageCount()).toBe(3);
    expect(editor.stats().map((s) => s.value)).toEqual([24, 16, 6, 8]);
    const seen = new Set<string>();
    for (const page of [1, 2, 3]) {
      editor.page.set(page);
      for (const row of editor.rows()) seen.add(row.id);
    }
    expect(seen.size).toBe(24);
    editor.page.set(1);
    expect(editor.rows()).toHaveLength(10);
    editor.page.set(2);
    expect(editor.rows()).toHaveLength(10);
    editor.page.set(3);
    expect(editor.rows()).toHaveLength(4);
    expect(harness.routeNativeElement!.querySelector('[aria-label="Rows per page"]')).toBeNull();
  });
  it('combines real location, plan, service and status filters and resets them', async () => {
    populate();
    const editor = await open();
    editor.setFilter('region', 'Kent');
    expect(editor.filtered()).toHaveLength(12);
    editor.setFilter('service', 'Residential care');
    editor.setFilter('plan', 'Professional');
    editor.setFilter('status', 'inactive');
    expect(editor.filtered()).toHaveLength(4);
    editor.clearFilters();
    expect(editor.filtered()).toHaveLength(24);
    editor.setFilter('completion', 'pending');
    expect(editor.filtered()).toHaveLength(6);
    editor.clearFilters();
    editor.setFilter('completion', 'complete');
    expect(editor.filtered()).toHaveLength(6);
    editor.clearFilters();
    editor.setFilter('updated', '7');
    expect(editor.filtered()).toHaveLength(3);
    editor.clearFilters();
    editor.setFilter('updated', 'missing');
    expect(editor.filtered()).toHaveLength(5);
  });
  it('searches saved admin and address details without leaking workspace users', async () => {
    const all = populate();
    const editor = await open();
    const admin = store.data().members.find((m) => m.role === 'Company Admin')!;
    editor.setSearch(admin.name.toUpperCase());
    expect(editor.filtered().map((c) => c.id)).toEqual(['lqcs']);
    editor.setSearch('  maidstone  ');
    expect(editor.filtered()).toHaveLength(12);
    editor.setSearch(all[10].code);
    expect(editor.filtered().map((c) => c.id)).toEqual([all[10].id]);
    const first = store.companies()[0];
    store.companies.update((companies) =>
      companies.map((c) => (c.id === first.id ? { ...c, contacts: undefined } : c)),
    );
    editor.clearFilters();
    editor.setFilter('region', 'missing');
    expect(editor.filtered().map((c) => c.id)).toEqual(['lqcs']);
  });
  it('honours search passed from the setup preview', async () => {
    populate();
    const editor = await open('?search=Care%20Company%2024');
    expect(editor.search()).toBe('Care Company 24');
    expect(editor.filtered()).toHaveLength(1);
  });
  it('sorts names and completion and leaves missing dates last', async () => {
    populate();
    const editor = await open();
    editor.sort('name');
    expect(editor.sorted()[0].name).toBe('Care Company 24');
    editor.sort('completion');
    editor.sort('completion');
    expect(editor.sorted()[0].logo).toBeTruthy();
    editor.sort('modifiedAt');
    editor.sort('modifiedAt');
    expect(editor.sorted().at(-1)!.modifiedAt).toBeUndefined();
    harness.detectChanges();
    expect(
      harness.routeNativeElement!.querySelector('th[aria-sort="descending"]')?.textContent,
    ).toContain('Last Updated');
  });
  it('selects across pages and clears selections when filtering', async () => {
    populate();
    const editor = await open();
    editor.togglePage();
    expect(editor.selectedIds()).toHaveLength(10);
    expect(editor.allPageSelected()).toBe(true);
    editor.page.set(2);
    editor.toggle(editor.rows()[0].id);
    expect(editor.somePageSelected()).toBe(true);
    expect(editor.selectedIds()).toHaveLength(11);
    editor.togglePage();
    expect(editor.selectedIds()).toHaveLength(20);
    editor.setFilter('status', 'active');
    expect(editor.selectedIds()).toHaveLength(0);
    expect(editor.currentPage()).toBe(1);
  });
  it('exports all filtered rows or just selected rows with safe CSV quoting', async () => {
    const all = populate();
    all[0] = { ...all[0], name: '=SUM(1,1)' };
    all[1] = { ...all[1], name: 'Care, "One"' };
    store.companies.set(all);
    const editor = await open();
    const download = vi.spyOn(store, 'download').mockImplementation(() => {});
    editor.exportList();
    const csv = download.mock.calls[0][1];
    expect(csv.split('\r\n')).toHaveLength(25);
    expect(csv).toContain('"\'=SUM(1,1)"');
    expect(csv).toContain('"Care, ""One"""');
    editor.toggle(all[0].id);
    editor.exportList(true);
    expect(download.mock.calls[1][0]).toBe('selected-companies.csv');
    expect(download.mock.calls[1][1].split('\r\n')).toHaveLength(2);
    editor.setFilter('status', 'active');
    editor.exportList();
    expect(download.mock.calls[2][1].split('\r\n')).toHaveLength(17);
  });
  it('confirms and atomically saves selected statuses while preserving records', async () => {
    const all = populate();
    const records = structuredClone(store.records());
    const editor = await open();
    editor.setFilter('updated', '7');
    const ids = [all[1].id, all[2].id];
    for (const id of ids) editor.toggle(id);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    editor.changeStatus(false);
    expect(editor.selectedIds()).toHaveLength(2);
    expect(store.companies()[1].active).toBe(true);
    confirm.mockReturnValue(true);
    editor.changeStatus(false);
    expect(editor.selectedIds()).toHaveLength(0);
    expect(editor.filtered().map((company) => company.id)).toEqual(expect.arrayContaining(ids));
    for (const id of ids) {
      const row = store.companies().find((c) => c.id === id)!;
      expect(row.active).toBe(false);
      expect(row.modules).toEqual(all[1].modules);
      expect(row.modifiedBy).toBe('Jane Doe');
      expect(Number.isFinite(Date.parse(row.modifiedAt!))).toBe(true);
    }
    expect(store.companies()[3]).toEqual(all[3]);
    expect(store.records()).toEqual(records);
    expect(JSON.parse(localStorage.getItem('cv_companies_v1')!)[1].active).toBe(false);
  });
  it('preserves selected companies and saved state if a bulk write fails', async () => {
    const all = populate();
    const editor = await open();
    editor.toggle(all[1].id);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Full');
    });
    editor.changeStatus(false);
    expect(editor.error()).toContain('could not be saved');
    expect(editor.selectedIds()).toHaveLength(1);
    expect(store.companies()).toEqual(all);
    expect(toast.success).not.toHaveBeenCalled();
  });
  it('rejects stale selections without applying a partial bulk update', async () => {
    const all = populate();
    expect(store.setCompaniesActive([all[0].id, 'removed-company'], false, 'Admin')).toBe(false);
    expect(store.companies()).toEqual(all);
  });
  it('renders empty and filtered-empty states with correct zero counts', async () => {
    populate();
    const editor = await open();
    editor.setSearch('unmatched company');
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('No matching companies');
    expect(editor.currentPage()).toBe(1);
    store.companies.set([]);
    editor.clearFilters();
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('No companies yet');
    expect(editor.stats().map((s) => s.value)).toEqual([0, 0, 0, 0]);
  });
});
