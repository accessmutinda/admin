import { DestroyRef, EnvironmentInjector, Injectable, inject, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PortalDemo {
  readonly error = signal('');
  constructor() {
    const injector = inject(EnvironmentInjector);
    const lifetime = inject(DestroyRef);
    void Promise.all([import('../../../demo/care-demo'), import('../../../demo/system-demo')])
      .then(([care, system]) => {
        if (lifetime.destroyed) return;
        care.installCareDemo(injector);
        system.installSystemDemo(injector);
      })
      .catch(() =>
        this.error.set('Sample records could not be loaded. Reload this page to try again.'),
      );
  }
}
