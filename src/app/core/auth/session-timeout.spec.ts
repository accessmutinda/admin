import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from './auth.service';
import { SessionTimeout } from './session-timeout';

describe('Session timeout prompt', () => {
  const warning = signal(false);
  const remaining = signal(120);
  const canContinue = signal(true);
  const busy = signal(false);
  const error = signal('');
  const originalShowModal = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    'showModal',
  );
  const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
  let auth: { continueSession: ReturnType<typeof vi.fn>; signOut: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    warning.set(false);
    remaining.set(120);
    canContinue.set(true);
    busy.set(false);
    error.set('');
    auth = { continueSession: vi.fn(), signOut: vi.fn() };
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
      }),
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.removeAttribute('open');
      }),
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            ...auth,
            sessionWarning: warning,
            sessionSecondsRemaining: remaining,
            canContinueSession: canContinue,
            continuingSession: busy,
            sessionContinuationError: error,
          },
        },
      ],
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    for (const [key, descriptor] of [
      ['showModal', originalShowModal],
      ['close', originalClose],
    ] as const) {
      if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, key, descriptor);
      else Reflect.deleteProperty(HTMLDialogElement.prototype, key);
    }
  });

  it('opens a branded modal with a countdown, continues on request and closes after extension', () => {
    const fixture = TestBed.createComponent(SessionTimeout);
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.open).toBe(false);
    warning.set(true);
    fixture.detectChanges();
    expect(dialog.open).toBe(true);
    expect(dialog.getAttribute('aria-labelledby')).toBe('session-timeout-title');
    expect(dialog.querySelector('img')?.alt).toBe('CareVerity');
    expect(dialog.textContent).toContain('Are you still there?');
    expect(dialog.querySelector('[role="timer"]')?.textContent).toBe('2:00');
    remaining.set(65);
    fixture.detectChanges();
    expect(dialog.querySelector('[role="timer"]')?.textContent).toBe('1:05');
    (dialog.querySelector('.primary') as HTMLButtonElement).click();
    expect(auth.continueSession).toHaveBeenCalledOnce();
    busy.set(true);
    fixture.detectChanges();
    expect((dialog.querySelector('.primary') as HTMLButtonElement).disabled).toBe(true);
    warning.set(false);
    fixture.detectChanges();
    expect(dialog.open).toBe(false);
  });

  it('shows retry errors and signs out through the backend before returning to sign-in', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    warning.set(true);
    error.set('Check your connection and try again.');
    const fixture = TestBed.createComponent(SessionTimeout);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Check your connection',
    );
    fixture.nativeElement.querySelector('.secondary').click();
    expect(auth.signOut).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith('/auth/sign-in');
  });

  it('explains the absolute limit and offers sign-out instead of an extension', () => {
    warning.set(true);
    canContinue.set(false);
    const fixture = TestBed.createComponent(SessionTimeout);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('maximum duration');
    expect(fixture.nativeElement.querySelector('.primary')).toBeNull();
    const cancel = new Event('cancel', { cancelable: true });
    fixture.nativeElement.querySelector('dialog').dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
  });
});
