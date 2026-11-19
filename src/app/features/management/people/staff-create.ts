import { Component, HostListener, inject, signal, effect, untracked } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Person } from '../shared/management.store';
import { HrService } from './hr.service';
import { STAFF_STEPS, newStaff, staffRecord, staffErrors, readiness } from './hr.models';
import { StaffFields } from './staff-fields';
import { RecruitmentApi, asPerson, StaffBranchOption } from '../recruitment/recruitment-api.service';
import { hireInput, restoreHire } from '../recruitment/recruitment-hire';
import { contractType, workingPattern } from './employment-terms';
import { PageLoading } from '../../../shared/layouts/page-loading';
@Component({
  selector: 'cv-staff-create',
  host: { class: 'module-page module-create people-page hr-create-page' },
  imports: [RouterLink, StaffFields, PageLoading],
  templateUrl: './staff-create.html',
  styleUrls: ['./hr.css', './hr-create.css'],
})
export class StaffCreate {
  protected readonly hr = inject(HrService);
  protected readonly api = inject(RecruitmentApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly companyId = this.api.companyId();
  protected readonly steps = STAFF_STEPS;
  protected readonly stepHints = [
    'Basic information',
    'Role, employment and checks',
    'Working hours and areas',
    'Courses and certifications',
    'Upload and verify',
    'Check and confirm',
  ];
  protected readonly step = signal(0);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly busy = signal(false);
  protected readonly loading = signal(true);
  protected readonly invalid = signal('');
  protected readonly ready = readiness;
  protected p: Person = newStaff();
  protected branches: StaffBranchOption[] = [];
  protected branchId = '';
  protected vacancyLocation = '';
  protected applicantLocation = '';
  protected readonly sourceId = this.route.snapshot.queryParamMap.get('source') ?? '';
  private baseline = '';
  private finished = false;
  private draftEtag = '"v0"';
  private readonly hireKey = crypto.randomUUID();
  private readonly initialScope = this.api.scope();
  constructor() {
    effect(() => {
      if (this.api.scope() !== this.initialScope)
        untracked(() => {
          this.p = newStaff();
          this.finished = true;
          this.loading.set(false);
          this.invalid.set(
            'The workspace or recruitment access changed. Reopen the accepted offer.',
          );
        });
    });
    queueMicrotask(() => void this.load());
  }
  private async load(): Promise<void> {
    try {
      if (!this.sourceId) throw Error('Open an accepted recruitment offer to begin staff setup.');
      const [, branches] = await Promise.all([
        this.api.detail(this.sourceId),
        this.api.hireBranches(),
      ]);
      if (this.initialScope !== this.api.scope())
        throw Error('The workspace or recruitment access changed.');
      const row = this.api.record(),
        offer = row?.offers?.find((item) => item.decision === 'Accepted');
      if (!row || row.id !== this.sourceId || row.stage !== 'Offer' || !offer)
        throw Error('This application must have an accepted offer before staff setup.');
      this.branches = branches;
      this.vacancyLocation = row.vacancy_location ?? '';
      this.applicantLocation = row.location;
      this.p = asPerson(row);
      this.p.location = '';
      this.p.hr = staffRecord(this.p);
      this.p.hr.employment.workingPattern = workingPattern(row.working_pattern);
      this.p.hr.employment.contractType = contractType(row.contract_type);
      this.p.start = offer.start_date;
      const saved = await this.api.draft(this.sourceId);
      if (this.initialScope !== this.api.scope())
        throw Error('The workspace or recruitment access changed.');
      let branchId = this.matchBranch(this.vacancyLocation);
      if (saved.draft) {
        const facts = saved.draft.facts;
        this.p = restoreHire(this.p, facts);
        if (facts.branch_id !== undefined) {
          branchId = facts.branch_id ?? '';
        } else if (
          facts.branch_name &&
          this.locationKey(facts.branch_name) !== this.locationKey(this.applicantLocation)
        ) {
          branchId = this.matchBranch(facts.branch_name);
        }
        this.draftEtag = saved.draft.etag;
        this.step.set(saved.draft.step);
      }
      this.p.hr!.employment.recruitment = {
        ...this.p.hr!.employment.recruitment,
        ...row.recruitment_milestones,
      };
      this.selectBranch(branchId);
      if (!this.branchId && this.step() > 1) this.step.set(1);
      this.baseline = JSON.stringify(this.p);
    } catch (error) {
      this.invalid.set(this.api.message(error));
    } finally {
      this.loading.set(false);
    }
  }
  private locationKey(value: string): string {
    return value.trim().toLowerCase();
  }
  private matchBranch(name: string): string {
    const key = this.locationKey(name);
    if (!key) return '';
    const matches = this.branches.filter(
      (branch) => this.locationKey(branch.name) === key,
    );
    return matches.length === 1 ? matches[0].id : '';
  }
  protected selectBranch(id: string): void {
    const branch = this.branches.find((option) => option.id === id);
    this.branchId = branch?.id ?? '';
    this.p.location = branch?.name ?? '';
  }
  protected select(index: number): void {
    if (this.busy()) return;
    this.error.set('');
    if (index > this.step()) {
      const errors = staffErrors(this.p, true).slice(0, index).flat();
      if (errors.length) {
        this.error.set(errors.join(' '));
        return;
      }
    }
    this.step.set(index);
  }
  protected async saveDraft(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      if (this.companyId !== this.api.companyId() || this.initialScope !== this.api.scope())
        throw Error('The workspace changed. Return to the original company.');
      const saved = await this.api.saveDraft(
        this.sourceId,
        hireInput(this.p, this.branchId || null),
        this.step(),
        this.draftEtag,
      );
      this.draftEtag = saved.etag;
      this.baseline = JSON.stringify(this.p);
      this.notice.set('Draft saved securely. Open this applicant’s accepted offer to resume.');
    } catch (error) {
      this.error.set(this.api.message(error));
    } finally {
      this.busy.set(false);
    }
  }
  protected async create(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      if (this.companyId !== this.api.companyId() || this.initialScope !== this.api.scope())
        throw Error('The workspace changed. Return to the original company.');
      if (!this.branchId) {
        this.step.set(1);
        throw Error('Choose an active company branch before creating the staff record.');
      }
      const errors = staffErrors(this.p, true).flat();
      if (errors.length) throw Error(errors[0]);
      await this.api.command('hire', hireInput(this.p, this.branchId), undefined, this.hireKey);
      this.finished = true;
      await this.router.navigate(['/manage/people/onboarding'], {
        queryParams: { q: this.p.name },
      });
    } catch (error) {
      this.error.set(this.api.message(error));
    } finally {
      this.busy.set(false);
    }
  }
  canLeave(): boolean {
    return (
      this.finished ||
      this.loading() ||
      this.baseline === JSON.stringify(this.p) ||
      window.confirm('You have unsaved staff details. Leave without saving them?')
    );
  }
  @HostListener('window:beforeunload', ['$event']) protected beforeUnload(
    event: BeforeUnloadEvent,
  ): void {
    if (!this.finished && !this.loading() && this.baseline !== JSON.stringify(this.p))
      event.preventDefault();
  }
}
