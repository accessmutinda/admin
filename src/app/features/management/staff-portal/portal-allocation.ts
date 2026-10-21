import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { StaffJournal } from '../journal/staff-journal';
import { addDays, completedVisit } from '../rota/rota.models';
import { PortalClientContext } from './portal-client-context';
@Component({
  selector: 'cv-portal-allocation',
  imports: [DatePipe, FormsModule, RouterLink, MatSelectModule, CvSelect, StaffJournal],
  templateUrl: './portal-allocation.html',
  styleUrls: ['./portal-ui.css', './portal-forms.css', './portal-allocation.css'],
})
export class PortalAllocation {
  protected readonly context = inject(PortalClientContext);
  protected readonly portal = this.context.portal;
  protected readonly rota = this.portal.care.rota;
  protected readonly from = signal(this.portal.today);
  protected readonly to = signal(addDays(this.portal.today, 6));
  protected readonly month = signal(this.portal.today.slice(0, 7));
  protected readonly journalFilter = signal('All');
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected callIds: string[] = [];
  protected staffIds: string[] = [];
  protected allocation: 'Regular' | 'Temporary' = 'Regular';
  protected readonly calls = computed(() =>
    this.rota.data().calls.filter((c) => c.clientId === this.context.id() && c.active),
  );
  protected readonly visits = computed(() =>
    this.rota
      .data()
      .visits.filter(
        (v) =>
          v.clientId === this.context.id() &&
          v.state !== 'Cancelled' &&
          v.date.startsWith(this.month()),
      )
      .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start)),
  );
  protected readonly days = computed(() => {
    const start = this.month() + '-01';
    const date = new Date(start + 'T12:00:00Z');
    const offset = (date.getUTCDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, i) => addDays(start, i - offset));
  });
  protected readonly events = computed(() =>
    this.context
      .audit()
      .filter((e) => this.journalFilter() === 'All' || e.category === this.journalFilter())
      .slice(0, 6),
  );
  protected readonly openTasks = computed(() =>
    this.context.tasks().filter((t) => t.status !== 'Resolved'),
  );
  protected readonly composer = viewChild(StaffJournal);
  protected selected = '';
  protected cancelReason = '';
  protected readonly completed = completedVisit;
  private clean = '';
  constructor() {
    this.clean = this.snapshot();
  }
  private snapshot(): string {
    return JSON.stringify([this.from(), this.to(), this.callIds, this.staffIds, this.allocation]);
  }
  protected allocate(): void {
    const error = this.rota.generate(
      this.context.id(),
      this.callIds,
      this.from(),
      this.to(),
      this.staffIds.length ? this.staffIds : null,
      this.allocation,
    );
    this.error.set(error ?? '');
    if (!error) {
      this.clean = this.snapshot();
      this.month.set(this.from().slice(0, 7));
      this.notice.set('Care calls allocated as draft visits. Review and publish them in the rota.');
    }
  }
  protected onDay(day: string) {
    return this.visits().filter((v) => v.date === day);
  }
  protected staffName(id: string): string {
    return this.portal.store.staff().find((p) => p.id === id)?.name ?? 'Unassigned';
  }
  protected cancelVisit(): void {
    const error = this.rota.cancel(this.selected, this.cancelReason);
    this.error.set(error ?? '');
    if (!error) {
      this.selected = '';
      this.cancelReason = '';
      this.notice.set('Visit cancelled. The allocation history is retained.');
    }
  }
  protected reset(): void {
    if (this.snapshot() !== this.clean && !window.confirm('Discard unsaved allocation choices?'))
      return;
    this.from.set(this.portal.today);
    this.to.set(addDays(this.portal.today, 6));
    this.callIds = [];
    this.staffIds = [];
    this.allocation = 'Regular';
    this.clean = this.snapshot();
  }
  canLeave(): boolean {
    return (
      (this.snapshot() === this.clean || window.confirm('Discard unsaved allocation choices?')) &&
      (this.composer()?.canLeave() ?? true)
    );
  }
}
