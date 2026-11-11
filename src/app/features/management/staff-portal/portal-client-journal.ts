import { Component, inject, viewChild, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { JournalService } from '../journal/journal.service';
import { StaffJournal } from '../journal/staff-journal';
@Component({
  selector: 'cv-portal-client-journal',
  imports: [StaffJournal],
  template: `<div class="page-heading">
      <div>
        <h1>Client Journal</h1>
        <p>Journal entries, internal notes and team messages related to {{ name() }}.</p>
      </div>
    </div>
    <cv-staff-journal [embedded]="true" [clientId]="id()" />`,
})
export class PortalClientJournal {
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  protected readonly id = computed(() => this.params().get('id') ?? '');
  private readonly service = inject(JournalService);
  protected readonly name = computed(
    () =>
      this.service.clients().find((client) => client.id === this.id())?.name ?? 'this service user',
  );
  private readonly journal = viewChild(StaffJournal);
  canLeave(): boolean {
    return this.journal()?.canLeave() ?? true;
  }
}
