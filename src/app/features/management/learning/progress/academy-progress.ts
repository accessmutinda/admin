import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../../shared/ui/select';
import { ManagementStore, Person } from '../../shared/management.store';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'cv-academy-progress',
  imports: [FormsModule, MatSelectModule, CvSelect, RouterLink],
  templateUrl: './academy-progress.html',
})
export class AcademyProgress {
  protected readonly store = inject(ManagementStore);
  protected readonly completion = computed(() => {
    const assignments = this.store
      .staff()
      .flatMap((p) => p.learning.map((id) => p.progress[id] ?? 0));
    return assignments.length
      ? Math.round(assignments.reduce((sum, v) => sum + v, 0) / assignments.length)
      : 0;
  });
  protected readonly progressSearch = signal('');
  protected readonly progressFilter = signal('Everyone');
  protected readonly assignedCount = computed(() =>
    this.store.staff().reduce((sum, p) => sum + p.learning.length, 0),
  );
  protected readonly completedCount = computed(() =>
    this.store.staff().reduce((sum, p) => sum + this.completedFor(p), 0),
  );
  protected readonly progressPeople = computed(() =>
    this.store
      .staff()
      .filter(
        (p) =>
          `${p.name} ${p.role} ${p.location}`
            .toLowerCase()
            .includes(this.progressSearch().toLowerCase()) &&
          (this.progressFilter() === 'Everyone' ||
            (this.progressFilter() === 'No assignments'
              ? !p.learning.length
              : this.progressFilter() === 'Completed'
                ? p.learning.length > 0 && this.completedFor(p) === p.learning.length
                : p.learning.length > 0 && this.completedFor(p) < p.learning.length)),
      ),
  );
  protected completedFor(p: Person): number {
    return p.learning.filter((id) => (p.progress[id] ?? 0) >= 100).length;
  }
  protected inProgressFor(p: Person): number {
    return p.learning.filter((id) => (p.progress[id] ?? 0) > 0 && (p.progress[id] ?? 0) < 100)
      .length;
  }
  protected progressFor(p: Person): number {
    return p.learning.length
      ? Math.round(
          p.learning.reduce((sum, id) => sum + (p.progress[id] ?? 0), 0) / p.learning.length,
        )
      : 0;
  }
}
