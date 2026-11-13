import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { CompanyAccessService } from '../../core/access/company-access.service';
import { ManagementStore } from '../management/shared/management.store';
import { InspectorProviderApi } from './inspector-provider-api.service';
import { InspectorProviderService } from './inspector-provider.service';
import { InspectorService } from './inspector.service';
import { InspectorPage } from './inspector-page';
import { InspectorProviderRead } from './inspector-provider.generated';

function response(): InspectorProviderRead {
  return {
    company_id: 'one',
    company: {
      id: 'one',
      name: 'Source Provider',
      code: 'SOURCE',
      trading_name: 'Care trading',
      registration_number: 'REG-123',
      sector: 'Domiciliary Care',
      registered_places: 0,
      date_established: null,
      country: 'United Kingdom',
      region: null,
      active: true,
      updated_at: '2026-11-13T12:00:00Z',
      registered_address: {
        line1: '1 Registered Road',
        line2: null,
        city: null,
        county: null,
        postcode: 'AA1 1AA',
        country: null,
      },
      head_office_address: {
        line1: '2 Office Road',
        line2: null,
        city: null,
        county: null,
        postcode: null,
        country: null,
      },
      contacts: {
        primary: {
          mainPhone: '01234567890',
          generalEmail: null,
          website: null,
          emergencyContact: null,
          outOfHoursNumber: null,
        },
        addresses: {},
        keyContacts: [],
      },
      compliance: {
        regulator_number: 'CQC-100',
        provider_type: null,
        registration_status: null,
        regulatory_region: null,
        inspection_type: null,
        data_protection_number: null,
        safeguarding_lead: null,
        medication_lead: null,
        insurance_expiry: null,
      },
      logo_available: false,
    },
    locations: [
      {
        id: 'location',
        name: 'Source location',
        type: 'Domiciliary Care',
        registered_places: 0,
        status: 'Active',
      },
    ],
    service_user_count: 12,
    documents: [
      {
        id: 'file',
        name: 'Continuity plan.pdf',
        kind: 'business_continuity_plan',
        content_type: 'application/pdf',
        size: 100,
        owner: null,
        updated: '2026-11-13T10:00:00Z',
        expiry: null,
        version: 1,
        scan_state: 'not_available',
      },
    ],
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
    capabilities: { edit_details: true, download_evidence: true },
    meta: { timezone: 'Europe/London', as_of: '2026-11-13T12:00:00Z', source: 'provider_records' },
    request_id: 'request',
  };
}

