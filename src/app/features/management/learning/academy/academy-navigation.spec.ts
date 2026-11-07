import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../../core/auth/auth.service';
import { WorkspaceService } from '../../../../core/auth/workspace.service';
import { ManagementLayout } from '../../layout/management-layout';
@Component({ template: '<h1>Academy destination</h1>' })
class Destination {}
describe('Academy navigation within the admin console', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
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
            ],
          },
        ]),
      ],
    });
    const auth = TestBed.inject(AuthService);
    auth.signInWithMicrosoft();
    const user = auth.currentUser()!;
    vi.spyOn(auth, 'currentUser').mockReturnValue({ ...user, roleCode: 'CA' });
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
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
    expect(page.querySelector('.app-sidebar a[href="/manage/companies"]')).not.toBeNull();
    expect(page.querySelector('.app-sidebar a[href="/manage/people"]')).not.toBeNull();
    expect(page.querySelector('.co-console-heading strong')?.textContent).toBe('Admin Console');
    expect(page.querySelector('.academy-shell')).toBeNull();
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
    const auth = TestBed.inject(AuthService);
    const user = auth.currentUser()!;
    vi.mocked(auth.currentUser).mockReturnValue({ ...user, roleCode: 'CW' });
    const harness = await RouterTestingHarness.create('/manage/learning');
    const page = harness.routeNativeElement!;
    expect(page.querySelector('.academy-submenu a[href="/staff-portal/training"]')).not.toBeNull();
    expect(page.querySelector('.academy-submenu a[href="/manage/learning/questions"]')).toBeNull();
  });
});
