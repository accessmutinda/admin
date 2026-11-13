import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { CompanyAccessService, routeAccess } from '../../core/access/company-access.service';
import { ManagementStore } from '../management/shared/management.store';
import { InspectorClientsApi } from './inspector-clients-api.service';
import { InspectorClientsService } from './inspector-clients.service';
import { InspectorService } from './inspector.service';
import { InspectorPage } from './inspector-page';
import { InspectorClientPage, InspectorClientRead } from './inspector-provider.generated';

function person(id = 'person'): InspectorClientRead {
  return {
    id,
    version: 1,
    name: 'Jane Shared',
    reference: 'JS-1',
    address: '10 Care Road',
    postcode: 'AB1',
    funding: 'Private',
    priority: 'High',
    active: true,
    updated_at: '2026-11-13T12:00:00Z',
    sections: { plan: { review: '2026-12-01' }, 'Personal Care': { assistance: 'Shared support' } },
    risks: [
      {
        id: 'risk',
        name: 'Falls',
        detail: 'Mobility',
        date: '2026-11-01',
        level: 'High',
        status: 'Active',
      },
    ],
    instructions: [
      {
        name: 'Personal Care',
        instructions: 'Shared support',
        preferences: '',
        outcome: 'Safe care',
        actions: 'Assist',
        escalation: 'Call care team',
        client: 'Jane Shared',
      },
    ],
    documents: [
      {
        id: 'document',
        service_user_id: id,
        name: 'Shared.pdf',
        category: 'Care Plan Samples',
        version: 1,
        updated: '2026-11-13T12:00:00Z',
        expiry: null,
        content_type: 'application/pdf',
        size: 20,
        owner: 'Care team',
        status: 'Current',
      },
    ],
  };
}
function response(): InspectorClientPage {
  return {
    count: 1,
    next: null,
    previous: null,
    results: [person()],
    company: {
      id: 'one',
      name: 'Provider Source',
      logo_available: false,
      code: 'SOURCE',
      active: true,
      sector: null,
      registered_places: 0,
      updated_at: '2026-11-13T12:00:00Z',
      head_office_address: null,
      postcode: null,
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
    capabilities: { download_evidence: true, view_provider: true },
    meta: {
      company_id: 'one',
      as_of: '2026-11-13T12:00:00Z',
      timezone: 'Europe/London',
      request_id: 'test',
      filters: { page: 1, page_size: 100 },
      disclosure: 'Shared only',
    },
  };
}
describe('Inspector service user integration', () => {
  const companyId = signal('one'),
    actor = signal({ id: 'reviewer' }),
    context = signal({
      revision: 1,
      request_id: 'one',
      permissions: ['inspector_portal.clients.read'],
    });
  let api: InspectorClientsApi;
  let request: ReturnType<typeof vi.fn>;
  let click: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    companyId.set('one');
    actor.set({ id: 'reviewer' });
    context.set({ revision: 1, request_id: 'one', permissions: ['inspector_portal.clients.read'] });
    click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:verification');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    request = vi.fn().mockResolvedValue(response());
    TestBed.configureTestingModule({
      imports: [InspectorPage],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { api: request, profile: actor, isAuthenticated: () => true },
        },
        { provide: CompanyAccessService, useValue: { companyId, context } },
        { provide: InspectorService, useClass: InspectorClientsService },
        {
          provide: ManagementStore,
          useFactory: () => {
            throw Error('Inspector service users must not load browser workspace');
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ page: 'service-users' }),
            queryParamMap: of(convertToParamMap({})),
            snapshot: { data: { page: 'service-users' }, queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    });
    api = TestBed.inject(InspectorClientsApi);
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
  it('uses the dedicated Service Users permission', () => {
    expect(routeAccess('/inspector/service-users')).toEqual([['inspector_portal', 'clients']]);
  });
  it('renders the existing directory and shared instructions without a browser workspace', async () => {
    const fixture = TestBed.createComponent(InspectorPage);
    fixture.detectChanges();
    await api.load();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Jane Shared');
    expect(text).toContain('Shared support');
    expect(text).toContain('Provider Source');
    expect(text).not.toContain('Local workspace');
    expect(api.company()?.registeredPlaces).toBe(0);
    expect(fixture.componentInstance.metrics()[0].value).toBe(1);
    expect(fixture.componentInstance.metrics()[2].value).toBe(1);
    const row = fixture.componentInstance.register().rows[0];
    fixture.componentInstance.openRecord(row);
    fixture.detectChanges();
    expect(fixture.componentInstance.client()?.id).toBe('person');
    expect(fixture.componentInstance.clientDocuments('person')[0].name).toBe('Shared.pdf');
  });
  it('loads all authorised pages before showing full-dataset counts and filters', async () => {
    const first = response();
    first.count = 101;
    first.results = Array.from({ length: 100 }, (_, i) => person(String(i)));
    first.next = 'next';
    const second = response();
    second.count = 101;
    second.results = [person('last')];
    second.previous = 'previous';
    request.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    await load();
    expect(api.clients()).toHaveLength(101);
    expect(request.mock.calls[1][0]).toContain('page=2&page_size=100');
  });
  it('fails explicitly instead of presenting partial or mixed-workspace counts', async () => {
    const wrong = response();
    wrong.meta.company_id = 'other';
    request.mockResolvedValue(wrong);
    await load();
    expect(api.ready()).toBe(false);
    expect(api.clients()).toEqual([]);
    expect(api.error()).toContain('workspace');
  });
  it('rejects changed pagination instead of silently duplicating source rows', async () => {
    const first = response();
    first.count = 2;
    const second = response();
    second.count = 2;
    request.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    await load();
    expect(api.ready()).toBe(false);
    expect(api.error()).toContain('changed while loading');
  });
  it('keeps known empty data ready without inventing clinical records', async () => {
    const value = response();
    value.count = 0;
    value.results = [];
    request.mockResolvedValue(value);
    await load();
    expect(api.ready()).toBe(true);
    expect(api.clients()).toEqual([]);
    expect(api.instructions()).toEqual([]);
  });
  it('clears drawer, records and evidence after an authorisation failure', async () => {
    const fixture = TestBed.createComponent(InspectorPage);
    fixture.detectChanges();
    await api.load();
    fixture.detectChanges();
    fixture.componentInstance.openRecord(fixture.componentInstance.register().rows[0]);
    request.mockRejectedValue(
      Object.assign(Error('Inspection engagement expired'), { status: 403 }),
    );
    await api.load();
    fixture.detectChanges();
    expect(api.clients()).toEqual([]);
    expect(api.documents()).toEqual([]);
    expect(fixture.componentInstance.client()).toBeNull();
    expect(fixture.componentInstance.record()).toBeNull();
    expect(fixture.componentInstance.modalOpen()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Inspection engagement expired');
  });
  it('ignores late responses after navigating away', async () => {
    let resolve!: (value: InspectorClientPage) => void;
    request.mockReturnValue(new Promise<InspectorClientPage>((done) => (resolve = done)));
    api.start();
    const pending = api.load();
    api.stop();
    resolve(response());
    await pending;
    expect(api.ready()).toBe(false);
    expect(api.clients()).toEqual([]);
  });
  it('clears records immediately when the company or identity changes', async () => {
    await load();
    companyId.set('other');
    expect(api.value()).toBeNull();
    expect(api.clients()).toEqual([]);
    companyId.set('one');
    actor.set({ id: 'another' });
    expect(api.value()).toBeNull();
  });
  it('does not reload for request metadata changes', async () => {
    await load();
    request.mockClear();
    context.update((v) => ({ ...v, request_id: 'new' }));
    TestBed.tick();
    expect(api.ready()).toBe(true);
    expect(request).not.toHaveBeenCalled();
  });
  it('filters the existing register by risk funding location and search', async () => {
    const fixture = TestBed.createComponent(InspectorPage);
    fixture.detectChanges();
    await api.load();
    fixture.detectChanges();
    const page = fixture.componentInstance;
    page.search.set(' Care Road ');
    page.riskFilter.set('High');
    page.fundingFilter.set('Private');
    page.locationFilter.set('AB1');
    expect(page.filteredRows()).toHaveLength(1);
    page.riskFilter.set('Low');
    expect(page.filteredRows()).toHaveLength(0);
    page.clearFilters();
    expect(page.filteredRows()).toHaveLength(1);
  });
  it('requires export capability for CSV and document downloads', async () => {
    const value = response();
    value.capabilities['download_evidence'] = false;
    request.mockResolvedValue(value);
    await load();
    await expect(api.export({})).rejects.toThrow('not permitted');
    await expect(api.download('care:person:document')).rejects.toThrow('not permitted');
    expect(click).not.toHaveBeenCalled();
  });
  it('downloads current shared documents through the guarded endpoint despite profile refreshes', async () => {
    await load();
    let resolve!: (value: Blob) => void;
    request.mockReturnValueOnce(new Promise<Blob>((done) => (resolve = done)));
    const pending = api.download('care:person:document');
    await api.load();
    resolve(new Blob(['evidence']));
    await pending;
    expect(click).toHaveBeenCalledOnce();
    expect(
      request.mock.calls.some((call) =>
        String(call[0]).endsWith('/service-users/person/documents/document/content'),
      ),
    ).toBe(true);
    expect((click.mock.instances[0] as HTMLAnchorElement).download).toBe('Shared.pdf');
  });
  it('rejects unknown or changed evidence and retains scanner explanations', async () => {
    await load();
    await expect(api.download('care:person:foreign')).rejects.toThrow('not permitted');
    request.mockRejectedValueOnce(Error('Evidence scanning is not configured'));
    await expect(api.download('care:person:document')).rejects.toThrow('scanning');
    expect(api.ready()).toBe(true);
    let resolve!: (value: Blob) => void;
    request.mockReturnValueOnce(new Promise<Blob>((done) => (resolve = done)));
    const pending = api.download('care:person:document');
    const changed = response();
    changed.results[0].documents = [];
    request.mockResolvedValueOnce(changed);
    await api.load();
    resolve(new Blob(['outdated']));
    await expect(pending).rejects.toThrow('changed');
    expect(click).not.toHaveBeenCalled();
  });
  it('exports the active filters using the server export authority', async () => {
    await load();
    request.mockResolvedValueOnce(new Blob(['Name,Reference']));
    await api.export({
      q: 'Jane',
      risk: 'High',
      funding: 'Private',
      postcode: 'AB1',
      status: 'Active',
    });
    const path = String(request.mock.lastCall![0]);
    expect(path).toContain('/service-users/export?');
    expect(path).toContain('risk=High');
    expect(click).toHaveBeenCalledOnce();
    expect((click.mock.instances[0] as HTMLAnchorElement).download).toBe('service-users.csv');
  });
  it('loads published branding through the clients endpoint and revokes its object URL on exit', async () => {
    const value = response();
    value.company.logo_available = true;
    request
      .mockResolvedValueOnce(value)
      .mockResolvedValueOnce(new Blob(['published logo'], { type: 'image/png' }));
    await load();
    expect(api.company()?.logo).toBe('blob:verification');
    expect(request.mock.calls[1][0]).toBe('/companies/one/inspector/service-users/logo');
    api.stop();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:verification');
    expect(api.company()).toBeUndefined();
  });
  it('discards a pending document after leaving the inspector page', async () => {
    await load();
    let resolve!: (value: Blob) => void;
    request.mockReturnValueOnce(new Promise<Blob>((done) => (resolve = done)));
    const pending = api.download('care:person:document');
    api.stop();
    resolve(new Blob(['private']));
    await pending;
    expect(click).not.toHaveBeenCalled();
  });
  it('does not deliver pending bytes after export authority disappears', async () => {
    await load();
    let resolve!: (value: Blob) => void;
    request.mockReturnValueOnce(new Promise<Blob>((done) => (resolve = done)));
    const pending = api.download('care:person:document');
    const value = response();
    value.capabilities['download_evidence'] = false;
    request.mockResolvedValueOnce(value);
    await api.load();
    resolve(new Blob(['private']));
    await expect(pending).rejects.toThrow('changed');
    expect(click).not.toHaveBeenCalled();
  });
  it('keeps provider details disabled when only Service Users access is granted', async () => {
    const value = response();
    value.capabilities['view_provider'] = false;
    request.mockResolvedValue(value);
    const fixture = TestBed.createComponent(InspectorPage);
    fixture.detectChanges();
    await api.load();
    fixture.detectChanges();
    const button = Array.from(fixture.nativeElement.querySelectorAll('button')).find((el) =>
      (el as HTMLButtonElement).textContent?.includes('Inspection details'),
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(api.clients()).toHaveLength(1);
  });

  it('exports the directory sort direction through the server', async () => {
    const fixture = TestBed.createComponent(InspectorPage);
    fixture.detectChanges();
    await api.load();
    fixture.detectChanges();
    const page = fixture.componentInstance;
    page.sortDirection.set(-1);
    page.search.set('Jane');
    page.error.set('Previous export failure');
    const exportRows = vi.spyOn(api, 'export').mockResolvedValue();
    page.exportRegister();
    expect(page.error()).toBe('');
    expect(exportRows).toHaveBeenCalledWith(
      expect.objectContaining({ ordering: '-name', q: 'Jane' }),
    );
    page.sortDirection.set(1);
    page.exportRegister();
    expect(exportRows).toHaveBeenLastCalledWith(expect.objectContaining({ ordering: 'name' }));
  });
  it('clears old download errors on retry and refreshes an open record title', async () => {
    const fixture = TestBed.createComponent(InspectorPage);
    fixture.detectChanges();
    await api.load();
    fixture.detectChanges();
    const page = fixture.componentInstance;
    page.openRecord(page.register().rows[0]);
    page.error.set('Previous failure');
    page.modalError.set('Previous failure');
    vi.spyOn(api, 'download').mockResolvedValue();
    page.downloadDocument(api.documents()[0]);
    expect(page.error()).toBe('');
    expect(page.modalError()).toBe('');
    const updated = response();
    updated.results[0].name = 'Jane Renamed';
    request.mockResolvedValueOnce(updated);
    await api.load();
    fixture.detectChanges();
    expect(page.modalTitle()).toBe('Jane Renamed');
    expect(page.client()?.name).toBe('Jane Renamed');
  });
  it('matches risk funding and status filters against their own columns', async () => {
    const value = response();
    Object.assign(value.results[0], {
      name: 'High',
      reference: 'Private',
      address: 'Active',
      funding: 'NHS',
      active: false,
      risks: [],
    });
    request.mockResolvedValue(value);
    const fixture = TestBed.createComponent(InspectorPage);
    fixture.detectChanges();
    await api.load();
    fixture.detectChanges();
    const page = fixture.componentInstance;
    page.riskFilter.set('High');
    expect(page.filteredRows()).toHaveLength(0);
    page.clearFilters();
    page.fundingFilter.set('Private');
    expect(page.filteredRows()).toHaveLength(0);
    page.clearFilters();
    page.statusFilter.set('Active');
    expect(page.filteredRows()).toHaveLength(0);
    page.statusFilter.set('Inactive');
    expect(page.filteredRows()).toHaveLength(1);
  });
});
