import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
import { ForgotPassword } from './forgot-password/forgot-password';
import { InviteAccept } from './invite-accept/invite-accept';

describe('Authentication action failures', () => {
  it('shows a recovery error, enables retry and clears the error on success', () => {
    const request = vi
      .fn()
      .mockReturnValueOnce(throwError(() => new Error('offline')))
      .mockReturnValue(of(undefined));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { requestPasswordReset: request } },
      ],
    });
    const fixture = TestBed.createComponent(ForgotPassword);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'person@example.com';
    input.dispatchEvent(new Event('input'));
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(
      'Please try again',
    );
    expect(fixture.nativeElement.querySelector('button').disabled).toBe(false);
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Check your inbox');
    expect(fixture.nativeElement.querySelector('[role=alert]')).toBeNull();
  });
  it('keeps invitation actions available after accept or decline failures', () => {
    const invite = {
      workspaceName: 'Example Care',
      inviteeEmail: 'person@example.com',
      inviterName: 'Sam',
      roleCode: 'CW',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ token: 'test' }) } },
        },
        {
          provide: AuthService,
          useValue: {
            getInvite: () => invite,
            acceptInvite: () => throwError(() => new Error('offline')),
            declineInvite: () => throwError(() => new Error('offline')),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(InviteAccept);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll(
      'button',
    ) as NodeListOf<HTMLButtonElement>;
    buttons[0].click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(
      'couldn’t accept',
    );
    expect(buttons[0].disabled).toBe(false);
    buttons[1].click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(
      'couldn’t decline',
    );
    expect(buttons[1].disabled).toBe(false);
  });
});
