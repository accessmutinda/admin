import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BreakpointObserver } from '@angular/cdk/layout';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { AuthService } from '../../../core/auth/auth.service';
import { AcademyDemoWorkflow } from '../learning/academy/academy-demo-workflow';
import { AcademyGovernanceService } from '../learning/academy/academy-governance.service';
import { AcademyService } from '../learning/academy/academy.service';
import { WorkspaceTools } from '../care/workspace-tools';
import { Company, ManagementStore } from '../shared/management.store';
import { ManagementLayout } from './management-layout';

@Component({ selector: 'cv-workspace-tools', template: '' })
class WorkspaceToolsStub {}

describe('Signed-in user profile menu', () => {
  const signOut = vi.fn();

  beforeEach(async () => {
    signOut.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'account/security', children: [] },
          { path: 'auth/sign-in', children: [] },
        ]),
        {
          provide: BreakpointObserver,
          useValue: { observe: () => of({ matches: false, breakpoints: {} }) },
        },
        {
          provide: AuthService,
          useValue: {
            currentUser: () => ({
              name: 'Warehouse Dispatch',
              initials: 'WD',
              email: 'admin@gmail.com',
              roleCode: 'CA',
            }),
            hasRole: () => false,
            isSuperAdmin: () => false,
            profile: () => null,
            canSwitchWorkspace: () => false,
            signOut,
          },
        },
        {
          provide: CompanyAccessService,
          useValue: {
            can: () => false,
            canPath: () => false,
            context: () => ({ roles: [{ name: 'Admin' }] }),
          },
        },
        {
          provide: ManagementStore,
          useValue: { company: () => null, companies: () => [], storageAvailable: () => true },
        },
        { provide: AcademyService, useValue: { can: () => false, state: () => ({}) } },
        { provide: AcademyDemoWorkflow, useValue: {} },
        { provide: AcademyGovernanceService, useValue: { seed: vi.fn() } },
      ],
    });
    TestBed.overrideComponent(ManagementLayout, {
      remove: { imports: [WorkspaceTools] },
      add: { imports: [WorkspaceToolsStub] },
    });
    await TestBed.compileComponents();
  });

  function render() {
    const fixture = TestBed.createComponent(ManagementLayout);
    fixture.detectChanges();
    return fixture;
  }

  const incompleteCompany = {
    id: 'company-1',
    name: 'Stored Care',
    apiSummaryOnly: true,
    profileCompletion: 43,
  } as Company;

  it('prompts company admins to complete their current company', () => {
    vi.spyOn(TestBed.inject(AuthService), 'hasRole').mockImplementation((role) => role === 'CA');
    vi.spyOn(TestBed.inject(ManagementStore), 'company').mockReturnValue(incompleteCompany);
    const fixture = render();
    expect(fixture.nativeElement.querySelector('cv-company-setup-banner')?.textContent).toContain(
      'Stored Care is 43% complete',
    );
  });

  it('keeps setup prompts out of staff views', () => {
    vi.spyOn(TestBed.inject(ManagementStore), 'company').mockReturnValue(incompleteCompany);
    expect(render().nativeElement.querySelector('cv-company-setup-banner')).toBeNull();
  });

  it('uses the company being viewed instead of the current workspace', () => {
    vi.spyOn(TestBed.inject(AuthService), 'isSuperAdmin').mockReturnValue(true);
    vi.spyOn(TestBed.inject(Router), 'url', 'get').mockReturnValue('/manage/companies/company-2');
    const store = TestBed.inject(ManagementStore);
    vi.spyOn(store, 'company').mockReturnValue(incompleteCompany);
    vi.spyOn(store, 'companies').mockReturnValue([
      incompleteCompany,
      { ...incompleteCompany, id: 'company-2', name: 'Second Care', profileCompletion: 29 },
    ]);
    const fixture = render();
    const banner: HTMLElement = fixture.nativeElement.querySelector('cv-company-setup-banner');
    expect(banner.textContent).toContain('Second Care is 29% complete');
    expect(banner.querySelector('a')?.getAttribute('href')).toBe(
      '/manage/companies/company-2?edit=true#general-information',
    );
  });

  it('opens a profile card from the signed-in name instead of leaving the page', () => {
    const fixture = render();
    const root = fixture.nativeElement as HTMLElement;
    const trigger = root.querySelector<HTMLButtonElement>('.user-control')!;

    expect(root.querySelector('.user-profile-menu')).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    trigger.click();
    fixture.detectChanges();

    const menu = root.querySelector('.user-profile-menu')!;
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(menu.querySelector('h2')?.textContent).toBe('User Profile');
    expect(menu.textContent).toContain('Warehouse Dispatch');
    expect(menu.textContent).toContain('Admin');
    expect(menu.textContent).toContain('admin@gmail.com');
    expect(menu.querySelector('.user-profile-account')?.getAttribute('href')).toBe(
      '/account/security',
    );
    expect(menu.querySelector('.user-profile-logout')?.textContent).toBe('Logout');
    expect(signOut).not.toHaveBeenCalled();
  });

  it('closes from outside and escape, and logs out from the profile card', () => {
    const fixture = render();
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('.user-control')!.click();
    fixture.detectChanges();

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(root.querySelector('.user-profile-menu')).toBeNull();

    root.querySelector<HTMLButtonElement>('.user-control')!.click();
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(root.querySelector('.user-profile-menu')).toBeNull();

    root.querySelector<HTMLButtonElement>('.user-control')!.click();
    fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('.user-profile-logout')!.click();
    expect(signOut).toHaveBeenCalledOnce();
  });
});
