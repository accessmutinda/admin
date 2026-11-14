import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { CompanyAccessService } from '../../core/access/company-access.service';
import { ManagementStore } from '../management/shared/management.store';
import { InspectorMedicationApi } from './inspector-medication-api.service';
import { InspectorMedicationService } from './inspector-medication.service';
import { InspectorService } from './inspector.service';
import { InspectorPage } from './inspector-page';
import { InspectorMedicationPage } from './inspector-provider.generated';

function response(): InspectorMedicationPage {
  return {
    count: 1,
    next: null,
    previous: null,
    results: [
      {
        id: 'client',
        name: 'Jane Shared',
        prescriptions: [
          {
            id: 'medicine',
            version: 1,
            status: 'Active',
            name: 'Controlled medicine',
            strength: '10 mg',
            dose: '1 tablet',
            route: 'Oral',
            frequency: 'PRN',
            times: [],
            start: '2026-01-01',
            end: null,
            controlled: true,
            discontinuedAt: '',
            indication: 'Pain',
            prescriber: 'Clinician',
            pharmacy: 'Pharmacy',
            stock: '24.000',
            stockLocation: 'Locked cabinet',
            prnIndication: 'Pain',
            prnMax: '4.000',
            notes: 'Recorded medication note',
          },
        ],
        administrations: [
          {
            id: 'entry',
            version: 1,
            medicationId: 'medicine',
            medication: 'Controlled medicine',
            date: '2026-11-12',
            time: '08:00',
            outcome: 'Given',
            reason: '',
            response: 'Comfortable',
            witness: 'Witness',
            by: 'Care Worker',
            at: '2026-11-12T08:00:00Z',
            doseUnits: '1.000',
            correctionOf: null,
            superseded: false,
          },
        ],
      },
    ],
    company: {
      id: 'one',
      name: 'Source Provider',
      code: 'SOURCE',
      active: true,
      sector: null,
      registered_places: 0,
      updated_at: '2026-11-14T12:00:00Z',
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
    summary: { active_prescriptions: 1, prescriptions: 1, administrations: 1 },
    capabilities: { export: true, view_provider: true },
    meta: {
      revision: 'a'.repeat(64),
      company_id: 'one',
      as_of: '2026-11-14T12:00:00Z',
      timezone: 'Europe/London',
      request_id: 'test',
      filters: { page: 1, page_size: 100 },
      disclosure: 'Medication only',
    },
  };
}
describe('Inspector medication integration', () => {
  const companyId = signal('one'),
    actor = signal({ id: 'reviewer' }),
    context = signal({
      revision: 1,
      request_id: 'first',
      permissions: ['inspector_portal.medication.read'],
    });
  let api: InspectorMedicationApi,
    request: ReturnType<typeof vi.fn>,
    click: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    companyId.set('one');
    actor.set({ id: 'reviewer' });
    context.set({
      revision: 1,
      request_id: 'first',
      permissions: ['inspector_portal.medication.read'],
    });
    request = vi.fn().mockResolvedValue(response());
    click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:medication');
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
        { provide: InspectorService, useClass: InspectorMedicationService },
        {
          provide: ManagementStore,
          useFactory: () => {
            throw Error('Medication must not load browser workspace');
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ page: 'medication' }),
            queryParamMap: of(convertToParamMap({})),
            snapshot: { data: { page: 'medication' }, queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    });
    api = TestBed.inject(InspectorMedicationApi);
  });
  afterEach(() => {
    api.stop();
    vi.restoreAllMocks();
  });
  async function page() {
    const fixture = TestBed.createComponent(InspectorPage);
    fixture.detectChanges();
    await api.load();
    fixture.detectChanges();
    return fixture;
  }
  async function load() {
    api.start();
    await api.load();
    TestBed.tick();
  }
  it('renders current records in the existing layout without browser data', async () => {
    const fixture = await page(),
      p = fixture.componentInstance;
    expect(fixture.nativeElement.textContent).toContain('Source Provider');
    expect(fixture.nativeElement.textContent).toContain('Controlled medicine');
    expect(p.metrics().map((m) => m.value)).toEqual([1, 1, '100%', 0]);
    expect(p.data.today).toBe('2026-11-14');
    expect(fixture.nativeElement.textContent).not.toContain('Save draft');
  });
  it('opens read-only administration and profile drawers and updates source changes', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.openRecord(p.register().rows[0]);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Comfortable');
    p.closeModal();
    p.activeTab.set('Medication profiles');
    p.openRecord(p.register().rows[0]);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Locked cabinet');
    const changed = response();
    changed.results[0].prescriptions[0].name = 'Updated medicine';
    changed.results[0].prescriptions[0].stock = '21.000';
    request.mockResolvedValueOnce(changed);
    await api.load();
    f.detectChanges();
    expect(p.modalTitle()).toBe('Updated medicine');
    expect(p.record()?.detail['Stock recorded']).toBe('21.000');
  });
  it('supports all tabs, service-user and date filters with valid empty results', async () => {
    const f = await page(),
      p = f.componentInstance;
    for (const tab of [
      'Overview',
      'Controlled drugs',
      'PRN prescriptions',
      'Medication profiles',
    ]) {
      p.activeTab.set(tab);
      expect(p.filteredRows()).toHaveLength(1);
    }
    p.selectedClient.set('other');
    expect(p.filteredRows()).toHaveLength(0);
    p.selectedClient.set('client');
    p.rangeEnd.set('2025-01-01');
    expect(p.filteredRows()).toHaveLength(0);
    p.rangeEnd.set('');
    p.activeTab.set('Overview');
    p.rangeStart.set('2026-11-13');
    expect(p.filteredRows()).toHaveLength(0);
  });
  it('excludes correction history from metrics while keeping it inspectable', async () => {
    const data = response();
    const original = data.results[0].administrations[0];
    original.superseded = true;
    data.results[0].administrations.push({
      ...original,
      id: 'replacement',
      superseded: false,
      outcome: 'Refused',
      correctionOf: original.id,
    });
    request.mockResolvedValue(data);
    const f = await page(),
      p = f.componentInstance;
    expect(p.register().rows).toHaveLength(2);
    expect(p.metrics().map((m) => m.value)).toEqual([1, 1, '0%', 1]);
    expect(p.register().rows[0].cells).toContain('Superseded · Given');
  });
  it('uses record IDs to keep equal-name rows stable in both sort directions', async () => {
    const value = response();
    value.results[0].administrations.push({
      ...value.results[0].administrations[0],
      id: 'aaa-entry',
      date: '2026-11-13',
    });
    value.summary.administrations = 2;
    request.mockResolvedValue(value);
    const f = await page(),
      p = f.componentInstance;
    expect(p.filteredRows().map((r) => r.id)).toEqual(['aaa-entry', 'entry']);
    p.sortDirection.set(-1);
    expect(p.filteredRows().map((r) => r.id)).toEqual(['entry', 'aaa-entry']);
  });
  it('exports tab, service user, dates, search and sort through the backend', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.activeTab.set('Controlled drugs');
    p.selectedClient.set('client');
    p.rangeStart.set('2026-01-01');
    p.rangeEnd.set('2026-11-14');
    p.search.set(' medicine ');
    p.sortDirection.set(-1);
    request.mockResolvedValueOnce(new Blob(['Medicine']));
    p.exportRegister();
    await Promise.resolve();
    const query = new URL(String(request.mock.lastCall![0]), 'https://example.test').searchParams;
    expect(Object.fromEntries(query)).toEqual({
      q: ' medicine ',
      ordering: '-name',
      view: 'Controlled drugs',
      client: 'client',
      start: '2026-01-01',
      end: '2026-11-14',
    });
    expect(click).toHaveBeenCalledOnce();
    expect((click.mock.instances[0] as HTMLAnchorElement).download).toBe('medication.csv');
  });
  it('rejects reversed dates before exporting', async () => {
    const f = await page(),
      p = f.componentInstance;
    request.mockClear();
    p.rangeStart.set('2026-12-01');
    p.rangeEnd.set('2026-11-01');
    p.filterChanged();
    p.exportRegister();
    expect(p.error()).toContain('end date');
    expect(request).not.toHaveBeenCalled();
  });
  it('clears every medication filter while retaining the selected view', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.activeTab.set('PRN prescriptions');
    p.selectedClient.set('client');
    p.rangeStart.set('2026-12-01');
    p.rangeEnd.set('2026-11-01');
    p.search.set('missing');
    p.filterChanged();
    p.clearFilters();
    expect([p.selectedClient(), p.rangeStart(), p.rangeEnd(), p.search(), p.error()]).toEqual([
      '',
      '',
      '',
      '',
      '',
    ]);
    expect(p.activeTab()).toBe('PRN prescriptions');
    expect(p.filteredRows()).toHaveLength(1);
  });
  it('clears previously readable records when an export is denied after revocation', async () => {
    await load();
    request.mockRejectedValueOnce(Object.assign(Error('Export access revoked'), { status: 403 }));
    await expect(api.export({})).rejects.toThrow('Export access revoked');
    expect(api.ready()).toBe(false);
    expect(api.records()).toEqual([]);
    expect(click).not.toHaveBeenCalled();
  });
  it('requires explicit export and provider capabilities', async () => {
    const value = response();
    value.capabilities = { export: false, view_provider: false };
    request.mockResolvedValue(value);
    await load();
    await expect(api.export({})).rejects.toThrow('not permitted');
    expect(api.canViewProvider()).toBe(false);
    expect(click).not.toHaveBeenCalled();
  });
  it('clears open records on revoked access and recovers on retry', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.openRecord(p.register().rows[0]);
    request.mockRejectedValueOnce(
      Object.assign(Error('Inspection access revoked'), { status: 403 }),
    );
    await api.load();
    f.detectChanges();
    expect(api.records()).toEqual([]);
    expect(p.modalOpen()).toBe(false);
    expect(f.nativeElement.textContent).toContain('Inspection access revoked');
    request.mockResolvedValueOnce(response());
    await api.load();
    f.detectChanges();
    expect(p.register().rows).toHaveLength(1);
  });
  it('does not retain data across workspace or account changes', async () => {
    await load();
    actor.set({ id: 'other' });
    expect(api.value()).toBeNull();
    companyId.set('other');
    expect(api.company()).toBeUndefined();
  });
  it('ignores late responses after leaving the module', async () => {
    let resolve!: (v: InspectorMedicationPage) => void;
    request.mockReturnValueOnce(new Promise<InspectorMedicationPage>((r) => (resolve = r)));
    api.start();
    const pending = api.load();
    api.stop();
    resolve(response());
    await pending;
    expect(api.records()).toEqual([]);
  });
  it('fails closed for foreign, duplicate or incomplete responses', async () => {
    const value = response();
    value.meta.company_id = 'other';
    request.mockResolvedValueOnce(value);
    await load();
    expect(api.ready()).toBe(false);
    expect(api.error()).toContain('workspace');
    request.mockResolvedValueOnce({
      ...response(),
      summary: { active_prescriptions: 1, prescriptions: 2, administrations: 1 },
    });
    await api.load();
    expect(api.ready()).toBe(false);
    expect(api.error()).toContain('changed while loading');
  });
  it('loads all authorised pages before presenting the medication register', async () => {
    const first = response(),
      second = response();
    first.count = 2;
    first.summary = { active_prescriptions: 2, prescriptions: 2, administrations: 2 };
    second.count = 2;
    second.results[0].id = 'second';
    second.results[0].prescriptions[0].id = 'second-prescription';
    second.results[0].administrations[0].id = 'second-entry';
    request.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    await load();
    expect(api.records()).toHaveLength(2);
    expect(request.mock.calls[1][0]).toContain('page=2');
  });
  it('releases branding and rejects delayed downloads after exit', async () => {
    const value = response();
    value.company.logo_available = true;
    request.mockResolvedValueOnce(value).mockResolvedValueOnce(new Blob(['logo']));
    await load();
    expect(api.company()?.logo).toBe('blob:medication');
    let resolve!: (v: Blob) => void;
    request.mockReturnValueOnce(new Promise<Blob>((r) => (resolve = r)));
    const pending = api.export({});
    api.stop();
    resolve(new Blob(['csv']));
    await pending;
    expect(click).not.toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:medication');
  });
  it('rejects pages from different source revisions even when their counts match', async () => {
    const first = response(), second = response();
    first.count = second.count = first.results.length + 1;
    second.meta.revision = 'b'.repeat(64);

    request.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    await load();
    expect(api.ready()).toBe(false);
    expect(api.error()).toContain('changed while loading');
    expect(request).toHaveBeenCalledTimes(2);
  });

});
