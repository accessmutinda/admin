import { DatePipe } from '@angular/common';
import { ManagementRole } from '../shared/role-pill';
import { A11yModule } from '@angular/cdk/a11y';
import { Component, computed, inject, signal, effect, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  CHECKS,
  COURSES,
  ManagementStore,
  ONBOARDING,
  Person,
  STAGES,
} from '../shared/management.store';
import { ToastService } from '../../../shared/ui/toast.service';
import { PersonCompliance } from './compliance/person-compliance';
import {
  RecruitmentApi,
  asPerson,
  Interview,
  Upload,
  RecruitmentVacancy,
} from '../recruitment/recruitment-api.service';
import { PageLoading } from '../../../shared/layouts/page-loading';
import { CompanyUnavailable } from '../shared/company-unavailable';

@Component({
  selector: 'cv-person-detail',
  imports: [
    DatePipe,
    ManagementRole,
    A11yModule,
    FormsModule,
    MatSelectModule,
    CvSelect,
    RouterLink,
    PersonCompliance,
    PageLoading,
    CompanyUnavailable,
  ],
  host: { '(document:keydown.escape)': "edit.set(false); terminal.set('')" },
  templateUrl: './person-detail.html',
})
export class PersonDetail {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly store = inject(ManagementStore);
  protected readonly api = inject(RecruitmentApi);
  private readonly toast = inject(ToastService);
  protected readonly id = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly person = computed(() => {
    const value = this.api.record();
    return value?.id === this.id ? asPerson(value, this.api.compliance()) : null;
  });
  protected readonly tabs = [
    'Profile',
    'Onboarding',
    'Compliance',
    'Documents',
    'Learning',
    'Notes',
  ];
  protected readonly visibleTabs = computed(() => [
    'Profile',
    ...(this.api.access.can('people', 'compliance', 'read') ? ['Compliance'] : []),
    'Documents',
    'Notes',
  ]);
  protected readonly tab = signal(this.route.snapshot.queryParamMap.get('tab') ?? 'Profile');
  protected readonly tabIcons = [
    'person',
    'waving_hand',
    'verified_user',
    'folder_open',
    'school',
    'forum',
  ];
  protected readonly checks = CHECKS;
  protected readonly checklist = ONBOARDING;
  protected readonly courses = COURSES;
  protected readonly stages = STAGES;
  protected readonly stageIcons = ['person_search', 'forum', 'handshake', 'celebration'];
  protected readonly stageHints = [
    'Application received',
    'Get to know the person',
    'Agree the next chapter',
    'Welcome to the team',
  ];
  protected readonly fromOnboarding = false;
  protected readonly edit = signal(false);
  protected readonly note = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly terminal = signal('');
  protected reason = '';
  protected draft: Person | null = null;
  protected interview = {
    id: '',
    etag: '',
    scheduled_at: '',
    panel: '',
    location: '',
    outcome: 'Scheduled',
    notes: '',
  };
  protected offer = { terms: '', start_date: '' };
  protected offerReasons: Record<string, string> = {};
  constructor() {
    effect(() => {
      this.api.scope();
      const company = this.api.companyId();
      const allowed = this.api.allowed();
      untracked(() => {
        if (company && allowed) queueMicrotask(() => void this.api.detail(this.id));
      });
    });
    effect(() => {
      if (!this.visibleTabs().includes(this.tab())) this.tab.set('Profile');
    });
  }
  protected reload(): void {
    void this.api.detail(this.id);
  }
  protected stageIndex(p: Person): number {
    return STAGES.indexOf(p.stage);
  }
  protected stage(): string {
    const current = this.person()?.stage ?? '';
    return current === 'Applied'
      ? 'Interview'
      : current === 'Interview'
        ? 'Offer'
        : current === 'Offer'
          ? 'Hired'
          : current;
  }
  protected verified(p: Person): number {
    return p.checks.filter(Boolean).length;
  }
  protected completed(_p: Person): number {
    return 0;
  }
  protected progress(_p: Person): number {
    return 0;
  }
  protected nextStepTitle(p: Person): string {
    return p.stage === 'Hired'
      ? 'Continue staff onboarding'
      : p.stage === 'Interview'
        ? 'Review the interview'
        : p.stage === 'Offer'
          ? 'Record the offer decision'
          : 'Get to know ' + p.name.split(' ')[0];
  }
  protected nextStepDescription(p: Person): string {
    return p.stage === 'Hired'
      ? 'The staff record has been created. Continue onboarding from People & HR.'
      : p.stage === 'Interview'
        ? 'Record the interview outcome before moving to Offer.'
        : p.stage === 'Offer'
          ? 'Record offer terms and acceptance before confirming the hire.'
          : 'Review the application and supporting evidence, then move it forward when your team is ready.';
  }
  private async run(operation: () => Promise<unknown>, message: string): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await operation();
      if (message) this.toast.success(message);
    } catch (error) {
      this.error.set(this.api.message(error));
    } finally {
      this.busy.set(false);
    }
  }
  protected async advance(): Promise<void> {
    const row = this.api.record();
    if (!row) return;
    if (this.stage() === 'Hired') {
      if (!row.offers?.some((offer) => offer.decision === 'Accepted')) {
        this.error.set('Record an accepted offer before confirming the hire.');
        return;
      }
      await this.router.navigate(['/manage/people/staff/new'], { queryParams: { source: row.id } });
      return;
    }
    await this.run(
      () =>
        this.api.command('transition', {
          stage: this.stage(),
          reason: 'Recruitment team moved the application to ' + this.stage(),
        }),
      'Applicant moved to ' + this.stage().toLowerCase() + '.',
    );
  }
  protected async saveInterview(): Promise<void> {
    await this.run(async () => {
      const { id, etag, ...fields } = this.interview;
      await this.api.command(
        id ? 'interviews/' + id : 'interviews',
        { ...fields, scheduled_at: new Date(fields.scheduled_at).toISOString() },
        id ? etag : undefined,
      );
      this.interview = {
        id: '',
        etag: '',
        scheduled_at: '',
        panel: '',
        location: '',
        outcome: 'Scheduled',
        notes: '',
      };
    }, 'Interview saved.');
  }
  protected editInterview(row: Interview): void {
    const date = new Date(row.scheduled_at);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    this.interview = { ...row, scheduled_at: local };
  }
  protected async saveOffer(): Promise<void> {
    await this.run(async () => {
      await this.api.command('offers', this.offer);
      this.offer = { terms: '', start_date: '' };
    }, 'Offer recorded.');
  }
  protected async decideOffer(id: string, etag: string, decision: string): Promise<void> {
    await this.run(
      () =>
        this.api.command(
          'offers/' + id + '/decision',
          { decision, reason: this.offerReasons[id] ?? '' },
          etag,
        ),
      'Offer decision recorded.',
    );
  }
  protected async closeApplication(): Promise<void> {
    await this.run(async () => {
      await this.api.command('transition', { stage: this.terminal(), reason: this.reason });
      this.terminal.set('');
      this.reason = '';
    }, 'Application updated.');
  }
  protected startEdit(): void {
    const value = this.person();
    if (value) {
      this.draft = structuredClone(value);
      this.edit.set(true);
    }
  }
  protected async save(): Promise<void> {
    if (!this.draft) return;
    const draft = this.draft;
    await this.run(async () => {
      await this.api.updateApplication({
        name: draft.name,
        email: draft.email,
        location: draft.location,
      });
      this.edit.set(false);
    }, 'Application details saved.');
  }
  protected async addNote(): Promise<void> {
    if (!this.note().trim()) return;
    await this.run(async () => {
      await this.api.command('notes', { text: this.note().trim() });
      this.note.set('');
    }, 'Note added.');
  }
  protected async uploadDocument(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0],
      row = this.api.record();
    if (!file || !row) return;
    await this.run(async () => {
      const vacancy = await this.loadVacancy(row.vacancyId);
      await this.api.upload(file, vacancy, undefined, row.id);
      await this.api.detail(row.id);
    }, 'Document uploaded and scanned.');
    input.value = '';
  }
  private async loadVacancy(id: string): Promise<RecruitmentVacancy> {
    await this.api.load();
    const vacancy = this.api.vacancies().find((row) => row.id === id);
    if (!vacancy) throw Error('This vacancy is unavailable.');
    return vacancy;
  }
  protected async downloadUploaded(_content: string, name: string): Promise<void> {
    const file = this.api.record()?.documents?.find((row) => row.name === name);
    if (file) await this.run(() => this.api.download(file), '');
  }
  protected async removeDocument(id: string): Promise<void> {
    const file = this.api.record()?.documents?.find((row) => row.id === id);
    if (file) await this.run(() => this.api.removeFile(file), 'Attachment removed.');
  }
  protected downloadDocument(_name: string): void {}
}
