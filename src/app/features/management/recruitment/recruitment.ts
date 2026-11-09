import { RecruitmentApi, asPerson } from './recruitment-api.service';
import { Skeleton } from '../../../shared/ui/skeleton';
import { CompanyUnavailable } from '../shared/company-unavailable';
import { CardTonePipe } from '../../../shared/ui/card-tone.pipe';
import { QuickActions } from '../shared/quick-actions';
import { DatePipe } from '@angular/common';
import { validVacancyDate } from './vacancy-deadline';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { ManagementRole } from '../shared/role-pill';
import { A11yModule } from '@angular/cdk/a11y';
import { Component, computed, inject, signal, effect, untracked, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ManagementStore, STAGES, Vacancy } from '../shared/management.store';
import { ApplicationForm } from './application-form';
import { ToastService } from '../../../shared/ui/toast.service';
@Component({
  selector: 'cv-recruitment',
  imports: [
    Skeleton,
    CompanyUnavailable,
    CardTonePipe,
    QuickActions,
    DatePipe,
    ApplicationForm,
    MatSelectModule,
    CvSelect,
    ManagementRole,
    A11yModule,
    FormsModule,
    RouterLink,
  ],
  host: {
    class: 'module-page people-page recruitment-page',
    '(document:keydown.escape)': "modal.set('')",
  },
  templateUrl: './recruitment.html',
  styleUrls: [
    '../people/hr.css',
    '../people/hr-directory.css',
    '../people/hr-tables.css',
    '../people/hr-forms.css',
    './recruitment.css',
  ],
})
export class Recruitment {
  protected readonly store = inject(ManagementStore);
  protected readonly api = inject(RecruitmentApi);
  protected readonly saving = signal(false);
  private readonly toast = inject(ToastService);
  protected readonly stages = [...STAGES, 'Rejected', 'Withdrawn'];
  protected readonly view = signal('Pipeline');
  protected readonly search = signal('');
  protected readonly vacancyFilter = signal('All vacancies');
  protected readonly stageFilter = signal('All stages');
  protected readonly vacancyState = signal('All statuses');
  protected readonly vacancyStates = [
    'Accepting applications',
    'Scheduled',
    'Not accepting applications',
    'Deadline passed',
  ];
  protected readonly vacancies = computed(() =>
    this.api
      .vacancies()
      .filter(
        (vacancy) =>
          `${vacancy.title} ${vacancy.location} ${vacancy.type} ${vacancy.salary}`
            .toLowerCase()
            .includes(this.search().trim().toLowerCase()) &&
          (this.vacancyState() === 'All statuses' ||
            this.api.vacancyStatus(vacancy) === this.vacancyState()),
      ),
  );
  protected readonly modal = signal('');
  protected readonly summary = computed(() => [
    {
      label: 'Open Vacancies',
      value: this.api.summary()?.open_vacancies ?? 0,
      caption: 'Accepting applications now',
      icon: 'work',
      color: '#008afa',
      view: 'Vacancies',
      stage: 'All stages',
      vacancyState: 'Accepting applications',
    },
    {
      label: 'Active Applicants',
      value: this.api.summary()?.active_applicants ?? 0,
      caption: 'Applications in progress',
      icon: 'groups',
      color: '#03a6c1',
      view: 'Pipeline',
      stage: 'Active applicants',
      vacancyState: 'All statuses',
    },
    {
      label: 'Offers Made',
      value: this.api.summary()?.offers_made ?? 0,
      caption: 'Awaiting the next hiring step',
      icon: 'handshake',
      color: '#00a34e',
      view: 'Pipeline',
      stage: 'Offer',
      vacancyState: 'All statuses',
    },
  ]);
  protected openView(view: string, stage = 'All stages', vacancyState = 'All statuses'): void {
    this.view.set(view);
    this.stageFilter.set(stage);
    this.vacancyFilter.set('All vacancies');
    this.search.set('');
    this.vacancyState.set(vacancyState);
  }
  protected readonly people = computed(() =>
    this.api
      .applications()
      .map((row) => asPerson(row))
      .filter(
        (p) =>
          `${p.name} ${p.email} ${p.role} ${p.location}`
            .toLowerCase()
            .includes(this.search().trim().toLowerCase()) &&
          (this.vacancyFilter() === 'All vacancies' ||
            p.vacancyId === this.vacancyFilter() ||
            (!p.vacancyId &&
              p.vacancy ===
                this.api.vacancies().find((v) => v.id === this.vacancyFilter())?.title)),
      ),
  );
  protected vacancy: Vacancy | null = null;
  protected readonly editorError = signal('');
  protected readonly savedVacancy = signal<Vacancy | null>(null);
  protected readonly fieldTypes = [
    { value: 'text', label: 'Short answer' },
    { value: 'textarea', label: 'Long answer' },
    { value: 'email', label: 'Email' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
  ];
  protected applicant = { name: '', email: '', vacancy: 'Care Worker', location: '' };
  protected inStage(stage: string) {
    return this.people().filter((p) => p.stage === stage);
  }
  protected readonly applicantRows = computed(() =>
    this.stages
      .flatMap((stage) => this.inStage(stage))
      .filter(
        (person) =>
          this.stageFilter() === 'All stages' ||
          (this.stageFilter() === 'Active applicants'
            ? !['Hired', 'Rejected', 'Withdrawn'].includes(person.stage)
            : person.stage === this.stageFilter()),
      ),
  );
  constructor() {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let scope = '';
    effect(() => {
      const current = this.api.scope();
      const company = this.api.companyId();
      const allowed = this.api.allowed();
      const q = this.search();
      const vacancy = this.vacancyFilter();
      untracked(() => {
        clearTimeout(timer);
        if (current !== scope) {
          scope = current;
          this.vacancy = null;
          this.savedVacancy.set(null);
          this.modal.set('');
        }
        if (company && allowed)
          timer = setTimeout(
            () => void this.api.load(q, vacancy === 'All vacancies' ? '' : vacancy),
            150,
          );
      });
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  }
  protected applicantCount(vacancy: Vacancy): number {
    return this.api.vacancies().find((row) => row.id === vacancy.id)?.applicant_count ?? 0;
  }
  protected openVacancy(existing?: Vacancy): void {
    this.vacancy = existing
      ? {
          ...structuredClone(existing),
          fields: structuredClone(existing.fields ?? []),
          documents: structuredClone(existing.documents ?? []),
        }
      : {
          id: crypto.randomUUID(),
          title: '',
          location: '',
          type: 'Full time',
          salary: '',
          description: '',
          published: this.api.can('publish'),
          closingDate: '',
          goLiveDate: '',
          fields: [],
          documents: [{ id: crypto.randomUUID(), label: 'CV / résumé', required: true }],
        };
    this.editorError.set('');
    this.savedVacancy.set(null);
  }
  protected addField(): void {
    this.vacancy?.fields?.push({
      id: crypto.randomUUID(),
      label: '',
      type: 'text',
      required: false,
    });
  }
  protected addDocument(): void {
    this.vacancy?.documents?.push({ id: crypto.randomUUID(), label: '', required: true });
  }
  protected removeField(id: string): void {
    if (this.vacancy) this.vacancy.fields = this.vacancy.fields?.filter((f) => f.id !== id);
  }
  protected removeDocument(id: string): void {
    if (this.vacancy) this.vacancy.documents = this.vacancy.documents?.filter((d) => d.id !== id);
  }
  protected link(vacancy: Vacancy): string {
    return `${window.location.origin}/apply/${encodeURIComponent(this.store.companyId())}/${encodeURIComponent(vacancy.id)}`;
  }
  protected async copyLink(vacancy: Vacancy): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.link(vacancy));
      this.toast.success('Application link copied.');
    } catch {
      this.toast.error('Could not copy the link. Select the link and copy it manually.');
      this.savedVacancy.set(vacancy);
    }
  }
  protected async addVacancy(): Promise<void> {
    if (this.saving()) return;
    if (!this.vacancy) return;
    const vacancy = structuredClone(this.vacancy);
    vacancy.title = vacancy.title.trim();
    vacancy.location = vacancy.location.trim();
    vacancy.fields = (vacancy.fields ?? []).map((f) => ({ ...f, label: f.label.trim() }));
    vacancy.documents = (vacancy.documents ?? []).map((d) => ({ ...d, label: d.label.trim() }));
    if (
      !vacancy.title ||
      !vacancy.location ||
      vacancy.fields.some((f) => !f.label) ||
      vacancy.documents.some((d) => !d.label)
    ) {
      this.editorError.set(
        'Enter a job title, location and a label for every question and document.',
      );
      return;
    }
    if (vacancy.closingDate && !validVacancyDate(vacancy.closingDate)) {
      this.editorError.set('Enter a valid closing date or leave it blank for no deadline.');
      return;
    }
    if (vacancy.goLiveDate && !validVacancyDate(vacancy.goLiveDate)) {
      this.editorError.set('Enter a valid go-live date or leave it blank to open immediately.');
      return;
    }
    if (vacancy.goLiveDate && vacancy.closingDate && vacancy.goLiveDate > vacancy.closingDate) {
      this.editorError.set('The closing date must be on or after the go-live date.');
      return;
    }
    this.saving.set(true);
    try {
      const saved = await this.api.saveVacancy(vacancy);
      this.savedVacancy.set(saved);
      this.vacancy = null;
      this.openView('Vacancies');
      this.toast.success('Vacancy and application form saved.');
    } catch (error) {
      this.editorError.set(this.api.message(error));
    } finally {
      this.saving.set(false);
    }
  }
  protected openApplicant(): void {
    const vacancies = this.api.vacancies();
    this.applicant.vacancy =
      (this.view() === 'Pipeline' &&
        vacancies.find((vacancy) => vacancy.id === this.vacancyFilter())?.id) ||
      vacancies[0]?.id ||
      '';
    this.modal.set('applicant');
  }
  protected async addApplicant(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    this.editorError.set('');
    try {
      await this.api.addApplicant(this.applicant);
      this.modal.set('');
      this.applicant = { name: '', email: '', vacancy: '', location: '' };
      this.toast.success('Applicant added.');
    } catch (error) {
      this.editorError.set(this.api.message(error));
    } finally {
      this.saving.set(false);
    }
  }
}
