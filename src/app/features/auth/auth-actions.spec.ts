import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
import { ForgotPassword } from './forgot-password/forgot-password';
import { InviteAccept } from './invite-accept/invite-accept';
import { PasswordReset } from './password-reset/password-reset';

describe('Authentication actions', () => {
  it('asks for an email and shows the same confirmation the server returns', () => {
    const requestPasswordReset = vi.fn(() => of('Check your inbox for a reset link.'));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ email: 'person@example.com' }) } },
        },
        { provide: AuthService, useValue: { requestPasswordReset } },
      ],
    });
    const fixture = TestBed.createComponent(ForgotPassword);
    fixture.detectChanges();
    const email = fixture.nativeElement.querySelector('#forgot-password-email') as HTMLInputElement;
    expect(email.value).toBe('person@example.com');
    fixture.nativeElement.querySelector('form').requestSubmit();
    fixture.detectChanges();
    expect(requestPasswordReset).toHaveBeenCalledWith('person@example.com');
    expect(fixture.nativeElement.querySelector('[role=status]').textContent).toContain(
      'Check your inbox for a reset link.',
    );
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });
  it('keeps an incomplete reset link from setting a password', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
        { provide: AuthService, useValue: { confirmPasswordReset: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(PasswordReset);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Reset link incomplete');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });
  it('accepts a server invitation and exposes server failures for retry', () => {
    const accept = vi
      .fn()
      .mockReturnValueOnce(throwError(() => new Error('Invitation expired.')))
      .mockReturnValue(of(undefined));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ token: 'server-token' }) } },
        },
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => true,
            currentUser: () => ({ email: 'api@example.com' }),
            acceptInvite: accept,
            nextRoute: () => '/manage/rota/overview',
          },
        },
      ],
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(InviteAccept);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();
    expect(accept).toHaveBeenCalledWith('server-token');
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(
      'Invitation expired.',
    );
    expect(fixture.nativeElement.querySelector('button').disabled).toBe(false);
    fixture.nativeElement.querySelector('button').click();
    expect(navigate).toHaveBeenCalledWith('/manage/rota/overview');
  });
});
