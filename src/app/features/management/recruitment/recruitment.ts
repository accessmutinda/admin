import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { ManagementRole } from '../shared/role-pill';
import { A11yModule } from '@angular/cdk/a11y';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ManagementStore, STAGES } from '../shared/management.store';
import { ToastService } from '../../../shared/ui/toast.service';
@Component({
  selector: 'cv-recruitment',
  imports: [MatSelectModule, CvSelect, ManagementRole, A11yModule, FormsModule, RouterLink],
  host: { '(document:keydown.escape)': "modal.set('')" },
  templateUrl: './recruitment.html',
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
          (this.vacancyFilter() === 'All vacancies' || p.vacancy === this.vacancyFilter()),
      ),
  );
  protected vacancy = { title: '', location: '', type: 'Full time', salary: '' };
  protected applicant = { name: '', email: '', vacancy: 'Care Worker', location: '' };
  protected inStage(stage: string) {
    return this.people().filter((p) => p.stage === stage);
  }
  protected applicantCount(title: string): number {
    return this.store.applicants().filter((p) => p.vacancy === title).length;
  }
  protected addVacancy(): void {
    this.store.update((d) => ({
      ...d,
      vacancies: [...d.vacancies, { ...this.vacancy, id: crypto.randomUUID() }],
    }));
    this.modal.set('');
    this.vacancy = { title: '', location: '', type: 'Full time', salary: '' };
    this.toast.success('Vacancy created in this workspace.');
  }
  protected openApplicant(): void {
    this.applicant.vacancy = this.store.data().vacancies[0]?.title ?? '';
    this.modal.set('applicant');
  }
  protected addApplicant(): void {
    if (!this.store.data().vacancies.some((v) => v.title === this.applicant.vacancy)) return;
    this.store.addPerson({
      id: crypto.randomUUID(),
      name: this.applicant.name,
      email: this.applicant.email,
      role: this.applicant.vacancy,
      vacancy: this.applicant.vacancy,
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
