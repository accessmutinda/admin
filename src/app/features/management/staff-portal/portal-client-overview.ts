import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PortalClientContext } from './portal-client-context';
@Component({
  selector: 'cv-portal-client-overview',
  imports: [DatePipe, RouterLink],
  templateUrl: './portal-client-overview.html',
  styleUrls: ['./portal-ui.css', './portal-forms.css', './portal-client.css'],
})
export class PortalClientOverview {
  protected readonly context = inject(PortalClientContext);
  protected readonly portal = this.context.portal;
  protected readonly client = this.context.client;
  protected readonly kin = computed(
    () =>
      this.context.contacts().find((c) => c.nextOfKin) ||
      this.context.contacts().find((c) => c.type === 'Family'),
  );
  protected readonly openTasks = computed(() =>
    this.context.tasks().filter((t) => t.status !== 'Resolved'),
  );
  protected readonly escalations = computed(() =>
    this.context.concerns().filter((c) => !['Resolved', 'Closed'].includes(c.status)),
  );
  protected details(key: string): string {
    return this.client()?.file?.details?.[key] || 'Not recorded';
  }
  protected section(group: string, key: string): string {
    return this.client()?.file?.sections?.[group]?.[key] || 'Not recorded';
  }
}
