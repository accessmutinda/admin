import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { CompanyAccessService } from '../../core/access/company-access.service';
import { ManagementStore } from '../management/shared/management.store';
import { InspectorDashboardApi } from './inspector-dashboard-api.service';
import { InspectorDashboardService } from './inspector-dashboard.service';
import { InspectorReportsApi } from './inspector-reports-api.service';
import { InspectorService } from './inspector.service';
import { InspectorPage } from './inspector-page';
import { InspectorDashboardRead } from './inspector-provider.generated';

function response(): InspectorDashboardRead {
  return {
    company: {
      id: 'one',
      name: 'Shared provider',
      code: 'SHARED',
      active: true,
      sector: null,
      registered_places: 0,
      updated_at: '2026-11-14T08:00:00Z',
      head_office_address: null,
      postcode: null,
      logo_available: false,
    },
    inspection: {
      id: null,
      version: 4,
      etag: '"v4"',
      type: 'Focused review',
      start: '2026-11-10',
      end: '2026-11-14',
      updated: null,
      by: null,
    },
    draft: {
      id: 'draft',
      version: 2,
      etag: '"v2"',
      ratings: { Safe: 'Good' },
      notes: { Safe: 'Saved safety observation', Effective: 'Saved effectiveness observation' },
      summary: 'Existing shared summary',
      updated: '2026-11-14T08:00:00Z',
      by: 'Inspector',
      findings: [],
    },
    summary: {
      service_users: 12,
      staff_records: 7,
      evidence_documents: 0,
      open_findings: 0,
      expired_evidence: 0,
    },
    preparation: {
      registration_recorded: true,
      evidence_covered: false,
      findings_resolved: false,
      questions_assessed: false,
      summary_recorded: true,
    },
    evidence: [],
    capabilities: {
      create: false,
      edit: false,
      export: false,
      view_provider: true,
      view_reports: true,
      view_documents: true,
      download: true,
    },
    meta: {
      company_id: 'one',
      as_of: '2026-11-14T12:00:00Z',
      timezone: 'Europe/London',
      request_id: 'test',
      filters: {},
      revision: 'a'.repeat(64),
      disclosure: 'Shared provisional inspection draft',
    },
  };
}

