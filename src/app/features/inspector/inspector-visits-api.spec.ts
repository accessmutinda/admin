import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { CompanyAccessService } from '../../core/access/company-access.service';
import { ManagementStore } from '../management/shared/management.store';
import { londonDate } from '../management/rota/rota.models';
import { InspectorVisitsApi } from './inspector-visits-api.service';
import { InspectorVisitsService } from './inspector-visits.service';
import { InspectorService } from './inspector.service';
import { InspectorPage } from './inspector-page';
import { InspectorVisitPage } from './inspector-provider.generated';
const MONTH = londonDate().slice(0, 7),
  DAY = MONTH + '-15';
function response(month = MONTH): InspectorVisitPage {
  const day = month + '-15';
  const start = new Date(month + '-01T00:00:00Z'),
    offset = (start.getUTCDay() + 6) % 7;
  return {
    count: 1,
    next: null,
    previous: null,
    results: [
      {
        id: 'visit',
        version: 3,
        client_id: 'client',
        client_name: 'Shared Person',
        address: '10 Care Road',
        call_name: 'Morning care',
        date: day,
        end_date: day,
        start: '08:00',
        end: '08:30',
        starts_at: day + 'T08:00:00Z',
        ends_at: day + 'T08:30:00Z',
        carers: 1,
        tasks: 'Agreed shared tasks',
        allocation: 'Regular',
        staff: [{ id: 'worker', name: 'Care Worker' }],
        attendance: [
          {
            id: 'attendance',
            carer: 'Care Worker',
            start: day + 'T08:00:00Z',
            end: day + 'T08:30:00Z',
            allocated: true,
          },
        ],
        status: 'Completed',
      },
    ],
    notes: [
      {
        id: 'note',
        version: 1,
        visit_id: 'visit',
        client_id: 'client',
        client: 'Shared Person',
        date: day,
        end_date: day,
        start: '08:00',
        end: '08:30',
        visit_type: 'Morning care',
        carer: 'Care Worker',
        body: 'Explicitly shared source note',
        status: 'Completed',
      },
    ],
    summary: { published: 1, completed: 1, in_progress: 0, no_attendance: 0, unallocated: 0 },
    calendar: Array.from({ length: 42 }, (_, i) => {
      const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), i - offset + 1)),
        date = d.toISOString().slice(0, 10);
      return {
        date,
        day: d.getUTCDate(),
        in_month: date.startsWith(month),
        count: date === day ? 1 : 0,
        completed: date === day ? 1 : 0,
        issues: 0,
      };
    }),
    company: {
      id: 'one',
      name: 'Source Provider',
      code: 'SOURCE',
      active: true,
      sector: null,
      registered_places: 0,
      updated_at: day + 'T12:00:00Z',
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
      as_of: day + 'T12:00:00Z',
      timezone: 'Europe/London',
      request_id: 'test',
      filters: { page: 1, page_size: 100, month },
      month,
      revision: 'a'.repeat(64),
      disclosure: 'Current published visits and explicitly shared notes',
    },
  };
}
describe('Inspector visit monitoring integration', () => {
  const companyId = signal('one'),
    actor = signal({ id: 'reviewer' }),
    context = signal({ revision: 1, permissions: ['inspector_portal.visits.read'] });
  let api: InspectorVisitsApi,
    request: ReturnType<typeof vi.fn>,
    click: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    companyId.set('one');
    actor.set({ id: 'reviewer' });
    context.set({ revision: 1, permissions: ['inspector_portal.visits.read'] });
    request = vi.fn().mockResolvedValue(response());
    click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:visit');
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
        { provide: InspectorService, useClass: InspectorVisitsService },
        {
          provide: ManagementStore,
          useFactory: () => {
            throw Error('Visits must not use browser workspace data');
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ page: 'visits' }),
            queryParamMap: of(convertToParamMap({})),
            snapshot: { data: { page: 'visits' }, queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    });
    api = TestBed.inject(InspectorVisitsApi);
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
  it('connects published visits, monthly metrics, calendar and shared notes without workspace records', async () => {
    const f = await page(),
      p = f.componentInstance;
    expect(api.ready()).toBe(true);
    expect(p.metrics().map((m) => m.value)).toEqual([1, 1, 0, 0, 0]);
    expect(p.calendar().find((d) => d.date === DAY)?.completed).toBe(1);
    expect(f.nativeElement.textContent).toContain('Explicitly shared source note');
    expect(p.register().rows[0].cells[4]).toBe('Care Worker');
    expect(f.nativeElement.textContent).not.toContain('Save details');
  });
  it('opens read-only human-labelled attendance with original planned timestamps', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.openRecord(p.register().rows[0]);
    f.detectChanges();
    const dialog = f.nativeElement.querySelector('[role=dialog]');
    expect(dialog.textContent).toContain('Care Worker');
    expect(dialog.textContent).toContain('Check-out');
    expect(dialog.textContent).toContain('Agreed shared tasks');
    expect(dialog.textContent).not.toContain('"personId"');
    expect(dialog.querySelectorAll('input,textarea')).toHaveLength(0);
  });
  it('exports the selected month/day/search/sort and the same activity rows', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.selectedDay.set(DAY);
    p.search.set(' worker ');
    p.sortDirection.set(-1);
    expect(p.filteredRows()).toHaveLength(1);
    request.mockResolvedValueOnce(new Blob(['csv']));
    p.exportRegister();
    await Promise.resolve();
    const url = request.mock.lastCall![0];
    expect(url).toContain('ordering=-name');
    expect(url).toContain('day=' + DAY);
    expect(url).toContain('month=' + MONTH);
    expect(click).toHaveBeenCalledOnce();
    expect((click.mock.instances[0] as HTMLAnchorElement).download).toBe('visit-monitoring.csv');
  });
  it('refreshes the month without mixing records or calendar totals', async () => {
    const f = await page(),
      p = f.componentInstance;
    const next = '2026-02';
    request.mockResolvedValue(response(next));
    p.month.set(next);
    f.detectChanges();
    await api.load();
    f.detectChanges();
    await api.load();
    f.detectChanges();
    expect(api.month()).toBe(next);
    expect(api.value()?.meta.month).toBe(next);
    expect(p.register().rows[0].detail['Date']).toContain('Feb');
    expect(
      p
        .calendar()
        .filter((d) => d.inMonth)
        .every((d) => d.date.startsWith(next)),
    ).toBe(true);
  });
  it('clears day selection when moving months and rejects invalid month controls', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.selectedDay.set(DAY);
    p.changeMonth(1);
    expect(p.selectedDay()).toBe('');
    expect(api.selectMonth('2026-13')).toBe(false);
    expect(api.selectMonth('not-a-month')).toBe(false);
  });
  it('updates the open drawer, calendar and totals after source attendance changes', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.openRecord(p.register().rows[0]);
    const value = response();
    value.results[0].status = 'In progress';
    value.results[0].attendance[0].end = null;
    value.results[0].version = 4;
    value.summary.completed = 0;
    value.summary.in_progress = 1;
    value.calendar.forEach((d) => (d.completed = 0));
    value.meta.revision = 'b'.repeat(64);
    request.mockResolvedValueOnce(value);
    await api.load();
    f.detectChanges();
    expect(p.record()?.detail['Status']).toBe('In progress');
    expect(p.metrics()[2].value).toBe(1);
    expect(p.calendar().find((d) => d.date === DAY)?.completed).toBe(0);
  });
  it('uses the selected calendar day for shared notes and clears it consistently', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.selectedDay.set(MONTH + '-16');
    expect(p.sharedVisitNotes()).toEqual([]);
    p.selectedDay.set(DAY);
    expect(p.sharedVisitNotes()).toHaveLength(1);
    p.error.set('Previous export failed');
    p.clearFilters();
    expect(p.selectedDay()).toBe('');
    expect(p.error()).toBe('');
    expect(p.sharedVisitNotes()).toHaveLength(1);
  });
  it('removes source-unshared notes immediately on refresh', async () => {
    const f = await page();
    const value = response();
    value.notes = [];
    request.mockResolvedValueOnce(value);
    await api.load();
    f.detectChanges();
    expect(f.nativeElement.textContent).not.toContain('Explicitly shared source note');
    expect(f.nativeElement.textContent).toContain('No visit notes have been shared');
  });
  it('closes an unavailable visit when the source is unpublished or cancelled', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.openRecord(p.register().rows[0]);
    const value = response();
    value.count = 0;
    value.results = [];
    value.summary = {
      published: 0,
      completed: 0,
      in_progress: 0,
      no_attendance: 0,
      unallocated: 0,
    };
    value.calendar.forEach((d) => {
      d.count = 0;
      d.completed = 0;
    });
    request.mockResolvedValueOnce(value);
    await api.load();
    f.detectChanges();
    expect(p.modalOpen()).toBe(false);
    expect(p.register().rows).toEqual([]);
  });
  it('enforces independent export permission', async () => {
    const value = response();
    value.capabilities['export'] = false;
    request.mockResolvedValue(value);
    await load();
    await expect(api.export({})).rejects.toThrow('not permitted');
    expect(click).not.toHaveBeenCalled();
  });
  it('clears records, shared notes and drawer on denied engagement and can retry', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.openRecord(p.register().rows[0]);
    request.mockRejectedValueOnce(
      Object.assign(Error('Inspection access revoked'), { status: 403 }),
    );
    await api.load();
    f.detectChanges();
    expect(p.modalOpen()).toBe(false);
    expect(api.notes()).toEqual([]);
    expect(api.records()).toEqual([]);
    expect(f.nativeElement.textContent).toContain('Visit monitoring unavailable');
    request.mockResolvedValueOnce(response());
    await api.load();
    f.detectChanges();
    expect(api.ready()).toBe(true);
  });
  it('rejects foreign, wrong-month and changing paginated source responses', async () => {
    const value = response();
    value.meta.company_id = 'other';
    request.mockResolvedValueOnce(value);
    await load();
    expect(api.ready()).toBe(false);
    request.mockResolvedValueOnce(response('2026-02'));
    await api.load();
    expect(api.ready()).toBe(false);
    const a = response(),
      b = response();
    a.count = 2;
    a.summary.published = 2;
    b.count = 2;
    b.summary.published = 2;
    b.results[0].id = 'second';
    b.meta.revision = 'b'.repeat(64);
    request.mockResolvedValueOnce(a).mockResolvedValueOnce(b);
    await api.load();
    expect(api.ready()).toBe(false);
    expect(api.error()).toContain('changed while loading');
  });
  it('loads all pages before presenting monthly totals', async () => {
    const a = response(),
      b = response();
    for (const v of [a, b]) {
      v.count = 2;
      v.summary.published = 2;
      v.summary.completed = 2;
    }
    b.results[0].id = 'second';
    request.mockResolvedValueOnce(a).mockResolvedValueOnce(b);
    await load();
    expect(api.records()).toHaveLength(2);
    expect(api.summary()?.published).toBe(2);
  });
  it('ignores a late CSV response after leaving the route', async () => {
    await load();
    let resolve!: (b: Blob) => void;
    request.mockReturnValueOnce(new Promise<Blob>((r) => (resolve = r)));
    const pending = api.export({});
    api.stop();
    resolve(new Blob(['csv']));
    await pending;
    expect(click).not.toHaveBeenCalled();
    expect(api.records()).toEqual([]);
  });
  it('keeps the selected month when an older visit request finishes late', async () => {
    await load();
    let resolve!: (value: InspectorVisitPage) => void;
    request.mockReturnValueOnce(new Promise<InspectorVisitPage>((r) => (resolve = r)));
    const previous = api.load();
    const next = MONTH === '2026-02' ? '2026-03' : '2026-02';
    request.mockResolvedValue(response(next));
    api.selectMonth(next);
    expect(api.records()).toEqual([]);
    TestBed.tick();
    await api.load();
    resolve(response());
    await previous;
    expect(api.value()?.meta.month).toBe(next);
    expect(api.records().every((row) => row.date.startsWith(next))).toBe(true);
    expect(api.error()).toBe('');
  });
  it('discards an in-flight export after the selected month changes', async () => {
    await load();
    let resolve!: (value: Blob) => void;
    request.mockReturnValueOnce(new Promise<Blob>((r) => (resolve = r)));
    const pending = api.export({});
    api.selectMonth(MONTH === '2026-02' ? '2026-03' : '2026-02');
    resolve(new Blob(['previous month csv']));
    await pending;
    expect(click).not.toHaveBeenCalled();
  });
  it('clears immediately on actor and company changes', async () => {
    await load();
    actor.set({ id: 'other' });
    expect(api.value()).toBeNull();
    companyId.set('other');
    expect(api.company()).toBeUndefined();
  });
  it('renders legitimate empty months and shared notes', async () => {
    const value = response();
    value.count = 0;
    value.results = [];
    value.notes = [];
    value.summary = {
      published: 0,
      completed: 0,
      in_progress: 0,
      no_attendance: 0,
      unallocated: 0,
    };
    value.calendar.forEach((d) => {
      d.count = 0;
      d.completed = 0;
    });
    request.mockResolvedValue(value);
    const f = await page();
    expect(api.ready()).toBe(true);
    expect(f.nativeElement.textContent).toContain('No records match this view');
  });
});
