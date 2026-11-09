import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { CompaniesApiService } from './companies-api.service';
import { CompanyDetail } from './companies-api.models';
import { ToastService } from '../../../shared/ui/toast.service';
import { ManagementStore } from '../shared/management.store';
import { CompanyProfile } from './company-profile';

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
  let queryEdit = false;
  let loadDetail: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    localStorage.clear();
    details.set({ [detail.id]: structuredClone(detail) });
    error.set('');
    pending.set(false);
    params.next(convertToParamMap({ id: detail.id }));
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
            isSuperAdmin: () => true,
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
  it('prefills direct edit links with the loaded profile and preserves an unlisted saved select value', async () => {
    details.set({ [detail.id]: { ...detail, service_type: 'Stored specialised care' } });
    queryEdit = true;
    const fixture = create();
    await fixture.whenStable();
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect((root.querySelector('#input-name') as HTMLInputElement).value).toBe('Stored Care');
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
