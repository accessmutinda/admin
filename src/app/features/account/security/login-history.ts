import { Component, OnInit, inject, signal } from '@angular/core';
import { LOGIN_HISTORY, TRUSTED_DEVICES } from '../../../core/auth/fixtures';
import { ToastService } from '../../../shared/ui/toast.service';
import { Skeleton } from '../../../shared/ui/skeleton';

@Component({
  selector: 'cv-login-history',
  imports: [Skeleton],
  templateUrl: './login-history.html',
})
export class LoginHistory implements OnInit {
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly skeletonEventRows = Array.from({ length: 6 });
  protected readonly skeletonDeviceRows = Array.from({ length: 2 });
  protected readonly events = LOGIN_HISTORY;
  protected readonly devices = signal([...TRUSTED_DEVICES]);
  /** Device awaiting a second click to confirm revocation — avoids a modal for one destructive action. */
  protected readonly pendingRevokeId = signal<string | null>(null);

  ngOnInit(): void {
    setTimeout(() => this.loading.set(false), 450);
  }

  protected requestRevoke(deviceId: string): void {
    if (this.pendingRevokeId() === deviceId) {
      const device = this.devices().find((d) => d.id === deviceId);
      this.devices.update((list) => list.filter((d) => d.id !== deviceId));
      this.pendingRevokeId.set(null);
      if (device) {
        this.toast.success(`${device.name} has been revoked.`);
      }
      return;
    }
    this.pendingRevokeId.set(deviceId);
  }

  protected cancelRevoke(): void {
    this.pendingRevokeId.set(null);
  }
}
