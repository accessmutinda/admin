import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { CompanyAccessService } from '../../core/access/company-access.service';
import { ManagementStore } from '../management/shared/management.store';
import { InspectorReportsApi } from './inspector-reports-api.service';
import { InspectorReportsService } from './inspector-reports.service';
import { InspectorService } from './inspector.service';
import { InspectorPage } from './inspector-page';
import { InspectorReportRead } from './inspector-provider.generated';

function response(): InspectorReportRead {
  return {
    company: {
      id: 'one',
      name: 'Source Provider',
      code: 'SOURCE',
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
      notes: { Safe: 'Saved inspector observation' },
      summary: 'Saved report summary',
      updated: '2026-11-14T08:00:00Z',
      by: 'Inspector Person',
      findings: [],
    },
    evidence: [
      {
        id: 'inspection:file',
        version: '2',
        source_version: 2,
        name: 'Reviewed evidence',
        filename: 'evidence.txt',
        category: 'Audits',
        questions: ['Safe'],
        owner: 'Inspector Person',
        updated: '2026-11-14T08:00:00Z',
        expiry: null,
        status: 'Pending review',
        source: 'Inspection upload',
        state: 'clean',
        content_type: 'text/plain',
        size: 4,
        downloadable: false,
      },
    ],
    capabilities: { create: true, edit: true, export: true, view_provider: true },
    meta: {
      company_id: 'one',
      as_of: '2026-11-14T12:00:00Z',
      timezone: 'Europe/London',
      request_id: 'test',
      filters: {},
      revision: 'a'.repeat(64),
      disclosure: 'Provisional inspection report',
    },
  };
}

