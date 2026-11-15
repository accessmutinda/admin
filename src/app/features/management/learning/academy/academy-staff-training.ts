import {
  Component,
  Injector,
  inject,
  input,
  computed,
  effect,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AcademyService } from './academy.service';
import { AcademyDate } from './academy-date';
@Component({
  selector: 'cv-academy-staff-training',
  imports: [RouterLink, AcademyDate],
  template: `@if (connected()) {
    <section class="panel">
      @if (loading()) {
        <p role="status">Loading Academy training records…</p>
      }
      @if (error()) {
        <p role="alert">{{ error() }}</p>
      }
      <div class="heading">
        <div>
          <h2>CareVerity Academy — learning & evidence</h2>
          <p>
            Assignments linked to this existing staff record. Practical sign-off remains separate.
          </p>
        </div>
        @if (academy.can('assign')) {
          <div class="actions">
            <a
              [attr.aria-disabled]="!connected()"
              class="academy-button primary"
              [routerLink]="connected() ? '/manage/learning/rules' : null"
              [queryParams]="{ person: personId(), action: 'assign' }"
              >Assign course</a
            ><a
              class="academy-button"
              [routerLink]="connected() ? '/manage/learning/rules' : null"
              [queryParams]="{ person: personId(), action: 'refresher' }"
              >Send refresher</a
            >
          </div>
        }
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
            @for (a of connected() ? assignments() : []; track a.id) {
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
                  @if (a.completedAt && certificateId(a.id) && academy.canViewEvidence()) {
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
                <td colspan="4">
                  {{
                    connected()
                      ? 'No Academy assignments for this staff record.'
                      : 'Academy assignments are not connected. Record external training evidence in the existing training editor.'
                  }}
                </td>
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
  private readonly injector = inject(Injector);
  protected get academy() {
    return this.injector.get(AcademyService);
  }
  readonly personId = input.required<string>();
  protected readonly connected = computed(() => this.academy.assignmentApi.available());
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  constructor() {
    effect(() => {
      this.personId();
      const scope = this.academy.store.companyId();
      if (!this.connected() || !scope) return;
      untracked(() => void this.load(scope));
    });
  }
  private async load(scope: string) {
    this.loading.set(true);
    this.error.set('');
    try {
      await Promise.all([
        this.academy.api.load(),
        this.academy.assignmentApi.load(),
        ...(this.academy.resultsApi.available() ? [this.academy.resultsApi.load()] : []),
        ...(this.academy.certificatesApi.available() ? [this.academy.certificatesApi.load()] : []),
      ]);
    } catch (error) {
      if (scope === this.academy.store.companyId()) this.error.set((error as Error).message);
    } finally {
      if (scope === this.academy.store.companyId()) this.loading.set(false);
    }
  }
  protected certificateId(id: string) {
    return this.academy.completion(id)?.certificateId ?? '';
  }
  protected assignments() {
    return this.academy.assignments().filter((a) => a.personId === this.personId() && !a.archived);
  }
}