describe('Connected inspector provider profile', () => {
  const companyId = signal('one'),
    actor = signal({ id: 'actor' }),
    context = signal({
      revision: 1,
      request_id: 'initial',
      permissions: ['inspector_portal.provider.read'],
    });
  let click: ReturnType<typeof vi.spyOn>;
  let api: InspectorProviderApi;
  let request: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:verification');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    companyId.set('one');
    actor.set({ id: 'actor' });
    context.set({
      revision: 1,
      request_id: 'initial',
      permissions: ['inspector_portal.provider.read'],
    });
    request = vi.fn().mockImplementation(async () => response());
    TestBed.configureTestingModule({
      imports: [InspectorPage],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { api: request, profile: actor, isAuthenticated: () => true },
        },
        { provide: CompanyAccessService, useValue: { companyId, context } },
        { provide: InspectorService, useClass: InspectorProviderService },
        {
          provide: ManagementStore,
          useFactory: () => {
            throw Error('Provider must not load the browser workspace');
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ page: 'provider' }),
            queryParamMap: of(convertToParamMap({})),
            snapshot: { data: { page: 'provider' }, queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    });
    api = TestBed.inject(InspectorProviderApi);
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
  it('loads the scoped backend profile and preserves known zero and missing facts', async () => {
    await load();
    expect(request).toHaveBeenCalledWith('/companies/one/inspector/provider');
    expect(api.company()?.name).toBe('Source Provider');
    expect(api.company()?.registeredPlaces).toBe(0);
    expect(api.company()?.compliance?.cqcNumber).toBe('CQC-100');
    expect(api.registeredAddress()).toContain('1 Registered Road');
    expect(api.company()?.headOfficeAddress).toBe('2 Office Road');
    expect(api.state().draft.type).toBe('');
    expect(api.serviceUserCount()).toBe(12);
    expect(api.company()?.compliance?.documents.continuity?.id).toBe('file');
  });
  it('renders the existing provider page entirely from backend records without instantiating the browser store', async () => {
    const fixture = TestBed.createComponent(InspectorPage);
    fixture.detectChanges();
    await api.load();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Source Provider');
    expect(text).toContain('Source location');
    expect(text).toContain('1 Registered Road');
    expect(text).toContain('2 Office Road');
    expect(text).toContain('Continuity plan.pdf');
    expect(TestBed.inject(InspectorService).locations()[0].registeredPlaces).toBe(0);
    expect(text).not.toContain('Saved on this device');
    expect(fixture.nativeElement.querySelectorAll('cv-inspection-questions article')).toHaveLength(
      5,
    );
  });
  it('saves details using the server version and refreshes the visible inspection', async () => {
    await load();
    request.mockResolvedValueOnce({
      company_id: 'one',
      id: 'details',
      version: 1,
      etag: '"v1"',
      type: 'Focused inspection',
      start: '2026-11-01',
      end: '2026-11-02',
      updated: '2026-11-13T12:10:00Z',
      by: 'Reviewer',
    });
    expect(
      await api.saveDetails(
        {
          ...api.state().draft,
          type: 'Focused inspection',
          start: '2026-11-01',
          end: '2026-11-02',
        },
        'one',
      ),
    ).toBe(true);
    expect(request).toHaveBeenLastCalledWith(
      '/companies/one/inspector/provider/inspection',
      { type: 'Focused inspection', start: '2026-11-01', end: '2026-11-02' },
      'PATCH',
      { 'If-Match': '"v0"' },
    );
    expect(api.state().draft.revision).toBe(1);
    expect(api.state().draft.start).toBe('2026-11-01');
  });
  it('keeps unsaved form details and reports validation failure without reporting success', async () => {
    const fixture = TestBed.createComponent(InspectorPage);
    fixture.detectChanges();
    await api.load();
    fixture.detectChanges();
    const page = fixture.componentInstance;
    page.openModal('setup', 'Inspection details');
    page.updateDraft('type', 'Unsaved focused review');
    request.mockRejectedValueOnce(
      Object.assign(Error('Check the inspection dates.'), { status: 400 }),
    );
    await page.saveDetails();
    fixture.detectChanges();
    expect(page.draft().type).toBe('Unsaved focused review');
    expect(page.dirty()).toBe(true);
    expect(page.modalOpen()).toBe(true);
    expect(page.message()).toBe('');
    expect(page.error()).toContain('dates');
  });
  it('uses server capabilities to disable editing and downloading', async () => {
    const value = response();
    value.capabilities = { edit_details: false, download_evidence: false };
    request.mockResolvedValue(value);
    await load();
    expect(api.canEdit()).toBe(false);
    expect(api.canDownload()).toBe(false);
    const count = request.mock.calls.length;
    expect(await api.saveDetails(api.state().draft, 'one')).toBe(false);
    await expect(api.download('file')).rejects.toThrow('not permitted');
    expect(request.mock.calls).toHaveLength(count);
  });
  it('clears sensitive records immediately when workspace or user changes', async () => {
    await load();
    companyId.set('two');
    expect(api.company()).toBeUndefined();
    expect(api.documents()).toEqual([]);
    expect(api.contacts()).toEqual({});
    companyId.set('one');
    actor.set({ id: 'different' });
    expect(api.company()).toBeUndefined();
  });
  it('discards a late response after a workspace change', async () => {
    let resolve!: (value: InspectorProviderRead) => void;
    request.mockReturnValueOnce(new Promise<InspectorProviderRead>((done) => (resolve = done)));
    api.start();
    companyId.set('two');
    resolve(response());
    await api.load();
    expect(api.ready()).toBe(false);
    expect(api.company()).toBeUndefined();
  });
  it('rejects foreign response data and never falls back to browser records', async () => {
    request.mockResolvedValue({ ...response(), company_id: 'foreign' });
    await load();
    expect(api.ready()).toBe(false);
    expect(api.error()).toContain('workspace');
    expect(api.documents()).toEqual([]);
  });
  it('clears previous records on a failed refresh and renders the branded unavailable panel', async () => {
    const fixture = TestBed.createComponent(InspectorPage);
    fixture.detectChanges();
    await api.load();
    fixture.detectChanges();
    request.mockRejectedValueOnce(
      Object.assign(Error('Your inspection engagement has ended.'), { status: 403 }),
    );
    await api.load();
    fixture.detectChanges();
    expect(api.ready()).toBe(false);
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Provider profile unavailable');
    expect(text).toContain('engagement has ended');
    expect(text).not.toContain('Source Provider');
  });
  it('clears all records on a denied mutation and blocks stale tenant writes', async () => {
    await load();
    const count = request.mock.calls.length;
    expect(await api.saveDetails(api.state().draft, 'other')).toBe(false);
    expect(request.mock.calls).toHaveLength(count);
    request.mockRejectedValueOnce(Object.assign(Error('No access'), { status: 403 }));
    expect(await api.saveDetails(api.state().draft, 'one')).toBe(false);
    expect(api.ready()).toBe(false);
    expect(api.documents()).toEqual([]);
  });
  it('only downloads listed evidence through the guarded backend route and reports scanner errors', async () => {
    await load();
    await expect(api.download('foreign')).rejects.toThrow('not permitted');
    request.mockRejectedValueOnce(
      Object.assign(Error('Evidence scanning is not configured.'), { status: 503 }),
    );
    await expect(api.download('file')).rejects.toThrow('scanning');
    expect(request).toHaveBeenLastCalledWith(
      '/companies/one/inspector/provider/evidence/file/content',
      undefined,
      undefined,
      undefined,
      'blob',
    );
  });
  it('discards responses after leaving the provider page', async () => {
    let resolve!: (value: InspectorProviderRead) => void;
    request.mockReturnValueOnce(new Promise<InspectorProviderRead>((done) => (resolve = done)));
    api.start();
    api.stop();
    resolve(response());
    await Promise.resolve();
    await Promise.resolve();
    expect(api.ready()).toBe(false);
  });
  it('reviews recorded recommendation states without navigating into browser-only reports', async () => {
    const fixture = TestBed.createComponent(InspectorPage);
    fixture.detectChanges();
    await api.load();
    fixture.detectChanges();
    const page = fixture.componentInstance,
      event = new Event('click', { cancelable: true });
    page.reviewProviderRatings(event);
    fixture.detectChanges();
    expect(event.defaultPrevented).toBe(true);
    expect(page.modalOpen()).toBe(true);
    expect(page.record()?.detail['Safe']).toBe('Not assessed');
    expect(Object.keys(page.record()!.detail)).toHaveLength(5);
    page.search.set('continuity');
    expect(page.documents()).toHaveLength(1);
    page.search.set('no matching evidence');
    expect(page.documents()).toHaveLength(0);
  });
  it('reloads the current server version after a conflict while keeping the proposed form values', async () => {
    const fixture = TestBed.createComponent(InspectorPage);
    fixture.detectChanges();
    await api.load();
    fixture.detectChanges();
    const page = fixture.componentInstance;
    page.updateDraft('type', 'Proposed review');
    const newer = response();
    newer.inspection = { ...newer.inspection, version: 2, etag: '"v2"', type: 'Saved elsewhere' };
    request
      .mockRejectedValueOnce(
        Object.assign(Error('This record changed. Reload and retry.'), { status: 412 }),
      )
      .mockResolvedValueOnce(newer);
    await page.saveDetails();
    fixture.detectChanges();
    expect(api.state().draft.revision).toBe(2);
    expect(page.draft().type).toBe('Proposed review');
    expect(page.dirty()).toBe(true);
    expect(api.busy()).toBe(false);
    expect(page.message()).toBe('');
  });
  it('clears records and retains an access explanation when a download is revoked', async () => {
    await load();
    request.mockRejectedValueOnce(
      Object.assign(Error('Your inspection access is revoked.'), { status: 403 }),
    );
    await expect(api.download('file')).rejects.toThrow('revoked');
    expect(api.ready()).toBe(false);
    expect(api.error()).toContain('revoked');
  });
  it('preserves loaded records and unsaved details during equivalent access refreshes', async () => {
    const fixture = TestBed.createComponent(InspectorPage);
    fixture.detectChanges();
    await api.load();
    fixture.detectChanges();
    const page = fixture.componentInstance;
    page.openModal('setup', 'Inspection details');
    page.updateDraft('type', 'Unsaved review');
    context.set({ ...context(), request_id: 'another-request' });
    TestBed.tick();
    fixture.detectChanges();
    expect(api.ready()).toBe(true);
    expect(page.modalOpen()).toBe(true);
    expect(page.dirty()).toBe(true);
    expect(page.draft().type).toBe('Unsaved review');
  });
  it('labels expired and due evidence using the source company date', async () => {
    const data = response();
    data.meta.timezone = 'Pacific/Kiritimati';
    data.meta.as_of = '2026-11-12T10:30:00Z';
    const original = data.documents[0];
    data.documents = [
      { ...original, expiry: '2026-11-12' },
      { ...original, id: 'due', expiry: '2026-12-12' },
      { ...original, id: 'current', expiry: '2027-01-01' },
    ];
    request.mockResolvedValue(data);
    await load();
    expect(api.documents().map((row) => row.status)).toEqual(['Expired', 'Review due', 'Recorded']);
  });
  it('uses company dates for provider timestamps and preserves calendar-only dates', async () => {
    const data = response();
    data.meta.timezone = 'Pacific/Kiritimati';
    request.mockResolvedValue(data);
    const fixture = TestBed.createComponent(InspectorPage);
    fixture.detectChanges();
    await api.load();
    fixture.detectChanges();
    expect(fixture.componentInstance.date('2026-11-12T10:30:00Z')).toBe('13 Nov 2026');
    expect(fixture.componentInstance.date('2026-11-12')).toBe('12 Nov 2026');
  });
  it('delivers a slow authorised evidence download despite a background profile refresh', async () => {
    await load();
    let resolve!: (value: Blob) => void;
    request.mockReturnValueOnce(new Promise<Blob>((done) => (resolve = done)));
    const pending = api.download('file');
    await api.load();
    const blob = new Blob(['certificate'], { type: 'application/pdf' });
    resolve(blob);
    await pending;
    expect(click).toHaveBeenCalledOnce();
    const link = click.mock.instances[0] as HTMLAnchorElement;
    expect(link.download).toBe('Continuity plan.pdf');
    expect(link.href).toBe('blob:verification');
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  });
  it('discards an evidence response after leaving the provider page', async () => {
    await load();
    let resolve!: (value: Blob) => void;
    request.mockReturnValueOnce(new Promise<Blob>((done) => (resolve = done)));
    const pending = api.download('file');
    api.stop();
    resolve(new Blob(['private file']));
    await pending;
    expect(click).not.toHaveBeenCalled();
    expect(api.ready()).toBe(false);
  });
  it('does not deliver an outdated file when evidence changes during its download', async () => {
    await load();
    let resolve!: (value: Blob) => void;
    request.mockReturnValueOnce(new Promise<Blob>((done) => (resolve = done)));
    const pending = api.download('file');
    const changed = response();
    changed.documents[0].version = 2;
    request.mockResolvedValueOnce(changed);
    await api.load();
    resolve(new Blob(['old file']));
    await expect(pending).rejects.toThrow('evidence changed');
    expect(click).not.toHaveBeenCalled();
    expect(api.ready()).toBe(true);
  });
});
