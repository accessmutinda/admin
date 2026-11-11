import { Skeleton } from '../../../shared/ui/skeleton';
import { Component, OnInit, ViewChild, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { toDataURL } from 'qrcode';
import { AuthCenteredLayout } from '../../../shared/layouts/auth-centered-layout';
import { Alert } from '../../../shared/ui/alert';
import { OtpInput } from '../../../shared/ui/otp-input';
import { MfaEnrolment } from '../../../core/auth/auth-api';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'cv-mfa-verify',
  imports: [Skeleton, RouterLink, MatButtonModule, AuthCenteredLayout, Alert, OtpInput],
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
  protected readonly setupQr = signal('');
  private qrRequest = 0;

  constructor() {
    effect(() => {
      const address = setupAddress(this.enrolment());
      untracked(() => {
        const request = ++this.qrRequest;
        if (!address) {
          this.setupQr.set('');
          return;
        }
        void toDataURL(address, { errorCorrectionLevel: 'M', margin: 1, width: 168 }).then(
          (image) => {
            if (request === this.qrRequest) this.setupQr.set(image);
          },
          () => {
            if (request === this.qrRequest) this.setupQr.set('');
          },
        );
      });
    });
  }

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

function setupAddress(device: MfaEnrolment | null): string {
  if (!device) return '';
  const provided = device.otpauth_url?.trim() ?? '';
  if (provided.startsWith('otpauth://')) return provided;
  const secret = device.secret?.replace(/\s+/g, '') ?? '';
  if (!secret) return '';
  return `otpauth://totp/CareVerity?secret=${encodeURIComponent(secret)}&issuer=CareVerity`;
}
