import { Component, HostListener, inject, signal, effect, untracked } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Person } from '../shared/management.store';
import { HrService } from './hr.service';
import { STAFF_STEPS, newStaff, staffRecord, staffErrors, readiness } from './hr.models';
import { StaffFields } from './staff-fields';
import { RecruitmentApi, asPerson, HireInput } from '../recruitment/recruitment-api.service';
import { hireInput, restoreHire } from '../recruitment/recruitment-hire';
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
      await Promise.all([this.api.detail(this.sourceId), this.api.load()]);
      const row = this.api.record(),
        offer = row?.offers?.find((item) => item.decision === 'Accepted');
      if (!row || row.id !== this.sourceId || row.stage !== 'Offer' || !offer)
        throw Error('This application must have an accepted offer before staff setup.');
      this.p = asPerson(row);
      this.p.hr = staffRecord(this.p);
      this.p.start = offer.start_date;
      const saved = await this.api.draft(this.sourceId);
      if (this.initialScope !== this.api.scope())
        throw Error('The workspace or recruitment access changed.');
      if (saved.draft) {
        this.p = restoreHire(this.p, saved.draft.facts);
        this.draftEtag = saved.draft.etag;
        this.step.set(saved.draft.step);
      }
      this.baseline = JSON.stringify(this.p);
    } catch (error) {
      this.invalid.set(this.api.message(error));
    } finally {
      this.loading.set(false);
    }
  }
  protected select(index: number): void {
    this.error.set('');
    if (index > this.step()) {
      const errors = staffErrors(this.p).slice(0, index).flat();
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
        hireInput(this.p),
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
      const errors = staffErrors(this.p).flat();
      if (errors.length) throw Error(errors[0]);
      await this.api.command('hire', hireInput(this.p), undefined, this.hireKey);
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
