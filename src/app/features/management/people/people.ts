import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { A11yModule } from '@angular/cdk/a11y';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ManagementStore } from '../shared/management.store';
import { ToastService } from '../../../shared/ui/toast.service';
import { WorkforceDirectory } from './directory/workforce-directory';
@Component({
  selector: 'cv-people',
  imports: [MatSelectModule, CvSelect, A11yModule, FormsModule, WorkforceDirectory],
  host: { '(document:keydown.escape)': 'modal.set(false)' },
  templateUrl: './people.html',
})
export class People {
  protected readonly store = inject(ManagementStore);
  private readonly toast = inject(ToastService);
  protected readonly section = inject(ActivatedRoute).snapshot.data['section'] as string;

  protected readonly modal = signal(false);

  protected readonly title: Record<string, string> = {
    onboarding: 'A warm welcome. A confident start.',
    staff: 'Your people, all in one place.',
    compliance: 'Confidence in every care team.',
    leave: 'Make room for life.',
    reviews: 'Good conversations. Stronger teams.',
  };
  protected readonly subtitle: Record<string, string> = {
    onboarding: 'Bring every new starter through a clear, reassuring onboarding journey.',
    staff: 'A connected view of the people who make care possible.',
    compliance: 'Stay on top of employment checks and workforce readiness.',
    leave: 'Plan availability and keep your team supported.',
    reviews: 'Keep supervision, appraisals and development on track.',
  };
  protected leave = {
    person: this.store.staff()[0]?.name ?? '',
    type: 'Annual leave',
    start: '',
    end: '',
  };
  protected review = { person: this.store.staff()[0]?.name ?? '', type: 'Supervision', date: '' };

  protected addLeave(): void {
    if (this.leave.end < this.leave.start) {
      this.toast.error('End date must be on or after the start date.');
      return;
    }
    this.store.update((d) => ({
      ...d,
      leaves: [...d.leaves, { ...this.leave, id: crypto.randomUUID() }],
    }));
    this.modal.set(false);
    this.toast.success('Leave recorded.');
  }
  protected addReview(): void {
    this.store.update((d) => ({
      ...d,
      reviews: [...d.reviews, { ...this.review, id: crypto.randomUUID(), status: 'Scheduled' }],
    }));
    this.modal.set(false);
    this.toast.success('Review scheduled.');
  }
  protected completeReview(id: string): void {
    this.store.update((d) => ({
      ...d,
      reviews: d.reviews.map((r) => (r.id === id ? { ...r, status: 'Completed' } : r)),
    }));
    this.toast.success('Review marked complete.');
  }
}
