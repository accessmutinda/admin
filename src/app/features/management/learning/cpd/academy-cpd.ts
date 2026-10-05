import { Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ManagementStore } from '../../shared/management.store';
import { ToastService } from '../../../../shared/ui/toast.service';
@Component({
  selector: 'cv-academy-cpd',
  imports: [DatePipe, A11yModule, FormsModule, RouterLink],
  host: { '(document:keydown.escape)': 'cpdModal.set(false)' },
  templateUrl: './academy-cpd.html',
})
export class AcademyCpd {
  readonly personId = input.required<string>();
  readonly active = input(false);
  protected readonly store = inject(ManagementStore);
  private readonly toast = inject(ToastService);
  protected readonly person = computed(() =>
    this.store.staff().find((p) => p.id === this.personId()),
  );
  protected readonly cpdModal = signal(false);
  protected readonly cpdError = signal('');
  protected readonly cpdPersonId = signal('');
  protected readonly entryPerson = computed(() =>
    this.store.staff().find((p) => p.id === this.cpdPersonId()),
  );
  protected cpd = { activity: '', hours: 1, date: '', reflection: '' };
  protected readonly cpdEntries = computed(() =>
    this.store
      .data()
      .cpd.filter((c) => c.personId === this.personId())
      .sort((a, b) => b.date.localeCompare(a.date)),
  );
  open(activity = ''): void {
    if (!this.person()) return;
    this.cpdPersonId.set(this.person()!.id);
    this.cpd = { activity, hours: 1, date: '', reflection: '' };
    this.cpdError.set('');
    this.cpdModal.set(true);
  }
  protected totalHours(): number {
    return this.cpdEntries().reduce((sum, c) => sum + c.hours, 0);
  }
  protected addCpd(): void {
    if (
      !this.store.staff().some((p) => p.id === this.cpdPersonId()) ||
      !this.cpd.activity.trim() ||
      !this.cpd.reflection.trim() ||
      !this.cpd.date ||
      !Number.isFinite(this.cpd.hours) ||
      this.cpd.hours < 0.25 ||
      this.cpd.hours > 100 ||
      !Number.isInteger(this.cpd.hours * 4)
    ) {
      this.cpdError.set(
        'Add an activity, date and reflection, with 0.25–100 hours in quarter-hour increments.',
      );
      return;
    }
    this.store.update((d) => ({
      ...d,
      cpd: [
        ...d.cpd,
        {
          ...this.cpd,
          activity: this.cpd.activity.trim(),
          reflection: this.cpd.reflection.trim(),
          personId: this.cpdPersonId(),
          id: crypto.randomUUID(),
        },
      ],
    }));
    this.cpdModal.set(false);
    this.cpd = { activity: '', hours: 1, date: '', reflection: '' };
    this.toast.success('CPD activity recorded.');
  }
}
