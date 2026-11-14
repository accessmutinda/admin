import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { CompanyAccessService } from '../../core/access/company-access.service';
import { ManagementStore } from '../management/shared/management.store';
import { InspectorQualityApi } from './inspector-quality-api.service';
import { InspectorQualityService } from './inspector-quality.service';
import { InspectorService } from './inspector.service';
import { InspectorPage } from './inspector-page';
import { InspectorQualityPage } from './inspector-provider.generated';

function response(): InspectorQualityPage {
  return {
    recommendations: { version: 0, ratings: {}, summary: '' },
    count: 1,
    next: null,
    previous: null,
    results: [
      {
        id: 'assessment',
        version: 3,
        template_code: 'visit',
        title: 'Quality visit form',
        subject_name: 'Source Provider',
        assessor_name: 'Quality Reviewer',
        date: '2026-11-12',
        review_date: '2027-01-01',
        context: 'Recorded assessment context',
        status: 'Signed off',
        answers: { 'Visit type': 'Planned' },
        outcome: 'Recorded assessment outcome',
        recommendations: 'Recorded follow-up',
        signature: {
          name: 'Independent Reviewer',
          role: 'Reviewer',
          at: '2026-11-13T12:00:00Z',
          declaration: true,
        },
        evidence: [
          {
            id: 'file',
            version: 2,
            name: 'Audit evidence.pdf',
            content_type: 'application/pdf',
            size: 100,
            caption: 'Linked source evidence',
          },
        ],
        audit: [
          {
            id: 'event',
            at: '2026-11-13T12:00:00Z',
            actor: 'Independent Reviewer',
            action: 'Assessment signed off',
            detail: 'Review declaration confirmed',
          },
        ],
      },
    ],
    actions: [
      {
        id: 'action',
        version: 1,
        assessment_id: 'assessment',
        title: 'Improve quality records',
        owner_name: 'Quality Owner',
        due: '2027-01-01',
        priority: 'High',
        status: 'Open',
        resolution: '',
      },
    ],
    findings: [],
    summary: {
      assessments: 1,
      signed_off: 1,
      open_actions: 1,
      clean_evidence: 1,
      covered_questions: 1,
    },
    preparation: { registration_recorded: true, findings_resolved: null },
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
    capabilities: { export: true, view_provider: true },
    meta: {
      company_id: 'one',
      revision: 'a'.repeat(64),
      as_of: '2026-11-14T12:00:00Z',
      timezone: 'Europe/London',
      request_id: 'test',
      filters: { page: 1, page_size: 100 },
      disclosure: 'Current quality evidence',
    },
  };
}
describe('Inspector quality and compliance integration', () => {
  const companyId = signal('one'),
    actor = signal({ id: 'reviewer' }),
    context = signal({ revision: 1, permissions: ['inspector_portal.quality.read'] });
  let api: InspectorQualityApi,
    request: ReturnType<typeof vi.fn>,
    click: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    companyId.set('one');
    actor.set({ id: 'reviewer' });
    context.set({ revision: 1, permissions: ['inspector_portal.quality.read'] });
    request = vi.fn().mockResolvedValue(response());
    click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:quality');
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
        { provide: InspectorService, useClass: InspectorQualityService },
        {
          provide: ManagementStore,
          useFactory: () => {
            throw Error('Quality must not load browser workspace');
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ page: 'quality' }),
            queryParamMap: of(convertToParamMap({})),
            snapshot: { data: { page: 'quality' }, queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    });
    api = TestBed.inject(InspectorQualityApi);
  });
  afterEach(() => {
    api.stop();
    vi.restoreAllMocks();
  });
  async function page() {
    const f = TestBed.createComponent(InspectorPage);
    f.detectChanges();
    await api.load();
    f.detectChanges();
    return f;
  }
  async function load() {
    api.start();
    await api.load();
    TestBed.tick();
  }
  it('uses real assessment and corrective-action data in the existing layout', async () => {
    const f = await page(),
      p = f.componentInstance;
    expect(f.nativeElement.textContent).toContain('Quality visit form');
    expect(f.nativeElement.textContent).toContain('Improve quality records');
    expect(f.nativeElement.textContent).toContain('Quality Owner');
    expect(p.metrics().map((m) => m.value)).toEqual([1, 1, 1, '1/5']);
    expect(p.readyCount()).toBe(1);
    expect(f.nativeElement.textContent).toContain('incident access required');
    expect(f.nativeElement.textContent).not.toContain('Save draft');
  });
  it('opens a read-only assessment with human field labels, signature, audit and evidence', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.openRecord(p.register().rows[0]);
    f.detectChanges();
    const dialog = f.nativeElement.querySelector('[role=dialog]');
    expect(dialog.textContent).toContain('Visit type');
    expect(dialog.textContent).toContain('Independent Reviewer');
    expect(dialog.textContent).toContain('Audit evidence.pdf');
    expect(dialog.textContent).toContain('Recorded assessment context');
    expect(dialog.querySelectorAll('input,textarea')).toHaveLength(0);
  });
  it('updates an open assessment after reopening and recalculates signoff and evidence counts', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.openRecord(p.register().rows[0]);
    const changed = response();
    changed.results[0].version = 4;
    changed.results[0].status = 'Draft';
    changed.results[0].signature = null;
    changed.results[0].evidence = [];
    changed.summary.signed_off = 0;
    changed.summary.clean_evidence = 0;
    changed.summary.covered_questions = 0;
    request.mockResolvedValueOnce(changed);
    await api.load();
    f.detectChanges();
    expect(p.record()?.detail['Status']).toBe('Draft');
    expect(p.record()?.detail['Signature']).toBe('Not recorded');
    expect(p.metrics().map((m) => m.value)).toEqual([1, 0, 1, '0/5']);
  });
  it('updates completed corrective actions from their owning source', async () => {
    const f = await page(),
      p = f.componentInstance;
    const changed = response();
    changed.actions[0].status = 'Completed';
    changed.actions[0].resolution = 'Source action completed';
    changed.summary.open_actions = 0;
    request.mockResolvedValueOnce(changed);
    await api.load();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Source action completed');
    expect(p.metrics()[2].value).toBe(0);
  });
  it('reviews missing recommendations without navigating to unfinished reports or closing the drawer', async () => {
    const f = await page(),
      p = f.componentInstance;
    const event = new Event('click', { cancelable: true });
    p.reviewProviderRatings(event);
    f.detectChanges();
    expect(event.defaultPrevented).toBe(true);
    expect(p.modalOpen()).toBe(true);
    expect(f.nativeElement.querySelector('[role=dialog]').textContent).toContain('Not assessed');
    const next = response();
    request.mockResolvedValueOnce(next);
    await api.load();
    f.detectChanges();
    expect(p.modalOpen()).toBe(true);
  });
  it('searches and exports the same register through the backend', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.search.set(' reviewer ');
    expect(p.filteredRows()).toHaveLength(1);
    p.search.set('unmatched');
    expect(p.filteredRows()).toHaveLength(0);
    p.search.set('Quality');
    p.sortDirection.set(-1);
    request.mockResolvedValueOnce(new Blob(['Assessment']));
    p.exportRegister();
    await Promise.resolve();
    expect(request.mock.lastCall![0]).toContain('/quality/export?q=Quality&ordering=-name');
    expect(click).toHaveBeenCalledOnce();
    expect((click.mock.instances[0] as HTMLAnchorElement).download).toBe(
      'quality-and-compliance.csv',
    );
  });
  it('requires separate export and provider authority', async () => {
    const value = response();
    value.capabilities = { export: false, view_provider: false };
    request.mockResolvedValue(value);
    await load();
    await expect(api.export({})).rejects.toThrow('not permitted');
    expect(api.canViewProvider()).toBe(false);
    expect(click).not.toHaveBeenCalled();
  });
  it('clears source records and drawers on denied access and supports retry', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.openRecord(p.register().rows[0]);
    request.mockRejectedValueOnce(
      Object.assign(Error('Inspection access revoked'), { status: 403 }),
    );
    await api.load();
    f.detectChanges();
    expect(p.modalOpen()).toBe(false);
    expect(p.register().rows).toEqual([]);
    expect(p.data.quality().actions).toEqual([]);
    expect(f.nativeElement.textContent).toContain('Inspection access revoked');
    request.mockResolvedValueOnce(response());
    await api.load();
    f.detectChanges();
    expect(p.register().rows).toHaveLength(1);
  });
  it('rejects foreign and incomplete responses rather than using workspace data', async () => {
    const value = response();
    value.meta.company_id = 'other';
    request.mockResolvedValueOnce(value);
    await load();
    expect(api.ready()).toBe(false);
    expect(api.error()).toContain('workspace');
    request.mockResolvedValueOnce({ ...response(), count: 2 });
    request.mockResolvedValueOnce({ ...response(), count: 1 });
    await api.load();
    expect(api.ready()).toBe(false);
  });
  it('loads all authorised pages before presenting totals', async () => {
    const first = response(),
      second = response();
    first.count = 2;
    first.summary.assessments = 2;
    first.summary.signed_off = 2;
    second.count = 2;
    second.summary.assessments = 2;
    second.results[0].id = 'second';
    request.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    await load();
    expect(api.records()).toHaveLength(2);
    expect(api.summary()?.assessments).toBe(2);
  });
  it('rejects source changes between pages even when counts stay the same, then retries cleanly', async () => {
    const first = response(),
      second = response();
    for (const value of [first, second]) {
      value.count = 2;
      value.summary.assessments = 2;
      value.summary.signed_off = 2;
    }
    second.results[0].id = 'second';
    second.results[0].context = 'Changed source review';
    second.actions[0].status = 'Completed';
    second.meta.revision = 'b'.repeat(64);
    request.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    await load();
    expect(api.ready()).toBe(false);
    expect(api.records()).toEqual([]);
    expect(api.error()).toContain('changed while loading');
    request.mockResolvedValueOnce(response());
    await api.load();
    expect(api.ready()).toBe(true);
    expect(api.records()).toHaveLength(1);
  });
  it('rejects missing source revision metadata', async () => {
    const value = response();
    value.meta.revision = '';
    request.mockResolvedValueOnce(value);
    await load();
    expect(api.ready()).toBe(false);
    expect(api.error()).toContain('incomplete');
  });
  it('ignores late reads and downloads after route exit', async () => {
    await load();
    let resolve!: (v: Blob) => void;
    request.mockReturnValueOnce(new Promise<Blob>((r) => (resolve = r)));
    const pending = api.export({});
    api.stop();
    resolve(new Blob(['CSV']));
    await pending;
    expect(click).not.toHaveBeenCalled();
    expect(api.records()).toEqual([]);
  });
  it('clears records immediately on company and account changes', async () => {
    await load();
    actor.set({ id: 'other' });
    expect(api.value()).toBeNull();
    companyId.set('other');
    expect(api.company()).toBeUndefined();
  });
  it('renders legitimate empty quality and action data', async () => {
    const value = response();
    value.count = 0;
    value.results = [];
    value.actions = [];
    value.summary = {
      assessments: 0,
      signed_off: 0,
      open_actions: 0,
      clean_evidence: 0,
      covered_questions: 0,
    };
    request.mockResolvedValue(value);
    const f = await page();
    expect(api.ready()).toBe(true);
    expect(f.nativeElement.textContent).toContain('No corrective actions recorded');
  });
  it('uses saved report recommendations and clears them from the open drawer when revoked', async () => {
    const saved = response();
    saved.recommendations = {
      version: 2,
      ratings: Object.fromEntries(
        ['Safe', 'Effective', 'Caring', 'Responsive', 'Well-led'].map((q) => [q, 'Good']),
      ),
      summary: 'Shared current summary',
    };
    request.mockResolvedValue(saved);
    const f = await page(),
      p = f.componentInstance;
    expect(p.readyCount()).toBe(3);
    p.reviewProviderRatings(new Event('click'));
    f.detectChanges();
    expect(p.record()?.detail['Safe']).toBe('Good');
    const changed = response();
    changed.recommendations = { version: 3, ratings: { Safe: 'Inadequate' }, summary: '' };
    request.mockResolvedValue(changed);
    await api.load();
    f.detectChanges();
    expect(p.record()?.detail['Safe']).toBe('Inadequate');
    const revoked = response();
    revoked.recommendations = null;
    request.mockResolvedValue(revoked);
    await api.load();
    f.detectChanges();
    expect(p.record()?.detail['Safe']).toBe('Report access required');
    expect(f.nativeElement.querySelector('[role=dialog]').textContent).not.toContain('Inadequate');
    expect(p.readyCount()).toBe(1);
  });
});
