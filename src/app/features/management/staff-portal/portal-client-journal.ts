import { Component, inject, viewChild } from '@angular/core';
import { PortalClientContext } from './portal-client-context';
import { StaffJournal } from '../journal/staff-journal';
@Component({
  selector: 'cv-portal-client-journal',
  imports: [StaffJournal],
  template: `<div class="page-heading">
      <div>
        <h1>Client Journal</h1>
        <p>
          Journal entries, internal notes and team messages related to {{ context.client()?.name }}.
        </p>
      </div>
    </div>
    <cv-staff-journal [embedded]="true" [clientId]="context.id()" />`,
})
export class PortalClientJournal {
  protected readonly context = inject(PortalClientContext);
  private readonly journal = viewChild(StaffJournal);
  canLeave(): boolean {
    return this.journal()?.canLeave() ?? true;
  }
}
