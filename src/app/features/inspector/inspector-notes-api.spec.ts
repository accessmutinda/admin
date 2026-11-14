import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { CompanyAccessService } from '../../core/access/company-access.service';
import { ManagementStore } from '../management/shared/management.store';
import { InspectorNotesApi } from './inspector-notes-api.service';
import { InspectorNotesService } from './inspector-notes.service';
import { InspectorReportsApi } from './inspector-reports-api.service';
import { InspectorService } from './inspector.service';
import { InspectorPage } from './inspector-page';
import { InspectorReportRead } from './inspector-provider.generated';

function response(): InspectorReportRead {
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
    evidence: [],
    capabilities: { create: true, edit: true, export: true, view_provider: true },
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

describe('Inspector Notes connected workflow', () => {
  const companyId = signal('one'),
    actor = signal({ id: 'reviewer' }),
    context = signal({ revision: 1 });
  let api: InspectorNotesApi, request: ReturnType<typeof vi.fn>;
  beforeEach(() => {
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
        { provide: InspectorService, useClass: InspectorNotesService },
        {
          provide: ManagementStore,
          useFactory: () => {
            throw Error('Inspector Notes must not use browser workspace storage');
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ page: 'notes' }),
            queryParamMap: of(convertToParamMap({})),
            snapshot: { data: { page: 'notes' }, queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    });
    api = TestBed.inject(InspectorNotesApi);
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
  it('loads the existing Notes screen from the dedicated endpoint and shared draft', async () => {
    const f = await page(),
      p = f.componentInstance;
    expect(request.mock.calls[0][0]).toBe('/companies/one/inspector/notes');
    expect(p.page().path).toBe('notes');
    expect(p.data.reportsBackend).toBe(api);
    expect(p.draft().notes['Safe']).toBe('Saved safety observation');
    expect(p.draft().ratings['Safe']).toBe('Good');
    expect(p.draft().summary).toBe('Existing shared summary');
    expect(TestBed.inject(InspectorReportsApi).ready()).toBe(false);
    expect(f.nativeElement.textContent).toContain('Inspector Notes');
  });
  it('saves only changed note sections without submitting untouched ratings or summary', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.noteTab.set('Safe');
    p.updateNote('Updated safety observation');
    const saved = response();
    saved.draft.version = 3;
    saved.draft.notes['Safe'] = 'Updated safety observation';
    request.mockResolvedValue(saved);
    await p.saveReport();
    f.detectChanges();
    const write = request.mock.calls.find((call) => call[2] === 'PATCH')!;
    expect(write[0]).toBe('/companies/one/inspector/notes');
    expect(write[1]).toEqual({ notes: { Safe: 'Updated safety observation' } });
    expect(write[3]['If-Match']).toBe('"v2"');
    expect(write[3]['Idempotency-Key']).toBeTruthy();
    expect(p.draft().notes['Effective']).toBe('Saved effectiveness observation');
    expect(p.draft().summary).toBe('Existing shared summary');
    expect(p.dirty()).toBe(false);
  });
  it('persists all seven note tabs with their entered whitespace and line breaks', async () => {
    const f = await page(),
      p = f.componentInstance;
    const notes: Record<string, string> = {};
    for (const tab of p.noteTabs) {
      p.noteTab.set(tab);
      notes[tab] = '  ' + tab + ' observation\nSecond line ✓';
      p.updateNote(notes[tab]);
    }
    const saved = response();
    saved.draft.notes = notes;
    saved.draft.version = 3;
    request.mockResolvedValue(saved);
    await p.saveReport();
    f.detectChanges();
    expect(request.mock.calls.find((call) => call[2] === 'PATCH')![1]).toEqual({ notes });
    expect(p.draft().notes).toEqual(notes);
    expect(p.noteTabs).toHaveLength(7);
  });
  it('keeps the existing rating and summary controls connected to the same partial save', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.updateRating('Safe', 'Outstanding');
    p.updateDraft('summary', 'Updated shared summary');
    const saved = response();
    saved.draft.ratings['Safe'] = 'Outstanding';
    saved.draft.summary = 'Updated shared summary';
    request.mockResolvedValue(saved);
    await p.saveReport();
    expect(request.mock.calls.find((call) => call[2] === 'PATCH')![1]).toEqual({
      ratings: { Safe: 'Outstanding' },
      summary: 'Updated shared summary',
    });
  });
  it('refreshes an unchanged save without creating an empty revision', async () => {
    const f = await page();
    await f.componentInstance.saveReport();
    expect(request.mock.calls.filter((call) => call[2] === 'PATCH')).toHaveLength(0);
    expect(request.mock.calls.every((call) => call[0] === '/companies/one/inspector/notes')).toBe(
      true,
    );
  });
  it('keeps note inputs disabled until an unchanged save finishes refreshing', async () => {
    const f = await page(),
      p = f.componentInstance;
    let resolve!: (value: InspectorReportRead) => void;
    request.mockReturnValueOnce(new Promise<InspectorReportRead>((r) => (resolve = r)));
    const pending = p.saveReport();
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect(api.saving()).toBe(true);
    expect(f.nativeElement.querySelector('#inspection-note').disabled).toBe(true);
    resolve(response());
    await pending;
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect(api.saving()).toBe(false);
    expect(f.nativeElement.querySelector('#inspection-note').disabled).toBe(false);
    expect(request.mock.calls.filter((call) => call[2] === 'PATCH')).toHaveLength(0);
  });
  it('ignores an unchanged-save response from a previous Notes session', async () => {
    const f = await page();
    let resolve!: (value: InspectorReportRead) => void;
    request.mockReturnValueOnce(new Promise<InspectorReportRead>((r) => (resolve = r)));
    const pending = api.saveDraft(f.componentInstance.draft(), 'one');
    api.stop();
    const next = response();
    next.draft.summary = 'Current reopened session';
    request.mockResolvedValue(next);
    api.start();
    await api.load();
    resolve(response());
    expect(await pending).toBeNull();
    expect(api.value()?.draft.summary).toBe('Current reopened session');
    expect(api.saving()).toBe(false);
  });
  it('retains a stale note edit and reloads the current shared report after a conflict', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.noteTab.set('Safe');
    p.updateNote('Uncommitted note');
    request.mockRejectedValueOnce(
      Object.assign(Error('This inspection changed. Reload and retry.'), { status: 412 }),
    );
    await p.saveReport();
    expect(p.draft().notes['Safe']).toBe('Uncommitted note');
    expect(p.dirty()).toBe(true);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const saved = response();
    saved.draft.version = 3;
    request.mockResolvedValue(saved);
    await p.reload();
    f.detectChanges();
    expect(p.draft().notes['Safe']).toBe('Saved safety observation');
    expect(p.draft().revision).toBe(3);
  });
  it('reuses existing report findings and export endpoints instead of duplicating records', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.openFinding();
    p.findingField('text', 'Notes evidence finding');
    await p.saveFinding();
    expect(request.mock.calls.find((call) => call[2] === 'POST')![0]).toBe(
      '/companies/one/inspector/reports/findings',
    );
    await api.prepareExport();
    expect(request.mock.lastCall![0]).toBe('/companies/one/inspector/reports/export');
  });
  it('enforces read-only actions and clears notes and dialogs when access is revoked', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.noteTab.set('Safe');
    p.updateNote('Private unsaved notes');
    p.openFinding();
    request.mockRejectedValueOnce(
      Object.assign(Error('Inspection access revoked'), { status: 403 }),
    );
    await api.load();
    f.detectChanges();
    expect(p.draft().notes).toEqual({});
    expect(p.modalOpen()).toBe(false);
    expect(p.dirty()).toBe(false);
    expect(f.nativeElement.textContent).toContain('Inspector notes unavailable');
    const readOnly = response();
    readOnly.capabilities = { edit: false, create: false, export: false };
    request.mockResolvedValue(readOnly);
    await api.load();
    f.detectChanges();
    await expect(api.saveDraft(p.draft(), 'one')).rejects.toThrow('not permitted');
    await expect(api.prepareExport()).rejects.toThrow('not permitted');
  });
  it('clears data on actor or company changes and ignores a late note save after leaving', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.noteTab.set('Safe');
    p.updateNote('Pending note');
    let resolve!: (value: InspectorReportRead) => void;
    request.mockReturnValueOnce(new Promise<InspectorReportRead>((r) => (resolve = r)));
    const pending = api.saveDraft(p.draft(), 'one');
    api.stop();
    resolve(response());
    expect(await pending).toBeNull();
    actor.set({ id: 'other' });
    companyId.set('other');
    expect(api.value()).toBeNull();
    expect(api.state().draft.notes).toEqual({});
  });
});
