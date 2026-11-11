import { MatDialog, MatDialogConfig, MAT_DIALOG_DEFAULT_OPTIONS } from '@angular/material/dialog';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { ApiError } from '../../../core/auth/auth-api';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { ManagementStore } from '../shared/management.store';
import { RotaService } from '../rota/rota.service';
import { ToastService } from '../../../shared/ui/toast.service';
import { ClientFiles } from './client-files';
import { ServiceUserDirectory } from '../care/service-user-directory';
import { ServiceUsersApi } from './service-users-api.service';
import {
  ServiceUser,
  ServiceUserPage,
  ServiceUserOverview,
  ServiceUserCarePlan,
  ServiceUserRecordSection,
} from './service-users.generated';
import { RotaClient } from '../rota/rota.models';

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
const unavailable = {
  time_sensitive: 'Visits are not connected.',
  capacity_reviews: 'Capacity sources are not connected.',
  primary_needs: 'Not connected.',
  packages: 'Not connected.',
  next_visit: 'Not connected.',
  high_risk: 'Recorded high priority only.',
};
function page(): ServiceUserPage {
  return {
    count: 17,
    next: null,
    previous: null,
    results: [row()],
    meta: {
      company_id: 'north',
      local_date: '2026-11-10',
      as_of: '2026-11-10T12:00:00Z',
      request_id: 'request',
      filters: {},
      unavailable,
    },
  };
}
function accessContext() {
  return {
    company_id: 'north',
    company_active: true,
    platform: false,
    revision: 1,
    enabled_modules: ['care', 'people'],
    roles: [
      { id: 'role-1', code: 'CA', name: 'Company Admin' },
      { id: 'role-2', code: 'CC', name: 'Coordinator' },
    ],
    permissions: [
      'care.records.read',
      'care.records.create',
      'care.records.edit',
      'care.records.export',
    ],
    core_permissions: [],
    can_manage_modules: false,
    can_manage_roles: false,
    can_create_roles: false,
    request_id: 'access-request-1',
  };
}
async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 4; i++) {
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();
  }
  fixture.detectChanges();
}
describe('Service user landing and creation', () => {
  let company: ReturnType<typeof signal<string>>,
    grant: ReturnType<typeof signal<boolean>>,
    context: ReturnType<typeof signal<ReturnType<typeof accessContext>>>,
    request: ReturnType<typeof vi.fn>,
    browser: ReturnType<typeof vi.fn>,
    params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  beforeEach(() => {
    company = signal('north');
    grant = signal(true);
    context = signal(accessContext());
    browser = vi.fn(() => {
      throw Error('Browser records must not be read by the landing page');
    });
    request = vi.fn(async (path: string, body?: unknown) => {
      if (path.endsWith('/summary'))
        return {
          company_id: company(),
          active: 17,
          high_priority: 3,
          high_risk: null,
          time_sensitive: null,
          capacity_reviews: null,
          unavailable,
          as_of: '2026-11-10T12:00:00Z',
          local_date: '2026-11-10',
        };
      if (path.endsWith('/facets'))
        return {
          company_id: company(),
          needs: [],
          packages: [],
          funding: ['Private'],
          unavailable,
        };
      if (path.includes('/export?'))
        return new Blob(['Name\r\nAlex Citizen\r\n'], { type: 'text/csv' });
      if (path.endsWith('/family')) {
        if (body) {
          const changes = body as Record<string, any>,
            value = overview();
          value.record.representative = {
            name: changes['name'],
            relationship: changes['relationship'],
            phone: changes['phone'],
            email: changes['email'],
          };
          value.family = {
            approved: changes['approved'],
            preferences: changes['preferences'],
            sharing_consent: changes['sharing_consent'],
          };
          value.record.version = 3;
          value.record.etag = '\"v3\"';
          return value;
        }
        return {
          id: 'user-1',
          company_id: 'north',
          version: 2,
          etag: '\"v2\"',
          name: 'Sam Latest',
          relationship: 'Sibling',
          phone: '0701',
          email: 'sam@example.com',
          approved: 'Visit times only',
          preferences: 'Call after 5pm',
          sharing_consent: 'Recorded consent',
          can_edit: true,
        };
      }
      if (path.endsWith('/demographics')) {
        if (body) {
          const source = row(),
            changes = body as Record<string, any>;
          for (const [key, value] of Object.entries(changes)) {
            if (['name', 'reference', 'address', 'postcode', 'phone', 'email'].includes(key))
              (source as any)[key] = value;
            else (source.details as any)[key] = value;
          }
          return overview({ ...source, version: 3, etag: '\"v3\"' });
        }
        return { ...row(), version: 2, etag: '\"v2\"', local_date: '2026-11-10', can_edit: true };
      }
      if (path.endsWith('/overview')) return overview();
      if (body && path.includes('/overview/')) {
        const value = overview(),
          card = path.split('/').at(-1),
          changes = body as Record<string, any>;
        value.record.version = 2;
        value.record.etag = '"v2"';
        if (card === 'contact') value.record.representative = changes;
        else if (card === 'preferences') Object.assign(value.record.details, changes);
        else if (card === 'photo') value.record.photo_id = changes['photo_id'];
        else {
          Object.assign(value.clinical, changes);
          if (changes['language'] !== undefined)
            value.record.details['language'] = changes['language'];
        }
        return value;
      }
      if (body) return row();
      return page();
    });
    params = new BehaviorSubject(convertToParamMap({}));
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MAT_DIALOG_DEFAULT_OPTIONS,
          useValue: {
            ...new MatDialogConfig(),
            enterAnimationDuration: 0,
            exitAnimationDuration: 0,
          },
        },
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: params.asObservable(),
            queryParamMap: params.asObservable(),
            snapshot: { paramMap: params.value, queryParamMap: params.value, data: {} },
          },
        },
        {
          provide: AuthService,
          useValue: {
            profile: () => ({ id: 'actor' }),
            currentUser: () => ({ roleCode: 'CA' }),
            api: request,
          },
        },
        {
          provide: CompanyAccessService,
          useValue: {
            companyId: company,
            context,
            can: () => grant(),
            canPath: () => grant(),
          },
        },
        { provide: RotaService, useValue: { can: () => grant(), data: browser } },
        {
          provide: ManagementStore,
          useValue: {
            companyId: company,
            company: () => ({ id: company(), name: 'Current workspace' }),
            data: browser,
            staff: () => [],
          },
        },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  it('renders server analytics and the server result count without browser records', async () => {
    const fixture = TestBed.createComponent(ClientFiles);
    await settle(fixture);
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Service Users (17)');
    expect(text).toContain('Alex Citizen');
    expect(text).toContain('North Practice');
    expect(text).toContain('Recorded high priority only.');
    expect(text).toContain('Visits are not connected.');
    expect(fixture.nativeElement.querySelectorAll('.metric strong')[1].textContent).toContain('17');
    expect(browser).not.toHaveBeenCalled();
  });
  it('submits the existing creation form with its details and contacts', async () => {
    const fixture = TestBed.createComponent(ClientFiles);
    await settle(fixture);
    const button = [...fixture.nativeElement.querySelectorAll('button')].find((b: any) =>
      b.textContent.includes('Add service'),
    ) as HTMLButtonElement;
    button.click();
    await settle(fixture);
    const input = (name: string, value: string) => {
      const el = fixture.nativeElement.querySelector(`[name="${name}"]`) as HTMLInputElement;
      expect(el, name).toBeTruthy();
      el.value = value;
      el.dispatchEvent(new Event('input'));
    };
    input('name', 'Alex Citizen');
    input('reference', 'SU-1');
    input('address', '1 Real Road');
    input('postcode', 'AB1 2CD');
    input('dob', '1950-01-01');
    input('about', 'My routines');
    input('representativeName', 'Sam');
    input('relationship', 'Sibling');
    input('representativePhone', '0701');
    input('representativeEmail', 'sam@example.com');
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    const call = request.mock.calls.find(
      ([path, body]) => path === '/companies/north/service-users' && !!body,
    );
    expect(call).toBeTruthy();
    expect(call![1]).toMatchObject({
      name: 'Alex Citizen',
      reference: 'SU-1',
      address: '1 Real Road',
      details: { dob: '1950-01-01', about: 'My routines' },
      representative: {
        name: 'Sam',
        relationship: 'Sibling',
        phone: '0701',
        email: 'sam@example.com',
      },
    });
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/manage/clients', 'user-1']);
    expect(browser).not.toHaveBeenCalled();
  });
  it('sends search filters and pagination to the server and exports the whole filtered result', async () => {
    const fixture = TestBed.createComponent(ServiceUserDirectory);
    await settle(fixture);
    const component = fixture.componentInstance as any;
    component.query.set('North Practice');
    component.funding.set('Private');
    component.status.set('All');
    component.page.set(2);
    await settle(fixture);
    const call = request.mock.calls.filter(([path]) => path.includes('/service-users?')).at(-1)!;
    const params = new URLSearchParams(call[0].split('?')[1]);
    expect(params.get('q')).toBe('North Practice');
    expect(params.get('page')).toBe('2');
    expect(params.get('funding')).toBe('Private');
    const clicked = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await component.export();
    await fixture.whenStable();
    const exported = request.mock.calls.find(([path]) => path.includes('/export?'))!;
    const args = new URLSearchParams(exported[0].split('?')[1]);
    expect(args.get('q')).toBe('North Practice');
    expect(args.get('status')).toBe('All');
    expect(args.has('page')).toBe(false);
    expect(args.has('page_size')).toBe(false);
    expect(clicked).toHaveBeenCalled();
  });
  it('clears old results on failed access and does not use a browser fallback', async () => {
    const fixture = TestBed.createComponent(ServiceUserDirectory);
    await settle(fixture);
    const api = TestBed.inject(ServiceUsersApi);
    expect(api.rows()).toHaveLength(1);
    grant.set(false);
    await settle(fixture);
    expect(api.rows()).toEqual([]);
    grant.set(true);
    await settle(fixture);
    expect(api.rows()).toHaveLength(1);
    request.mockRejectedValue(Error('Service unavailable'));
    await api.load('status=All');
    expect(api.rows()).toEqual([]);
    expect(api.summary()).toBeNull();
    expect(api.error()).toBe('Service unavailable');
    grant.set(false);
    await settle(fixture);
    expect(api.rows()).toEqual([]);
    expect(browser).not.toHaveBeenCalled();
  });
  it('ignores an old company response after switching workspaces', async () => {
    const api = TestBed.inject(ServiceUsersApi);
    TestBed.tick();
    let resolve!: (value: unknown) => void;
    request.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const loading = api.detail('user-1');
    company.set('south');
    TestBed.tick();
    resolve(overview());
    await loading;
    expect(api.selected()).toBeNull();
  });
  it('keeps the same creation retry key and the original edit revision', async () => {
    const api = TestBed.inject(ServiceUsersApi);
    TestBed.tick();
    const value = row();
    const draft: RotaClient = {
      ...value,
      funding: 'Private',
      priority: 'High',
      riskFlags: [],
      representative: {
        name: 'Sam',
        relationship: 'Sibling',
        phone: '0701',
        email: 'sam@example.com',
      },
      file: { details: { dob: '1950-01-01' }, sections: {}, entries: {}, updatedAt: '' },
    };
    request.mockRejectedValueOnce(Error('Network lost')).mockResolvedValue(row());
    await expect(api.save(draft, null, api.scope())).rejects.toThrow('Network lost');
    await api.save(draft, null, api.scope());
    expect((request.mock.calls[0] as any)[3]['Idempotency-Key']).toBe(
      (request.mock.calls[1] as any)[3]['Idempotency-Key'],
    );
    const original = api.selected()!;
    await api.save(draft, original, api.scope());
    expect((request.mock.calls.at(-1) as any)[3]).toEqual({ 'If-Match': '"v1"' });
  });
  it('renders recorded needs, care packages and next visits in both existing views', async () => {
    const result = page();
    result.results[0] = {
      ...row(),
      primary_needs: ['Mobility support'],
      packages: [{ id: 'package-1', name: 'Morning support' }],
      next_visit: { id: 'visit-1', date: '2026-11-11', start: '10:00' },
    };
    result.meta.unavailable = {
      time_sensitive: '',
      capacity_reviews: '',
      primary_needs: '',
      packages: '',
      next_visit: '',
      high_risk: '',
    };
    const original = request.getMockImplementation() as (
      path: string,
      body?: unknown,
    ) => Promise<unknown>;
    request.mockImplementation(async (path: string, body?: unknown) =>
      path.includes('/service-users?') ? result : original(path, body),
    );
    const fixture = TestBed.createComponent(ServiceUserDirectory);
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('Mobility support');
    expect(fixture.nativeElement.textContent).toContain('Morning support');
    expect(fixture.nativeElement.textContent).toContain('10:00');
    (fixture.componentInstance as any).view.set('Cards');
    await settle(fixture);
    expect(fixture.nativeElement.querySelectorAll('.directory-cards article')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Mobility support');
    expect(browser).not.toHaveBeenCalled();
  });
  it('preserves a saved photo before its preview loads and removes it only on explicit removal', async () => {
    const api = TestBed.inject(ServiceUsersApi);
    TestBed.tick();
    request.mockImplementation(async (path: string) =>
      path.endsWith('/overview')
        ? overview({ ...row(), photo_id: 'photo-1' })
        : { ...row(), photo_id: 'photo-1' },
    );
    await api.detail('user-1');
    const original = api.selected()!;
    const draft = structuredClone(original);
    await api.save(draft, original, api.scope());
    let saved = request.mock.calls.filter((call: any[]) => call[2] === 'PATCH').at(-1)!;
    expect((saved[1] as any).photo_id).toBe('photo-1');
    draft.file!.photo = '';
    await api.save(draft, original, api.scope());
    saved = request.mock.calls.filter((call: any[]) => call[2] === 'PATCH').at(-1)!;
    expect((saved[1] as any).photo_id).toBeNull();
  });
  it('does not reload the directory for access polling metadata or equivalent reordered grants', async () => {
    const fixture = TestBed.createComponent(ServiceUserDirectory);
    await settle(fixture);
    const api = TestBed.inject(ServiceUsersApi),
      scope = api.scope();
    request.mockClear();
    context.update((value) => ({
      ...value,
      request_id: 'access-request-2',
      permissions: [...value.permissions].reverse(),
      enabled_modules: [...value.enabled_modules].reverse(),
      roles: [...value.roles].reverse(),
    }));
    await settle(fixture);
    expect(api.scope()).toBe(scope);
    expect(api.rows()).toHaveLength(1);
    expect(request).not.toHaveBeenCalled();
  });
  it('keeps the new service user form and entered data through access polling and then submits it', async () => {
    const fixture = TestBed.createComponent(ClientFiles);
    await settle(fixture);
    const add = [...fixture.nativeElement.querySelectorAll('button')].find((button: any) =>
      button.textContent.includes('Add service'),
    ) as HTMLButtonElement;
    add.click();
    await settle(fixture);
    for (const [name, value] of Object.entries({
      name: 'Alex Citizen',
      reference: 'SU-1',
      address: '1 Real Road',
      postcode: 'AB1 2CD',
    })) {
      const input = fixture.nativeElement.querySelector(`[name="${name}"]`) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    const form = fixture.nativeElement.querySelector('form');
    request.mockClear();
    for (let index = 2; index <= 4; index++) {
      context.update((value) => ({ ...value, request_id: 'access-request-' + index }));
      await settle(fixture);
      expect(fixture.nativeElement.querySelector('form')).toBe(form);
      expect((fixture.nativeElement.querySelector('[name="name"]') as HTMLInputElement).value).toBe(
        'Alex Citizen',
      );
    }
    expect(request).not.toHaveBeenCalled();
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle(fixture);
    expect(
      request.mock.calls.find(
        ([path, body]) => path === '/companies/north/service-users' && !!body,
      )?.[1],
    ).toMatchObject({ name: 'Alex Citizen', reference: 'SU-1' });
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/manage/clients', 'user-1']);
  });
  it('still closes a draft when the effective access grant changes', async () => {
    const fixture = TestBed.createComponent(ClientFiles);
    await settle(fixture);
    (
      [...fixture.nativeElement.querySelectorAll('button')].find((button: any) =>
        button.textContent.includes('Add service'),
      ) as HTMLButtonElement
    ).click();
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('form')).toBeTruthy();
    context.update((value) => ({
      ...value,
      permissions: ['care.records.read'],
      request_id: 'changed-permissions',
    }));
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });
  async function openCreateForm() {
    const fixture = TestBed.createComponent(ClientFiles);
    await settle(fixture);
    (
      [...fixture.nativeElement.querySelectorAll('button')].find((button: any) =>
        button.textContent.includes('Add service'),
      ) as HTMLButtonElement
    ).click();
    await settle(fixture);
    return fixture;
  }
  function fillRequired(fixture: ComponentFixture<ClientFiles>) {
    for (const [name, value] of Object.entries({
      name: 'Alex Citizen',
      reference: 'SU-1',
      address: '1 Real Road',
      postcode: 'AB1 2CD',
    })) {
      const input = fixture.nativeElement.querySelector(`[name="${name}"]`) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
  }
  it('identifies each missing required field, highlights it and focuses the first error', async () => {
    const fixture = await openCreateForm();
    request.mockClear();
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle(fixture);
    for (const name of ['name', 'reference', 'address', 'postcode']) {
      const input = fixture.nativeElement.querySelector(`[name="${name}"]`) as HTMLInputElement;
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(
        document.getElementById(input.getAttribute('aria-describedby')!)?.textContent,
      ).toContain('is required.');
      expect(getComputedStyle(input).borderColor).toBe('rgb(185, 28, 28)');
    }
    const first = fixture.nativeElement.querySelector('[name="name"]') as HTMLInputElement;
    expect(document.activeElement).toBe(first);
    expect(request).not.toHaveBeenCalled();
    first.value = 'Alex';
    first.dispatchEvent(new Event('input'));
    await settle(fixture);
    expect(first.getAttribute('aria-invalid')).toBe('false');
    expect(first.hasAttribute('aria-describedby')).toBe(false);
    expect(
      fixture.nativeElement.querySelector('[name="reference"]').getAttribute('aria-invalid'),
    ).toBe('true');
  });
  it('shows nested backend errors beside GP and contact email while preserving the draft', async () => {
    const fixture = await openCreateForm();
    fillRequired(fixture);
    request.mockRejectedValueOnce(
      new ApiError('This field may not be blank.', 400, 'validation_error', {
        'details.gp': ['This field may not be blank.'],
        'representative.email': ['Enter a valid email address.'],
      }),
    );
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle(fixture);
    for (const name of ['gp', 'representativeEmail']) {
      const input = fixture.nativeElement.querySelector(`[name="${name}"]`) as HTMLInputElement;
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(document.getElementById(input.getAttribute('aria-describedby')!)).toBeTruthy();
    }
    expect(fixture.nativeElement.querySelector('#su-details-gp-error').textContent).toContain(
      'GP / practice and contact is required.',
    );
    expect((fixture.nativeElement.querySelector('[name="name"]') as HTMLInputElement).value).toBe(
      'Alex Citizen',
    );
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });
  it('marks the reference field when the backend rejects a duplicate reference', async () => {
    const fixture = await openCreateForm();
    fillRequired(fixture);
    request.mockRejectedValueOnce(
      new ApiError('That service user reference is already in use.', 409, 'reference_conflict'),
    );
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle(fixture);
    expect(
      fixture.nativeElement.querySelector('[name="reference"]').getAttribute('aria-invalid'),
    ).toBe('true');
    expect(fixture.nativeElement.querySelector('#su-reference-error').textContent).toContain(
      'already in use',
    );
  });
  async function openOverview() {
    params.next(convertToParamMap({ id: 'user-1' }));
    const fixture = TestBed.createComponent(ClientFiles);
    await settle(fixture);
    return fixture;
  }
  async function openDemographics() {
    const fixture = await openOverview();
    (fixture.componentInstance as any).setSection('details');
    await settle(fixture);
    const button = [...fixture.nativeElement.querySelectorAll('button')].find(
      (element: any) => element.textContent.trim() === 'Edit contacts',
    ) as HTMLButtonElement;
    button.click();
    await settle(fixture);
    return { fixture, dialog: document.querySelector('[role="dialog"]')! };
  }
  it('loads fresh demographics in a branded popup and saves with its version without navigating', async () => {
    const { fixture, dialog } = await openDemographics();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    expect(dialog.textContent).toContain('Demographics & Contacts');
    expect(document.querySelector('.service-user-card-dialog')).toBeTruthy();
    expect((dialog.querySelector('[name="preferredName"]') as HTMLInputElement).value).toBe('Alex');
    expect((dialog.querySelector('[name="phone"]') as HTMLInputElement).value).toBe('0700');
    expect(dialog.querySelector('[name="funding"]')).toBeNull();
    expect(dialog.querySelector('[name="primary_diagnosis"]')).toBeNull();
    const input = dialog.querySelector('[name="name"]') as HTMLInputElement;
    input.value = 'Alex Updated';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    dialog
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle(fixture);
    const call = request.mock.calls.find(
      ([path, body]) => path.endsWith('/demographics') && !!body,
    )!;
    expect(call[2]).toBe('PATCH');
    expect(call[3]).toEqual({ 'If-Match': '\"v2\"' });
    expect(call[1].name).toBe('Alex Updated');
    expect(call[1].funding).toBeUndefined();
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    expect(fixture.nativeElement.textContent).toContain('Alex Updated');
    expect(navigate).not.toHaveBeenCalled();
  });
  it('marks the invalid demographic field and retains entered values after failed save', async () => {
    const { fixture, dialog } = await openDemographics();
    const input = dialog.querySelector('[name="reference"]') as HTMLInputElement;
    input.value = 'Duplicate';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    request.mockRejectedValueOnce(
      new ApiError('That reference is in use.', 409, 'reference_conflict', {
        reference: ['Choose another client reference.'],
      }),
    );
    dialog
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle(fixture);
    expect(input.value).toBe('Duplicate');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(dialog.textContent).toContain('Choose another client reference.');
    expect(document.querySelector('[role="dialog"]')).toBe(dialog);
  });
  it('disables demographic submission when loading fails and allows discarding', async () => {
    const fixture = await openOverview();
    request.mockRejectedValueOnce(new Error('Could not load saved details.'));
    (fixture.componentInstance as any).setSection('details');
    await settle(fixture);
    (
      [...fixture.nativeElement.querySelectorAll('button')].find(
        (element: any) => element.textContent.trim() === 'Edit contacts',
      ) as HTMLButtonElement
    ).click();
    await settle(fixture);
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.textContent).toContain('Could not load saved details.');
    expect((dialog.querySelector('[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
    (dialog.querySelector('[type="button"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
  });
  it('closes the demographics popup on workspace change and ignores a late read', async () => {
    const fixture = await openOverview();
    let resolve!: (value: unknown) => void;
    request.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    (fixture.componentInstance as any).setSection('details');
    await settle(fixture);
    (
      [...fixture.nativeElement.querySelectorAll('button')].find(
        (element: any) => element.textContent.trim() === 'Edit contacts',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    await Promise.resolve();
    expect(
      (document.querySelector('[role="dialog"] [type="submit"]') as HTMLButtonElement).disabled,
    ).toBe(true);
    company.set('south');
    fixture.detectChanges();
    resolve({ ...row(), local_date: '2026-11-10', can_edit: true });
    await settle(fixture);
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    expect(
      request.mock.calls.filter(([path, body]) => path.endsWith('/demographics') && !!body),
    ).toHaveLength(0);
  });
  async function openFamily(action: 'Edit' | 'Edit contacts' = 'Edit') {
    const fixture = await openOverview();
    (fixture.componentInstance as any).setSection('family');
    await settle(fixture);
    (
      [...fixture.nativeElement.querySelectorAll('button')].find(
        (element: any) => element.textContent.trim() === action,
      ) as HTMLButtonElement
    ).click();
    await settle(fixture);
    return { fixture, dialog: document.querySelector('[role="dialog"]')! };
  }
  it('opens both existing family edit actions in a fresh prefilled branded popup', async () => {
    for (const action of ['Edit', 'Edit contacts'] as const) {
      const { fixture, dialog } = await openFamily(action);
      expect(dialog.textContent).toContain('Family / Representative');
      expect(document.querySelector('.service-user-card-dialog')).toBeTruthy();
      for (const [key, value] of [
        ['name', 'Sam Latest'],
        ['approved', 'Visit times only'],
        ['preferences', 'Call after 5pm'],
        ['sharing_consent', 'Recorded consent'],
      ])
        expect((dialog.querySelector(`[name="${key}"]`) as HTMLInputElement).value).toBe(value);
      expect(fixture.nativeElement.querySelector('.client-editor')).toBeNull();
      (dialog.querySelector('[type="button"]') as HTMLButtonElement).click();
      await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
      fixture.destroy();
    }
  });
  it('saves family details and guidance with the fresh version and updates the existing page', async () => {
    const { fixture, dialog } = await openFamily();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    const input = dialog.querySelector('[name="approved"]') as HTMLTextAreaElement;
    input.value = 'Appointment dates only';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    dialog
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle(fixture);
    const call = request.mock.calls.find(([path, body]) => path.endsWith('/family') && !!body)!;
    expect(call[2]).toBe('PATCH');
    expect(call[3]).toEqual({ 'If-Match': '\"v2\"' });
    expect(call[1]).toEqual({
      name: 'Sam Latest',
      relationship: 'Sibling',
      phone: '0701',
      email: 'sam@example.com',
      approved: 'Appointment dates only',
      preferences: 'Call after 5pm',
      sharing_consent: 'Recorded consent',
    });
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    expect(fixture.nativeElement.textContent).toContain('Appointment dates only');
    expect(fixture.nativeElement.textContent).toContain('Call after 5pm');
    expect(fixture.nativeElement.textContent).toContain('Recorded consent');
    expect(fixture.nativeElement.textContent).toContain('Sam Latest');
    expect(navigate).not.toHaveBeenCalled();
  });
  it('keeps failed family edits and marks the invalid contact field', async () => {
    const { fixture, dialog } = await openFamily();
    const input = dialog.querySelector('[name="name"]') as HTMLInputElement;
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    request.mockRejectedValueOnce(
      new ApiError('Enter a contact name.', 400, 'validation_error', {
        name: ['Contact name is required.'],
      }),
    );
    dialog
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle(fixture);
    expect(document.querySelector('[role="dialog"]')).toBe(dialog);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(dialog.textContent).toContain('Contact name is required.');
    expect((dialog.querySelector('[name="approved"]') as HTMLTextAreaElement).value).toBe(
      'Visit times only',
    );
  });
  it('blocks family saving after a failed fresh read', async () => {
    const fixture = await openOverview();
    (fixture.componentInstance as any).setSection('family');
    await settle(fixture);
    request.mockRejectedValueOnce(new Error('Family details are unavailable.'));
    (
      [...fixture.nativeElement.querySelectorAll('button')].find(
        (element: any) => element.textContent.trim() === 'Edit',
      ) as HTMLButtonElement
    ).click();
    await settle(fixture);
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.textContent).toContain('Family details are unavailable.');
    expect((dialog.querySelector('[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
  });
  function connectPlan() {
    let state: ServiceUserCarePlan = {
      id: 'user-1',
      company_id: 'north',
      version: 2,
      etag: '\"v2\"',
      plan: {
        name: 'Current plan',
        start: '2026-11-10',
        review: '2027-02-10',
        status: 'Active',
        needs: 'Recorded needs',
        support: 'Offer choices',
      },
      goals: [
        {
          id: 'goal-1',
          version: 1,
          name: 'Maintain independence',
          detail: 'Offer support',
          date: '2027-01-01',
          level: 'High',
          status: 'Active',
        },
      ],
      can_edit: true,
      can_create_goal: true,
    };
    const previous = request.getMockImplementation()! as (...args: any[]) => any;
    request.mockImplementation(async (path: string, body?: any, method?: string, headers?: any) => {
      if (path.endsWith('/overview')) return { ...overview(), care_plan: structuredClone(state) };
      if (path.endsWith('/care-plan') && !body) return structuredClone(state);
      if (path.includes('/care-plan') && body) {
        if (path.endsWith('/goals')) state.goals.push({ ...body, id: 'goal-new', version: 1 });
        else if (path.includes('/goals/'))
          state.goals[0] = { ...state.goals[0], ...body, version: 2 };
        else state.plan = { ...state.plan, ...body };
        state.version++;
        state.etag = '\"v' + state.version + '\"';
        return {
          ...overview({ ...row(), version: state.version, etag: state.etag }),
          care_plan: structuredClone(state),
        };
      }
      return previous(path, body, method, headers);
    });
    return state;
  }
  async function openPlan() {
    connectPlan();
    const fixture = await openOverview();
    (fixture.componentInstance as any).setSection('plan');
    await settle(fixture);
    return fixture;
  }
  it('loads saved plan and goals in the existing page and edits the plan in a branded popup', async () => {
    const fixture = await openPlan();
    expect(fixture.nativeElement.textContent).toContain('Current plan');
    expect(fixture.nativeElement.textContent).toContain('Maintain independence');
    const button = [...fixture.nativeElement.querySelectorAll('.client-section-panel button')].find(
      (element: any) => element.textContent.trim() === 'Edit',
    ) as HTMLButtonElement;
    button.click();
    await settle(fixture);
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.textContent).toContain('Care Plan');
    expect((dialog.querySelector('[name="name"]') as HTMLInputElement).value).toBe('Current plan');
    const review = dialog.querySelector('[name="review"]') as HTMLInputElement;
    expect(review.value).toBe('2027-02-10');
    expect(review.max).toBe('');
    const needs = dialog.querySelector('[name="needs"]') as HTMLTextAreaElement;
    needs.value = 'Updated needs';
    needs.dispatchEvent(new Event('input', { bubbles: true }));
    dialog
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle(fixture);
    const call = request.mock.calls.find(([path, body]) => path.endsWith('/care-plan') && body)!;
    expect(call[2]).toBe('PATCH');
    expect(call[3]).toEqual({ 'If-Match': '\"v2\"' });
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    expect(fixture.nativeElement.textContent).toContain('Updated needs');
  });
  it('adds a goal through a popup with an idempotency key and refreshes the register', async () => {
    const fixture = await openPlan();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    (
      fixture.nativeElement.querySelector('.client-entry-panel .primary') as HTMLButtonElement
    ).click();
    await settle(fixture);
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.textContent).toContain('Add goal');
    const input = dialog.querySelector('[name="name"]') as HTMLInputElement;
    input.value = 'Attend appointments';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    dialog
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle(fixture);
    const call = request.mock.calls.find(
      ([path, body]) => path.endsWith('/care-plan/goals') && body,
    )!;
    expect(call[2]).toBe('POST');
    expect(call[3]['If-Match']).toBe('\"v2\"');
    expect(call[3]['Idempotency-Key']).toBeTruthy();
    expect(call[1].name).toBe('Attend appointments');
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    expect(fixture.nativeElement.textContent).toContain('Attend appointments');
    expect(fixture.nativeElement.textContent).toContain('Maintain independence');
    expect(navigate).not.toHaveBeenCalled();
  });
  it('edits a saved goal in a prefilled popup and retains invalid drafts', async () => {
    const fixture = await openPlan();
    (
      fixture.nativeElement.querySelector(
        '[aria-label="Edit Maintain independence"]',
      ) as HTMLButtonElement
    ).click();
    await settle(fixture);
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.textContent).toContain('Edit goal');
    const input = dialog.querySelector('[name="name"]') as HTMLInputElement;
    expect(input.value).toBe('Maintain independence');
    request.mockRejectedValueOnce(
      new ApiError('Check the goal.', 400, 'validation_error', {
        name: ['Care goal is required.'],
      }),
    );
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    dialog
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle(fixture);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(dialog.textContent).toContain('Care goal is required.');
    input.value = 'Updated care goal';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    dialog
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle(fixture);
    expect(
      request.mock.calls.find(
        ([path, body]) => path.endsWith('/care-plan/goals/goal-1') && body,
      )?.[2],
    ).toBe('PATCH');
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    expect(fixture.nativeElement.textContent).toContain('Updated care goal');
  });
  it('shows access denied instead of empty plan data when Planning is unavailable', async () => {
    const fixture = await openOverview();
    (fixture.componentInstance as any).setSection('plan');
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('cv-access-required')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.client-entry-panel')).toBeNull();
  });
  it('uses independent Planning actions to show edit and create controls', async () => {
    const state = connectPlan();
    state.can_edit = false;
    state.can_create_goal = true;
    const fixture = await openOverview();
    (fixture.componentInstance as any).setSection('plan');
    await settle(fixture);
    expect(
      fixture.nativeElement.querySelector('.client-section-panel .panel-toolbar button'),
    ).toBeNull();
    expect(fixture.nativeElement.querySelector('.client-entry-panel .primary')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[aria-label="Edit Maintain independence"]'),
    ).toBeNull();
  });
  function connectRecords() {
    const values: Record<string, Record<string, string>> = {
      diagnoses: {
        primary: 'Recorded diagnosis',
        diet: 'Diet guidance',
        ongoing: 'Healthcare guidance',
        communication: 'Speak clearly',
        hearing: 'Hearing guidance',
        vision: 'Glasses',
        sensory: 'Reduce noise',
      },
      moving: {
        assessed: '2026-01-01',
        review: '2027-01-01',
        support: 'One person',
        equipment: 'Walking frame',
        instructions: 'Agreed transfer instructions',
      },
      capacity: {
        status: 'Has capacity',
        assessed: '2026-01-01',
        reason: 'Recorded assessment findings',
        welfareLpa: 'Named attorney',
        financeLpa: 'Named attorney',
        advance: 'Recorded document reference',
        support: 'Give time to decide',
        review: '2027-01-01',
      },
      consent: {
        status: 'Given',
        date: '2026-01-01',
        by: 'Service user',
        care: 'Agreed',
        medication: 'Declined',
        family: 'Agreed',
        photo: 'Declined',
        notes: 'Recorded scope and restrictions',
      },
      access: {
        location: 'Side entrance',
        checked: '2026-01-01',
        instructions: 'Call before entering',
      },
      support: {
        personal: 'Morning support',
        nutrition: 'Offer drinks',
        continence: 'Recorded support',
        safety: 'Agreed checks',
        behaviour: 'Give reassurance',
        gender: 'Any',
        preferredStaff: 'staff-1',
        backupStaff: 'staff-2',
        continuity: 'Consistent team',
      },
      risks: {},
      medication: {},
      allergies: {},
      tasks: {},
      documents: {},
    };
    const registers = [
      'diagnoses',
      'risks',
      'capacity',
      'medication',
      'allergies',
      'tasks',
      'documents',
    ];
    const sources: Record<string, ServiceUserRecordSection> = Object.fromEntries(
      Object.entries(values).map(([key, fields]) => [
        key,
        {
          id: 'user-1',
          company_id: 'north',
          version: 1,
          etag: '\"v1\"',
          key,
          fields: Object.entries(fields).map(([key, value]) => ({ key, value })),
          entries: registers.includes(key)
            ? [
                {
                  id: key + '-entry',
                  version: 1,
                  name: 'Saved ' + key,
                  detail: 'Recorded ' + key + ' guidance',
                  date: '2026-01-01',
                  level: 'High',
                  status: 'Active',
                  capacity: key === 'capacity' ? 'Has capacity' : '',
                },
              ]
            : [],
          can_edit: true,
          can_create: registers.includes(key),
          has_code: key === 'access',
          staff_read: key === 'support',
          staff_choices:
            key === 'support'
              ? [
                  { id: 'staff-1', name: 'First carer' },
                  { id: 'staff-2', name: 'Backup carer' },
                ]
              : [],
          local_date: '2026-11-10',
        },
      ]),
    );
    let accessSecret = '45678-fresh-secret';
    const current = () => ({
      ...overview(),
      workspace: {
        sections: structuredClone(Object.values(sources)),
        visits: [
          {
            id: 'visit-1',
            callName: 'Morning support',
            date: '2026-11-01',
            start: '09:00',
            end: '10:00',
            state: 'Planned',
          },
        ],
        visits_read: true,
      },
    });
    const previous = request.getMockImplementation()! as (...args: any[]) => any;
    request.mockImplementation(async (path: string, body?: any, method?: string, headers?: any) => {
      if (path.endsWith('/overview')) return current();
      if (path.endsWith('/record-summary')) {
        const value = current();
        value.record.name = 'Fresh exported name';
        value.workspace.sections = value.workspace.sections.filter(
          (section) => section.key !== 'access',
        );
        return value;
      }
      const match = path.match(/\/record-sections\/([^/]+)(?:\/entries(?:\/([^/]+))?)?$/);
      if (match) {
        const source = sources[match[1]];
        if (!body) {
          const fresh = { ...structuredClone(source), version: 2, etag: '\"v2\"' };
          if (source.key === 'access') fresh.fields.push({ key: 'code', value: accessSecret });
          return fresh;
        }
        if (path.includes('/entries')) {
          if (match[2])
            Object.assign(
              source.entries.find((entry) => entry.id === match[2])!,
              body,
            );
          else
            source.entries.push({
              ...body,
              id: source.key + '-new',
              version: 1,
              capacity: body.capacity ?? '',
            });
        } else {
          for (const [key, value] of Object.entries(body)) {
            if (key === 'code') {
              accessSecret = String(value);
              continue;
            }
            const field = source.fields.find((field) => field.key === key);
            if (field) field.value = String(value ?? '');
            else source.fields.push({ key, value: String(value ?? '') });
          }
        }
        return { ...current(), record: { ...row(), version: 3, etag: '\"v3\"' } };
      }
      return previous(path, body, method, headers);
    });
    return { sources, current };
  }
  async function openRecordSection(key: string) {
    const state = connectRecords();
    const fixture = await openOverview();
    (fixture.componentInstance as any).setSection(key);
    await settle(fixture);
    return { fixture, ...state };
  }
  it('opens every left-menu section and returns to Overview without leaving the record', async () => {
    const state = connectRecords();
    const plan = connectPlan();
    const previous = request.getMockImplementation()! as (...args: any[]) => any;
    request.mockImplementation(async (path: string, ...args: any[]) =>
      path.endsWith('/overview')
        ? { ...state.current(), care_plan: plan }
        : previous(path, ...args),
    );
    const fixture = await openOverview();
    const nav = fixture.nativeElement.querySelector('nav[aria-label="Client record sections"]');
    const buttons = Array.from(nav.querySelectorAll('button')) as HTMLButtonElement[];
    expect(buttons).toHaveLength(15);
    for (const button of buttons.slice(1)) {
      button.click();
      await settle(fixture);
      expect(button.getAttribute('aria-current')).toBe('page');
      expect(fixture.nativeElement.textContent).toContain(
        button.textContent!.trim().replace(/^\w+/, '').trim(),
      );
      expect(fixture.nativeElement.querySelector('cv-access-required')).toBeNull();
      expect(fixture.nativeElement.querySelector('.client-editor')).toBeNull();
    }
    buttons[0].click();
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('cv-client-overview')).toBeTruthy();
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
    expect(browser).not.toHaveBeenCalled();
  });
  it('uses Records permissions for Overview actions even when legacy manage grants differ', async () => {
    vi.spyOn(TestBed.inject(CompanyAccessService), 'can').mockImplementation(
      (module, submodule, action) => submodule === 'records' && action !== 'export',
    );
    vi.spyOn(TestBed.inject(RotaService), 'can').mockReturnValue(false);
    const fixture = await openOverview();
    await settle(fixture);
    expect(
      fixture.nativeElement.querySelector('cv-care-header .profile-page-actions').textContent,
    ).toContain('Edit Profile');
    expect(
      fixture.nativeElement.querySelector('cv-care-header .profile-page-actions').textContent,
    ).not.toContain('Print');
    expect(fixture.nativeElement.querySelectorAll('cv-client-overview header button')).toHaveLength(
      6,
    );
  });
  it('uses the fresh authorised summary for the top Print action', async () => {
    const { fixture } = await openRecordSection('overview');
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    (
      Array.from(
        fixture.nativeElement.querySelectorAll('cv-care-header .profile-page-actions button'),
      ) as HTMLButtonElement[]
    )
      .find((button) => button.textContent?.includes('Print'))!
      .click();
    await settle(fixture);
    expect(request).toHaveBeenCalledWith('/companies/north/service-users/user-1/record-summary');
    expect(print).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelector('.client-print').textContent).toContain(
      'Fresh exported name',
    );
    window.dispatchEvent(new Event('afterprint'));
  });
  it('reads every remaining section from the API and opens all existing field editors as branded popups', async () => {
    const { fixture } = await openRecordSection('diagnoses');
    for (const [key, field, expected] of [
      ['diagnoses', 'primary', 'Recorded diagnosis'],
      ['moving', 'instructions', 'Agreed transfer instructions'],
      ['capacity', 'reason', 'Recorded assessment findings'],
      ['consent', 'by', 'Service user'],
      ['access', 'code', '45678-fresh-secret'],
      ['support', 'personal', 'Morning support'],
    ]) {
      (fixture.componentInstance as any).setSection(key);
      await settle(fixture);
      (
        fixture.nativeElement.querySelector(
          '.client-section-panel .panel-toolbar button',
        ) as HTMLButtonElement
      ).click();
      await settle(fixture);
      const dialog = document.querySelector('[role="dialog"]')!;
      expect(document.querySelector('.service-user-card-dialog')).toBeTruthy();
      expect((dialog.querySelector(`[name="${field}"]`) as HTMLInputElement).value).toBe(expected);
      expect(fixture.nativeElement.querySelector('.client-editor')).toBeNull();
      (dialog.querySelector('[type="button"]') as HTMLButtonElement).click();
      await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    }
    expect(browser).not.toHaveBeenCalled();
  });
  it('adds and edits records in every remaining register through the existing branded dialog', async () => {
    const { fixture } = await openRecordSection('diagnoses');
    for (const key of [
      'diagnoses',
      'risks',
      'capacity',
      'medication',
      'allergies',
      'tasks',
      'documents',
    ]) {
      (fixture.componentInstance as any).setSection(key);
      await settle(fixture);
      (
        fixture.nativeElement.querySelector('.client-entry-panel .primary') as HTMLButtonElement
      ).click();
      await settle(fixture);
      let dialog = document.querySelector('[role="dialog"]')!;
      const name = dialog.querySelector('[name="name"]') as HTMLInputElement;
      name.value = 'Added ' + key;
      name.dispatchEvent(new Event('input', { bubbles: true }));
      if (key === 'capacity') {
        (
          dialog.querySelector(
            'mat-select[aria-label="Capacity summary"] .mat-mdc-select-trigger',
          ) as HTMLElement
        ).click();
        await settle(fixture);
        (
          Array.from(document.querySelectorAll('mat-option')).find(
            (option) => option.textContent?.trim() === 'Has capacity',
          ) as HTMLElement
        ).click();
        await settle(fixture);
      }
      dialog
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await settle(fixture);
      const call = request.mock.calls.find(
        ([path, body]) => path.endsWith('/record-sections/' + key + '/entries') && body,
      )!;
      expect(call[2]).toBe('POST');
      if (key === 'capacity') expect(call[1].capacity).toBe('Has capacity');
      expect(call[3]['If-Match']).toBe('\"v2\"');
      expect(call[3]['Idempotency-Key']).toBeTruthy();
      await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
      expect(fixture.nativeElement.textContent).toContain('Added ' + key);
      (
        fixture.nativeElement.querySelector(
          '[aria-label="Edit Saved ' + key + '"]',
        ) as HTMLButtonElement
      ).click();
      await settle(fixture);
      dialog = document.querySelector('[role="dialog"]')!;
      expect((dialog.querySelector('[name="name"]') as HTMLInputElement).value).toBe(
        'Saved ' + key,
      );
      const detail = dialog.querySelector('[name="detail"]') as HTMLTextAreaElement;
      detail.value = 'Updated ' + key + ' findings';
      detail.dispatchEvent(new Event('input', { bubbles: true }));
      dialog
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await settle(fixture);
      expect(
        request.mock.calls.find(
          ([path, body]) => path.endsWith('/entries/' + key + '-entry') && body,
        )?.[2],
      ).toBe('PATCH');
      await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
      expect(fixture.nativeElement.textContent).toContain('Updated ' + key + ' findings');
    }
    expect(browser).not.toHaveBeenCalled();
  });
  it('saves clinical section edits with the fresh ETag and keeps the page in place', async () => {
    const { fixture } = await openRecordSection('moving');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    (
      fixture.nativeElement.querySelector(
        '.client-section-panel .panel-toolbar button',
      ) as HTMLButtonElement
    ).click();
    await settle(fixture);
    const dialog = document.querySelector('[role="dialog"]')!;
    const input = dialog.querySelector('[name="instructions"]') as HTMLTextAreaElement;
    input.value = 'Updated transfer instructions';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    dialog
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle(fixture);
    const call = request.mock.calls.find(
      ([path, body]) => path.endsWith('/record-sections/moving') && body,
    )!;
    expect(call[3]).toEqual({ 'If-Match': '\"v2\"' });
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    expect(fixture.nativeElement.textContent).toContain('Updated transfer instructions');
    expect(navigate).not.toHaveBeenCalled();
  });
  it('keeps field errors and drafts in a failed consent edit', async () => {
    const { fixture } = await openRecordSection('consent');
    (
      fixture.nativeElement.querySelector(
        '.client-section-panel .panel-toolbar button',
      ) as HTMLButtonElement
    ).click();
    await settle(fixture);
    const dialog = document.querySelector('[role="dialog"]')!;
    const input = dialog.querySelector('[name="by"]') as HTMLInputElement;
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    request.mockRejectedValueOnce(
      new ApiError('Check the consent fields.', 400, 'validation_error', {
        by: ['Record the person and their authority.'],
      }),
    );
    dialog
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle(fixture);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(dialog.textContent).toContain('Record the person and their authority.');
    expect(document.querySelector('[role="dialog"]')).toBe(dialog);
  });
  it('marks rejected select values as invalid and names the consent control accessibly', async () => {
    const { fixture } = await openRecordSection('consent');
    (
      fixture.nativeElement.querySelector(
        '.client-section-panel .panel-toolbar button',
      ) as HTMLButtonElement
    ).click();
    await settle(fixture);
    const dialog = document.querySelector('[role="dialog"]')!;
    (
      dialog.querySelector(
        'mat-select[aria-label="Consent status"] .mat-mdc-select-trigger',
      ) as HTMLElement
    ).click();
    await settle(fixture);
    (
      Array.from(document.querySelectorAll('mat-option')).find(
        (option) => option.textContent?.trim() === 'Withdrawn',
      ) as HTMLElement
    ).click();
    await settle(fixture);
    request.mockRejectedValueOnce(
      new ApiError('Review the consent scope.', 400, 'validation_error', {
        status: ['Review agreed scopes before withdrawing consent.'],
      }),
    );
    dialog
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle(fixture);
    const control = dialog.querySelector('mat-select[aria-label="Consent status"]')!;
    expect(control).toBeTruthy();
    expect(control.getAttribute('aria-invalid')).toBe('true');
    expect(dialog.textContent).toContain('Review agreed scopes before withdrawing consent.');
  });
  it('fetches an access code only on demand and clears it when leaving the section', async () => {
    const { fixture } = await openRecordSection('access');
    expect(fixture.nativeElement.textContent).not.toContain('45678-fresh-secret');
    expect(
      request.mock.calls.filter(([path]) => path.endsWith('/record-sections/access')),
    ).toHaveLength(0);
    (fixture.nativeElement.querySelector('.client-code') as HTMLButtonElement).click();
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('45678-fresh-secret');
    expect(
      fixture.debugElement.injector.get(ServiceUsersApi).selected()?.file?.sections['access'][
        'code'
      ],
    ).toBeUndefined();
    (fixture.componentInstance as any).setSection('documents');
    await settle(fixture);
    (fixture.componentInstance as any).setSection('access');
    await settle(fixture);
    expect(fixture.nativeElement.textContent).not.toContain('45678-fresh-secret');
  });
  it('prepares a fresh authorised care summary before printing and excludes access data', async () => {
    const { fixture } = await openRecordSection('documents');
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    (
      [...fixture.nativeElement.querySelectorAll('button')].find(
        (element: any) =>
          element.textContent.includes('Print') && element.textContent.includes('summary'),
      ) as HTMLButtonElement
    ).click();
    await settle(fixture);
    expect(request).toHaveBeenCalledWith('/companies/north/service-users/user-1/record-summary');
    expect(print).toHaveBeenCalledOnce();
    const summary = fixture.nativeElement.querySelector('.client-print') as HTMLElement;
    expect(summary.textContent).toContain('Fresh exported name');
    expect(summary.textContent).toContain('Saved documents');
    expect(summary.textContent).not.toContain('45678-fresh-secret');
    expect(summary.textContent).not.toContain('Key safe');
    window.dispatchEvent(new Event('afterprint'));
    await settle(fixture);
    expect(summary.textContent?.trim()).toBe('');
  });
  it('does not print cached data after a denied summary export', async () => {
    const { fixture } = await openRecordSection('documents');
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    request.mockRejectedValueOnce(
      new ApiError('Export permission is required.', 403, 'permission_denied'),
    );
    (
      [...fixture.nativeElement.querySelectorAll('button')].find(
        (element: any) =>
          element.textContent.includes('Print') && element.textContent.includes('summary'),
      ) as HTMLButtonElement
    ).click();
    await settle(fixture);
    expect(print).not.toHaveBeenCalled();
    expect(TestBed.inject(ToastService).error).toHaveBeenCalledWith(
      'Export permission is required.',
    );
    expect(fixture.nativeElement.querySelector('.client-print').textContent.trim()).toBe('');
  });
  it('preserves carer preferences when Staff Records is unavailable during a support edit', async () => {
    const state = connectRecords();
    state.sources['support'].staff_read = false;
    state.sources['support'].staff_choices = [];
    state.sources['support'].fields = state.sources['support'].fields.filter(
      (field) => !['preferredStaff', 'backupStaff'].includes(field.key),
    );
    const fixture = await openOverview();
    (fixture.componentInstance as any).setSection('support');
    await settle(fixture);
    (
      fixture.nativeElement.querySelector(
        '.client-section-panel .panel-toolbar button',
      ) as HTMLButtonElement
    ).click();
    await settle(fixture);
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.textContent).toContain('Staff Records read permission');
    expect(
      dialog
        .querySelector('mat-select[aria-label="Preferred carers"]')
        ?.getAttribute('aria-disabled'),
    ).toBe('true');
    const input = dialog.querySelector('[name="personal"]') as HTMLTextAreaElement;
    input.value = 'Updated personal care';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    dialog
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle(fixture);
    const body = request.mock.calls.find(
      ([path, body]) => path.endsWith('/record-sections/support') && body,
    )?.[1] as any;
    expect(body.personal).toBe('Updated personal care');
    expect(body.preferredStaff).toBeUndefined();
    expect(body.backupStaff).toBeUndefined();
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
  });
  it('uses visit schedule sources without browser workspace attendance', async () => {
    const { fixture } = await openRecordSection('tasks');
    expect(fixture.nativeElement.textContent).toContain('Morning support');
    expect(fixture.nativeElement.textContent).toContain('Planned');
    expect(browser).not.toHaveBeenCalled();
  });
  it('opens each existing overview card in a prefilled dialog without changing the page', async () => {
    const fixture = await openOverview();
    const panels = [
      ...fixture.nativeElement.querySelectorAll('cv-client-overview .profile-panel'),
    ] as HTMLElement[];
    for (const [title, name, value] of [
      ['Personal Details', 'name', 'Alex Citizen'],
      ['Next of Kin', 'name', 'Sam'],
      ['Health Conditions', 'primary_diagnosis', 'Recorded diagnosis'],
      ['Support Needs', 'personal', 'Morning support'],
      ['Communication', 'communication', 'Speak clearly'],
      ['Likes, Dislikes', 'likes', ''],
    ]) {
      const panel = panels.find((panel) =>
        panel.querySelector('h2')?.textContent?.includes(title),
      )!;
      expect(panel).toBeTruthy();
      (panel.querySelector('header button') as HTMLButtonElement).click();
      await settle(fixture);
      const dialog = document.querySelector('[role="dialog"]')!;
      expect(dialog).toBeTruthy();
      expect((dialog.querySelector(`[name="${name}"]`) as HTMLInputElement).value).toBe(value);
      expect(fixture.nativeElement.querySelector('cv-client-overview')).toBeTruthy();
      expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
      TestBed.inject(MatDialog).closeAll();
      await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
      await settle(fixture);
    }
    expect(browser).not.toHaveBeenCalled();
  });
  it('saves support to the backend and updates the existing overview without navigation', async () => {
    const fixture = await openOverview();
    const panel = (
      [
        ...fixture.nativeElement.querySelectorAll('cv-client-overview .profile-panel'),
      ] as HTMLElement[]
    ).find((panel) => panel.querySelector('h2')?.textContent?.includes('Support Needs'))!;
    (panel.querySelector('header button') as HTMLButtonElement).click();
    await settle(fixture);
    const dialog = document.querySelector('[role="dialog"]')!;
    const input = dialog.querySelector('[name="personal"]') as HTMLTextAreaElement;
    input.value = 'Updated personal support';
    input.dispatchEvent(new Event('input'));
    dialog
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle(fixture);
    const call = request.mock.calls.find(
      ([path, body]) => path.endsWith('/overview/support') && !!body,
    )!;
    expect(call[1]).toMatchObject({ personal: 'Updated personal support' });
    expect((call as any)[3]).toEqual({ 'If-Match': '"v1"' });
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    expect(panel.textContent).toContain('Updated personal support');
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });
  it('keeps the dialog and entered values when a source revision is stale', async () => {
    const fixture = await openOverview();
    const panel = (
      [
        ...fixture.nativeElement.querySelectorAll('cv-client-overview .profile-panel'),
      ] as HTMLElement[]
    ).find((panel) => panel.querySelector('h2')?.textContent?.includes('Communication'))!;
    (panel.querySelector('header button') as HTMLButtonElement).click();
    await settle(fixture);
    const dialog = document.querySelector('[role="dialog"]')!;
    const input = dialog.querySelector('[name="communication"]') as HTMLTextAreaElement;
    input.value = 'Retain this draft';
    input.dispatchEvent(new Event('input'));
    context.update((value) => ({ ...value, request_id: 'background-overview-check' }));
    await settle(fixture);
    expect(document.querySelector('[role="dialog"]')).toBe(dialog);
    expect(input.value).toBe('Retain this draft');
    request.mockRejectedValueOnce(
      new ApiError('This record changed. Reload before saving.', 412, 'stale_version'),
    );
    dialog
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle(fixture);
    expect(document.querySelector('[role="dialog"]')).toBe(dialog);
    expect(input.value).toBe('Retain this draft');
    expect(dialog.textContent).toContain('This record changed');
  });
  it('opens a photo-only popup and removes the photo through its own scoped command', async () => {
    const fixture = await openOverview();
    (fixture.nativeElement.querySelector('.profile-photo-button') as HTMLButtonElement).click();
    await settle(fixture);
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.textContent).toContain('Edit profile photo');
    expect(dialog.querySelector('[name="name"]')).toBeNull();
    expect(dialog.querySelector('input[type="file"]')).toBeTruthy();
    dialog
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle(fixture);
    const call = request.mock.calls.find(
      ([path, body]) => path.endsWith('/overview/photo') && !!body,
    )!;
    expect(call[1]).toEqual({ photo_id: null });
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });
  it('does not let a delayed old photo response restore the earlier record or image', async () => {
    const api = TestBed.inject(ServiceUsersApi);
    TestBed.tick();
    let resolveOld!: (value: Blob) => void;
    let photoReads = 0;
    const old = overview({ ...row(), photo_id: 'old-photo' }),
      fresh = overview({ ...row(), photo_id: 'new-photo', version: 2, etag: '"v2"' });
    request.mockImplementation(async (path: string, body?: unknown) => {
      if (path.endsWith('/overview')) return old;
      if (path.endsWith('/overview/photo')) return fresh;
      if (path.endsWith('/photo')) {
        photoReads++;
        if (photoReads === 1)
          return new Promise<Blob>((resolve) => {
            resolveOld = resolve;
          });
        return new Blob(['new'], { type: 'image/png' });
      }
      throw Error('Unexpected operation');
    });
    const pending = api.detail('user-1');
    await Promise.resolve();
    expect(api.detailPending('user-1')).toBe(true);
    const original = api.selected()!;
    await api.saveCard('photo', { photo_id: 'new-photo' }, original, api.scope());
    await Promise.resolve();
    const selected = api.selected()!;
    resolveOld(new Blob(['old'], { type: 'image/png' }));
    await pending;
    await Promise.resolve();
    expect(api.selected()?.version).toBe(2);
    expect(api.selected()?.photo_id).toBe('new-photo');
    expect(api.selected()?.file?.photo).toBe(selected.file?.photo);
  });
  it('previews a changed profile photo, uploads it and refreshes the top card in place', async () => {
    let state = overview({ ...row(), photo_id: 'photo-old' }),
      imageNumber = 0;
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:profile-${++imageNumber}`);
    request.mockImplementation(async (path: string, body?: any) => {
      if (path.endsWith('/overview')) return state;
      if (path.endsWith('/overview/photo')) {
        state = {
          ...state,
          record: { ...state.record, photo_id: body.photo_id, version: 2, etag: '"v2"' },
        };
        return state;
      }
      if (path.endsWith('/photo')) return new Blob([state.record.photo_id!], { type: 'image/png' });
      if (path.endsWith('/service-user-photos'))
        return { id: 'photo-new', company_id: 'north', state: 'Uploading', etag: '"v1"' };
      if (path.includes('/chunks/'))
        return { id: 'photo-new', company_id: 'north', state: 'Uploading', etag: '"v1"' };
      if (path.endsWith('/finalise'))
        return { id: 'photo-new', company_id: 'north', state: 'Clean', etag: '"v2"' };
      throw Error('Unexpected operation ' + path);
    });
    const fixture = await openOverview();
    const oldSource = (
      fixture.nativeElement.querySelector('.client-profile-photo') as HTMLImageElement
    ).src;
    (fixture.nativeElement.querySelector('.profile-photo-button') as HTMLButtonElement).click();
    await settle(fixture);
    const dialog = document.querySelector('[role="dialog"]')!;
    expect((dialog.querySelector('.client-photo-preview') as HTMLImageElement).src).toBe(oldSource);
    const input = dialog.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', {
      value: [new File([new Uint8Array([137, 80, 78, 71])], 'portrait.png', { type: 'image/png' })],
      configurable: true,
    });
    input.dispatchEvent(new Event('change'));
    await vi.waitFor(() =>
      expect((dialog.querySelector('.client-photo-preview') as HTMLImageElement).src).toMatch(
        /^data:image\/png;base64,/,
      ),
    );
    await settle(fixture);
    dialog
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle(fixture);
    await vi.waitFor(() =>
      expect(request.mock.calls.find(([path]) => path.endsWith('/overview/photo'))?.[1]).toEqual({
        photo_id: 'photo-new',
      }),
    );
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    expect(
      (fixture.nativeElement.querySelector('.client-profile-photo') as HTMLImageElement).src,
    ).not.toBe(oldSource);
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
    expect(browser).not.toHaveBeenCalled();
  });
  it('excludes medication fields from the health popup when the owning feature is unavailable', async () => {
    const value = overview();
    value.medication_read = false;
    value.medication_edit = false;
    value.medication_reference = null;
    request.mockImplementation(async (path: string, body?: unknown) => {
      if (path.endsWith('/overview') || path.endsWith('/overview/health')) return value;
      throw Error('Unexpected request');
    });
    const fixture = await openOverview();
    const panel = (
      [
        ...fixture.nativeElement.querySelectorAll('cv-client-overview .profile-panel'),
      ] as HTMLElement[]
    ).find((panel) => panel.querySelector('h2')?.textContent?.includes('Health Conditions'))!;
    expect(panel.textContent).toContain('Unavailable');
    (panel.querySelector('header button') as HTMLButtonElement).click();
    await settle(fixture);
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.querySelector('[name="medication_reference"]')).toBeNull();
    dialog
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle(fixture);
    const body = request.mock.calls.find(([path]) => path.endsWith('/overview/health'))?.[1] as any;
    expect(body).toBeTruthy();
    expect(body).not.toHaveProperty('medication_reference');
  });
});
