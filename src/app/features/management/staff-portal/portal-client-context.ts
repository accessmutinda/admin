import { Injectable, computed, inject, effect, untracked, DestroyRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { StaffClientsApi } from './staff-clients-api.service';
import { StaffClientsPortal } from './staff-clients-portal.service';
import { PortalService } from './portal.service';
@Injectable()
export class PortalClientContext {
  readonly portal = inject(PortalService);
  readonly staffApi = inject(StaffClientsApi, { optional: true });
  constructor() {
    if (this.staffApi) {
      effect(() => {
        const id = this.id();
        untracked(() => this.staffApi!.select(id));
      });
      inject(DestroyRef).onDestroy(() => this.staffApi!.stop());
    }
  }
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  readonly id = computed(() => this.params().get('id') ?? '');
  readonly client = computed(() => this.portal.clients().find((c) => c.id === this.id()));
  readonly communications = computed(() =>
    this.portal.communications().filter((c) => c.clientId === this.id()),
  );
  readonly tasks = computed(() => this.portal.tasks().filter((t) => t.clientId === this.id()));
  readonly concerns = computed(() =>
    this.portal.concerns().filter((c) => c.clientId === this.id()),
  );
  readonly journal = computed(() =>
    (this.staffApi
      ? (this.portal as unknown as StaffClientsPortal).journalEntries()
      : this.portal.journal.entries()
    ).filter((e) => e.clientId === this.id()),
  );
  readonly contacts = computed(() => this.client()?.file?.contacts ?? []);
  readonly keyContacts = computed(() =>
    this.contacts().filter((c) => !['Pharmacy', 'Emergency'].includes(c.type)),
  );
  readonly audit = computed(() => this.portal.clientTimeline(this.id()));
}
