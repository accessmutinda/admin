import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AcademyService } from './academy.service';
import { AcademyDate } from './academy-date';
@Component({
  selector: 'cv-academy-portal-summary',
  imports: [RouterLink, AcademyDate],
  template: `@if (academy.enabled() && academy.me()) {
    <section class="panel">
      <div class="heading">
        <div>
          <h2>
            <span class="material-symbols-outlined" aria-hidden="true">school</span>My training
          </h2>
          <p>Your assigned courses, due dates and completion evidence.</p>
        </div>
        <a class="academy-button" routerLink="/staff-portal/training">Open CareVerity Academy →</a>
      </div>
      <div class="stats summary-stats">
        <a class="cv-metric" data-card-tone="blue" routerLink="/staff-portal/training/courses"
          ><span class="material-symbols-outlined" aria-hidden="true">school</span>
          <div>
            <h3 class="cv-metric-label">Assigned courses</h3>
            <strong>{{ assignments().length }}</strong
            ><small>Your current learning assignments</small>
          </div></a
        >
        <a class="cv-metric" data-card-tone="orange" routerLink="/staff-portal/training/refreshers"
          ><span class="material-symbols-outlined" aria-hidden="true">schedule</span>
          <div>
            <h3 class="cv-metric-label">Due / overdue</h3>
            <strong>{{ attention().length }}</strong
            ><small>Assignments needing attention</small>
          </div></a
        >
        <a class="cv-metric" data-card-tone="purple" routerLink="/staff-portal/training/history"
          ><span class="material-symbols-outlined" aria-hidden="true">folder_open</span>
          <div>
            <h3 class="cv-metric-label">Passed · evidence pending</h3>
            <strong>{{ pending().length }}</strong
            ><small>Completion filing and updates pending</small>
          </div></a
        >
      </div>
      @for (a of attention().slice(0, 3); track a.id) {
        <div class="summary-row">
          <div>
            <a [routerLink]="['/staff-portal/training/courses', a.courseId]">{{
              academy.assignedCourse(a)?.title
            }}</a
            ><small>{{ a.due ? (a.due | ukDate: 'd MMM yyyy') : 'Review renewal policy' }}</small>
          </div>
          <span class="badge warn">{{ academy.status(a) }}</span>
        </div>
      }
      <p>
        Knowledge completion does not replace practical sign-off or visit-specific suitability
        checks.
      </p>
    </section>
  }`,
  styleUrls: ['./academy.css', './academy-portal.css'],
})
export class AcademyPortalSummary {
  protected readonly academy = inject(AcademyService);
  protected readonly assignments = computed(() =>
    this.academy.assignments().filter((a) => a.personId === this.academy.me()?.id && !a.archived),
  );
  protected readonly attention = computed(() =>
    this.assignments().filter((a) =>
      ['Due soon', 'Overdue', 'Expired', 'Expiring soon'].includes(this.academy.status(a)),
    ),
  );
  protected readonly pending = computed(() =>
    this.assignments().filter(
      (a) => a.completedAt && this.academy.completion(a.id)?.status !== 'COMPLETE_SYNCED',
    ),
  );
}
