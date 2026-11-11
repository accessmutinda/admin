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
import { ServiceUser, ServiceUserPage, ServiceUserOverview } from './service-users.generated';
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
        { provide: AuthService, useValue: { profile: () => ({ id: 'actor' }), api: request } },
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
          useValue: { companyId: company, data: browser, staff: () => [] },
        },
        { provide: ToastService, useValue: { success: vi.fn() } },
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
    await api.detail('user-1');
    const original = api.selected()!;
    await api.saveCard('photo', { photo_id: 'new-photo' }, original, api.scope());
    await Promise.resolve();
    const selected = api.selected()!;
    resolveOld(new Blob(['old'], { type: 'image/png' }));
    await Promise.resolve();
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
