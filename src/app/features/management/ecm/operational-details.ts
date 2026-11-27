import { Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../core/auth/auth-api';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';

type Person = { id: string; name: string };
type Visit = {
  id: string;
  clientName: string;
  callName: string;
  date: string;
  startsAt: string;
  endsAt: string;
  status: string;
  carers: number | null;
  arrived: number;
  workers: Person[];
  canAllocate: boolean;
};
type Subject = Person & {
  company_id: string;
  kind: 'care-workers' | 'service-users';
  timezone: string;
  status: string | null;
  shift: { startsAt: string; endsAt: string } | null;
  visits: Visit[];
  workforce: {
    hrAvailable: boolean;
    availabilityIssues: string[] | null;
    approvedLeave: { start: string; end: string } | null;
    trainingCount: number | null;
    certificates: { id: string; title: string; state: string; expires: string | null }[] | null;
  } | null;
  care: {
    activePackages: number;
    carePlanAvailable: boolean;
    approvedPlan: { version: number; reviewDate: string | null } | null;
  } | null;
};
type Options = {
  company_id: string;
  visitId: string;
  total: number;
  candidates: (Person & { preferred: boolean })[];
};

@Component({
  selector: 'cv-operational-details',
  imports: [RouterLink],
  template: `
    <section class="geo-operational" aria-label="Operational details">
      @if (loading() && !detail()) {
        <p role="status">Loading schedule…</p>
      }
      @if (error()) {
        <p role="alert">{{ error() }}</p>
      }
      @if (detail(); as person) {
        <h3>{{ person.kind === 'care-workers' ? 'Worker schedule' : 'Visits and allocation' }}</h3>
        @if (person.kind === 'care-workers') {
          <p>{{ person.status }}</p>
          @if (person.shift; as shift) {
            <p>Scheduled shift · {{ time(shift.startsAt) }} to {{ time(shift.endsAt) }}</p>
          } @else {
            <p>No active scheduled shift</p>
          }
        }
        @if (person.workforce; as workforce) {
          <div class="geo-operational-actions">
            @if (workforce.hrAvailable) {
              <a class="button" [routerLink]="['/manage/people/staff', person.id, 'overview']"
                >HR profile</a
              >
              <a class="button" [routerLink]="['/manage/people/staff', person.id, 'training']"
                >Training and competency</a
              >
            }
            @if (workforce.availabilityIssues !== null) {
              <a class="button" [routerLink]="['/manage/people/staff', person.id, 'availability']"
                >Staff availability</a
              >
              <a class="button" routerLink="/manage/leave" [queryParams]="{ worker: person.id }"
                >Holiday management</a
              >
            }
          </div>
          @if (workforce.availabilityIssues; as issues) {
            <p>
              {{
                issues.length ? issues.join(' ') : 'Available in the recorded working pattern now.'
              }}
            </p>
            @if (workforce.approvedLeave; as leave) {
              <p>Approved leave · {{ leave.start }} to {{ leave.end }}</p>
            }
          }
          @if (workforce.trainingCount !== null) {
            <p>Verified training requirements met · {{ workforce.trainingCount }}</p>
          }
          @if (workforce.certificates; as certificates) {
            <h4>CareVerity Academy</h4>
            <ul>
              @for (certificate of certificates; track certificate.id) {
                <li>
                  <a [routerLink]="['/manage/learning/certificates', certificate.id]">{{
                    certificate.title
                  }}</a>
                  · {{ certificate.state }}
                  @if (certificate.expires) {
                    · Expires {{ certificate.expires }}
                  }
                </li>
              } @empty {
                <li>No Academy certificates recorded.</li>
              }
            </ul>
          }
        }
        @if (person.care; as care) {
          <div class="geo-operational-actions">
            <a
              class="button"
              routerLink="/manage/rota/call-packages"
              [queryParams]="{ client: person.id }"
            >
              Care packages ({{ care.activePackages }} active)
            </a>
            @if (care.carePlanAvailable) {
              <a class="button" [routerLink]="['/manage/care-plans', person.id]">Care plan</a>
            }
          </div>
          @if (care.carePlanAvailable) {
            @if (care.approvedPlan; as plan) {
              <p>
                Approved care plan · Version {{ plan.version }}
                @if (plan.reviewDate) {
                  · Review {{ plan.reviewDate }}
                }
              </p>
            } @else {
              <p>No approved care plan recorded.</p>
            }
          }
        }
        <ul class="geo-operational-visits">
          @for (visit of person.visits; track visit.id) {
            <li>
              <strong
                >{{ person.kind === 'care-workers' ? visit.clientName + ' · ' : ''
                }}{{ visit.callName }}</strong
              >
              <p>{{ time(visit.startsAt) }} to {{ time(visit.endsAt) }} · {{ visit.status }}</p>
              @if (person.kind === 'service-users') {
                <p>
                  {{ visit.workers.length }} / {{ visit.carers ?? 'Unknown' }} carers assigned
                  @if (visit.workers.length) {
                    · {{ workerNames(visit.workers) }}
                  }
                </p>
              }
              <div class="geo-operational-actions">
                <a
                  class="button"
                  routerLink="/manage/rota/planner"
                  [queryParams]="{ visit: visit.id, from: visit.date }"
                  >Open visit</a
                >
                @if (person.kind === 'service-users' && visit.canAllocate) {
                  <button
                    class="button"
                    type="button"
                    [disabled]="optionsLoading()"
                    (click)="loadOptions(visit)"
                  >
                    Show suitable carers
                  </button>
                }
              </div>
              @if (visit.canAllocate && optionsVisit() === visit.id) {
                @if (optionsLoading()) {
                  <p role="status">Checking suitable carers…</p>
                }
                @if (optionsError()) {
                  <p role="alert">{{ optionsError() }}</p>
                }
                @if (options(); as review) {
                  <p>
                    {{
                      review.total
                        ? review.total + ' suitable carers available for review'
                        : 'No suitable unassigned carers found.'
                    }}
                  </p>
                  <ul>
                    @for (candidate of review.candidates; track candidate.id) {
                      <li>{{ candidate.name }}{{ candidate.preferred ? ' · Preferred' : '' }}</li>
                    }
                  </ul>
                }
              }
            </li>
          } @empty {
            <li>
              {{
                person.kind === 'care-workers'
                  ? 'No visits scheduled today.'
                  : 'No active visits in the current schedule.'
              }}
            </li>
          }
        </ul>
      }
    </section>
  `,
})
export class OperationalDetails {
  readonly kind = input.required<'care-workers' | 'service-users'>();
  readonly subjectId = input.required<string>();
  private readonly auth = inject(AuthService);
  private readonly records = inject(ServiceUsersApi);
  protected readonly detail = signal<Subject | null>(null);
  protected readonly error = signal('');
  protected readonly loading = signal(false);
  protected readonly options = signal<Options | null>(null);
  protected readonly optionsVisit = signal('');
  protected readonly optionsLoading = signal(false);
  protected readonly optionsError = signal('');
  private generation = 0;

  constructor() {
    effect(() => {
      const scope = this.records.scope();
      const kind = this.kind();
      const id = this.subjectId();
      untracked(() => void this.load(scope, kind, id));
    });
    const timer = setInterval(() => {
      if (!document.hidden && !this.loading()) {
        void this.load(this.records.scope(), this.kind(), this.subjectId(), false);
      }
    }, 30000);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      this.generation++;
    });
  }
  private async load(
    scope: string,
    kind: Subject['kind'],
    id: string,
    reset = true,
  ): Promise<void> {
    const company = this.records.companyId();
    if (reset) {
      this.generation++;
      this.detail.set(null);
      this.loading.set(false);
      this.options.set(null);
      this.optionsVisit.set('');
      this.optionsLoading.set(false);
      this.optionsError.set('');
    }
    const generation = this.generation;
    this.error.set('');
    if (!company || !this.records.allowed()) return;
    this.loading.set(true);
    try {
      const result = await this.auth.api<Subject>(
        `/companies/${company}/ecm/operations/${kind}/${id}`,
      );
      if (!this.current(scope, generation)) return;
      if (result.company_id !== company || result.kind !== kind || result.id !== id)
        throw Error('This schedule belongs to a different record.');
      this.detail.set(result);
    } catch (error) {
      if (!this.current(scope, generation)) return;
      if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
        this.detail.set(null);
        this.options.set(null);
      }
      this.error.set(error instanceof Error ? error.message : 'The schedule is unavailable.');
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
  protected async loadOptions(visit: Visit): Promise<void> {
    const person = this.detail();
    if (!person || person.kind !== 'service-users' || !visit.canAllocate || this.optionsLoading())
      return;
    const scope = this.records.scope();
    const generation = this.generation;
    this.options.set(null);
    this.optionsVisit.set(visit.id);
    this.optionsError.set('');
    this.optionsLoading.set(true);
    try {
      const result = await this.auth.api<Options>(
        `/companies/${person.company_id}/ecm/operations/service-users/${person.id}/visits/${visit.id}/options`,
      );
      if (!this.current(scope, generation)) return;
      if (result.company_id !== person.company_id || result.visitId !== visit.id)
        throw Error('These options belong to a different visit.');
      if (this.detail()?.visits.some((row) => row.id === visit.id && row.canAllocate)) {
        this.options.set(result);
      }
    } catch (error) {
      if (this.current(scope, generation))
        this.optionsError.set(
          error instanceof Error ? error.message : 'Allocation options are unavailable.',
        );
    } finally {
      if (generation === this.generation) this.optionsLoading.set(false);
    }
  }
  protected time(value: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: this.detail()?.timezone,
    }).format(new Date(value));
  }
  protected workerNames(workers: Person[]): string {
    return workers.map((worker) => worker.name).join(', ');
  }
  private current(scope: string, generation: number): boolean {
    return (
      generation === this.generation && scope === this.records.scope() && this.records.allowed()
    );
  }
}
