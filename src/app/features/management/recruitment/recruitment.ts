import { DatePipe } from '@angular/common';
import { validVacancyDate } from './vacancy-deadline';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { ManagementRole } from '../shared/role-pill';
import { A11yModule } from '@angular/cdk/a11y';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ManagementStore, STAGES, Vacancy } from '../shared/management.store';
import { ApplicationForm } from './application-form';
import { ToastService } from '../../../shared/ui/toast.service';
@Component({
  selector: 'cv-recruitment',
  imports: [
    DatePipe,
    ApplicationForm,
    MatSelectModule,
    CvSelect,
    ManagementRole,
    A11yModule,
    FormsModule,
    RouterLink,
  ],
  host: { '(document:keydown.escape)': "modal.set('')" },
  templateUrl: './recruitment.html',
  styleUrl: './recruitment.css',
})
export class Recruitment {
  protected readonly store = inject(ManagementStore);
  private readonly toast = inject(ToastService);
  protected readonly stages = STAGES;
  protected readonly view = signal('Pipeline');
  protected readonly search = signal('');
  protected readonly vacancyFilter = signal('All vacancies');
  protected readonly modal = signal('');
  protected readonly people = computed(() =>
    this.store
      .data()
      .people.filter(
        (p) =>
          `${p.name} ${p.role} ${p.location}`.toLowerCase().includes(this.search().toLowerCase()) &&
          (this.vacancyFilter() === 'All vacancies' ||
            p.vacancyId === this.vacancyFilter() ||
            (!p.vacancyId &&
              p.vacancy ===
                this.store.data().vacancies.find((v) => v.id === this.vacancyFilter())?.title)),
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
  protected applicantCount(vacancy: Vacancy): number {
    return this.store
      .applicants()
      .filter((p) => (p.vacancyId ? p.vacancyId === vacancy.id : p.vacancy === vacancy.title))
      .length;
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
          published: true,
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
  protected addVacancy(): void {
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
    if (!this.store.saveVacancy(vacancy)) {
      this.editorError.set(
        'The vacancy could not be saved. Free some browser storage and try again.',
      );
      return;
    }
    this.savedVacancy.set(vacancy);
    this.vacancy = null;
    this.view.set('Vacancies');
    this.toast.success('Vacancy and application form saved.');
  }
  protected openApplicant(): void {
    this.applicant.vacancy = this.store.data().vacancies[0]?.id ?? '';
    this.modal.set('applicant');
  }
  protected addApplicant(): void {
    const vacancy = this.store.data().vacancies.find((v) => v.id === this.applicant.vacancy);
    if (!vacancy) return;
    this.store.addPerson({
      id: crypto.randomUUID(),
      name: this.applicant.name,
      email: this.applicant.email,
      role: vacancy.title,
      vacancy: vacancy.title,
      vacancyId: vacancy.id,
      location: this.applicant.location,
      stage: 'Applied',
      start: '',
      notes: [],
      checks: Array(7).fill(false),
      onboarding: Array(8).fill(false),
      learning: [],
      progress: {},
    });
    this.modal.set('');
    this.applicant = { name: '', email: '', vacancy: 'Care Worker', location: '' };
    this.toast.success('Applicant added.');
  }
}