describe('Inspector dashboard connected workflow', () => {
  const companyId = signal('one'),
    actor = signal({ id: 'reviewer' }),
    context = signal({ revision: 1 });
  let api: InspectorDashboardApi, request: ReturnType<typeof vi.fn>;
  let clicks: HTMLAnchorElement[];
  beforeEach(() => {
    clicks = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicks.push(this);
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:dashboard');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    companyId.set('one');
    actor.set({ id: 'reviewer' });
    context.set({ revision: 1 });
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
        { provide: InspectorService, useClass: InspectorDashboardService },
        {
          provide: ManagementStore,
          useFactory: () => {
            throw Error('Inspector dashboard must not use browser workspace storage');
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ page: 'dashboard' }),
            queryParamMap: of(convertToParamMap({})),
            snapshot: { data: { page: 'dashboard' }, queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    });
    api = TestBed.inject(InspectorDashboardApi);
  });
  afterEach(() => {
    api.stop();
    TestBed.inject(InspectorReportsApi).stop();
    vi.restoreAllMocks();
  });
  async function page() {
    const f = TestBed.createComponent(InspectorPage);
    f.detectChanges();
    await api.load();
    f.detectChanges();
    return f;
  }
  it('renders shared provider data counts recommendations and preparation without local storage', async () => {
    const f = await page(),
      p = f.componentInstance;
    expect(request.mock.calls[0][0]).toBe('/companies/one/inspector/dashboard');
    expect(p.data.dashboardBackend).toBe(api);
    expect(p.metrics().map((m) => m.value)).toEqual([0, 12, 7, 0, 0]);
    expect(p.readyCount()).toBe(2);
    expect(p.data.state().draft.ratings['Safe']).toBe('Good');
    expect(f.nativeElement.textContent).toContain('Shared provider');
    expect(f.nativeElement.textContent).toContain('No open inspection findings recorded.');
    expect(f.nativeElement.querySelector('a[href="/inspector/reports"]')).toBeTruthy();
  });
  it('shows unavailable counts and hides actions for restricted source permissions', async () => {
    const data = response();
    data.summary.service_users = data.summary.staff_records = data.summary.open_findings = null;
    data.preparation.findings_resolved =
      data.preparation.questions_assessed =
      data.preparation.summary_recorded =
        null;
    data.capabilities = {
      view_provider: true,
      view_reports: false,
      view_documents: false,
      download: false,
    };
    data.draft = { ...data.draft, ratings: {}, notes: {}, summary: '' };
    request.mockResolvedValue(data);
    const f = await page();
    expect(f.componentInstance.metrics().map((m) => m.value)).toEqual([0, '—', '—', '—', 0]);
    expect(f.nativeElement.querySelector('a[href="/inspector/reports"]')).toBeNull();
    expect(f.nativeElement.querySelector('a[href="/inspector/documents"]')).toBeNull();
    expect(f.nativeElement.textContent).toContain('Report access is required');
    expect(f.nativeElement.textContent).toContain('report access required');
    expect(api.canPack()).toBe(false);
  });
  it('clears private records on revocation and recovers through Retry', async () => {
    const f = await page();
    request.mockRejectedValue(Object.assign(Error('Inspection access revoked'), { status: 403 }));
    await api.load();
    f.detectChanges();
    expect(api.ready()).toBe(false);
    expect(f.nativeElement.textContent).toContain('Inspector dashboard unavailable');
    expect(f.nativeElement.textContent).not.toContain('Shared provider');
    request.mockResolvedValue(response());
    f.nativeElement.querySelector('section button').click();
    await api.load();
    f.detectChanges();
    expect(api.ready()).toBe(true);
    expect(f.nativeElement.textContent).toContain('Shared provider');
  });
  it('rejects responses for another company', async () => {
    const data = response();
    data.company.id = 'other';
    request.mockResolvedValue(data);
    await page();
    expect(api.ready()).toBe(false);
    expect(api.error()).toContain('does not match this workspace');
  });
  it('ignores a delayed response after leaving and reopening the dashboard', async () => {
    let resolve!: (value: InspectorDashboardRead) => void;
    request.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    api.start();
    const old = api.load();
    api.stop();
    api.start();
    await api.load();
    const data = response();
    data.company.name = 'Stale private provider';
    resolve(data);
    await old;
    expect(api.company()?.name).toBe('Shared provider');
  });
  it('clears data immediately on workspace changes while the next request is pending', async () => {
    await page();
    request.mockImplementation(() => new Promise(() => {}));
    companyId.set('two');
    TestBed.tick();
    expect(api.ready()).toBe(false);
    expect(api.company()).toBeUndefined();
    expect(api.state().draft.notes).toEqual({});
  });
  it('blocks pack requests without downloadable authorised files', async () => {
    await page();
    await expect(api.pack()).rejects.toThrow('not permitted');
    expect(request.mock.calls.some((call) => call[2] === 'POST')).toBe(false);
  });
  function withFiles(): InspectorDashboardRead {
    const data = response();
    const row: InspectorDashboardRead['evidence'][number] = {
      id: 'inspection:file',
      version: '3',
      source_version: 3,
      name: 'Shared evidence',
      filename: 'file.txt',
      category: 'Audits',
      questions: ['Safe'],
      owner: 'Reviewer',
      updated: '2026-11-14T08:00:00Z',
      expiry: null,
      status: 'Recorded',
      source: 'Inspection evidence',
      state: 'clean',
      content_type: 'text/plain',
      size: 4,
      downloadable: true,
    };
    data.evidence = [row, { ...row, id: 'care:metadata', downloadable: false }];
    data.summary.evidence_documents = 2;
    return data;
  }
  it('downloads only authorised original files through the shared versioned pack endpoint', async () => {
    request.mockResolvedValue(withFiles());
    const f = await page();
    const blob = new Blob(['zip']);
    request.mockResolvedValueOnce(blob);
    f.componentInstance.pack(true);
    await Promise.resolve();
    expect(request).toHaveBeenLastCalledWith(
      '/companies/one/inspector/documents/pack',
      { documents: [{ id: 'inspection:file', source_version: 3 }] },
      'POST',
      undefined,
      'blob',
    );
    await vi.waitFor(() => expect(clicks).toHaveLength(1));
    expect(clicks[0].download).toBe('inspection-evidence.zip');
  });
  it('does not download a delayed pack after the dashboard has been closed and reopened', async () => {
    request.mockResolvedValue(withFiles());
    await page();
    let resolve!: (value: Blob) => void;
    request.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const pending = api.pack();
    api.stop();
    api.start();
    await api.load();
    resolve(new Blob(['zip']));
    await pending;
    expect(clicks).toHaveLength(0);
  });
  it('rejects an incomplete dashboard response', async () => {
    const data = response();
    delete (data as Partial<InspectorDashboardRead>).preparation;
    request.mockResolvedValue(data);
    await page();
    expect(api.ready()).toBe(false);
    expect(api.error()).toContain('dashboard response is incomplete');
  });
  it('exports the register through the backend without deriving a browser CSV', async () => {
    const data = response();
    data.capabilities['export'] = true;
    request.mockResolvedValue(data);
    const f = await page();
    const blob = new Blob(['csv']);
    request.mockResolvedValueOnce(blob);
    f.componentInstance.exportRegister();
    await Promise.resolve();
    expect(request).toHaveBeenLastCalledWith(
      '/companies/one/inspector/dashboard/export?q=&ordering=name',
      undefined,
      undefined,
      undefined,
      'blob',
    );
    await vi.waitFor(() => expect(clicks).toHaveLength(1));
    expect(clicks[0].download).toBe('inspection-dashboard.csv');
  });
  it.each(['pack', 'export'] as const)(
    'suppresses a delayed %s after refresh revokes that action',
    async (action) => {
      const initial = withFiles();
      initial.capabilities['export'] = true;
      request.mockResolvedValue(initial);
      await page();
      let resolve!: (value: Blob) => void;
      request.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
      const pending = api[action]();
      const revoked = withFiles();
      revoked.capabilities['download'] = false;
      revoked.capabilities['export'] = false;
      request.mockResolvedValue(revoked);
      await api.load();
      resolve(new Blob(['private export']));
      await expect(pending).rejects.toThrow('no longer permitted');
      expect(clicks).toHaveLength(0);
    },
  );
  it('does not show a previous workspace download error after its recovery read completes', async () => {
    request.mockResolvedValue(withFiles());
    await page();
    let fail!: (error: Error) => void, finish!: (value: InspectorDashboardRead) => void;
    request.mockImplementationOnce(() => new Promise((_r, reject) => (fail = reject)));
    const pending = api.pack();
    request.mockImplementationOnce(() => new Promise((r) => (finish = r)));
    fail(Error('Previous provider private file is unavailable'));
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(3));
    api.stop();
    api.start();
    await api.load();
    finish(response());
    await expect(pending).resolves.toBeUndefined();
    expect(clicks).toHaveLength(0);
  });

  it('suppresses a delayed pack when a selected source was withdrawn or replaced', async () => {
    request.mockResolvedValue(withFiles());
    await page();
    let resolve!: (value: Blob) => void;
    request.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const pending = api.pack();
    const changed = withFiles();
    changed.evidence[0].source_version++;
    request.mockResolvedValue(changed);
    await api.load();
    resolve(new Blob(['previous source file']));
    await expect(pending).rejects.toThrow('no longer permitted');
    expect(clicks).toHaveLength(0);
  });
});
