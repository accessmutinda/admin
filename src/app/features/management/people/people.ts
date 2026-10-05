import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { A11yModule } from '@angular/cdk/a11y';
import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ManagementStore } from '../shared/management.store';
import { ToastService } from '../../../shared/ui/toast.service';
import { WorkforceDirectory } from './directory/workforce-directory';
@Component({
  selector: 'cv-people',
  imports: [MatSelectModule, CvSelect, A11yModule, DatePipe, FormsModule, WorkforceDirectory],
  host: { '(document:keydown.escape)': 'modal.set(false)' },
  templateUrl: './people.html',
})
export class People {
  protected readonly store = inject(ManagementStore);
  private readonly toast = inject(ToastService);
  protected readonly section = inject(ActivatedRoute).snapshot.data['section'] as string;

  protected leaveSearch = '';
  protected readonly leaveQuery = signal('');
  protected readonly filteredLeaves = computed(() => {
    const query = this.leaveQuery().trim().toLowerCase();
    return this.store
      .data()
      .leaves.filter((entry) =>
        `${entry.person} ${entry.type} ${entry.start} ${entry.end}`.toLowerCase().includes(query),
      );
  });
  protected searchLeave(): void {
    this.leaveQuery.set(this.leaveSearch);
  }
  protected clearLeaveSearch(): void {
    this.leaveSearch = '';
    this.leaveQuery.set('');
  }

  protected reviewSearch = '';
  protected readonly reviewQuery = signal('');
  protected readonly filteredReviews = computed(() => {
    const query = this.reviewQuery().trim().toLowerCase();
    return this.store
      .data()
      .reviews.filter((entry) =>
        `${entry.person} ${entry.type} ${entry.date} ${entry.status}`.toLowerCase().includes(query),
      );
  });
  protected searchReviews(): void {
    this.reviewQuery.set(this.reviewSearch);
  }
  protected clearReviewSearch(): void {
    this.reviewSearch = '';
    this.reviewQuery.set('');
  }

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
