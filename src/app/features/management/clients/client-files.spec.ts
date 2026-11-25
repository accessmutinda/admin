import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import {
  ActivatedRoute,
  convertToParamMap,
  NavigationEnd,
  provideRouter,
  Router,
} from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BehaviorSubject, filter, firstValueFrom } from 'rxjs';
import { routes } from '../../../app.routes';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { ApiError } from '../../../core/auth/auth-api';
import { ManagementStore } from '../shared/management.store';
import { RotaService } from '../rota/rota.service';
import { ServiceUsersApi } from './service-users-api.service';
import { ServiceUser, ServiceUserOverview } from './service-users.generated';
import { ClientFiles } from './client-files';
import { CLIENT_SECTIONS } from './client-file.models';
function row(): ServiceUser {
  return {
    id: 'user-1',
    company_id: 'north',
    version: 1,
    etag: '"v1"',
    name: 'Alex Citizen',
    reference: 'SU-1',
    address: '1 Real Road',
    postcode: 'AB1 2CD',
    funding: 'Private',
    priority: 'High',
    active: true,
    phone: '0700',
    email: 'alex@example.com',
    details: {
      dob: '1950-01-01',
      preferredName: 'Alex',
      gp: 'North Practice',
      about: 'My routines',
    },
    representative: {
      name: 'Sam',
      relationship: 'Sibling',
      phone: '0701',
      email: 'sam@example.com',
    },
    riskFlags: ['Living alone'],
    photo_id: null,
    primary_needs: [],
    packages: [],
    next_visit: null,
  };
}
function overview(record: ServiceUser = row()): ServiceUserOverview {
  return {
    record,
    workspace: { sections: [], visits: [], visits_read: false },
    care_plan: null,
    family: { approved: '', preferences: '', sharing_consent: '' },
    clinical: {
      primary_diagnosis: 'Recorded diagnosis',
      other_conditions: '',
      allergies: 'Recorded allergy',
      diet: 'Dietary guidance',
      ongoing: '',
      equipment: 'Walking frame',
      mobility_support: 'One person',
      mobility_instructions: 'Support with transfers',
      communication: 'Speak clearly',
      hearing: '',
      vision: '',
      sensory: '',
      decision_support: 'Give time to respond',
      welfare_lpa: 'Named attorney',
      finance_lpa: '',
      personal: 'Morning support',
      nutrition: 'Regular drinks',
      continence: '',
      safety: '',
      behaviour: '',
      continuity: 'Familiar team',
      key_safe_location: '',
    },
    capacity: { status: 'Has capacity', assessed_on: '2026-11-01', reason: 'Recorded assessment' },
    medication_reference: 'Recorded medicine reference',
    medication_read: true,
    medication_edit: true,
    risks: [],
    risks_read: true,
    services_read: true,
    local_date: '2026-11-10',
  };
}

