import { CardTonePipe } from '../../../../shared/ui/card-tone.pipe';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../../shared/ui/select';
import { ManagementStore, Person } from '../../shared/management.store';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'cv-academy-progress',
  imports: [CardTonePipe, FormsModule, MatSelectModule, CvSelect, RouterLink],
  templateUrl: './academy-progress.html',
  styleUrls: [
    '../../people/hr.css',
    '../../people/hr-tables.css',
    '../../people/hr-forms.css',
    '../academy-design.css',
    './academy-progress.css',
  ],
})
export class AcademyProgress {
  readonly active = input(true);
  protected readonly store = inject(ManagementStore);
  protected readonly animatedCompletion = signal(0);
  protected readonly animatedProgress = signal<Record<string, number>>({});
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
  constructor() {
    effect((onCleanup) => {
      if (!this.active()) {
        this.animatedCompletion.set(0);
        this.animatedProgress.set({});
        return;
      }
      const completion = this.completion();
      const progress = Object.fromEntries(
        this.store.staff().map((person) => [person.id, this.progressFor(person)]),
      );
      if (
        typeof requestAnimationFrame !== 'function' ||
        typeof matchMedia !== 'function' ||
        matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        this.animatedCompletion.set(completion);
        this.animatedProgress.set(progress);
        return;
      }
      const initial = untracked(() => ({
        completion: this.animatedCompletion(),
        progress: this.animatedProgress(),
      }));
      const started = performance.now();
      let frame = 0;
      const animate = (now: number) => {
        const elapsed = Math.min(Math.max((now - started) / 900, 0), 1);
        const eased = 1 - (1 - elapsed) ** 3;
        this.animatedCompletion.set(
          Math.round(initial.completion + (completion - initial.completion) * eased),
        );
        this.animatedProgress.set(
          Object.fromEntries(
            Object.entries(progress).map(([id, target]) => {
              const start = initial.progress[id] ?? 0;
              return [id, Math.round(start + (target - start) * eased)];
            }),
          ),
        );
        if (elapsed < 1) frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
      onCleanup(() => cancelAnimationFrame(frame));
    });
  }
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
