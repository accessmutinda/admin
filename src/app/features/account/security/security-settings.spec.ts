import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { SecuritySettings } from './security-settings';

describe('Account security API identity', () => {
  it('shows the authenticated identity without sample devices or invented sign-in times', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            currentUser: () => ({
              name: 'API Person',
              initials: 'AP',
              email: 'api@example.com',
              roleCode: 'UN',
              mfaEnabled: true,
              mfaMethod: 'authenticator',
            }),
            session: () => ({ mfaVerified: true, signedInAt: null }),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(SecuritySettings);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('API Person');
    expect(text).toContain('api@example.com');
    expect(text).toContain('MFA verified');
    expect(text).toContain('Unavailable');
    expect(text).not.toMatch(/sample|demo/i);
    expect(
      fixture.nativeElement.querySelector('a[href="/account/change-password"]'),
    ).not.toBeNull();
  });
});
