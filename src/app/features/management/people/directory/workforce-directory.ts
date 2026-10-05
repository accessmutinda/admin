import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../../shared/ui/select';
import { ManagementRole } from '../../shared/role-pill';
import { CHECKS, ONBOARDING, ManagementStore, Person } from '../../shared/management.store';
@Component({
  selector: 'cv-workforce-directory',
  imports: [FormsModule, RouterLink, MatSelectModule, CvSelect, ManagementRole],
  templateUrl: './workforce-directory.html',
})
export class WorkforceDirectory {
  readonly mode = input.required<string>();
  protected readonly store = inject(ManagementStore);
  protected readonly search = signal('');
  protected readonly filter = signal('All staff');
  protected readonly checks = CHECKS;
  protected readonly checklist = ONBOARDING;
  protected readonly filtered = computed(() =>
    this.store
      .staff()
      .filter(
        (p) =>
          `${p.name} ${p.role} ${p.location}`.toLowerCase().includes(this.search().toLowerCase()) &&
          (this.filter() !== 'Needs attention' || p.checks.some((c) => !c)),
      ),
  );
  protected completed(p: Person): number {
    return p.onboarding.filter(Boolean).length;
  }
  protected percent(p: Person): number {
    return Math.round((p.onboarding.filter(Boolean).length / ONBOARDING.length) * 100);
  }
  protected readonly expiryAlerts = computed(() =>
    this.store.staff().flatMap((p) => {
      const entries = Object.entries(p.checkExpiry ?? {}).filter(
        ([check]) => p.checks[CHECKS.indexOf(check)],
      );
      if (p.visaExpiry) entries.push(['Visa', p.visaExpiry]);
      return entries
        .filter(([, date]) => date && new Date(date).getTime() < Date.now() + 60 * 86400000)
        .map(([check, date]) => ({
          person: p,
          check,
          date,
          overdue: new Date(date).getTime() < Date.now(),
        }));
    }),
  );
  protected ready(p: Person): number {
    return p.checks.filter(Boolean).length;
  }
}
