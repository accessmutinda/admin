import { Injectable, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { PortalService } from './portal.service';
@Injectable()
export class PortalClientContext {
  readonly portal = inject(PortalService);
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
    this.portal.journal.entries().filter((e) => e.clientId === this.id()),
  );
  readonly contacts = computed(() => this.client()?.file?.contacts ?? []);
  readonly audit = computed(() => this.portal.clientTimeline(this.id()));
}
