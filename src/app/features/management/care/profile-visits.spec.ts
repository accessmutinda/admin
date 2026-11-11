import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Component, input, output, signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
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
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Recorded person');
    expect(fixture.nativeElement.querySelector('cv-profile-visits')).not.toBeNull();
    expect(request.mock.calls.filter((c) => c[0].includes('/roster?')).length).toBe(1);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(request.mock.calls.filter((c) => c[0].includes('/roster?')).length).toBe(1);
  });
  it('opens a prefilled edit popup from a fresh backend response', async () => {
    const fixture = TestBed.createComponent(VisitPlanner);
    fixture.detectChanges();
    await fixture.whenStable();
    const editor = fixture.componentInstance as any;
    await editor.edit(rosterVisit());
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(editor.draft.tasks).toBe('Latest instructions');
    expect(
      fixture.nativeElement.querySelector('[role="dialog"].service-user-popup'),
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelector('input[name="start"]').value).toBe('08:00');
  });
  it('keeps entered edits and the popup open when a save is rejected', async () => {
    const fixture = TestBed.createComponent(VisitPlanner);
    fixture.detectChanges();
    await fixture.whenStable();
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
    fixture.detectChanges();
    await fixture.whenStable();
    const editor = fixture.componentInstance as any;
    await editor.edit(rosterVisit());
    scope.set('north:actor:revoked');
    fixture.detectChanges();
    expect(editor.modal()).toBe('');
    expect(editor.draft).toBeNull();
  });
  it('submits recurring allocations and disables confirmation while saving', async () => {
    const fixture = TestBed.createComponent(VisitPlanner);
    fixture.detectChanges();
    await fixture.whenStable();
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
