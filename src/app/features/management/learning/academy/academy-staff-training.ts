import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AcademyService } from './academy.service';
import { AcademyDate } from './academy-date';
@Component({
  selector: 'cv-academy-staff-training',
  imports: [RouterLink, AcademyDate],
  template: `@if (academy.canManage()) {
    <section class="panel">
      <div class="heading">
        <div>
          <h2>CareVerity Academy — learning & evidence</h2>
          <p>
            Assignments linked to this existing staff record. Practical sign-off remains separate.
          </p>
        </div>
        <div class="actions">
          <a
            class="academy-button primary"
            routerLink="/manage/learning/rules"
            [queryParams]="{ person: personId(), action: 'assign' }"
            >Assign course</a
          ><a
            class="academy-button"
            routerLink="/manage/learning/rules"
            [queryParams]="{ person: personId(), action: 'refresher' }"
            >Send refresher</a
          >
        </div>
      </div>
      <div class="scroll" tabindex="0" role="region" aria-label="Academy staff training">
        <table>
          <thead>
            <tr>
              <th>Course / version</th>
              <th>Due</th>
              <th>Learning status</th>
              <th>Evidence workflow</th>
            </tr>
          </thead>
          <tbody>
            @for (a of assignments(); track a.id) {
              <tr>
                <td>
                  {{ academy.assignedCourse(a)?.title
                  }}<small
                    >Version {{ a.courseVersion ?? academy.assignedCourse(a)?.version }} ·
                    {{ a.type ?? 'Initial' }}</small
                  >
                </td>
                <td>{{ a.due ? (a.due | ukDate: 'd MMM yyyy') : 'Not set' }}</td>
                <td>{{ academy.status(a) }}</td>
                <td>
                  {{ academy.completion(a.id)?.status ?? 'No completion workflow' }}
                  @if (a.completedAt) {
                    <small
                      ><a [routerLink]="['/manage/learning/certificates', certificateId(a.id)]"
                        >Inspect evidence →</a
                      ></small
                    >
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4">No Academy assignments for this staff record.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  }`,
  styleUrl: './academy.css',
})
export class AcademyStaffTraining {
  protected readonly academy = inject(AcademyService);
  readonly personId = input.required<string>();
  protected certificateId(id: string) {
    return (
      this.academy
        .state()
        .certificates.filter((c) => c.assignmentId === id)
        .at(-1)?.id ?? ''
    );
  }
  protected assignments() {
    return this.academy.assignments().filter((a) => a.personId === this.personId() && !a.archived);
  }
}
