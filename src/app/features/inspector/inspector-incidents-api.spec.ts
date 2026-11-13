import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { CompanyAccessService } from '../../core/access/company-access.service';
import { ManagementStore } from '../management/shared/management.store';
import { InspectorIncidentsApi } from './inspector-incidents-api.service';
import { InspectorIncidentsService } from './inspector-incidents.service';
import { InspectorService } from './inspector.service';
import { InspectorPage } from './inspector-page';
import { InspectorIncidentPage, InspectorFindingRead } from './inspector-provider.generated';

function finding(): InspectorFindingRead {
  return {
    id: 'finding',
    version: 1,
    question: 'Safe',
    type: 'Required action',
    text: 'Review the incident response',
    owner: 'Registered manager',
    due: '2027-01-01',
    status: 'Open',
    evidenceIds: ['care:source'],
    at: '2026-11-14T12:00:00Z',
    by: 'Inspector',
  };
}
function response(): InspectorIncidentPage {
  return {
    count: 2,
    next: null,
    previous: null,
    results: [
      {
        id: 'care:source',
        source_id: 'source',
        source_type: 'care',
        version: 2,
        name: 'Recorded fall',
        detail: 'Care response recorded',
        client: 'Jane Shared',
        client_id: 'client',
        date: '2026-11-12',
        category: 'Incident',
        level: 'High',
        status: 'Completed',
        reviewed: true,
        updated_at: '2026-11-14T12:00:00Z',
      },
      {
        id: 'visit:source',
        source_id: 'source',
        source_type: 'visit',
        version: 1,
        name: 'Safeguarding',
        detail: 'Safeguarding concern recorded',
        client: 'Jane Shared',
        client_id: 'client',
        date: '2026-11-13',
        category: 'Safeguarding',
        level: null,
        status: 'Awaiting review',
        reviewed: false,
        updated_at: '2026-11-14T12:00:00Z',
      },
    ],
    findings: [finding()],
    summary: {
      recorded: 2,
      safeguarding: 1,
      awaiting_review: 1,
      reviewed: 1,
      concerns: 0,
      required_actions: 1,
      completed_actions: 0,
    },
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
    capabilities: { create: true, edit: true, export: true, view_provider: true },
    meta: {
      company_id: 'one',
      as_of: '2026-11-14T12:00:00Z',
      timezone: 'Europe/London',
      request_id: 'test',
      filters: { page: 1, page_size: 100 },
      disclosure: 'Care and visit source evidence',
    },
  };
}
describe('Inspector incidents and safeguarding integration', () => {
  const companyId = signal('one'),
    actor = signal({ id: 'reviewer' }),
    context = signal({ revision: 1, permissions: ['inspector_portal.incidents.read'] });
  let api: InspectorIncidentsApi,
    request: ReturnType<typeof vi.fn>,
    click: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    companyId.set('one');
    actor.set({ id: 'reviewer' });
    context.set({ revision: 1, permissions: ['inspector_portal.incidents.read'] });
    request = vi.fn().mockResolvedValue(response());
    click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:incidents');
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
        { provide: InspectorService, useClass: InspectorIncidentsService },
        {
          provide: ManagementStore,
          useFactory: () => {
            throw Error('Incidents must not load browser workspace');
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ page: 'incidents' }),
            queryParamMap: of(convertToParamMap({})),
            snapshot: { data: { page: 'incidents' }, queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    });
    api = TestBed.inject(InspectorIncidentsApi);
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
  async function page() {
    const f = TestBed.createComponent(InspectorPage);
    f.detectChanges();
    await api.load();
    f.detectChanges();
    return f;
  }
  it('renders existing incident layout, source records, real review counts and unknown risk', async () => {
    const f = await page(),
      p = f.componentInstance;
    expect(f.nativeElement.textContent).toContain('Source Provider');
    expect(f.nativeElement.textContent).toContain('Recorded fall');
    expect(f.nativeElement.textContent).toContain('Not assessed');
    expect(p.metrics().map((m) => m.value)).toEqual([2, 1, 1, 0]);
    expect(p.reviewedIncidents()).toBe(1);
    expect(p.findingCount('Required action')).toBe(1);
    expect(f.nativeElement.textContent).toContain('Review the incident response');
    expect(f.nativeElement.querySelector('a[href="/inspector/notes"]')).toBeNull();
  });
  it('opens read-only event details and updates them from current source data', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.openRecord(p.register().rows[0]);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Care response recorded');
    const changed = response();
    changed.results[0].detail = 'Updated source response';
    request.mockResolvedValueOnce(changed);
    await api.load();
    f.detectChanges();
    expect(p.record()?.detail['Detail']).toBe('Updated source response');
  });
  it('saves a finding through the server and refreshes the existing action list', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.openFinding();
    p.findingField('text', 'New inspection concern');
    p.findingField('type', 'Concern');
    p.findingEvidence('care:source', true);
    const saved = response();
    saved.findings.push({
      ...finding(),
      id: 'new',
      type: 'Concern',
      text: 'New inspection concern',
    });
    saved.summary.concerns = 1;
    request.mockImplementation(async (_path, _body, method) =>
      method === 'POST' ? saved.findings[1] : saved,
    );
    await p.saveFinding();
    f.detectChanges();
    expect(p.modalOpen()).toBe(false);
    expect(p.findingCount('Concern')).toBe(1);
    expect(p.message()).toContain('saved');
    const call = request.mock.calls.find((c) => c[2] === 'POST')!;
    expect(call[0]).toBe('/companies/one/inspector/incidents/findings');
    expect(call[1].evidenceIds).toEqual(['care:source']);
    expect(call[1].evidenceVersions).toEqual({ 'care:source': 2 });
    expect(call[1]).not.toHaveProperty('by');
    expect(call[3]['Idempotency-Key']).toBeTruthy();
  });
  it('revises required actions with the source version and updates completion counts', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.openFinding(p.findings()[0]);
    p.findingField('status', 'Completed');
    const updated = response();
    updated.findings[0].version = 2;
    updated.findings[0].status = 'Completed';
    updated.summary.completed_actions = 1;
    request.mockImplementation(async (_path, _body, method) =>
      method === 'POST' ? updated.findings[0] : updated,
    );
    await p.saveFinding();
    f.detectChanges();
    const call = request.mock.calls.find((c) => c[2] === 'POST')!;
    expect(call[0]).toContain('/findings/finding/revise');
    expect(call[3]['If-Match']).toBe('"v1"');
    expect(p.completedFindings()).toBe(1);
  });
  it('validates required-action inputs without writing or claiming success', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.openFinding();
    p.findingField('text', 'Required action');
    p.findingField('type', 'Required action');
    request.mockClear();
    await p.saveFinding();
    expect(p.modalError()).toContain('owner and due date');
    expect(request).not.toHaveBeenCalled();
    expect(p.modalOpen()).toBe(true);
  });
  it('retains the form and refreshes current records on a stale version conflict', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.openFinding(p.findings()[0]);
    p.findingField('text', 'Unsubmitted edit');
    request
      .mockRejectedValueOnce(
        Object.assign(Error('This finding changed. Reopen the current record.'), { status: 412 }),
      )
      .mockResolvedValueOnce(response());
    await p.saveFinding();
    f.detectChanges();
    expect(p.modalOpen()).toBe(true);
    expect(p.finding().text).toBe('Unsubmitted edit');
    expect(p.modalError()).toContain('changed');
    expect(p.message()).toBe('');
  });
  it('uses the same idempotency key when retrying a failed finding save', async () => {
    await load();
    request.mockRejectedValueOnce(Object.assign(Error('Connection failed'), { status: 503 }));
    const body = { ...finding(), id: '', evidenceVersions: { 'care:source': 2 } };
    await expect(api.saveFinding(body)).rejects.toThrow('Connection failed');
    const first = request.mock.lastCall![3]['Idempotency-Key'];
    request.mockResolvedValue(response());
    await api.saveFinding(body);
    const posts = request.mock.calls.filter((c) => c[2] === 'POST');
    expect(posts.at(-1)![3]['Idempotency-Key']).toBe(first);
  });
  it('removes unavailable references on refresh while preserving an unsaved finding', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.openFinding(p.findings()[0]);
    p.findingField('text', 'Unsaved observation');
    const next = response();
    next.count = 1;
    next.results = next.results.slice(1);
    next.summary.recorded = 1;
    next.findings[0].evidenceIds = [];
    request.mockResolvedValueOnce(next);
    await api.load();
    f.detectChanges();
    expect(p.finding().text).toBe('Unsaved observation');
    expect(p.finding().evidenceIds).toEqual([]);
    expect(p.modalError()).toContain('no longer available');
    expect(p.modalOpen()).toBe(true);
  });
  it('keeps the reviewed version and unsaved text when selected evidence changes', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.openFinding(p.findings()[0]);
    p.findingField('text', 'Unsaved inspection review');
    expect(p.finding().evidenceVersions).toEqual({ 'care:source': 2 });
    const changed = response();
    changed.results[0].version = 3;
    changed.results[0].detail = 'Amended source facts';
    request.mockResolvedValueOnce(changed);
    await api.load();
    f.detectChanges();
    expect(p.finding().text).toBe('Unsaved inspection review');
    expect(p.finding().evidenceVersions).toEqual({ 'care:source': 2 });
    expect(p.modalError()).toContain('evidence changed');
    p.findingEvidence('care:source', false);
    p.findingEvidence('care:source', true);
    f.detectChanges();
    expect(p.finding().evidenceVersions).toEqual({ 'care:source': 3 });
    expect(p.modalError()).toBe('');
  });
  it('does not allow read-only inspectors to create, edit or export', async () => {
    const value = response();
    value.capabilities = { create: false, edit: false, export: false, view_provider: false };
    request.mockResolvedValue(value);
    const f = await page(),
      p = f.componentInstance;
    p.openFinding();
    expect(p.modalOpen()).toBe(false);
    expect(p.error()).toContain('not permitted');
    await expect(api.export({})).rejects.toThrow('not permitted');
    expect(api.canEdit()).toBe(false);
  });
  it('clears records and an open finding form on access loss and supports retry', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.openFinding();
    p.findingField('text', 'Unsaved inspection observation');
    request.mockRejectedValueOnce(
      Object.assign(Error('Inspection access revoked'), { status: 403 }),
    );
    await api.load();
    f.detectChanges();
    expect(p.modalOpen()).toBe(false);
    expect(p.findings()).toEqual([]);
    expect(p.finding().text).toBe('');
    expect(p.register().rows).toEqual([]);
    expect(f.nativeElement.textContent).toContain('Inspection access revoked');
    request.mockResolvedValueOnce(response());
    await api.load();
    f.detectChanges();
    expect(p.register().rows).toHaveLength(2);
  });
  it('exports search and sorting through the guarded backend', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.search.set('fall');
    p.sortDirection.set(-1);
    request.mockResolvedValueOnce(new Blob(['Event']));
    p.exportRegister();
    await Promise.resolve();
    expect(request.mock.lastCall![0]).toContain('/incidents/export?q=fall&ordering=-name');
    expect(click).toHaveBeenCalledOnce();
    expect((click.mock.instances[0] as HTMLAnchorElement).download).toBe(
      'incidents-and-safeguarding.csv',
    );
  });
  it('ignores late read and save responses after leaving the module', async () => {
    await load();
    let resolve!: (v: unknown) => void;
    request.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const pending = api.saveFinding({
      ...finding(),
      id: '',
      evidenceVersions: { 'care:source': 2 },
    });
    api.stop();
    resolve(finding());
    expect(await pending).toBe(false);
    expect(api.records()).toEqual([]);
  });
  it('rejects foreign scope and incomplete pages and clears company/account changes', async () => {
    const value = response();
    value.meta.company_id = 'other';
    request.mockResolvedValueOnce(value);
    await load();
    expect(api.ready()).toBe(false);
    expect(api.error()).toContain('workspace');
    request.mockResolvedValue(response());
    await api.load();
    actor.set({ id: 'other' });
    expect(api.value()).toBeNull();
    companyId.set('other');
    expect(api.company()).toBeUndefined();
  });
  it('accepts known empty source and finding lists', async () => {
    const value = response();
    value.count = 0;
    value.results = [];
    value.findings = [];
    value.summary = {
      recorded: 0,
      safeguarding: 0,
      awaiting_review: 0,
      reviewed: 0,
      concerns: 0,
      required_actions: 0,
      completed_actions: 0,
    };
    request.mockResolvedValue(value);
    const f = await page();
    expect(api.ready()).toBe(true);
    expect(f.nativeElement.textContent).toContain('No records match this view');
  });
});
