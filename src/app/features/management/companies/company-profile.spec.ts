import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { CompaniesApiService } from './companies-api.service';
import { CompanyDetail } from './companies-api.models';
import { ToastService } from '../../../shared/ui/toast.service';
import { ManagementStore } from '../shared/management.store';
import { CompanyProfile } from './company-profile';
import { CompanyComplianceApiService } from './company-compliance-api.service';
import { COMPLIANCE_DOCUMENTS } from './company-compliance.models';

const detail: CompanyDetail = {
  id: 'company-1',
  name: 'Stored Care',
  code: 'STORED',
  lifecycle: 'active',
  version: 3,
  etag: '"v3"',
  trading_name: 'Stored Trading',
  description: 'Care description from the database.',
  service_type: 'Domiciliary care',
  staff_size_band: '11–50 staff',
  registration_number: '12345678',
  date_established: '2010-03-15',
  head_office_name: 'Main office',
  registered_places: 0,
  primary_language: 'English',
  enabled_modules: ['hr'],
  head_office_address: {
    line1: '10 Stored Road',
    line2: 'First Floor',
    city: 'London',
    county: '',
    postcode: 'SW1A 1AA',
    country: 'United Kingdom',
  },
  updated_at: '2026-11-07T10:00:00Z',
  updated_by: { id: 'actor', name: 'Actual Administrator' },
  profile_completion_percent: 57,
};

