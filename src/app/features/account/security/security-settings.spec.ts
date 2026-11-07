import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { SecuritySettings } from './security-settings';

describe('Account security API identity', () => {
  for (const verification of [true, false, null]) {
    it(`shows API identity with ${verification === null ? 'unavailable' : verification ? 'verified' : 'unverified'} MFA information`, () => {
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
                mfaEnabled: verification,
                mfaMethod: null,
              }),
              session: () => ({ mfaVerified: verification, signedInAt: null }),
            },
          },
        ],
      });
      const fixture = TestBed.createComponent(SecuritySettings);
      fixture.detectChanges();
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('API Person');
      expect(text).toContain('api@example.com');
      expect(text).toContain(
        verification === null
          ? 'MFA verification unavailable'
          : verification
            ? 'MFA verified'
            : 'MFA not verified',
      );
      expect(text).toContain('Unavailable');
      expect(text).toContain(
        verification
          ? 'Method unavailable'
          : verification === null
            ? 'Verification unavailable'
            : 'Not verified',
      );
      if (verification === null) expect(text).not.toContain('Not verified for this sign-in');
      expect(text).not.toContain('SMS verification');
      expect(text).not.toContain('Authenticator app');
      expect(text).not.toMatch(/sample|demo/i);
      expect(
        fixture.nativeElement.querySelector('a[href="/account/change-password"]'),
      ).not.toBeNull();
    });
  }
});
