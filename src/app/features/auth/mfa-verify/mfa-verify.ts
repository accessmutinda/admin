import { Component, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Subscription, interval } from 'rxjs';
import { AuthCenteredLayout } from '../../../shared/layouts/auth-centered-layout';
import { Alert } from '../../../shared/ui/alert';
import { OtpInput } from '../../../shared/ui/otp-input';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/ui/toast.service';

const RESEND_SECONDS = 30;

@Component({
  selector: 'cv-mfa-verify',
  imports: [RouterLink, MatButtonModule, MatCheckboxModule, AuthCenteredLayout, Alert, OtpInput],
  templateUrl: './mfa-verify.html',
})
export class MfaVerify implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private countdownSub?: Subscription;

  @ViewChild(OtpInput) private otpInput?: OtpInput;

  protected readonly code = signal('');
  protected readonly trustDevice = signal(true);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly secondsLeft = signal(RESEND_SECONDS);
  protected readonly maskedTarget = 'your authenticator app';

  ngOnInit(): void {
    if (!this.auth.pendingUser()) {
      this.router.navigateByUrl('/auth/sign-in');
      return;
    }
    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.countdownSub?.unsubscribe();
  }

  protected onCodeChange(value: string): void {
    this.code.set(value);
    if (this.errorMessage()) {
      this.errorMessage.set('');
    }
  }

  protected verify(): void {
    if (this.code().length !== 6 || this.loading()) {
      return;
    }
    this.loading.set(true);
    this.auth.verifyMfa(this.code(), this.trustDevice()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/select-workspace');
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.errorMessage.set(err.message);
        this.otpInput?.reset();
        this.code.set('');
      },
    });
  }

  protected resend(): void {
    if (this.secondsLeft() > 0) {
      return;
    }
    this.auth.resendMfaCode().subscribe(() => {
      this.startCountdown();
      this.toast.success('A new code has been sent.');
    });
  }

  private startCountdown(): void {
    this.countdownSub?.unsubscribe();
    this.secondsLeft.set(RESEND_SECONDS);
    this.countdownSub = interval(1000).subscribe(() => {
      this.secondsLeft.update((s) => Math.max(s - 1, 0));
      if (this.secondsLeft() === 0) {
        this.countdownSub?.unsubscribe();
      }
    });
  }
}
