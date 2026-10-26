import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PortalClientContext } from './portal-client-context';
@Component({
  selector: 'cv-portal-client-overview',
  imports: [DatePipe, RouterLink, FormsModule],
  templateUrl: './portal-client-overview.html',
  styleUrls: ['./portal-ui.css', './portal-forms.css', './portal-client.css'],
})
export class PortalClientOverview {
  protected readonly context = inject(PortalClientContext);
  protected readonly portal = this.context.portal;
  protected readonly client = this.context.client;
  protected readonly period = signal(30);
  protected readonly recentCommunications = computed(() =>
    this.context
      .communications()
      .filter((c) => !this.period() || Date.parse(c.at) >= Date.now() - this.period() * 86400000)
      .sort((a, b) => b.at.localeCompare(a.at)),
  );
  protected readonly journalCount = computed(
    () =>
      this.context
        .journal()
        .filter(
          (e) =>
            e.state === 'Sent' &&
            !(e.deletedBy ?? []).includes(this.portal.journal.email()) &&
            (!this.period() || Date.parse(e.createdAt) >= Date.now() - this.period() * 86400000),
        ).length,
  );
  protected readonly overdue = computed(
    () => this.openTasks().filter((t) => t.due < this.portal.today).length,
  );
  protected contact(id: string): string {
    return this.context.contacts().find((c) => c.id === id)?.name ?? 'Contact unavailable';
  }
  protected readonly allergies = computed(
    () =>
      (this.client()?.file?.entries?.['allergies'] ?? []).map((e) => e.name).join(', ') ||
      'Not recorded',
  );
  protected readonly timeSensitive = computed(() =>
    this.portal.care.rota
      .data()
      .calls.some((c) => c.clientId === this.context.id() && c.active && c.timeSensitive),
  );
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
