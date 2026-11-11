import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Component, input, output, signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { ApiError } from '../../../core/auth/auth-api';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { VisitPlanner } from './visit-planner';
import { ProfileVisits } from './profile-visits';
import { CareHeader } from './care-header';
import { rosterVisit, rosterWorkspace } from '../rota/roster.spec-fixtures';
@Component({ selector: 'cv-care-header', template: '' })
class HeaderStub {
  client = input<any>();
  active = input('');
  printManaged = input(false);
  printBusy = input(false);
  printRequested = output<void>();
}
async function settle(fixture: ComponentFixture<VisitPlanner>): Promise<void> {
  for (let round = 0; round < 4; round++) {
    fixture.detectChanges();
    await fixture.whenStable();
  }
  fixture.detectChanges();
}
describe('Service user visits and allocation', () => {
  let request: ReturnType<typeof vi.fn>,
    workspace: any,
    selected: ReturnType<typeof signal<any>>,
    scope: ReturnType<typeof signal<string>>;
  beforeEach(() => {
    workspace = rosterWorkspace();
    workspace.visits = [rosterVisit()];
    selected = signal(null);
    scope = signal('north:actor');
    const params = new BehaviorSubject(convertToParamMap({ id: 'client' })),
      query = new BehaviorSubject(convertToParamMap({}));
    request = vi.fn(async (path: string, body?: any, method?: string) =>
      path.endsWith('/visits/visit/candidates')
        ? { company_id: 'north', visit_id: 'visit', candidates: [] }
        : path.endsWith('/visits/visit')
          ? { ...rosterVisit(), tasks: 'Latest instructions', ...body }
          : method
            ? { company_id: 'north', ids: ['visit'] }
            : structuredClone(workspace),
    );
    TestBed.configureTestingModule({
      imports: [VisitPlanner],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: params,
            queryParamMap: query,
            snapshot: { data: {}, paramMap: params.value, queryParamMap: query.value },
          },
        },
        { provide: AuthService, useValue: { api: request } },
        {
          provide: ServiceUsersApi,
          useValue: {
            scope,
            companyId: signal('north'),
            allowed: () => true,
            selected,
            detailPending: () => false,
            error: signal(''),
            access: { can: () => true },
            detail: vi.fn(async () =>
              selected.set({ ...workspace.clients[0], file: { details: {}, support: {} } }),
            ),
          },
        },
      ],
    });
    TestBed.overrideComponent(ProfileVisits, {
      remove: { imports: [CareHeader] },
      add: { imports: [HeaderStub] },
    });
  });
  it('loads the profile and schedule without repeatedly remounting and refreshing', async () => {
    const fixture = TestBed.createComponent(VisitPlanner);
    await settle(fixture);
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('Recorded person');
    expect(fixture.nativeElement.querySelector('cv-profile-visits')).not.toBeNull();
    expect(
      request.mock.calls.filter((c) => c[0].includes('/service-users/client/visits?')).length,
    ).toBe(1);
    await settle(fixture);
    expect(
      request.mock.calls.filter((c) => c[0].includes('/service-users/client/visits?')).length,
    ).toBe(1);
  });
  it('keeps the service user and schedule dates when handing drafts to Publishing', async () => {
    const fixture = TestBed.createComponent(VisitPlanner);
    await settle(fixture);
    const profile = fixture.debugElement.query(By.directive(ProfileVisits))
      .componentInstance as any;
    const link = fixture.nativeElement.querySelector(
      'a[href^="/manage/rota/publishing"]',
    ) as HTMLAnchorElement;
    const destination = new URL(link.href);
    expect(destination.searchParams.get('client')).toBe('client');
    expect(destination.searchParams.get('from')).toBe(profile.start());
    expect(destination.searchParams.get('to')).toBe(profile.end());
  });
  it('renders the refreshed schedule before opening print', async () => {
    const fixture = TestBed.createComponent(VisitPlanner);
    await settle(fixture);
    const profile = fixture.debugElement.query(By.directive(ProfileVisits))
      .componentInstance as any;
    const print = vi.spyOn(window, 'print').mockImplementation(() => {
      expect(fixture.nativeElement.querySelector('[aria-label="Loading service user"]')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Visits & Allocation');
    });
    await profile.print();
    expect(
      request.mock.calls.some(([path]) => path.includes('/service-users/client/visits/export?')),
    ).toBe(true);
    expect(print).toHaveBeenCalledOnce();
    print.mockRestore();
  });
  it('holds the content skeleton through a slow schedule read and keeps the service user card', async () => {
    let finish!: (value: unknown) => void;
    request.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const fixture = TestBed.createComponent(VisitPlanner);
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();
    const profile = fixture.debugElement.query(By.directive(ProfileVisits)).componentInstance;
    expect(fixture.nativeElement.querySelector('cv-care-header')).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('[aria-label="Loading service user"]'),
    ).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('No visits scheduled');
    finish(structuredClone(workspace));
    await settle(fixture);
    expect(fixture.debugElement.query(By.directive(ProfileVisits)).componentInstance).toBe(profile);
    expect(fixture.nativeElement.querySelector('[aria-label="Loading service user"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Visits & Allocation');
  });
  it('shows a scheduling error instead of an empty calendar and retries without discarding entered allocations', async () => {
    const fixture = TestBed.createComponent(VisitPlanner);
    await settle(fixture);
    const profile = fixture.debugElement.query(By.directive(ProfileVisits))
      .componentInstance as any;
    profile.form.notes = 'Keep the recorded routine';
    request.mockRejectedValueOnce(new ApiError('Missing route', 404, 'request_failed'));
    await profile.service.refresh();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Visits & Allocation unavailable');
    expect(fixture.nativeElement.textContent).not.toContain('No visits scheduled');
    expect(fixture.nativeElement.querySelector('cv-care-header')).not.toBeNull();
    fixture.nativeElement.querySelector('.cu-retry').click();
    await settle(fixture);
    expect(fixture.nativeElement.textContent).not.toContain('Visits & Allocation unavailable');
    expect(profile.form.notes).toBe('Keep the recorded routine');
    expect(fixture.debugElement.query(By.directive(ProfileVisits)).componentInstance).toBe(profile);
  });
  it('opens a prefilled edit popup from a fresh backend response', async () => {
    const fixture = TestBed.createComponent(VisitPlanner);
    await settle(fixture);
    const editor = fixture.componentInstance as any;
    await editor.edit(rosterVisit());
    await settle(fixture);
    fixture.detectChanges();
    expect(editor.draft.tasks).toBe('Latest instructions');
    expect(
      fixture.nativeElement.querySelector('[role="dialog"].service-user-popup'),
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelector('input[name="start"]').value).toBe('08:00');
  });
  it('keeps entered edits and the popup open when a save is rejected', async () => {
    const fixture = TestBed.createComponent(VisitPlanner);
    await settle(fixture);
    const editor = fixture.componentInstance as any;
    await editor.edit(rosterVisit());
    editor.draft.start = '09:00';
    editor.reason = 'Reschedule care';
    request.mockImplementation(async (_p: string, _b: any, method?: string) => {
      if (method === 'PATCH') throw Error('The visit changed. Reopen it.');
      return structuredClone(workspace);
    });
    await editor.save();
    fixture.detectChanges();
    expect(editor.draft.start).toBe('09:00');
    expect(editor.modal()).toBe('visit');
    expect(editor.error()).toContain('visit changed');
  });
  it('clears the editor on access-context changes', async () => {
    const fixture = TestBed.createComponent(VisitPlanner);
    await settle(fixture);
    const editor = fixture.componentInstance as any;
    await editor.edit(rosterVisit());
    scope.set('north:actor:revoked');
    fixture.detectChanges();
    expect(editor.modal()).toBe('');
    expect(editor.draft).toBeNull();
  });
  it('submits recurring allocations and disables confirmation while saving', async () => {
    const fixture = TestBed.createComponent(VisitPlanner);
    await settle(fixture);
    const profile = fixture.debugElement.query(By.directive(ProfileVisits))
      .componentInstance as any;
    profile.toggleCall('call');
    Object.assign(profile.form, { primary: 'carer-1', from: '2026-11-11', to: '2026-11-18' });
    let resolve!: (value: any) => void;
    request.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const pending = profile.save();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button.confirm').disabled).toBe(true);
    const submitted = request.mock.calls.find((c) => c[0].endsWith('/generate'))!;
    expect(submitted[1]).toMatchObject({
      clientId: 'client',
      callIds: ['call'],
      staffIds: ['carer-1'],
      start: '2026-11-11',
      end: '2026-11-18',
      allocation: 'Regular',
      options: { start: '08:00', durationMinutes: 30, carers: 1 },
    });
    resolve({ company_id: 'north', ids: ['visit'] });
    await pending;
    fixture.detectChanges();
    expect(profile.notice()).toContain('saved as drafts');
    expect(profile.dirty()).toBe(false);
  });
});