describe('Inspector reports integration', () => {
  const companyId = signal('one'),
    actor = signal({ id: 'reviewer' }),
    context = signal({ revision: 1 });
  let api: InspectorReportsApi,
    request: ReturnType<typeof vi.fn>,
    click: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    companyId.set('one');
    actor.set({ id: 'reviewer' });
    context.set({ revision: 1 });
    request = vi.fn().mockResolvedValue(response());
    click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:report');
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
        { provide: InspectorService, useClass: InspectorReportsService },
        {
          provide: ManagementStore,
          useFactory: () => {
            throw Error('Reports must not use browser workspace data');
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ page: 'reports' }),
            queryParamMap: of(convertToParamMap({})),
            snapshot: { data: { page: 'reports' }, queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    });
    api = TestBed.inject(InspectorReportsApi);
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
  it('shows persisted ratings, notes, summary, provider details and evidence without workspace storage', async () => {
    const f = await page(),
      p = f.componentInstance;
    expect(api.ready()).toBe(true);
    expect(p.draft().revision).toBe(2);
    expect(p.draft().type).toBe('Focused review');
    expect(p.draft().ratings['Safe']).toBe('Good');
    expect(p.data.documents()[0].source_version).toBe(2);
    expect(f.nativeElement.textContent).toContain('Saved report summary');
    expect(p.dirty()).toBe(false);
    expect(f.nativeElement.querySelector('mat-select[aria-label="Safe rating"]')).toBeTruthy();
  });
  it('saves only report source fields with its own version and reloads persisted results', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.noteTab.set('Safe');
    p.updateNote('Updated observation');
    p.updateRating('Safe', 'Outstanding');
    p.updateDraft('summary', 'Updated summary');
    const saved = response();
    saved.draft = {
      ...saved.draft,
      version: 3,
      etag: '"v3"',
      ratings: { Safe: 'Outstanding' },
      notes: { Safe: 'Updated observation' },
      summary: 'Updated summary',
    };
    request.mockResolvedValue(saved);
    await p.saveReport();
    f.detectChanges();
    const write = request.mock.calls.find((call) => call[2] === 'PATCH')!;
    expect(write[0]).toBe('/companies/one/inspector/reports');
    expect(write[1]).toEqual({
      ratings: { Safe: 'Outstanding' },
      notes: { Safe: 'Updated observation' },
      summary: 'Updated summary',
    });
    expect(write[3]['If-Match']).toBe('"v2"');
    expect(write[3]['Idempotency-Key']).toBeTruthy();
    expect(p.draft().revision).toBe(3);
    expect(p.dirty()).toBe(false);
    expect(p.message()).toBe('Inspection draft saved.');
  });
  it('preserves edits after a conflict and explicitly reloads the saved server version', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.updateDraft('summary', 'Unsaved observation');
    request.mockRejectedValueOnce(
      Object.assign(Error('This record changed. Reload and retry.'), { status: 412 }),
    );
    await p.saveReport();
    expect(p.dirty()).toBe(true);
    expect(p.draft().summary).toBe('Unsaved observation');
    expect(p.error()).toContain('Reload');
    const saved = response();
    saved.draft.version = 3;
    saved.draft.summary = 'Other reviewer saved';
    request.mockResolvedValue(saved);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await p.reload();
    f.detectChanges();
    expect(p.draft().revision).toBe(3);
    expect(p.draft().summary).toBe('Other reviewer saved');
    expect(p.dirty()).toBe(false);
  });
  it('reuses the idempotency key for an unchanged retry after a network failure', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.updateDraft('summary', 'Retry source');
    request.mockRejectedValueOnce(Error('Network unavailable'));
    await p.saveReport();
    const first = request.mock.calls.find((call) => call[2] === 'PATCH')!;
    await p.saveReport();
    const writes = request.mock.calls.filter((call) => call[2] === 'PATCH');
    expect(writes[1][3]['Idempotency-Key']).toBe(first[3]['Idempotency-Key']);
  });
  it('records a finding with reviewed evidence versions while preserving unsaved report edits', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.updateDraft('summary', 'Unsaved report work');
    p.openFinding();
    p.findingField('text', 'Evidence-based finding');
    p.findingEvidence('inspection:file', true);
    const saved = response();
    saved.draft.findings = [
      {
        id: 'finding',
        version: 1,
        question: 'Safe',
        type: 'Strength',
        text: 'Evidence-based finding',
        owner: '',
        due: '',
        status: 'Open',
        evidenceIds: ['inspection:file'],
        evidenceVersions: { 'inspection:file': 2 },
        at: '2026-11-14T12:00:00Z',
        by: 'Inspector Person',
      },
    ];
    request.mockResolvedValue(saved);
    await p.saveFinding();
    f.detectChanges();
    const write = request.mock.calls.find((call) => call[2] === 'POST')!;
    expect(write[1].evidenceVersions).toEqual({ 'inspection:file': 2 });
    expect(write[0]).toContain('/reports/findings');
    expect(p.modalOpen()).toBe(false);
    expect(p.draft().findings).toHaveLength(1);
    expect(p.draft().summary).toBe('Unsaved report work');
    expect(p.dirty()).toBe(true);
  });
  it('exports authorised server JSON and blocks export or review of unsaved edits', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.updateDraft('summary', 'Unsaved');
    await p.downloadReport();
    await p.showReport();
    expect(click).not.toHaveBeenCalled();
    expect(p.modalOpen()).toBe(false);
    p.dirty.set(false);
    await p.downloadReport();
    expect(request.mock.lastCall![0]).toBe('/companies/one/inspector/reports/export');
    expect(click).toHaveBeenCalledOnce();
    expect((click.mock.instances[0] as HTMLAnchorElement).download).toBe('inspection-report.json');
  });
  it('rechecks export access and renders the current restricted report before printing', async () => {
    const f = await page(),
      p = f.componentInstance;
    await p.showReport();
    f.detectChanges();
    const exported = response();
    exported.evidence = [];
    exported.draft.summary = 'Current export source';
    request.mockResolvedValueOnce(exported);
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    await p.printReport();
    expect(request.mock.lastCall![0]).toContain('/reports/export');
    expect(p.reportDocuments()).toEqual([]);
    expect(p.reportDraft().summary).toBe('Current export source');
    expect(print).toHaveBeenCalledOnce();
  });
  it('keeps read-only actions unavailable without their independent grants', async () => {
    const value = response();
    value.capabilities = { edit: false, create: false, export: false };
    request.mockResolvedValue(value);
    const f = await page();
    for (const label of ['Save draft', 'Add finding', 'Export JSON']) {
      const button = [...f.nativeElement.querySelectorAll('button')].find((b: any) =>
        b.textContent.includes(label),
      ) as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    }
    await expect(api.export()).rejects.toThrow('not permitted');
    await expect(api.saveDraft(api.state().draft, 'one')).rejects.toThrow('not permitted');
    expect(click).not.toHaveBeenCalled();
  });
  it('clears report text, unsaved edits, evidence and full-report modal on revoked access', async () => {
    const f = await page(),
      p = f.componentInstance;
    await p.showReport();
    p.updateDraft('summary', 'Sensitive unsaved text');
    request.mockRejectedValueOnce(
      Object.assign(Error('Inspection access revoked'), { status: 403 }),
    );
    await api.load();
    f.detectChanges();
    expect(p.modalOpen()).toBe(false);
    expect(p.dirty()).toBe(false);
    expect(p.reportView()).toBeNull();
    expect(p.draft().summary).toBe('');
    expect(api.documents()).toEqual([]);
    expect(f.nativeElement.textContent).toContain('Inspection reports unavailable');
    expect(f.nativeElement.textContent).not.toContain('Sensitive unsaved text');
  });
  it('retains unsaved report edits across temporary refresh failures without presenting stale source data', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.updateDraft('summary', 'Unsaved offline work');
    p.noteTab.set('Safe');
    p.updateNote('Unsaved observation');
    request.mockRejectedValueOnce(Object.assign(Error('Temporarily unavailable'), { status: 503 }));
    await api.load();
    f.detectChanges();
    expect(api.value()).toBeNull();
    expect(api.documents()).toEqual([]);
    expect(f.nativeElement.querySelector('#report-summary')).toBeNull();
    expect(p.draft().summary).toBe('Unsaved offline work');
    expect(p.dirty()).toBe(true);
    const current = response();
    current.draft.version = 3;
    request.mockResolvedValueOnce(current);
    await api.load();
    f.detectChanges();
    expect(p.draft().summary).toBe('Unsaved offline work');
    expect(p.draft().notes['Safe']).toBe('Unsaved observation');
    expect(p.draft().revision).toBe(2);
    expect(api.value()?.draft.version).toBe(3);
  });
  it('clears retained offline edits if access is subsequently revoked', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.updateDraft('summary', 'Sensitive offline work');
    request.mockRejectedValueOnce(Error('Connection interrupted'));
    await api.load();
    f.detectChanges();
    expect(p.dirty()).toBe(true);
    request.mockRejectedValueOnce(
      Object.assign(Error('Inspection access revoked'), { status: 403 }),
    );
    await api.load();
    f.detectChanges();
    expect(p.dirty()).toBe(false);
    expect(p.draft().summary).toBe('');
    expect(api.retainEdits()).toBe(false);
  });
  it('removes changed or withdrawn evidence selections from an open finding and permits reselecting current versions', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.openFinding();
    p.findingField('text', 'Unfinished source review');
    p.findingEvidence('inspection:file', true);
    const changed = response();
    changed.evidence[0].source_version = 3;
    request.mockResolvedValueOnce(changed);
    await api.load();
    f.detectChanges();
    expect(p.finding().text).toBe('Unfinished source review');
    expect(p.finding().evidenceIds).toEqual([]);
    expect(p.modalError()).toContain('reselect current evidence');
    p.findingEvidence('inspection:file', true);
    expect(p.finding().evidenceVersions).toEqual({ 'inspection:file': 3 });
    const withdrawn = response();
    withdrawn.evidence = [];
    request.mockResolvedValueOnce(withdrawn);
    await api.load();
    f.detectChanges();
    expect(p.finding().evidenceIds).toEqual([]);
    expect(p.finding().evidenceVersions).toEqual({});
    expect(p.modalOpen()).toBe(true);
    expect(p.finding().text).toBe('Unfinished source review');
  });
  it('restores an unfinished finding after a temporary refresh failure', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.openFinding();
    p.findingField('text', 'Unfinished finding work');
    p.findingEvidence('inspection:file', true);
    request.mockRejectedValueOnce(Object.assign(Error('Temporarily unavailable'), { status: 503 }));
    await api.load();
    f.detectChanges();
    expect(p.modalOpen()).toBe(false);
    expect(p.finding().text).toBe('Unfinished finding work');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(p.canLeave()).toBe(false);
    expect(confirm).toHaveBeenCalledOnce();
    request.mockResolvedValueOnce(response());
    await api.load();
    f.detectChanges();
    expect(p.modalOpen()).toBe(true);
    expect(p.finding().text).toBe('Unfinished finding work');
    expect(p.finding().evidenceVersions).toEqual({ 'inspection:file': 2 });
    expect(p.modalError()).toContain('Connection restored');
  });
  it('clears a suspended finding on revoked access and never reopens it for a later session', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.openFinding();
    p.findingField('text', 'Private unfinished finding');
    request.mockRejectedValueOnce(Error('Network interrupted'));
    await api.load();
    f.detectChanges();
    request.mockRejectedValueOnce(
      Object.assign(Error('Inspection access revoked'), { status: 403 }),
    );
    await api.load();
    f.detectChanges();
    expect(p.finding().text).toBe('');
    expect(p.modalOpen()).toBe(false);
    request.mockResolvedValueOnce(response());
    await api.load();
    f.detectChanges();
    expect(p.modalOpen()).toBe(false);
    const confirm = vi.spyOn(window, 'confirm');
    expect(p.canLeave()).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });
  it('warns only for changed finding inputs when leaving the reports page', async () => {
    const f = await page(),
      p = f.componentInstance;
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    p.openFinding();
    expect(p.canLeave()).toBe(true);
    p.findingField('owner', 'Entered owner');
    expect(p.canLeave()).toBe(false);
    p.closeModal();
    expect(p.canLeave()).toBe(true);
    expect(confirm).toHaveBeenCalledOnce();
  });
  it('ignores an older refresh failure while a draft save is in flight', async () => {
    const f = await page();
    let rejectRead!: (e: Error) => void;
    request.mockReturnValueOnce(
      new Promise<InspectorReportRead>((_, reject) => (rejectRead = reject)),
    );
    const oldRead = api.load();
    let resolveWrite!: (value: InspectorReportRead) => void;
    request.mockReturnValueOnce(
      new Promise<InspectorReportRead>((resolve) => (resolveWrite = resolve)),
    );
    const saving = api.saveDraft(f.componentInstance.draft(), 'one');
    rejectRead(Error('Old refresh interrupted'));
    await oldRead;
    expect(api.ready()).toBe(true);
    expect(api.saving()).toBe(true);
    resolveWrite(response());
    expect(await saving).not.toBeNull();
    expect(api.error()).toBe('');
  });
  it('keeps a confirmed draft save successful if its following refresh fails', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.updateDraft('summary', 'Confirmed saved summary');
    const saved = response();
    saved.draft.version = 3;
    saved.draft.summary = 'Confirmed saved summary';
    request.mockResolvedValueOnce(saved).mockRejectedValueOnce(Error('Refresh interrupted'));
    await p.saveReport();
    f.detectChanges();
    expect(api.ready()).toBe(false);
    expect(p.draft().summary).toBe('Confirmed saved summary');
    expect(p.draft().revision).toBe(3);
    expect(p.dirty()).toBe(false);
    expect(p.message()).toBe('Inspection draft saved.');
    request.mockResolvedValueOnce(saved);
    await api.load();
    f.detectChanges();
    expect(p.draft().summary).toBe('Confirmed saved summary');
    expect(p.dirty()).toBe(false);
  });
  it('never reopens or retries a confirmed new finding merely because its refresh failed', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.openFinding();
    p.findingField('text', 'Confirmed new finding');
    const saved = response();
    const created: InspectorReportRead['draft']['findings'][number] = {
      id: 'created-finding',
      version: 1,
      question: 'Safe',
      type: 'Strength',
      text: 'Confirmed new finding',
      owner: '',
      due: '',
      status: 'Open',
      evidenceIds: [],
      evidenceVersions: {},
      at: '2026-11-14T12:00:00Z',
      by: 'Inspector Person',
    };
    saved.draft.findings = [created];
    request.mockResolvedValueOnce(created).mockRejectedValueOnce(Error('Refresh interrupted'));
    await p.saveFinding();
    f.detectChanges();
    expect(p.modalOpen()).toBe(false);
    expect(p.message()).toBe('Inspection finding saved.');
    request.mockResolvedValueOnce(saved);
    await api.load();
    f.detectChanges();
    expect(p.modalOpen()).toBe(false);
    expect(p.draft().findings.map((row) => row.id)).toEqual(['created-finding']);
    expect(p.canLeave()).toBe(true);
    expect(request.mock.calls.filter((call) => call[2] === 'POST')).toHaveLength(1);
  });
  it('does not restore a report or finish downloads after leaving the workspace', async () => {
    await page();
    let resolve!: (v: InspectorReportRead) => void;
    request.mockReturnValueOnce(new Promise<InspectorReportRead>((r) => (resolve = r)));
    const pending = api.export();
    api.stop();
    resolve(response());
    await pending;
    expect(click).not.toHaveBeenCalled();
    expect(api.value()).toBeNull();
  });
  it('hides previous actor data immediately and rejects a foreign response', async () => {
    await page();
    actor.set({ id: 'other' });
    expect(api.value()).toBeNull();
    expect(api.state().draft.summary).toBe('');
    const foreign = response();
    foreign.meta.company_id = 'other';
    request.mockResolvedValue(foreign);
    TestBed.tick();
    await api.load();
    expect(api.ready()).toBe(false);
    expect(api.error()).toContain('workspace');
  });
  it('removes stale evidence from an open report after source access changes', async () => {
    const f = await page(),
      p = f.componentInstance;
    await p.showReport();
    f.detectChanges();
    expect(p.reportDocuments()).toHaveLength(1);
    const current = response();
    current.evidence = [];
    request.mockResolvedValueOnce(current);
    await api.load();
    f.detectChanges();
    expect(p.reportDocuments()).toEqual([]);
    expect(p.modalOpen()).toBe(true);
  });
});
