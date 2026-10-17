import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { HrService } from './hr.service';
import { onboardingRow } from './hr-queues.models';
import { staffRecord } from './hr.models';

@Component({
  selector: 'cv-hr-onboarding',
  host: { class: 'module-page people-page hr-workspace-page' },
  imports: [FormsModule, RouterLink, MatSelectModule, CvSelect],
  templateUrl: './hr-onboarding.html',
  styleUrls: ['./hr.css', './hr-directory.css', './hr-tables.css', './hr-queues.css'],
})
export class HrOnboarding {
  protected readonly hr = inject(HrService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly q = computed(() => this.params().get('q') ?? '');
  protected readonly lane = computed(() => this.params().get('lane') ?? 'in-progress');
  protected readonly branch = computed(() => this.params().get('branch') ?? '');
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly starters = computed(() =>
    this.hr
      .staff()
      .filter((person) => person.hr.status === 'Onboarding')
      .map(onboardingRow),
  );
  protected readonly branches = computed(() =>
    [
      ...new Set(
        [
          ...this.starters().map((row) => row.person.location),
          ...this.hr.drafts().map((draft) => draft.person.location),
        ].filter(Boolean),
      ),
    ].sort(),
  );
  protected readonly rows = computed(() =>
    this.starters().filter(
      (row) =>
        `${row.person.name} ${row.person.hr.reference}`
          .toLowerCase()
          .includes(this.q().trim().toLowerCase()) &&
        (!this.branch() || row.person.location === this.branch()) &&
        (this.lane() === 'ready' ? row.ready : this.lane() === 'in-progress' ? !row.ready : true),
    ),
  );
  protected readonly drafts = computed(() =>
    this.hr
      .drafts()
      .filter(
        (draft) =>
          `${draft.person.hr?.personal.firstName ?? ''} ${draft.person.hr?.personal.surname ?? ''} ${draft.person.email}`
            .toLowerCase()
            .includes(this.q().trim().toLowerCase()) &&
          (!this.branch() || draft.person.location === this.branch()),
      ),
  );
  protected readonly stats = computed(() => [
    {
      label: 'Saved Drafts',
      value: this.hr.drafts().length,
      caption: 'Staff setup not submitted',
      icon: 'draft',
      lane: 'drafts',
      color: '#008afa',
    },
    {
      label: 'In Progress',
      value: this.starters().filter((row) => !row.ready).length,
      caption: 'Checklists in progress',
      icon: 'assignment_ind',
      lane: 'in-progress',
      color: '#ff8a00',
    },
    {
      label: 'Ready to Activate',
      value: this.starters().filter((row) => row.ready).length,
      caption: 'All required tasks complete',
      icon: 'person_check',
      lane: 'ready',
      color: '#00a34e',
    },
  ]);
  protected set(key: string, value: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [key]: value || null },
      queryParamsHandling: 'merge',
    });
  }
  protected clear(): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { lane: this.lane() } });
  }
  protected activate(id: string): void {
    this.error.set('');
    this.notice.set('');
    const current = this.hr.staff().find((person) => person.id === id);
    if (!current || current.hr.status !== 'Onboarding') {
      this.error.set('This starter is no longer awaiting activation. Refresh the queue.');
      return;
    }
    if (!onboardingRow(current).ready) {
      this.error.set('Complete the outstanding tasks before activating this employee.');
      return;
    }
    const person = structuredClone(current);
    person.hr = staffRecord(person);
    person.hr.status = 'Active';
    const error = this.hr.savePerson(
      person,
      this.hr.store.companyId(),
      'Onboarding completed and staff activated',
      { expectedAudit: current.hr.audit.at(-1)?.id ?? '' },
    );
    if (error) this.error.set(error);
    else
      this.notice.set(
        person.name + ' is now active. Their record is available in Staff Directory.',
      );
  }
}
