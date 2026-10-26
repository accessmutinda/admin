import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { StaffJournal } from '../journal/staff-journal';
import { addDays, completedVisit, RotaVisit } from '../rota/rota.models';
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
  protected duration = '1 month';
  protected recurrence = 'Daily (every day)';
  protected individual = false;
  protected cancelAllocationMode = false;
  protected editVisit: RotaVisit | null = null;
  private originalVisit = '';
  protected editReason = '';
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
  protected readonly missed = computed(() =>
    this.visits().filter(
      (v) =>
        v.state === 'Published' &&
        v.date < this.portal.today &&
        !completedVisit(v) &&
        !v.attendance.length,
    ),
  );
  protected readonly cancellable = computed(() =>
    this.visits().filter((v) => !v.attendance.length),
  );
  protected icon(name: string): string {
    const lower = name.toLowerCase();
    return lower.includes('morning') || lower.includes('breakfast')
      ? 'light_mode'
      : lower.includes('lunch')
        ? 'restaurant'
        : lower.includes('tea') || lower.includes('afternoon')
          ? 'local_cafe'
          : lower.includes('bed') || lower.includes('evening')
            ? 'dark_mode'
            : 'schedule';
  }
  protected changeDuration(): void {
    this.to.set(
      this.individual
        ? this.from()
        : addDays(
            this.from(),
            this.duration === '1 week' ? 6 : this.duration === '2 weeks' ? 13 : 30,
          ),
    );
  }
  protected editAllocation(): void {
    const visit = this.cancellable()[0];
    if (visit) this.openVisit(visit);
  }
  protected openVisit(visit: RotaVisit): void {
    this.editVisit = structuredClone(visit);
    this.originalVisit = JSON.stringify(visit);
    this.editReason = '';
  }
  protected saveVisit(): void {
    if (!this.editVisit) return;
    const error = this.rota.updateVisit(
      this.editVisit,
      this.portal.store.companyId(),
      this.originalVisit,
      this.editReason,
    );
    this.error.set(error ?? '');
    if (!error) {
      this.editVisit = null;
      this.notice.set('Visit allocation updated.');
    }
  }
  protected readonly events = computed(() =>
    this.context
      .audit()
      .filter(
        (e) =>
          this.journalFilter() === 'All' ||
          e.category === (this.journalFilter() === 'Notes' ? 'Journal' : this.journalFilter()),
      )
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
    this.to.set(addDays(this.portal.today, 30));
    this.clean = this.snapshot();
  }
  private snapshot(): string {
    return JSON.stringify([
      this.from(),
      this.to(),
      this.callIds,
      this.staffIds,
      this.allocation,
      this.duration,
      this.recurrence,
      this.individual,
    ]);
  }
  protected allocate(): void {
    const error = this.rota.generate(
      this.context.id(),
      this.callIds,
      this.from(),
      this.to(),
      this.staffIds.length ? this.staffIds : null,
      this.allocation,
      undefined,
      this.recurrence === 'Use template recurrence'
        ? undefined
        : this.recurrence === 'Weekdays'
          ? [1, 2, 3, 4, 5]
          : this.recurrence === 'Weekends'
            ? [0, 6]
            : [0, 1, 2, 3, 4, 5, 6],
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
    const error = this.cancelAllocationMode
      ? this.rota.cancelAllocation(
          this.cancellable().map((v) => v.id),
          this.cancelReason,
        )
      : this.rota.cancel(this.selected, this.cancelReason);
    this.error.set(error ?? '');
    if (!error) {
      this.selected = '';
      this.cancelAllocationMode = false;
      this.cancelReason = '';
      this.notice.set('Visit cancelled. The allocation history is retained.');
    }
  }
  protected reset(): void {
    if (this.snapshot() !== this.clean && !window.confirm('Discard unsaved allocation choices?'))
      return;
    this.from.set(this.portal.today);
    this.to.set(addDays(this.portal.today, 30));
    this.duration = '1 month';
    this.recurrence = 'Daily (every day)';
    this.individual = false;
    this.callIds = [];
    this.staffIds = [];
    this.allocation = 'Regular';
    this.clean = this.snapshot();
  }
  canLeave(): boolean {
    return (
      (((!this.editVisit || JSON.stringify(this.editVisit) === this.originalVisit) &&
        !this.cancelReason.trim() &&
        this.snapshot() === this.clean) ||
        window.confirm('Discard unsaved allocation choices?')) &&
      (this.composer()?.canLeave() ?? true)
    );
  }
}
