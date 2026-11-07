import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
import { ForgotPassword } from './forgot-password/forgot-password';
import { InviteAccept } from './invite-accept/invite-accept';

describe('Authentication actions', () => {
  it('shows recovery as unavailable without simulating email delivery', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(ForgotPassword);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('not available yet');
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