async function settle(fixture?: ComponentFixture<unknown>) {
  for (let i = 0; i < 5; i++) {
    TestBed.tick();
    fixture?.detectChanges();
    await fixture?.whenStable();
    await Promise.resolve();
  }
  fixture?.detectChanges();
}
describe('Service user record navigation and persistence', () => {
  let company: ReturnType<typeof signal<string>>,
    grant: ReturnType<typeof signal<boolean>>,
    request: ReturnType<typeof vi.fn>,
    api: ServiceUsersApi;
  beforeEach(() => {
    company = signal('north');
    grant = signal(true);
    const params = new BehaviorSubject(convertToParamMap({ id: 'user-1' }));
    request = vi.fn(async () => overview());
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: params,
            queryParamMap: new BehaviorSubject(convertToParamMap({})),
            snapshot: { paramMap: params.value, queryParamMap: convertToParamMap({}), data: {} },
          },
        },
        {
          provide: AuthService,
          useValue: {
            profile: () => ({ id: 'actor' }),
            currentUser: () => ({ roleCode: 'CA' }),
            workspaces: () => [{ id: company(), name: 'Current company' }],
            api: request,
          },
        },
        {
          provide: CompanyAccessService,
          useValue: {
            companyId: company,
            context: () => null,
            can: () => grant(),
            canPath: () => grant(),
          },
        },
        {
          provide: ManagementStore,
          useValue: {
            companyId: company,
            company: () => ({ id: company(), name: 'Current company' }),
            staff: () => [],
          },
        },
        {
          provide: RotaService,
          useValue: {
            can: () => grant(),
            data: () => {
              throw Error('Record navigation must not use browser records');
            },
          },
        },
      ],
    });
    api = TestBed.inject(ServiceUsersApi);
    TestBed.tick();
  });
  it('renders all grouped sections using the saved company record', async () => {
    const fixture = TestBed.createComponent(ClientFiles);
    await settle(fixture);
    const component = fixture.componentInstance as any;
    for (const section of CLIENT_SECTIONS) {
      component.setSection(section.key);
      await settle(fixture);
      expect(fixture.nativeElement.textContent).toContain('Alex Citizen');
      expect(fixture.nativeElement.querySelector('.client-content').textContent).toContain(
        section.key === 'overview' ? 'What matters to me' : section.label,
      );
    }
  });
  it('opens every client module using the current service user identifier', async () => {
    const fixture = TestBed.createComponent(ClientFiles);
    await settle(fixture);
    const links = [
      ...fixture.nativeElement.querySelectorAll('a[href*="/manage/clients/"]'),
    ] as HTMLAnchorElement[];
    expect(links.length).toBeGreaterThan(4);
    expect(links.every((link) => link.getAttribute('href')!.includes('/user-1'))).toBe(true);
  });
  it('routes the Service Users breadcrumb to the directory and Documents to the selected user register', async () => {
    const router = TestBed.inject(Router);
    const managementRoutes = routes.find((route) => route.path === 'manage')!.children!;
    router.resetConfig([
      {
        path: 'manage',
        children: managementRoutes.filter((route) =>
          ['clients', 'clients/:id'].includes(route.path!),
        ),
      },
    ]);
    request.mockImplementation(async (path: string) =>
      path.includes('/documents?')
        ? { company_id: 'north', service_user_id: 'user-1', results: [], next: null }
        : overview(),
    );
    const profileUrl = '/manage/clients/user-1';
    const harness = await RouterTestingHarness.create(profileUrl);
    const follow = async (link: HTMLAnchorElement) => {
      const navigation = firstValueFrom(
        router.events.pipe(filter((event) => event instanceof NavigationEnd)),
      );
      link.click();
      const destination = await navigation;
      await settle(harness.fixture);
      return destination.urlAfterRedirects;
    };
    await settle(harness.fixture);
    const breadcrumb = harness.routeNativeElement!.querySelector<HTMLAnchorElement>(
      'nav[aria-label="Breadcrumb"] a',
    )!;
    expect(breadcrumb.textContent?.trim()).toBe('Service Users');
    expect(await follow(breadcrumb)).toBe('/manage/clients');
    expect(harness.routeNativeElement!.querySelector('h1')?.textContent).toBe('Service Users');

    await harness.navigateByUrl(profileUrl, ClientFiles);
    await settle(harness.fixture);
    const workspace = harness.routeNativeElement!.querySelector(
      'nav[aria-label="Service user workspace"]',
    )!;
    const more = workspace.querySelector<HTMLButtonElement>(
      'button[aria-label="More service-user sections"]',
    );
    if (more) {
      more.click();
      harness.detectChanges();
    }
    const documents = [...workspace.querySelectorAll<HTMLAnchorElement>('a')].find(
      (link) => link.lastChild?.textContent?.trim() === 'Documents',
    )!;
    expect(await follow(documents)).toBe(`${profileUrl}/documents`);
    expect(
      harness.routeNativeElement!.querySelector('[aria-label="Documents register"]'),
    ).not.toBeNull();
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('/service-users/user-1/documents?'),
      undefined,
      undefined,
      undefined,
      'json',
    );
  });
  it('does not imply recorded consent or clinical assessment when source fields are empty', async () => {
    const value = overview();
    value.clinical.allergies = '';
    value.capacity.status = '';
    value.family.sharing_consent = '';
    request.mockResolvedValue(value);
    const fixture = TestBed.createComponent(ClientFiles);
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('Not recorded');
    expect(fixture.nativeElement.textContent).not.toContain('Consent given');
  });
  it('uses the recorded revision when saving a clinical section', async () => {
    await api.detail('user-1');
    const original = api.selected()!;
    await api.saveRecordSection({ status: 'Given' }, original, '"v3"', api.scope(), 'consent');
    expect(request).toHaveBeenLastCalledWith(
      '/companies/north/service-users/user-1/record-sections/consent',
      { status: 'Given' },
      'PATCH',
      { 'If-Match': '"v3"' },
    );
  });
  it('uses a separate retry identity when adding a record entry', async () => {
    await api.detail('user-1');
    const original = api.selected()!;
    await api.saveRecordSection(
      { name: 'Mobility diagnosis' },
      original,
      '"v3"',
      api.scope(),
      'diagnoses',
      null,
      'entry-retry',
    );
    expect(request).toHaveBeenLastCalledWith(
      '/companies/north/service-users/user-1/record-sections/diagnoses/entries',
      { name: 'Mobility diagnosis' },
      'POST',
      { 'If-Match': '"v3"', 'Idempotency-Key': 'entry-retry' },
    );
  });
  it('keeps the selected record when a stale write is rejected', async () => {
    await api.detail('user-1');
    const original = api.selected()!;
    request.mockRejectedValueOnce(new ApiError('Reload the changed record.', 412, 'stale_version'));
    await expect(
      api.saveRecordSection({ status: 'Given' }, original, original.etag, api.scope(), 'consent'),
    ).rejects.toThrow('Reload');
    expect(api.selected()).toBe(original);
  });
  it('rejects writes after changing company without sending a request', async () => {
    await api.detail('user-1');
    const original = api.selected()!,
      scope = api.scope();
    company.set('south');
    request.mockClear();
    await expect(
      api.saveRecordSection({}, original, original.etag, scope, 'consent'),
    ).rejects.toThrow('workspace changed');
    expect(request).not.toHaveBeenCalled();
  });
  it('rejects a revoked section permission without sending a request', async () => {
    await api.detail('user-1');
    const original = api.selected()!;
    grant.set(false);
    request.mockClear();
    await expect(
      api.saveRecordSection({}, original, original.etag, api.scope(), 'consent'),
    ).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
  it('does not apply a late record from a previous company', async () => {
    let resolve!: (value: unknown) => void;
    request.mockImplementation(() => new Promise((done) => (resolve = done)));
    const pending = api.detail('user-1');
    company.set('south');
    TestBed.tick();
    resolve(overview());
    await pending;
    expect(api.selected()).toBeNull();
  });
  it('clears a record that is no longer available', async () => {
    await api.detail('user-1');
    request.mockRejectedValueOnce(new ApiError('Record unavailable.', 404, 'not_found'));
    await api.detail('user-1');
    expect(api.selected()).toBeNull();
    expect(api.error()).toContain('unavailable');
  });
});
