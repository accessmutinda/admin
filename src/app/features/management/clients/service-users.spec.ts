import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { ManagementStore } from '../shared/management.store';
import { RotaService } from '../rota/rota.service';
import { ToastService } from '../../../shared/ui/toast.service';
import { ClientFiles } from './client-files';
import { ServiceUserDirectory } from '../care/service-user-directory';
import { ServiceUsersApi } from './service-users-api.service';
import { ServiceUser, ServiceUserPage } from './service-users.generated';
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
    browser: ReturnType<typeof vi.fn>;
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
      if (body) return row();
      return page();
    });
    const params = new BehaviorSubject(convertToParamMap({}));
    TestBed.configureTestingModule({
      providers: [
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
    resolve(row());
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
    request.mockResolvedValue({ ...row(), photo_id: 'photo-1' });
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
});
