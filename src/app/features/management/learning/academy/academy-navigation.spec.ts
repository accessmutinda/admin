import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { ManagementStore } from '../../shared/management.store';
import { AcademyService } from './academy.service';
import { AcademyGovernanceService } from './academy-governance.service';
import { AcademyDemoWorkflow } from './academy-demo-workflow';
import { WorkspaceTools } from '../../care/workspace-tools';
import { WallboardLauncher } from '../../ecm/wallboard-launcher';
import { ManagementLayout } from '../../layout/management-layout';
@Component({ template: '<h1>Academy destination</h1>' })
class Destination {}
@Component({ selector: 'cv-workspace-tools', template: '' })
class WorkspaceToolsStub {}
describe('Academy navigation within the admin console', () => {
  const role = signal('CA');
  const auth = {
    currentUser: () => ({
      id: 'author-one',
      name: 'Course author',
      initials: 'CA',
      roleCode: role(),
    }),
    hasRole: (...codes: string[]) => codes.includes(role()),
    isSuperAdmin: () => role() === 'PO',
    canSwitchWorkspace: () => role() === 'PO',
    profile: () => ({ company_id: 'company-one' }),
    signOut: vi.fn(),
  };
  beforeEach(async () => {
    role.set('CA');
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        {
          provide: CompanyAccessService,
          useValue: { context: () => ({ roles: [] }), can: () => true, canPath: () => true },
        },
        {
          provide: ManagementStore,
          useValue: {
            company: () => ({ name: 'North Training', code: 'NORTH' }),
            storageAvailable: () => true,
          },
        },
        {
          provide: AcademyService,
          useValue: {
            canManage: () => role() !== 'CW',
            can: () => role() !== 'CW',
            canViewEvidence: () => false,
            state: () => ({ governance: {} }),
          },
        },
        { provide: AcademyGovernanceService, useValue: { seed: vi.fn() } },
        { provide: AcademyDemoWorkflow, useValue: {} },
        { provide: WallboardLauncher, useValue: { open: vi.fn() } },
        provideRouter([
          {
            path: 'manage',
            component: ManagementLayout,
            children: [
              { path: 'learning', component: Destination },
              { path: 'learning/questions', component: Destination },
              { path: 'learning/courses/new', component: Destination },
              { path: 'learning/structure/:courseId', component: Destination },
              { path: 'learning/rules/:courseId', component: Destination },
              { path: 'learning/publish/:courseId', component: Destination },
              { path: 'companies', component: Destination },
              { path: 'rota/overview', component: Destination },
            ],
          },
        ]),
      ],
    });
    TestBed.overrideComponent(ManagementLayout, {
      remove: { imports: [WorkspaceTools] },
      add: { imports: [WorkspaceToolsStub] },
    });
    await TestBed.compileComponents();
  });
  afterEach(() => vi.restoreAllMocks());
  it('opens the Academy dropdown on a direct course link while retaining the shared shell', async () => {
    const harness = await RouterTestingHarness.create('/manage/learning/courses/new');
    const page = harness.routeNativeElement!;
    expect(page.querySelector('.academy-submenu-toggle')?.getAttribute('aria-expanded')).toBe(
      'true',
    );
    expect(
      page.querySelector('.academy-submenu a[aria-current="page"]')?.getAttribute('href'),
    ).toBe('/manage/learning/courses');
    expect(
      page.querySelector('.app-sidebar a[href="/manage/companies/company-one"]'),
    ).not.toBeNull();
    expect(page.querySelector('.app-sidebar a[href="/manage/people"]')).not.toBeNull();
    expect(page.querySelector('.co-console-heading strong')?.textContent).toBe('Admin Console');
    expect(page.querySelector('.academy-shell')).toBeNull();
    expect(page.querySelector('.workspace-control')).toBeNull();
    expect(page.querySelector('.app-sidebar > .nav-label')?.textContent).toBe('CARE DELIVERY');
    await harness.navigateByUrl('/manage/learning/structure/test-course');
    expect(
      page.querySelector('.academy-submenu a[aria-current="page"]')?.getAttribute('href'),
    ).toBe('/manage/learning/courses');
    expect(page.querySelector('.academy-submenu a[href="/manage/learning/assets"]')).toBeNull();
    expect(page.querySelector('.academy-submenu a[href="/manage/learning/rules"]')).toBeNull();
    expect(page.querySelector('.academy-submenu a[href="/manage/learning/publish"]')).toBeNull();
    await harness.navigateByUrl('/manage/learning/rules/test-course');
    expect(
      page.querySelector('.academy-submenu a[aria-current="page"]')?.getAttribute('href'),
    ).toBe('/manage/learning/courses');
    await harness.navigateByUrl('/manage/learning/publish/test-course');
    expect(
      page.querySelector('.academy-submenu a[aria-current="page"]')?.getAttribute('href'),
    ).toBe('/manage/learning/courses');
    const menu = page.querySelector<HTMLElement>('.academy-submenu')!;
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    harness.detectChanges();
    expect(page.querySelector('.academy-submenu')).toBeNull();
    expect(page.querySelector('.academy-submenu-toggle')?.getAttribute('aria-expanded')).toBe(
      'false',
    );
  });
  it('places the Super Admin workspace selector above Organisation and removes it from the header', async () => {
    role.set('PO');
    const harness = await RouterTestingHarness.create('/manage/companies');
    const page = harness.routeNativeElement!;
    const selector = page.querySelector<HTMLButtonElement>('.app-sidebar > .workspace-control')!;
    expect(selector).not.toBeNull();
    expect(page.querySelector('.app-sidebar > .nav-label')?.textContent).toBe('ORGANISATION');
    expect(selector.nextElementSibling?.textContent).toBe('ORGANISATION');
    expect(selector.textContent).toContain('North Training');
    expect(page.querySelector('.app-header .workspace-control')).toBeNull();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    selector.click();
    expect(navigate).toHaveBeenCalledWith('/select-workspace');
  });
  it('uses Visits & Rostering Overview as the company home destination', async () => {
    const harness = await RouterTestingHarness.create('/manage/rota/overview');
    const page = harness.routeNativeElement!;
    expect(page.querySelector('.sidebar-logo')?.getAttribute('href')).toBe('/manage/rota/overview');
    expect(page.querySelector('.visits-submenu a[aria-current="page"]')?.getAttribute('href')).toBe(
      '/manage/rota/overview',
    );
    expect(page.querySelector('.app-sidebar > .nav-label')?.textContent).toBe('CARE DELIVERY');
  });
  it('expands on navigation into Academy and allows manual collapse without navigating', async () => {
    const harness = await RouterTestingHarness.create('/manage/companies');
    const page = harness.routeNativeElement!;
    expect(page.querySelector('.academy-submenu')).toBeNull();
    await harness.navigateByUrl('/manage/learning/questions');
    expect(page.querySelector('.academy-submenu a[href="/manage/learning/questions"]')).toBeNull();
    expect(
      page.querySelector('.academy-submenu a[aria-current="page"]')?.getAttribute('href'),
    ).toBe('/manage/learning/courses');
    page.querySelector<HTMLButtonElement>('.academy-submenu-toggle')!.click();
    harness.detectChanges();
    expect(page.querySelector('.academy-submenu')).toBeNull();
    expect(TestBed.inject(Router).url).toBe('/manage/learning/questions');
  });
  it('shows workers their own learning rather than authoring links', async () => {
    role.set('CW');
    const harness = await RouterTestingHarness.create('/manage/learning');
    const page = harness.routeNativeElement!;
    expect(page.querySelector('.academy-submenu a[href="/staff-portal/training"]')).not.toBeNull();
    expect(page.querySelector('.academy-submenu a[href="/manage/learning/questions"]')).toBeNull();
  });
});
