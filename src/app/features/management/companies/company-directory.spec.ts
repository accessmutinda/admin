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
  exportList(): void;
  error(): string;
}
describe('Original company directory with backend data', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CompaniesApiService, useValue: { loading: () => false, error: () => '' } },
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
        { provide: AuthService, useValue: { currentUser: () => ({ name: 'API User' }) } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    });
  });
  function open() {
    const fixture = TestBed.createComponent(CompanyDirectory);
    fixture.detectChanges();
    return { fixture, editor: fixture.componentInstance as unknown as Directory };
  }
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
  it('keeps unsupported controls in place without fabricating an export or missing data', () => {
    const { fixture, editor } = open();
    editor.exportList();
    fixture.detectChanges();
    expect(editor.error()).toContain('not supported by the backend');
    editor.setFilter('completion', 'pending');
    expect(editor.error()).toContain('backend does not return');
    expect(fixture.nativeElement.querySelector('button')).not.toBeNull();
  });
});
