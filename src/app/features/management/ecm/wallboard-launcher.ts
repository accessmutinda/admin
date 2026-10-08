import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class WallboardLauncher {
  private readonly router = inject(Router);

  open(): void {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      void document.documentElement.requestFullscreen().catch(() => undefined);
    }
    void this.router.navigateByUrl('/manage/ecm/wallboard');
  }
}