describe('Company profile from the API', () => {
  const details = signal<Record<string, CompanyDetail>>({});
  const error = signal('');
  const pending = signal(false);
  const params = new BehaviorSubject(convertToParamMap({ id: detail.id }));
  const queryParams = new BehaviorSubject(convertToParamMap({}));
  let queryEdit = false;
  let loadDetail: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    localStorage.clear();
    details.set({ [detail.id]: structuredClone(detail) });
    error.set('');
    pending.set(false);
    params.next(convertToParamMap({ id: detail.id }));
    queryParams.next(convertToParamMap({}));
    queryEdit = false;
    loadDetail = vi.fn(async () => {
      details.set({ [detail.id]: detail });
      error.set('');
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: params.asObservable(),
            queryParamMap: queryParams.asObservable(),
            snapshot: {
              paramMap: convertToParamMap({ id: detail.id }),
              get queryParamMap() {
                return convertToParamMap(queryEdit ? { edit: 'true' } : {});
              },
            },
          },
        },
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => false,
            isSuperAdmin: () => true,
            currentUser: () => ({ name: 'Actual Administrator' }),
            canAccessCompany: () => true,
            profile: () => ({ id: 'admin', company_entry_state: 'platform' }),
            session: () => ({ workspaceId: detail.id }),
          },
        },
        {
          provide: CompaniesApiService,
          useValue: {
            scope: () => 'scope',
            ensureLoaded: () => Promise.resolve(),
            companies: () => [
              { id: detail.id, name: 'Summary name', code: 'STORED', lifecycle: 'active' },
            ],
            details,
            loading: () => false,
            loaded: () => true,
            error: () => '',
            detailLoading: pending,
            detailError: () => error(),
            loadDetail,
            updateDetail: vi.fn().mockResolvedValue(detail),
            changeLifecycle: vi.fn().mockResolvedValue(undefined),
            brandLogo: () => '',
            ensureBrandLogo: () => Promise.resolve(),
          },
        },
      ],
    });
  });
  function create() {
    const fixture = TestBed.createComponent(CompanyProfile);
    fixture.detectChanges();
    return fixture;
  }
  it('populates the read-only profile from stored facts, including zero places and audit actor', () => {
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;
    for (const value of [
      'Stored Care',
      'Stored Trading',
      detail.description!,
      '12345678',
      'Main office',
      'English',
      '10 Stored Road',
      'SW1A 1AA',
      'Actual Administrator',
    ])
      expect(root.textContent).toContain(value);
    expect(root.querySelector('#profile-registeredPlaces dd')?.textContent?.trim()).toBe('0');
    expect(root.querySelector('#profile-establishedDate dd')?.textContent).toContain('15 Mar 2010');
    expect(root.textContent).not.toContain('Summary name');
  });
  it('marks Registration & Compliance complete from the saved setup record', () => {
    details.set({
      [detail.id]: {
        ...detail,
        setup_progress: { registration: { complete: true, state: 'complete', missing: [] } },
      },
    });
    const fixture = create();
    const row = [...fixture.nativeElement.querySelectorAll('.cp-required-sections li')].find(
      (item) => item.textContent?.includes('Registration & Compliance'),
    );
    expect(row?.textContent).toContain('Complete');
    expect(row?.querySelector('.co-check-status.complete')).toBeTruthy();
  });
  it('marks Contact Information complete from the saved setup record', () => {
    details.set({
      [detail.id]: {
        ...detail,
        setup_progress: { contacts: { complete: true, state: 'complete', missing: [] } },
      },
    });
    const fixture = create();
    const row = [...fixture.nativeElement.querySelectorAll('.cp-required-sections li')].find(
      (item) => item.textContent?.includes('Contact Information'),
    );
    expect(row?.textContent).toContain('Complete');
    expect(row?.querySelector('.co-check-status.complete')).toBeTruthy();
  });
  it('keeps Roles & Permissions pending until a company admin is active', () => {
    details.set({
      [detail.id]: {
        ...detail,
        setup_progress: {
          access: { complete: false, state: 'in_progress', missing: ['company_admin'] },
        },
      },
    });
    const fixture = create();
    const row = [...fixture.nativeElement.querySelectorAll('.cp-required-sections li')].find(
      (item) => item.textContent?.includes('Roles & Permissions'),
    );
    expect(row?.textContent).toContain('Pending');
    expect(fixture.nativeElement.textContent).toContain('required sections');
  });
  it('marks Branches & Locations complete from the saved setup record', () => {
    details.set({
      [detail.id]: {
        ...detail,
        setup_progress: { locations: { complete: true, state: 'complete', missing: [] } },
      },
    });
    const fixture = create();
    const row = [...fixture.nativeElement.querySelectorAll('.cp-required-sections li')].find(
      (item) => item.textContent?.includes('Branches & Locations'),
    );
    expect(row?.textContent).toContain('Complete');
  });
  it('marks Documents & Policies complete from the saved evidence', async () => {
    const document = {
      name: 'certificate.pdf',
      type: 'application/pdf',
      size: 10,
      content: '',
      uploadedAt: '2026-11-01T00:00:00Z',
      uploadedBy: 'Hussein',
      owner: 'Hussein',
      expiry: '2027-06-18',
      scanState: 'verified',
    };
    TestBed.overrideComponent(CompanyProfile, {
      set: {
        providers: [
          {
            provide: CompanyComplianceApiService,
            useValue: {
              load: async () => ({
                documents: Object.fromEntries(
                  COMPLIANCE_DOCUMENTS.map(({ key }) => [key, document]),
                ),
              }),
            },
          },
        ],
      },
    });
    const fixture = create();
    await fixture.whenStable();
    fixture.detectChanges();
    const row = [...fixture.nativeElement.querySelectorAll('.cp-required-sections li')].find(
      (item) => item.textContent?.includes('Documents & Policies'),
    );
    expect(row?.textContent).toContain('Complete');
  });
  it('scores profile completion as an equal share of the required sections', async () => {
    const document = {
      name: 'certificate.pdf',
      type: 'application/pdf',
      size: 10,
      content: '',
      uploadedAt: '2026-11-01T00:00:00Z',
      uploadedBy: 'Hussein',
      owner: 'Hussein',
      expiry: '2027-06-18',
      scanState: 'verified',
    };
    TestBed.overrideComponent(CompanyProfile, {
      set: {
        providers: [
          {
            provide: CompanyComplianceApiService,
            useValue: {
              load: async () => ({
                documents: Object.fromEntries(
                  COMPLIANCE_DOCUMENTS.map(({ key }) => [key, document]),
                ),
              }),
            },
          },
        ],
      },
    });
    details.set({
      [detail.id]: {
        ...detail,
        setup_progress: {
          general: { complete: true, state: 'complete' },
          registration: { complete: true, state: 'complete' },
          contacts: { complete: true, state: 'complete' },
          locations: { complete: true, state: 'complete' },
          modules: { complete: true, state: 'complete' },
          access: { complete: false, state: 'in_progress', missing: ['company_admin'] },
        },
      },
    });
    const fixture = create();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.cp-completion-value')?.textContent).toContain(
      '86%',
    );
  });
  it('prefills direct edit links with the loaded profile and preserves an unlisted saved select value', async () => {
    details.set({ [detail.id]: { ...detail, service_type: 'Stored specialised care' } });
    queryEdit = true;
    const fixture = create();
    await fixture.whenStable();
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect((root.querySelector('#input-name') as HTMLInputElement).value).toBe('Stored Care');
    expect((root.querySelector('#input-registration') as HTMLInputElement).value).toBe('12345678');
    expect((root.querySelector('#input-description') as HTMLTextAreaElement).value).toBe(
      detail.description,
    );
    expect((root.querySelector('#input-registeredPlaces') as HTMLInputElement).value).toBe('0');
    expect((root.querySelector('#input-establishedDate') as HTMLInputElement).value).toBe(
      '2010-03-15',
    );
    expect(root.querySelector('#input-sector')?.textContent).toContain('Stored specialised care');
    expect(
      root.querySelector('#profile-headOfficeAddress .cp-managed-address')?.textContent,
    ).toContain('10 Stored Road');
  });
  it('shows a profile skeleton until the detail arrives, then hydrates direct edit fields', async () => {
    pending.set(true);
    details.set({});
    queryEdit = true;
    const fixture = create();
    expect(fixture.nativeElement.querySelector('cv-company-loading')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    details.set({ [detail.id]: detail });
    pending.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('cv-company-loading')).toBeNull();
    expect((fixture.nativeElement.querySelector('#input-name') as HTMLInputElement).value).toBe(
      'Stored Care',
    );
  });
  it('opens edit when the completion link changes query parameters on the current profile', async () => {
    const fixture = create();
    expect(fixture.nativeElement.querySelector('#input-name')).toBeNull();
    queryParams.next(convertToParamMap({ edit: 'true' }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect((fixture.nativeElement.querySelector('#input-name') as HTMLInputElement).value).toBe(
      'Stored Care',
    );
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    (fixture.componentInstance as unknown as { cancel(): void }).cancel();
    expect(navigate).toHaveBeenCalledWith(['/manage/companies', detail.id], {
      queryParams: { edit: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    queryParams.next(convertToParamMap({}));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#input-name')).toBeNull();
    queryParams.next(convertToParamMap({ edit: 'true' }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#input-name')).not.toBeNull();
  });

  it('accepts one registered place when the field supplies it as text', async () => {
    details.set({ [detail.id]: { ...detail, registered_places: 1 } });
    queryEdit = true;
    const fixture = create();
    await fixture.whenStable();
    fixture.detectChanges();
    const page = fixture.componentInstance as unknown as {
      setField: (key: string, value: string) => void;
      save: () => Promise<void>;
    };
    page.setField('registeredPlaces', '1');
    await page.save();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Enter a whole number of 0 or more.');
    expect(TestBed.inject(CompaniesApiService).updateDetail).toHaveBeenCalledWith(
      detail.id,
      expect.objectContaining({ registered_places: 1, name: 'Stored Care', code: 'STORED' }),
    );
  });
  it('saves changes to the registration number and reloads the saved value into edit', async () => {
    queryEdit = true;
    const fixture = create();
    await fixture.whenStable();
    const api = TestBed.inject(CompaniesApiService);
    vi.mocked(api.updateDetail).mockImplementationOnce(async (_id, changes) => {
      const updated = { ...detail, registration_number: changes.registration_number };
      details.set({ [detail.id]: updated });
      return updated;
    });
    const page = fixture.componentInstance as unknown as {
      setField: (key: string, value: string) => void;
      save: () => Promise<void>;
      edit: () => void;
    };
    page.setField('registration', ' SC123456 ');
    await page.save();
    expect(api.updateDetail).toHaveBeenCalledWith(
      detail.id,
      expect.objectContaining({ registration_number: 'SC123456' }),
    );
    page.edit();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(
      (fixture.nativeElement.querySelector('#input-registration') as HTMLInputElement).value,
    ).toBe('SC123456');
  });
  it('keeps genuinely absent values empty instead of substituting sample data', async () => {
    details.set({
      [detail.id]: {
        ...detail,
        description: null,
        registered_places: null,
        head_office_address: null,
        postcode: null,
        date_established: null,
      },
    });
    const fixture = create();
    expect(fixture.nativeElement.querySelector('#profile-description dd').textContent).toContain(
      'Not recorded',
    );
    expect(
      fixture.nativeElement.querySelector('#profile-registeredPlaces dd').textContent,
    ).toContain('Not recorded');
    expect(
      fixture.nativeElement.querySelector('#profile-headOfficeAddress dd').textContent,
    ).toContain('Not recorded');
  });
  it('shows a retryable error instead of presenting a directory summary as an empty profile', async () => {
    details.set({});
    error.set('Profile unavailable.');
    const fixture = create();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(
      'Profile unavailable.',
    );
    expect(fixture.nativeElement.querySelector('dl')).toBeNull();
    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(loadDetail).toHaveBeenCalledWith(detail.id);
    expect(fixture.nativeElement.textContent).toContain('Stored Trading');
  });
  it('uses the newly requested company when route parameters change', async () => {
    const fixture = create();
    vi.spyOn(TestBed.inject(CompaniesApiService), 'companies').mockReturnValue([
      detail,
      { ...detail, id: 'company-2', name: 'Second Care' },
    ]);
    details.set({
      [detail.id]: detail,
      'company-2': {
        ...detail,
        id: 'company-2',
        name: 'Second Care',
        description: 'Second description',
      },
    });
    params.next(convertToParamMap({ id: 'company-2' }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#profile-name dd').textContent).toContain(
      'Second Care',
    );
    expect(fixture.nativeElement.querySelector('#profile-description dd').textContent).toContain(
      'Second description',
    );
    expect(TestBed.inject(ManagementStore).companies()).toHaveLength(2);
  });
});
