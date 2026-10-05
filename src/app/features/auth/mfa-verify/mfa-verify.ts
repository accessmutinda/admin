import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AuthCenteredLayout } from '../../../shared/layouts/auth-centered-layout';
import { Alert } from '../../../shared/ui/alert';
import { OtpInput } from '../../../shared/ui/otp-input';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'cv-mfa-verify',
  imports: [RouterLink, MatButtonModule, MatCheckboxModule, AuthCenteredLayout, Alert, OtpInput],
  templateUrl: './mfa-verify.html',
})
export class MfaVerify implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  @ViewChild(OtpInput) private otpInput?: OtpInput;
  protected readonly code = signal('');
  protected readonly trustDevice = signal(true);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');

  ngOnInit(): void {
    if (!this.auth.pendingUser()) this.router.navigateByUrl('/auth/sign-in');
  }

  protected onCodeChange(value: string): void {
    this.code.set(value);
    this.errorMessage.set('');
  }

  protected verify(): void {
    if (this.code().length !== 6 || this.loading()) return;
    this.loading.set(true);
    this.auth.verifyMfa(this.code(), this.trustDevice()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/select-workspace');
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.errorMessage.set(err.message || 'We couldn’t verify that code. Please try again.');
        this.otpInput?.reset();
        this.code.set('');
      },
    });
  }
}
