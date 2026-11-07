import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { DEMO_USER } from '../../../core/auth/fixtures';
import { SsoGoogle } from './sso-google';

describe('Google demonstration sign-in', () => {
  for (const requiresMfa of [true, false]) {
    it(`routes to ${requiresMfa ? 'MFA' : 'workspace selection'} according to policy`, () => {
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          {
            provide: AuthService,
            useValue: { signInWithGoogle: () => of({ requiresMfa, user: DEMO_USER }) },
          },
        ],
      });
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
      const fixture = TestBed.createComponent(SsoGoogle);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Sign in with Google');
      expect(fixture.nativeElement.textContent).toContain(
        'A live Google connection is not configured',
      );
      fixture.nativeElement.querySelector('button').click();
      expect(navigate).toHaveBeenCalledWith(requiresMfa ? '/auth/mfa' : '/select-workspace');
    });
  }
  it('allows retry after a provider failure', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { signInWithGoogle: () => throwError(() => new Error('offline')) },
        },
      ],
    });
    const fixture = TestBed.createComponent(SsoGoogle);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(
      'Please try again',
    );
    expect(fixture.nativeElement.querySelector('button').disabled).toBe(false);
  });
});
