import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/ui/toast.service';
import { ManagementStore } from '../shared/management.store';
import { CompaniesApiService } from './companies-api.service';
import { CompanyContactsApiService } from './company-contacts-api.service';
import { CompanyContactsPage } from './company-contacts';
import { CompanyContacts, emptyCompanyContacts } from './company-contacts.models';
const stored: CompanyContacts = emptyCompanyContacts({});
stored.primary = {
  mainPhone: '020 1234 5678',
  secondaryPhone: '',
  generalEmail: 'care@example.com',
  billingEmail: 'billing@example.com',
  website: 'https://example.com',
  emergencyContact: 'Jane Smith',
  outOfHoursNumber: '',
};
for (const kind of ['registered', 'headOffice', 'billing'] as const)
  stored.addresses[kind] = {
    line1: `Stored ${kind} Road`,
    line2: '',
    city: 'London',
    county: '',
    postcode: 'SW1A 1AA',
    country: 'United Kingdom',
  };
stored.keyContacts = [
  {
    id: 'contact-1',
    category: 'Registered Manager',
    name: 'Stored Manager',
    role: 'Manager',
    email: 'manager@example.com',
    phone: '020 1234 5678',
    active: true,
  },
];
describe('Contact information from the backend', () => {
  let service: { load: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    localStorage.clear();
    service = {
      load: vi.fn().mockResolvedValue(structuredClone(stored)),
      save: vi.fn(async (_id, value) => structuredClone(value)),
    };
    const params = convertToParamMap({ id: 'company-1' });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: params }, paramMap: of(params) },
        },
        {
          provide: AuthService,
          useValue: { profile: () => ({ id: 'admin' }), canAccessCompany: () => true },
        },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
        {
          provide: ManagementStore,
          useValue: {
            companies: () => [
              {
                id: 'company-1',
                name: 'Stored Care',
                code: 'STORED',
                registration: '12345678',
                modules: [],
                active: true,
              },
            ],
          },
        },
        {
          provide: CompaniesApiService,
          useValue: {
            loading: () => false,
            loaded: () => true,
            detailLoading: () => false,
            detailError: () => '',
            error: () => '',
            load: vi.fn().mockResolvedValue(undefined),
            loadDetail: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    });
    TestBed.overrideComponent(CompanyContactsPage, {
      set: { providers: [{ provide: CompanyContactsApiService, useValue: service }] },
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });
  afterEach(() => vi.restoreAllMocks());
  async function create() {
    const fixture = TestBed.createComponent(CompanyContactsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }
  it('populates saved addresses, primary channels and key contact cards', async () => {
    const fixture = await create();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.textContent).toContain('Stored Manager');
    expect((root.querySelector('#primary-mainPhone') as HTMLInputElement).value).toBe(
      '020 1234 5678',
    );
    expect((root.querySelector('#primary-emergencyContact') as HTMLInputElement).value).toBe(
      'Jane Smith',
    );
    expect(
      [...root.querySelectorAll('input')].some((input) => input.value === 'Stored headOffice Road'),
    ).toBe(true);
    expect(root.textContent).not.toContain('Details checked locally');
  }, 30000);
  it('keeps the contact layout visible as skeletons while its response is pending', async () => {
    let complete!: (value: CompanyContacts) => void;
    service.load.mockReturnValue(new Promise((resolve) => (complete = resolve)));
    const fixture = TestBed.createComponent(CompanyContactsPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('cv-company-loading')).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('Primary Contact Details');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    complete(structuredClone(stored));
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('cv-company-loading')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Stored Manager');
  });

  it('saves partial setup and retains edits after a failed save', async () => {
    const fixture = await create();
    const page = fixture.componentInstance as any;
    page.draft.primary.mainPhone = '';
    page.draft.addresses.headOffice.line1 = '';
    service.save.mockRejectedValueOnce(new Error('Newer changes exist. Reload and retry.'));
    await page.save();
    expect(page.draft.primary.mainPhone).toBe('');
    expect(page.hasChanges()).toBe(true);
    expect(page.saveError()).toContain('Newer changes');
    await page.save();
    expect(service.save).toHaveBeenLastCalledWith(
      'company-1',
      expect.objectContaining({ primary: expect.objectContaining({ mainPhone: '' }) }),
    );
    expect(page.hasChanges()).toBe(false);
  });
  it('stages address and contact deletions until Save Changes', async () => {
    const fixture = await create();
    const page = fixture.componentInstance as any;
    page.clearAddress('registered');
    page.removeContact('contact-1');
    page.clearPrimary();
    expect(service.save).not.toHaveBeenCalled();
    expect(page.draft.keyContacts).toEqual([]);
    expect(page.draft.addresses.registered.line1).toBe('');
    await page.save();
    expect(service.save).toHaveBeenCalled();
    expect(page.hasChanges()).toBe(false);
  });
  it('honours cancelled deletions and does not treat local format checks as saved business data', async () => {
    const fixture = await create();
    const page = fixture.componentInstance as any;
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    page.removeContact('contact-1');
    expect(page.draft.keyContacts).toHaveLength(1);
    page.checkAddress('registered');
    expect(page.isChecked('registered')).toBe(true);
    expect(page.hasChanges()).toBe(false);
    expect(page.draft.addressChecks).toEqual({});
  });
  it('shows a retry state without presenting blank inputs after a read failure', async () => {
    service.load.mockRejectedValueOnce(new Error('Contact information unavailable.'));
    const fixture = await create();
    expect(fixture.nativeElement.textContent).toContain('Contact information unavailable.');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    await (fixture.componentInstance as any).load();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Stored Manager');
  });
});
