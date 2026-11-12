import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { VisitPlanner } from './visit-planner';
import { rosterVisit, rosterWorkspace } from '../rota/roster.spec-fixtures';

describe('Visits overview source integration', () => {
  let request: ReturnType<typeof vi.fn>, workspace: any, actions: Set<string>;
  let accessRevision: ReturnType<typeof signal<number>>;
  beforeEach(() => {
    actions = new Set(['read', 'create', 'edit', 'publish', 'archive', 'export']);
    accessRevision = signal(0);
    workspace = {
      ...rosterWorkspace(),
      matching_visit_ids: ['visit'],
      visit_statuses: { visit: 'Needs staff' },
      visits: [rosterVisit()],
      training_options: [{ id: 'recorded-skill', name: 'Recorded training' }],
      metrics: [
        { key: 'total', value: 12, percentage: null },
        { key: 'allocated', value: 9, percentage: 75 },
        { key: 'unallocated', value: 3, percentage: 25 },
        { key: 'double_up', value: 2, percentage: 17 },
        { key: 'staff', value: 4, percentage: null },
        { key: 'late', value: null, percentage: null },
      ],
      alerts: [{ kind: 'conflicts', count: 1, visit_id: 'visit' }],
      previous_count: 10,
      change_percentage: 20,
      staff_on_leave: null,
      as_of: '2026-11-11T12:00:00Z',
    };
    request = vi.fn(async (path: string) =>
      path.endsWith('/visits/visit/candidates')
        ? { company_id: 'north', visit_id: 'visit', candidates: [] }
        : path.endsWith('/visits/visit')
          ? rosterVisit()
          : structuredClone(workspace),
    );
    const params = new BehaviorSubject(convertToParamMap({}));
    const query = new BehaviorSubject(convertToParamMap({ from: '2026-11-11' }));
    TestBed.configureTestingModule({
      imports: [VisitPlanner],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: params,
            queryParamMap: query,
            snapshot: {
              data: { visitsWorkspace: true, visitsOverview: true },
              paramMap: params.value,
              queryParamMap: query.value,
            },
          },
        },
        { provide: AuthService, useValue: { api: request } },
        {
          provide: ServiceUsersApi,
          useValue: {
            scope: signal('north:actor'),
            companyId: signal('north'),
            allowed: () => true,
            selected: signal(null),
            access: {
              can: (_module: string, _submodule: string, action: string) => (
                accessRevision(),
                actions.has(action)
              ),
            },
          },
        },
      ],
    });
  });
  it('renders backend summaries and reloads filters without changing the screen structure', async () => {
    const fixture = TestBed.createComponent(VisitPlanner);
    for (let i = 0; i < 4; i++) {
      fixture.detectChanges();
      await fixture.whenStable();
    }
    const component = fixture.componentInstance as any;
    expect(request.mock.calls.at(-1)![0]).toContain('/roster/overview?');
    expect(fixture.nativeElement.querySelectorAll('.care-stats > *').length).toBe(6);
    expect(component.rosterStats()[0].value).toBe(12);
    expect(component.rosterStats()[1].detail).toBe('75% of total');
    expect(component.rosterStats()[5].value).toBe('—');
    expect(component.courses).toEqual([{ id: 'recorded-skill', title: 'Recorded training' }]);
    fixture.nativeElement.querySelector('.planner-issue').click();
    for (let i = 0; i < 4; i++) {
      fixture.detectChanges();
      await fixture.whenStable();
    }
    expect(fixture.nativeElement.querySelector('[role="dialog"]').textContent).toContain(
      'Visit details & allocation',
    );
    expect(request.mock.calls.some((call) => call[0].endsWith('/visits/visit'))).toBe(true);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fixture.nativeElement.querySelector('[aria-label="Close planner"]').click();
    fixture.detectChanges();
    component.allocationFilter.set('Unallocated');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(request.mock.calls.at(-1)![0]).toContain('allocation=Unallocated');
    request.mockRejectedValue(new Error('Overview unavailable'));
    component.query.set('Search');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    for (let i = 0; i < 4; i++) {
      fixture.detectChanges();
      await fixture.whenStable();
    }
    expect(fixture.nativeElement.textContent).toContain('Overview unavailable');
    expect(fixture.nativeElement.textContent).not.toContain(
      'All matching visits have staff allocated.',
    );
    expect(component.rosterStats()[0].value).toBe('—');
  });
  async function openOverview() {
    const fixture = TestBed.createComponent(VisitPlanner);
    await settle(fixture);
    return fixture;
  }
  async function settle(fixture: any) {
    for (let i = 0; i < 4; i++) {
      fixture.detectChanges();
      await fixture.whenStable();
    }
  }
  it('prunes hidden selections when filters reload the source', async () => {
    const fixture = await openOverview(),
      component = fixture.componentInstance as any;
    component.selected.set(['visit']);
    workspace.matching_visit_ids = [];
    component.query.set('No matching visit');
    await settle(fixture);
    expect(component.selected()).toEqual([]);
    expect(component.visits()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('No visits match the current filters.');
    component.prepareBulk();
    expect(component.modal()).toBe('');
  });
  it('keeps monthly availability consistent with the selected period', async () => {
    workspace.staff = [
      {
        id: 'worker',
        name: 'Recorded carer',
        gender: null,
        driver: null,
        hours: '35',
        training: [],
        availabilityRecorded: true,
        availableDays: ['2026-11-23'],
      },
    ];
    const fixture = await openOverview(),
      component = fixture.componentInstance as any;
    component.availabilityFilter.set('Available');
    await settle(fixture);
    expect(component.staff()).toHaveLength(0);
    component.view.set('Month');
    await settle(fixture);
    expect(component.staff()).toHaveLength(1);
  });
  it('uses backend row statuses and disables unavailable alert actions', async () => {
    workspace.visit_statuses.visit = 'Timing unavailable';
    const fixture = await openOverview(),
      component = fixture.componentInstance as any;
    expect(component.status(component.visits()[0])).toBe('Timing unavailable');
    const alerts = fixture.nativeElement.querySelectorAll('.planner-issue');
    expect(alerts[0].disabled).toBe(false);
    expect(alerts[1].disabled).toBe(true);
  });
  it('matches create and edit action controls to their own permissions', async () => {
    actions.delete('edit');
    const fixture = await openOverview(),
      component = fixture.componentInstance as any;
    expect(fixture.nativeElement.textContent).toContain('Add Visit');
    expect(fixture.nativeElement.textContent).not.toContain('Auto Allocate');
    await component.prepareAuto();
    expect(component.modal()).toBe('');
    actions.delete('create');
    accessRevision.update((v) => v + 1);
    await settle(fixture);
    expect(fixture.nativeElement.textContent).not.toContain('Add Visit');
    component.create();
    expect(component.modal()).toBe('');
  });
  it('blocks saving while suggestions load and discards suggestions after closing', async () => {
    const fixture = await openOverview(),
      component = fixture.componentInstance as any;
    let resolve!: (value: any) => void;
    request.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const pending = component.prepareAuto();
    fixture.detectChanges();
    expect(component.preparing()).toBe(true);
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    await component.save();
    expect(request.mock.calls.some((call) => call[0].endsWith('/allocations'))).toBe(false);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.close();
    component.create();
    resolve({
      company_id: 'north',
      plans: [{ id: 'visit', etag: '"v1"', staffIds: ['worker'] }],
      unfilled: [],
    });
    await pending;
    expect(component.modal()).toBe('plan');
    expect(component.plans).toEqual([]);
    expect(component.preparing()).toBe(false);
  });
  it('keeps the newest visit editor when detail responses arrive out of order', async () => {
    const fixture = await openOverview(),
      component = fixture.componentInstance as any;
    let first!: (value: any) => void, second!: (value: any) => void;
    request.mockImplementationOnce(() => new Promise((r) => (first = r)));
    request.mockImplementationOnce(() => new Promise((r) => (second = r)));
    const a = component.edit(rosterVisit());
    const b = component.edit({ ...rosterVisit(), id: 'visit2' });
    second({ ...rosterVisit(), id: 'visit2' });
    await b;
    first(rosterVisit());
    await a;
    expect(component.draft.id).toBe('visit2');
  });
  it('preserves the current selection when unchanged access information refreshes', async () => {
    const fixture = await openOverview(),
      component = fixture.componentInstance as any;
    component.selected.set(['visit']);
    const count = request.mock.calls.length;
    accessRevision.update((v) => v + 1);
    await settle(fixture);
    expect(request).toHaveBeenCalledTimes(count);
    expect(component.selected()).toEqual(['visit']);
  });
  it('closes the editor and clears its draft when backend access is revoked', async () => {
    const fixture = await openOverview(),
      component = fixture.componentInstance as any;
    await component.edit(rosterVisit());
    await settle(fixture);
    expect(component.draft).not.toBeNull();
    request.mockRejectedValue(Object.assign(new Error('Access revoked'), { status: 403 }));
    component.query.set('Refresh after revocation');
    await settle(fixture);
    expect(component.modal()).toBe('');
    expect(component.draft).toBeNull();
    expect(component.selected()).toEqual([]);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });
  it('opens the package planning handoff after sources load and retains the selected client', async () => {
    const route = TestBed.inject(ActivatedRoute) as any;
    route.snapshot.data = { visitsWorkspace: true };
    route.queryParamMap.next(
      convertToParamMap({ plan: 'true', client: 'client', from: '2026-11-11' }),
    );
    const fixture = await openOverview(),
      component = fixture.componentInstance as any;
    expect(component.modal()).toBe('plan');
    expect(component.plan.clientId).toBe('client');
    expect(fixture.nativeElement.querySelector('[role="dialog"]').textContent).toContain(
      'Plan recurring visits',
    );
  });
});
