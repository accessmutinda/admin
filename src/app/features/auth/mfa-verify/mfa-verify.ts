import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AuthCenteredLayout } from '../../../shared/layouts/auth-centered-layout';
import { Alert } from '../../../shared/ui/alert';
import { OtpInput } from '../../../shared/ui/otp-input';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'cv-mfa-verify',
  imports: [RouterLink, MatButtonModule, AuthCenteredLayout, Alert, OtpInput],
  templateUrl: './mfa-verify.html',
})
export class MfaVerify implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly returnTo = this.route.snapshot.queryParamMap.get('redirectTo');
  @ViewChild(OtpInput) private otpInput?: OtpInput;
  protected readonly code = signal('');
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');

  ngOnInit(): void {
    if (!this.auth.state().startsWith('mfa_')) {
      void this.router.navigate([this.auth.nextRoute(this.returnTo)], {
        queryParams: this.auth.isAuthenticated() ? {} : { redirectTo: this.returnTo },
      });
    }
  }

  protected readonly enrolment = this.auth.enrolment;
  protected readonly needsEnrolment = () => this.auth.state() === 'mfa_enrolment_required';

  protected enrol(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.errorMessage.set('');
    this.auth.enrolMfa().subscribe({
      next: () => this.loading.set(false),
      error: (err: Error) => {
        this.loading.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  protected onCodeChange(value: string): void {
    this.code.set(value);
    this.errorMessage.set('');
  }

  protected verify(): void {
    if (this.code().length !== 6 || this.loading()) return;
    this.loading.set(true);
    this.auth.verifyMfa(this.code()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate([this.auth.nextRoute(this.returnTo)], {
          queryParams: this.auth.isAuthenticated() ? {} : { redirectTo: this.returnTo },
        });
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
