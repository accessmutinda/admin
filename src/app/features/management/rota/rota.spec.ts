import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { DEMO_USER } from '../../../core/auth/fixtures';
import { Rota } from './rota';
import { RotaService } from './rota.service';

describe('Rota screens', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [Rota], providers: [provideRouter([])] });
    const auth = TestBed.inject(AuthService);
    auth.signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    vi.spyOn(auth, 'currentUser').mockReturnValue({ ...DEMO_USER, roleCode: 'CA' });
  });
  it('renders all starting workflows before any visits have been created', async () => {
    const fixture = TestBed.createComponent(Rota);
    fixture.detectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.rota-workflow')).toHaveLength(6);
    expect(element.querySelectorAll('.metric strong')[0].textContent).toBe('0');
    expect(element.textContent).toContain('Service users & calls');
  });
  it('renders saved service users and their calls in the package view', async () => {
    const service = TestBed.inject(RotaService);
    service.saveClient({
      id: 'client',
      name: 'Mary Smith',
      reference: 'M1',
      address: '1 Test Street',
      postcode: 'SW1A 1AA',
      funding: 'Private',
      priority: 'Standard',
      active: true,
    });
    service.saveCall({
      id: 'call',
      clientId: 'client',
      name: 'Breakfast call',
      start: '08:00',
      end: '08:30',
      carers: 1,
      weekdays: [1],
      skills: [],
      regularStaffIds: [],
      tasks: 'Prepare breakfast',
      active: true,
    });
    const fixture = TestBed.createComponent(Rota);
    const editor = fixture.componentInstance as unknown as {
      choose(view: string): void;
      packageClient: { set(id: string): void };
    };
    editor.choose('Service users');
    editor.packageClient.set('client');
    fixture.detectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.rota-client-list')?.textContent).toContain('Mary Smith');
    expect(element.querySelector('.rota-call-list')?.textContent).toContain('Breakfast call');
    expect(element.querySelector('.rota-call-list')?.textContent).toContain('Prepare breakfast');
  });
  it('shows a clear permission panel and links to the current role instead of displaying rota data', async () => {
    vi.mocked(TestBed.inject(AuthService).currentUser).mockReturnValue({
      ...DEMO_USER,
      roleCode: 'CW',
    });
    const fixture = TestBed.createComponent(Rota);
    fixture.detectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.access-required-panel')?.textContent).toContain('View rota');
    expect(element.querySelector('.access-required-context')?.textContent).toContain('Care Worker');
    expect(element.querySelector('.access-required-actions a')?.getAttribute('href')).toContain(
      'role=Care%20Worker',
    );
    expect(element.querySelector('.rota-register')).toBeNull();
  });
});
