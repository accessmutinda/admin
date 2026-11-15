import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { CompaniesApiService } from './companies-api.service';
import { CompanyDirectory } from './company-directory';
import { Company, ManagementStore } from '../shared/management.store';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/ui/toast.service';

const companies: Company[] = Array.from({ length: 12 }, (_, index) => ({
  id: `api-${index}`,
  name: `API Provider ${index}`,
  code: `CODE${index}`,
  active: index % 2 === 0,
  lifecycle: index % 2 ? 'suspended' : 'active',
  apiSummaryOnly: true,
  sector: '',
  size: '',
  registration: '',
  postcode: '',
  color: '',
  accent: '',
  tagline: '',
  logo: '',
  modules: [],
}));
interface Directory {
  rows(): Company[];
  page: ReturnType<typeof signal<number>>;
  pageCount(): number;
  setSearch(value: string): void;
  setFilter(key: string, value: string): void;
  exportList(): Promise<void>;
  error(): string;
}
describe('Original company directory with backend data', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: CompaniesApiService,
          useValue: {
            loading: () => false,
            error: () => '',
            exportDirectory: vi.fn().mockRejectedValue(new Error('Export unavailable.')),
          },
        },
        {
          provide: ManagementStore,
          useValue: {
            companies: () => companies,
            companyId: () => 'api-0',
            records: () => ({}),
            data: () => ({ members: [] }),
            companyWriteError: () => 'Backend support is pending.',
          },
        },
        {
          provide: AuthService,
          useValue: { currentUser: () => ({ name: 'API User' }), isSuperAdmin: () => true },
        },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    });
  });
  function open() {
    const fixture = TestBed.createComponent(CompanyDirectory);
    fixture.detectChanges();
    return { fixture, editor: fixture.componentInstance as unknown as Directory };
  }
  it('shows super admins a setup banner and edit links for incomplete companies', () => {
    vi.spyOn(TestBed.inject(ManagementStore), 'companies').mockReturnValue([
      { ...companies[0], profileCompletion: 100 },
      { ...companies[1], profileCompletion: 43 },
      { ...companies[2], profileCompletion: 71 },
      companies[3],
    ]);
    const { fixture } = open();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('cv-company-setup-banner')?.textContent).toContain(
      'API Provider 1 is 43% complete',
    );
    const links = root.querySelectorAll('tbody a[aria-label^="Complete profile for"]');
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute('href')).toBe(
      '/manage/companies/api-1?edit=true#general-information',
    );
    expect(links[1].getAttribute('href')).toBe(
      '/manage/companies/api-2?edit=true#general-information',
    );
  });
  it('does not add the directory setup prompts for other roles', () => {
    vi.spyOn(TestBed.inject(AuthService), 'isSuperAdmin').mockReturnValue(false);
    vi.spyOn(TestBed.inject(ManagementStore), 'companies').mockReturnValue([
      { ...companies[0], profileCompletion: 43 },
    ]);
    const { fixture } = open();
    expect(fixture.nativeElement.querySelector('cv-company-setup-banner')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[aria-label^="Complete profile for"]')).toBeNull();
  });
  it('keeps every original column, filter and action', () => {
    const { fixture } = open();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelectorAll('thead th')).toHaveLength(11);
    for (const label of [
      'Service Type',
      'Region / County',
      'Profile Completion',
      'Primary Admin',
      'Subscription Plan',
      'Last Updated',
      'Export List',
      'Bulk Actions',
    ])
      expect(root.textContent).toContain(label);
    expect(root.querySelectorAll('tbody tr')).toHaveLength(10);
    expect(root.textContent).toContain('API Provider 0');
    expect(root.textContent).not.toContain('25%');
  });
  it('retains name/code search, active filtering and the original page size', () => {
    const { editor } = open();
    expect(editor.pageCount()).toBe(2);
    editor.page.set(2);
    expect(editor.rows()).toHaveLength(2);
    editor.setSearch('CODE11');
    expect(editor.rows().map((c) => c.id)).toEqual(['api-11']);
    editor.setSearch('');
    editor.setFilter('status', 'active');
    expect(editor.rows()).toHaveLength(6);
  });
  it('displays export failures without claiming a download and applies completion filters', async () => {
    const { fixture, editor } = open();
    await editor.exportList();
    fixture.detectChanges();
    expect(editor.error()).toBe('Export unavailable.');
    editor.setFilter('completion', 'pending');
    expect(editor.rows()).toEqual([]);
    expect(editor.error()).toBe('');
    expect(fixture.nativeElement.querySelector('button')).not.toBeNull();
  });
});
