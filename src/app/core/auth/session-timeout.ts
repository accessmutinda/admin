import { Component, ElementRef, computed, effect, inject, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'cv-session-timeout',
  template: `
    <dialog
      #dialog
      aria-labelledby="session-timeout-title"
      aria-describedby="session-timeout-message"
      (cancel)="$event.preventDefault()"
    >
      <header>
        <img src="/brand/logo-full.png" alt="CareVerity" width="130" />
        <span class="security-label">Session security</span>
      </header>
      <div class="session-content">
        <span class="session-icon material-symbols-outlined" aria-hidden="true">timer</span>
        <h2 id="session-timeout-title">
          {{ auth.canContinueSession() ? 'Are you still there?' : 'Please sign in again soon' }}
        </h2>
        <p id="session-timeout-message">
          @if (auth.canContinueSession()) {
            Your session is about to end because you have been inactive. Stay signed in to continue
            working, or sign out if you have finished.
          } @else {
            Your session is approaching its maximum duration. For your security, sign out and sign
            in again to continue.
          }
        </p>
        <div class="countdown">
          <span>Automatic sign-out in</span>
          <strong role="timer" aria-label="Time until automatic sign-out">{{ countdown() }}</strong>
        </div>
        <p class="session-note">Unsaved changes may be lost when your session ends.</p>
        @if (auth.sessionContinuationError()) {
          <p class="session-error" role="alert">{{ auth.sessionContinuationError() }}</p>
        }
        @if (auth.continuingSession()) {
          <p role="status" class="session-note">Extending your session…</p>
        }
      </div>
      <footer>
        <button type="button" class="secondary" (click)="signOut()">Sign out</button>
        @if (auth.canContinueSession()) {
          <button
            type="button"
            class="primary"
            autofocus
            [disabled]="auth.continuingSession()"
            [attr.aria-busy]="auth.continuingSession()"
            (click)="auth.continueSession()"
          >
            {{ auth.continuingSession() ? 'Staying signed in…' : 'Stay signed in' }}
          </button>
        }
      </footer>
    </dialog>
  `,
  styleUrl: './session-timeout.css',
})
export class SessionTimeout {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  protected readonly countdown = computed(() => {
    const seconds = this.auth.sessionSecondsRemaining();
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  });

  constructor() {
    effect(() => {
      const dialog = this.dialog()?.nativeElement;
      if (!dialog) return;
      if (this.auth.sessionWarning()) {
        if (!dialog.open) dialog.showModal();
      } else if (dialog.open) dialog.close();
    });
  }

  protected signOut(): void {
    this.auth.signOut();
    void this.router.navigateByUrl('/auth/sign-in');
  }
}
