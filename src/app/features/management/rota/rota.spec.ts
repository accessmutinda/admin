import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { Rota } from './rota';
import { londonDate } from './rota.models';
import { rosterVisit, rosterWorkspace } from './roster.spec-fixtures';

async function settle(fixture: any) {
  for (let round = 0; round < 4; round++) {
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();
  }
  fixture.detectChanges();
}
describe('Connected rota screens', () => {
  let request: ReturnType<typeof vi.fn>, workspace: any;
  beforeEach(() => {
    workspace = rosterWorkspace();
    const selected = signal<any>(null);
    request = vi.fn(async (path: string, body?: any, method?: string) =>
      path.includes('/history')
        ? {
            company_id: 'north',
            count: path.includes('/history/audit')
              ? (workspace.audit || []).length
              : workspace.visits.length,
            next: null,
            previous: null,
            results: structuredClone(
              path.includes('/history/audit') ? workspace.audit || [] : workspace.visits,
            ),
            context: structuredClone({ ...workspace, visits: [], audit: [] }),
            meta: {
              revision: 'history-1',
              as_of: '2026-11-12T12:00:00Z',
              metrics: { visits: 27, completed: null, cancelled: 3, audit: 204 },
              training_options: [],
            },
          }
        : path.includes('/publishing?') || path.includes('/publishing/export?')
          ? {
              ...structuredClone(workspace),
              metrics: workspace.metrics ?? {
                drafts: workspace.visits.length,
                unallocated: 0,
                conflicts: 0,
                published: 0,
              },
              reviews: structuredClone(
                workspace.reviews ??
                  Object.fromEntries(
                    workspace.visits.map((v: any) => [
                      v.id,
                      { etag: v.etag, ready: v.state === 'Draft', issues: [] },
                    ]),
                  ),
              ),
              training_options: [],
            }
          : path.includes('/call-packages/workspace?')
            ? {
                company_id: 'north',
                count: workspace.calls.length,
                next: null,
                previous: null,
                results: structuredClone(workspace.calls),
                context: structuredClone(workspace),
                meta: {
                  revision: 'packages-v1',
                  metrics: {
                    active_clients: 1,
                    active_packages: workspace.calls.length,
                    regular_carers: 0,
                    priority_packages: 0,
                  },
                  training_options: [{ id: 'recorded-skill', name: 'Recorded training' }],
                },
              }
            : path.endsWith('/call-packages/call')
              ? { ...workspace.calls[0], tasks: 'Latest recorded instructions' }
              : method
                ? { company_id: 'north', ids: ['call'] }
                : structuredClone(workspace),
    );
    TestBed.configureTestingModule({
      imports: [Rota],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            api: request,
            currentUser: () => null,
            isAuthenticated: () => false,
            isSuperAdmin: () => false,
            profile: () => null,
          },
        },
        {
          provide: ServiceUsersApi,
          useValue: {
            scope: signal('north:actor'),
            companyId: signal('north'),
            allowed: () => true,
            access: { can: () => true },
            selected,
            error: signal(''),
            detail: vi.fn(async (id: string) =>
              selected.set({
                ...workspace.clients.find((c: any) => c.id === id),
                representative: { name: 'Recorded representative' },
              }),
            ),
          },
        },
      ],
    });
  });
  it('renders call packages from the API without allocation workflow cards', async () => {
    TestBed.inject(ActivatedRoute).snapshot.data = { rotaSection: 'call-packages' };
    const fixture = TestBed.createComponent(Rota);
    await settle(fixture);
    const editor = fixture.componentInstance as any;
    editor.packageClient.set('client');
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('.rota-call-list').textContent).toContain(
      'Recorded instructions',
    );
    expect(fixture.nativeElement.querySelector('.rota-workflows')).toBeNull();
  });
  it('uses historical sources with an open start date and server counts, and retains dates when opening audit', async () => {
    TestBed.inject(ActivatedRoute).snapshot.data = { rotaSection: 'history' };
    workspace.visits = [{ ...rosterVisit(), date: '2025-01-01', staffIds: ['worker'] }];
    workspace.audit = [
      {
        id: 'new',
        clientId: 'client',
        userId: 'actor',
        at: '2026-11-12T12:00:00Z',
        user: 'Recorded actor',
        action: 'Visit published',
        detail: 'Reviewed',
      },
      {
        id: 'old',
        clientId: 'client',
        userId: 'actor',
        at: '2026-11-11T12:00:00Z',
        user: 'Recorded actor',
        action: 'Visits planned',
        detail: 'Planned',
      },
    ];
    const fixture = TestBed.createComponent(Rota);
    await settle(fixture);
    const editor = fixture.componentInstance as any;
    expect(editor.from()).toBe('');
    expect(editor.filtered()).toHaveLength(1);
    editor.toggleVisit('visit');
    expect(editor.selectedIds()).toEqual([]);
    expect(fixture.nativeElement.querySelector('.rota-register input[type="checkbox"]')).toBeNull();
    expect(editor.sectionStats().map((s: any) => s.value)).toEqual([27, '—', 3, 204]);
    expect(request.mock.calls.every((call) => !call[0].includes('/roster?'))).toBe(true);
    editor.from.set('2025-01-01');
    await settle(fixture);
    editor.choose('Audit');
    await settle(fixture);
    expect(editor.from()).toBe('2025-01-01');
    expect(request.mock.calls.at(-1)![0]).toContain('/history/audit?');
    expect(request.mock.calls.at(-1)![0]).toContain('start=2025-01-01');
    expect(editor.audit().map((event: any) => event.id)).toEqual(['new', 'old']);
    expect(fixture.nativeElement.textContent).toContain('Recorded actor');
  });
  it('fetches the latest call and opens a prefilled branded popup', async () => {
    TestBed.inject(ActivatedRoute).snapshot.data = { rotaSection: 'call-packages' };
    const fixture = TestBed.createComponent(Rota);
    await settle(fixture);
    const editor = fixture.componentInstance as any;
    await editor.open('call', 'call');
    fixture.detectChanges();
    expect(editor.call.tasks).toBe('Latest recorded instructions');
    expect(
      fixture.nativeElement.querySelector('[role="dialog"].service-user-popup'),
    ).not.toBeNull();
    expect(request.mock.calls.some((c) => c[0].endsWith('/call-packages/call'))).toBe(true);
  });
  it('uses the existing planner when starting allocations from publishing', async () => {
    TestBed.inject(ActivatedRoute).snapshot.data = { rotaSection: 'publishing' };
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(Rota);
    await settle(fixture);
    await (fixture.componentInstance as any).open('allocation');
    expect(navigate).toHaveBeenCalledWith(['/manage/rota/planner'], {
      queryParams: { plan: 'true', client: null },
    });
  });
  it('shows backend errors without retaining a successful-looking register', async () => {
    request.mockRejectedValue(new Error('Roster unavailable'));
    const fixture = TestBed.createComponent(Rota);
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('Roster unavailable');
    expect(fixture.nativeElement.textContent).not.toContain('Recorded person');
  });
  it('uses database training options and source packages for call defaults', async () => {
    TestBed.inject(ActivatedRoute).snapshot.data = { rotaSection: 'call-packages' };
    workspace.calls[0].skills = ['retained-requirement'];
    const fixture = TestBed.createComponent(Rota);
    await settle(fixture);
    const editor = fixture.componentInstance as any;
    editor.packageClient.set('client');
    await settle(fixture);
    expect(editor.courses).toContainEqual({ id: 'recorded-skill', title: 'Recorded training' });
    expect(editor.courses).toContainEqual({
      id: 'retained-requirement',
      title: 'retained-requirement',
    });
    expect(editor.callTypes()).toEqual(['Morning care']);
    expect(editor.sectionStats()[1].value).toBe(1);
    expect(request.mock.calls.every((call) => !/roster\?start=/.test(call[0]))).toBe(true);
  });
  it('clears stale package forms when the selected service user changes', async () => {
    TestBed.inject(ActivatedRoute).snapshot.data = { rotaSection: 'call-packages' };
    const fixture = TestBed.createComponent(Rota);
    await settle(fixture);
    const editor = fixture.componentInstance as any;
    editor.packageClient.set('client');
    await settle(fixture);
    await editor.open('call', 'call');
    expect(editor.modal()).toBe('call');
    editor.packageClient.set('');
    await settle(fixture);
    expect(editor.modal()).toBe('');
    expect(editor.call.tasks).toBe('');
  });
  function publishingVisits() {
    const ready = { ...rosterVisit(), id: 'ready', date: londonDate(), staffIds: ['worker'] };
    const blocked = { ...rosterVisit(), id: 'blocked', date: londonDate() };
    workspace.visits = [ready, blocked];
    workspace.reviews = {
      ready: { etag: '"v1"', ready: true, issues: [] },
      blocked: {
        etag: '"v1"',
        ready: false,
        issues: ['Current accepted medication training evidence is required.'],
      },
    };
    TestBed.inject(ActivatedRoute).snapshot.data = { rotaSection: 'publishing' };
    return { ready, blocked };
  }
  it('renders server publishing counts and evidence issues and selects only ready drafts', async () => {
    const { blocked } = publishingVisits();
    workspace.metrics = { drafts: 12, unallocated: 3, conflicts: 2, published: 9 };
    const fixture = TestBed.createComponent(Rota);
    await settle(fixture);
    const editor = fixture.componentInstance as any;
    expect(editor.sectionStats()[0].value).toBe(12);
    const boxes = fixture.nativeElement.querySelectorAll('tbody input[type="checkbox"]');
    expect(boxes[0].disabled).toBe(false);
    expect(boxes[1].disabled).toBe(true);
    editor.toggleAll();
    expect(editor.selectedIds()).toEqual(['ready']);
    editor.view(blocked);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Current accepted medication training evidence is required.',
    );
  });
  it('keeps reviewed ETags on publication and reloads stale drafts for a new review', async () => {
    publishingVisits();
    const fixture = TestBed.createComponent(Rota);
    await settle(fixture);
    const editor = fixture.componentInstance as any;
    editor.toggleVisit('ready');
    workspace.visits[0].etag = '"v2"';
    workspace.visits[0].version = 2;
    workspace.reviews.ready.etag = '"v2"';
    const original = request.getMockImplementation()! as (
      path: string,
      body?: any,
      method?: string,
    ) => Promise<any>;
    request.mockImplementation(async (path: string, body?: any, method?: string) => {
      if (path.endsWith('/publish') && method === 'POST')
        throw Object.assign(new Error('This draft changed. Review it again.'), { status: 412 });
      return original(path, body, method);
    });
    await editor.publish();
    await settle(fixture);
    const publication = request.mock.calls.find((call) => call[0].endsWith('/publish'))!;
    expect(publication[1].visits).toEqual([{ id: 'ready', etag: '"v1"' }]);
    expect(editor.selectedIds()).toEqual([]);
    expect(editor.error()).toContain('Review it again');
    expect(request.mock.calls.at(-1)![0]).toContain('/publishing?');
  });
  it('drops hidden selections and keeps the published tab free of draft filters', async () => {
    publishingVisits();
    workspace.visits[1].state = 'Published';
    const fixture = TestBed.createComponent(Rota);
    await settle(fixture);
    const editor = fixture.componentInstance as any;
    editor.toggleVisit('ready');
    editor.query.set('No matching visits');
    await settle(fixture);
    expect(editor.selectedIds()).toEqual([]);
    editor.choose('Published');
    await settle(fixture);
    expect(editor.filtered().map((v: any) => v.id)).toEqual(['blocked']);
  });
  it('requires an entered travel buffer and does not turn an unknown rule into zero', async () => {
    publishingVisits();
    const fixture = TestBed.createComponent(Rota);
    await settle(fixture);
    const editor = fixture.componentInstance as any;
    expect(editor.travel).toBeNull();
    await editor.saveTravel();
    expect(editor.error()).toContain('Enter a travel buffer');
    expect(request.mock.calls.some((call) => call[2] === 'PATCH')).toBe(false);
  });
  it('blocks publishing when source readiness is unavailable and labels attendance honestly', async () => {
    publishingVisits();
    workspace.attendance_available = false;
    workspace.metrics = { drafts: 1, unallocated: 0, conflicts: null, published: 1 };
    workspace.reviews.ready = {
      etag: '"v1"',
      ready: null,
      issues: ['Attendance sources are unavailable.'],
    };
    workspace.visits[1].state = 'Published';
    workspace.visits[1].staffIds = ['worker'];
    const fixture = TestBed.createComponent(Rota);
    await settle(fixture);
    const editor = fixture.componentInstance as any;
    editor.toggleAll();
    await editor.publish();
    expect(editor.selectedIds()).toEqual([]);
    expect(editor.sectionStats()[2].value).toBe('—');
    expect(request.mock.calls.some((call) => call[0].endsWith('/publish'))).toBe(false);
    editor.choose('Published');
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('Attendance unavailable');
  });
  it('reloads a stale travel rule for review before another save', async () => {
    publishingVisits();
    workspace.travelMinutes = 20;
    workspace.settings_etag = '"v1"';
    const fixture = TestBed.createComponent(Rota);
    await settle(fixture);
    const editor = fixture.componentInstance as any;
    editor.travel = 25;
    workspace.travelMinutes = 30;
    workspace.settings_etag = '"v2"';
    const original = request.getMockImplementation()! as (
      path: string,
      body?: any,
      method?: string,
    ) => Promise<any>;
    request.mockImplementation(async (path: string, body?: any, method?: string) => {
      if (path.endsWith('/settings') && method === 'PATCH')
        throw Object.assign(new Error('This rule changed. Review it again.'), { status: 412 });
      return original(path, body, method);
    });
    await editor.saveTravel();
    await settle(fixture);
    expect(editor.error()).toContain('Review it again');
    expect(editor.travel).toBe(30);
    expect(request.mock.calls.at(-1)![0]).toContain('/publishing?');
    request.mockImplementation(original);
    editor.travel = 15;
    await editor.saveTravel();
    const edits = request.mock.calls.filter((call) => call[2] === 'PATCH');
    expect((edits[1] as any)[3]['If-Match']).toBe('"v2"');
  });
  it('does not publish a hidden draft while a filter update is waiting to render', async () => {
    publishingVisits();
    const fixture = TestBed.createComponent(Rota);
    await settle(fixture);
    const editor = fixture.componentInstance as any;
    editor.toggleVisit('ready');
    editor.query.set('No matching visit');
    await editor.publish();
    expect(request.mock.calls.some((call) => call[0].endsWith('/publish'))).toBe(false);
  });
  it('clears the previous workspace travel rule when the next workspace cannot load', async () => {
    publishingVisits();
    workspace.travelMinutes = 20;
    const fixture = TestBed.createComponent(Rota);
    await settle(fixture);
    const editor = fixture.componentInstance as any;
    expect(editor.travel).toBe(20);
    request.mockRejectedValue(new Error('Next workspace unavailable'));
    const records = TestBed.inject(ServiceUsersApi) as any;
    records.companyId.set('south');
    records.scope.set('south:actor');
    await settle(fixture);
    expect(editor.travel).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('20 min travel buffer');
  });
});
