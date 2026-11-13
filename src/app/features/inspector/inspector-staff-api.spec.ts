import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { CompanyAccessService, routeAccess } from '../../core/access/company-access.service';
import { ManagementStore } from '../management/shared/management.store';
import { InspectorStaffApi } from './inspector-staff-api.service';
import { InspectorStaffService } from './inspector-staff.service';
import { InspectorService } from './inspector.service';
import { InspectorPage } from './inspector-page';
import { InspectorStaffPage, InspectorStaffRead } from './inspector-provider.generated';

function person(id = 'staff'): InspectorStaffRead {
  return {
    id,
    person_id: 'person',
    version: 1,
    name: 'Jane Worker',
    reference: 'EMP-1',
    role: 'Care Worker',
    location: 'North',
    department: null,
    employment_type: 'Full Time',
    status: 'Active',
    updated_at: '2026-11-13T12:00:00Z',
    checks: [
      {
        id: 'check',
        title: 'DBS check',
        code: 'dbs',
        status: 'Verified',
        current: true,
        completed: '2026-01-01',
        expiry: '2027-01-01',
        effective_state: 'Verified',
      },
    ],
    training: [
      {
        id: 'training',
        course_id: 'moving',
        course_version: 1,
        completed_at: null,
        title: 'Moving and handling',
        completed: '2026-01-01',
        expiry: null,
        current: true,
        competency: 'Competent',
        source: 'HR',
        certificate_id: 'file',
        status: 'Current',
      },
    ],
    references: [
      {
        id: 'reference',
        name: 'Professional reference',
        organisation: 'Previous employer',
        status: 'Received',
      },
    ],
    documents: [
      {
        id: 'file',
        name: 'Training certificate.pdf',
        category: 'Training',
        expiry: null,
        status: 'Verified',
        version: 1,
        source: 'HR',
      },
    ],
  };
}
function response(): InspectorStaffPage {
  return {
    count: 1,
    next: null,
    previous: null,
    results: [person()],
    company: {
      id: 'one',
      name: 'Source Provider',
      code: 'SOURCE',
      active: true,
      sector: null,
      registered_places: 0,
      updated_at: '2026-11-13T12:00:00Z',
      head_office_address: null,
      postcode: null,
      logo_available: false,
    },
    inspection: {
      id: null,
      version: 0,
      etag: '"v0"',
      type: null,
      start: null,
      end: null,
      updated: null,
      by: null,
    },
    capabilities: { export: true, view_provider: true },
    summary: {
      total_staff: 1,
      open_vacancies: 3,
      verified_dbs: 1,
      training_certificates: 1,
      pipeline: { Applied: 2, Interview: 1, Offer: 0 },
      training: [
        {
          id: 'moving',
          name: 'Moving and handling',
          current: 1,
          expired: 0,
          missing: 0,
          competent: 1,
        },
      ],
    },
    meta: {
      company_id: 'one',
      as_of: '2026-11-13T12:00:00Z',
      timezone: 'Europe/London',
      request_id: 'test',
      filters: { page: 1, page_size: 100 },
      disclosure: 'Workforce evidence only',
    },
  };
}
describe('Inspector staffing integration', () => {
  const companyId = signal('one'),
    actor = signal({ id: 'reviewer' }),
    context = signal({
      revision: 1,
      request_id: 'first',
      permissions: ['inspector_portal.staff.read'],
    });
  let api: InspectorStaffApi;
  let request: ReturnType<typeof vi.fn>;
  let click: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    companyId.set('one');
    actor.set({ id: 'reviewer' });
    context.set({ revision: 1, request_id: 'first', permissions: ['inspector_portal.staff.read'] });
    request = vi.fn().mockResolvedValue(response());
    click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:verification');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    TestBed.configureTestingModule({
      imports: [InspectorPage],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { api: request, profile: actor, isAuthenticated: () => true },
        },
        { provide: CompanyAccessService, useValue: { companyId, context } },
        { provide: InspectorService, useClass: InspectorStaffService },
        {
          provide: ManagementStore,
          useFactory: () => {
            throw Error('Staffing must not instantiate the browser workspace');
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ page: 'staffing' }),
            queryParamMap: of(convertToParamMap({})),
            snapshot: { data: { page: 'staffing' }, queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    });
    api = TestBed.inject(InspectorStaffApi);
  });
  afterEach(() => {
    api.stop();
    vi.restoreAllMocks();
  });
  async function load() {
    api.start();
    await api.load();
    TestBed.tick();
  }
  it('maps staffing to its own submodule', () => {
    expect(routeAccess('/inspector/staffing')).toEqual([['inspector_portal', 'staff']]);
  });
  it('renders the existing layout using current workforce and server summaries', async () => {
    const fixture = TestBed.createComponent(InspectorPage);
    fixture.detectChanges();
    await api.load();
    fixture.detectChanges();
    const page = fixture.componentInstance,
      text = fixture.nativeElement.textContent;
    expect(text).toContain('Jane Worker');
    expect(text).toContain('Moving and handling');
    expect(text).toContain('Source Provider');
    expect(page.metrics().map((m) => m.value)).toEqual([1, 3, 1, 1]);
    expect(page.pipelineCount('Applied')).toBe(2);
    expect(page.register().rows[0].cells).toEqual([
      'Jane Worker',
      'Care Worker',
      'North',
      'Full Time',
      '1',
      '1',
      'Active',
    ]);
    expect(api.company()?.registeredPlaces).toBe(0);
  });
  it('opens a read-only evidence drawer and updates it after source refresh', async () => {
    const fixture = TestBed.createComponent(InspectorPage);
    fixture.detectChanges();
    await api.load();
    fixture.detectChanges();
    const page = fixture.componentInstance;
    page.openRecord(page.register().rows[0]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Training certificate.pdf');
    const updated = response();
    updated.results[0].name = 'Jane Renamed';
    updated.results[0].checks[0].current = false;
    updated.results[0].checks[0].effective_state = 'Expired';
    request.mockResolvedValueOnce(updated);
    await api.load();
    fixture.detectChanges();
    expect(page.modalTitle()).toBe('Jane Renamed');
    expect(page.record()?.cells[4]).toBe('0');
    expect(fixture.nativeElement.textContent).toContain('Expired');
  });
  it('searches and sorts the existing register without recalculating cohort summaries from a page', async () => {
    const value = response();
    value.count = 2;
    value.summary.total_staff = 2;
    value.results.push({ ...person('second'), name: 'Aaron Worker' });
    request.mockResolvedValue(value);
    const fixture = TestBed.createComponent(InspectorPage);
    fixture.detectChanges();
    await api.load();
    fixture.detectChanges();
    const page = fixture.componentInstance;
    expect(page.filteredRows()[0].cells[0]).toBe('Aaron Worker');
    page.sortDirection.set(-1);
    expect(page.filteredRows()[0].cells[0]).toBe('Jane Worker');
    page.search.set(' Jane ');
    expect(page.filteredRows()).toHaveLength(1);
    expect(page.metrics()[0].value).toBe(2);
  });
  it('loads all authorised pages and rejects partial counts', async () => {
    const first = response();
    first.count = 101;
    first.summary.total_staff = 101;
    first.results = Array.from({ length: 100 }, (_, i) => person(String(i)));
    first.next = 'next';
    const second = response();
    second.count = 101;
    second.summary.total_staff = 101;
    second.results = [person('last')];
    request.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    await load();
    expect(api.records()).toHaveLength(101);
    expect(api.summary()?.total_staff).toBe(101);
    expect(request.mock.calls[1][0]).toContain('page=2&page_size=100');
  });
  it('rejects duplicate or changed pagination instead of showing a partial workforce', async () => {
    const first = response();
    first.count = 2;
    first.summary.total_staff = 2;
    const second = { ...first };
    request.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    await load();
    expect(api.ready()).toBe(false);
    expect(api.error()).toContain('changed while loading');
  });
  it('fails closed on foreign-company response data', async () => {
    const value = response();
    value.meta.company_id = 'other';
    request.mockResolvedValue(value);
    await load();
    expect(api.ready()).toBe(false);
    expect(api.records()).toEqual([]);
    expect(api.error()).toContain('workspace');
  });
  it('shows a legitimate empty workforce and empty training catalogue', async () => {
    const value = response();
    value.count = 0;
    value.results = [];
    value.summary = {
      total_staff: 0,
      open_vacancies: 0,
      verified_dbs: 0,
      training_certificates: 0,
      pipeline: { Applied: 0, Interview: 0, Offer: 0 },
      training: [],
    };
    request.mockResolvedValue(value);
    const fixture = TestBed.createComponent(InspectorPage);
    fixture.detectChanges();
    await api.load();
    fixture.detectChanges();
    expect(api.ready()).toBe(true);
    expect(api.records()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('No mandatory training requirements');
  });
  it('clears records and the open drawer on access loss and supports retry', async () => {
    const fixture = TestBed.createComponent(InspectorPage);
    fixture.detectChanges();
    await api.load();
    fixture.detectChanges();
    const page = fixture.componentInstance;
    page.openRecord(page.register().rows[0]);
    request.mockRejectedValueOnce(
      Object.assign(Error('Inspection access revoked'), { status: 403 }),
    );
    await api.load();
    fixture.detectChanges();
    expect(api.records()).toEqual([]);
    expect(page.record()).toBeNull();
    expect(page.modalOpen()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Inspection access revoked');
    request.mockResolvedValueOnce(response());
    await api.load();
    fixture.detectChanges();
    expect(api.ready()).toBe(true);
    expect(page.register().rows).toHaveLength(1);
  });
  it('ignores late responses after route exit', async () => {
    let resolve!: (value: InspectorStaffPage) => void;
    request.mockReturnValueOnce(new Promise<InspectorStaffPage>((done) => (resolve = done)));
    api.start();
    const pending = api.load();
    api.stop();
    resolve(response());
    await pending;
    expect(api.ready()).toBe(false);
    expect(api.records()).toEqual([]);
  });
  it('clears data immediately on account and company changes', async () => {
    await load();
    actor.set({ id: 'other' });
    expect(api.value()).toBeNull();
    expect(api.records()).toEqual([]);
    companyId.set('other');
    expect(api.company()).toBeUndefined();
  });
  it('ignores request metadata changes when access is otherwise unchanged', async () => {
    await load();
    request.mockClear();
    context.update((c) => ({ ...c, request_id: 'next' }));
    TestBed.tick();
    expect(api.ready()).toBe(true);
    expect(request).not.toHaveBeenCalled();
  });
  it('requires explicit export and provider permissions', async () => {
    const value = response();
    value.capabilities = { export: false, view_provider: false };
    request.mockResolvedValue(value);
    await load();
    await expect(api.export({})).rejects.toThrow('not permitted');
    expect(api.canViewProvider()).toBe(false);
    expect(click).not.toHaveBeenCalled();
  });
  it('exports the active search and sort through the authorised backend', async () => {
    const fixture = TestBed.createComponent(InspectorPage);
    fixture.detectChanges();
    await api.load();
    fixture.detectChanges();
    const page = fixture.componentInstance;
    page.search.set('Jane');
    page.sortDirection.set(-1);
    request.mockResolvedValueOnce(new Blob(['Name,Role']));
    page.exportRegister();
    await Promise.resolve();
    expect(String(request.mock.lastCall![0])).toContain(
      '/inspector/staffing/export?q=Jane&ordering=-name',
    );
    expect(String(request.mock.lastCall![0])).not.toContain('funding=');
    expect(click).toHaveBeenCalledOnce();
    expect((click.mock.instances[0] as HTMLAnchorElement).download).toBe('staffing.csv');
  });
  it('loads only the published branding and releases its URL on exit', async () => {
    const value = response();
    value.company.logo_available = true;
    request.mockResolvedValueOnce(value).mockResolvedValueOnce(new Blob(['logo']));
    await load();
    expect(api.company()?.logo).toBe('blob:verification');
    expect(request.mock.calls[1][0]).toBe('/companies/one/inspector/staffing/logo');
    api.stop();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:verification');
  });
  it('rejects a summary that does not match the complete authorised workforce', async () => {
    const value = response();
    value.summary.total_staff = 20;
    request.mockResolvedValue(value);
    await load();
    expect(api.ready()).toBe(false);
    expect(api.records()).toEqual([]);
    expect(api.error()).toContain('incomplete');
  });
});
