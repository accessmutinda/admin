import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { Rota } from './rota';
import { rosterWorkspace } from './roster.spec-fixtures';

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
    request = vi.fn(async (path: string, body?: any, method?: string) =>
      path.endsWith('/call-packages/call')
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
            selected: signal(null),
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
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.rota-call-list').textContent).toContain(
      'Recorded instructions',
    );
    expect(fixture.nativeElement.querySelector('.rota-workflows')).toBeNull();
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
});
