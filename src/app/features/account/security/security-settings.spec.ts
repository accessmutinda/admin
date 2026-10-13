import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { TRUSTED_DEVICES } from '../../../core/auth/fixtures';
import { SecuritySettings } from './security-settings';

describe('Account security overview', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [SecuritySettings],
      providers: [provideRouter([])],
    });
    TestBed.inject(AuthService).signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
  });

  it('preserves account information, session details and security destinations in compact rows', async () => {
    const auth = TestBed.inject(AuthService);
    const before = JSON.stringify(auth.session());
    const fixture = TestBed.createComponent(SecuritySettings);
    fixture.detectChanges();
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('nav a[aria-current="page"]')!.getAttribute('href')).toBe(
      '/account/security',
    );
    expect(root.querySelector('.account-sec-identity')!.textContent).toContain(
      auth.currentUser()!.name,
    );
    expect(root.querySelector('.account-sec-identity')!.textContent).toContain(
      auth.currentUser()!.email,
    );
    expect(root.querySelectorAll('.account-sec-row')).toHaveLength(4);
    expect(root.querySelector('.account-sec-row[data-tone="purple"]')!.textContent).toContain(
      `${TRUSTED_DEVICES.length} sample trusted-device records`,
    );
    expect(root.querySelector('.account-sec-row[data-tone="blue"] a')!.getAttribute('href')).toBe(
      '/account/change-password',
    );
    expect(root.querySelector('.account-sec-row[data-tone="purple"] a')!.getAttribute('href')).toBe(
      '/account/security/login-history',
    );
    expect(root.querySelector('.account-sec-session')!.textContent).toContain(
      auth.currentUser()!.email,
    );
    expect(root.querySelector('.account-sec-session')!.textContent).toContain(
      auth.session()!.mfaVerified ? 'Session verified' : 'Not verified',
    );
    expect(root.querySelector('.account-sec-note')!.textContent).toContain('sample records');
    expect(JSON.stringify(auth.session())).toBe(before);
  });

  it('opens the MFA and work-account details and closes them without changing authentication', async () => {
    const auth = TestBed.inject(AuthService);
    const before = JSON.stringify(auth.session());
    const fixture = TestBed.createComponent(SecuritySettings);
    fixture.detectChanges();
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    root.querySelector<HTMLButtonElement>('.account-sec-row[data-tone="teal"] button')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.querySelector('[role="dialog"]')!.textContent).toContain(
      'Your verification method',
    );
    root.querySelector<HTMLButtonElement>('button[aria-label="Close security details"]')!.click();
    fixture.detectChanges();
    expect(root.querySelector('[role="dialog"]')).toBeNull();
    root.querySelector<HTMLButtonElement>('.account-sec-row[data-tone="amber"] button')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.querySelector('[role="dialog"]')!.textContent).toContain(
      'Microsoft work-account sign-in',
    );
    root.querySelector<HTMLButtonElement>('.form-footer button')!.click();
    fixture.detectChanges();
    expect(root.querySelector('[role="dialog"]')).toBeNull();
    expect(JSON.stringify(auth.session())).toBe(before);
  });
});
