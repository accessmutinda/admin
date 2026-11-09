import {
  RecruitmentVacancy,
  Upload,
  publicRecruitment,
  uploadRecruitmentFile,
} from './recruitment-api.service';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Company, ManagementStore, StaffDocument, Vacancy } from '../shared/management.store';

@Component({
  selector: 'cv-application-form',
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [DatePipe, FormsModule],
  templateUrl: './application-form.html',
  styleUrl: './application-form.css',
})
export class ApplicationForm {
  readonly vacancy = input.required<Vacancy>();
  readonly company = input<Pick<Company, 'id' | 'name' | 'code'> & Partial<Company>>();
  readonly preview = input(false);
  protected readonly store = inject(ManagementStore);
  protected consent = false;
  private readonly submissionKey = crypto.randomUUID();
  private readonly uploadTokens: Record<string, string> = {};
  private readonly uploading = signal(false);
  protected readonly sent = signal(false);
  private readonly pendingUploads = signal(0);
  protected readonly busy = computed(() => this.pendingUploads() > 0 || this.uploading());
  private uploadVersions: Record<string, number> = {};
  protected readonly error = signal('');
  protected readonly fileErrors = signal<Record<string, string>>({});
  protected readonly files = signal<Record<string, StaffDocument>>({});
  protected details = { name: '', email: '', phone: '', location: '' };
  protected answers: Record<string, string> = {};

  protected async upload(event: Event, id: string, label: string): Promise<void> {
    const version = (this.uploadVersions[id] ?? 0) + 1;
    this.uploadVersions[id] = version;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const next = { ...this.files() };
    delete next[id];
    this.files.set(next);
    this.fileErrors.update((errors) => ({ ...errors, [id]: '' }));
    if (!file) return;
    if (file.size > 1024 * 1024 || !/\.(pdf|doc|docx|jpg|jpeg|png)$/i.test(file.name)) {
      this.fileErrors.update((errors) => ({
        ...errors,
        [id]: 'Choose a PDF, Word document or image up to 1 MB.',
      }));
      input.value = '';
      return;
    }
    this.pendingUploads.update((n) => n + 1);
    try {
      const vacancy = this.vacancy() as RecruitmentVacancy;
      const uploaded = await uploadRecruitmentFile(
        publicRecruitment,
        '/public/application-uploads',
        file,
        vacancy,
        id,
      );
      if (this.uploadVersions[id] !== version) return;
      this.uploadTokens[uploaded.id] = uploaded.upload_token ?? '';
      this.files.update((files) => ({
        ...files,
        [id]: {
          id: uploaded.id,
          name: uploaded.name,
          type: uploaded.type,
          content: '',
          requirement: label,
          requirementId: id,
        },
      }));
    } catch (error) {
      this.fileErrors.update((errors) => ({
        ...errors,
        [id]:
          error instanceof Error
            ? error.message
            : 'Could not upload this document. Please choose it again.',
      }));
    } finally {
      this.pendingUploads.update((n) => n - 1);
    }
  }
  protected async submit(form: NgForm): Promise<void> {
    if (this.preview() || this.busy()) return;
    this.error.set('');
    const vacancy = this.vacancy();
    const missing = (vacancy.documents ?? []).filter((d) => d.required && !this.files()[d.id]);
    const missingAnswers = (vacancy.fields ?? []).some(
      (f) => f.required && !String(this.answers[f.id] ?? '').trim(),
    );
    if (
      form.invalid ||
      !this.consent ||
      missing.length ||
      missingAnswers ||
      !this.details.name.trim() ||
      !this.details.location.trim()
    ) {
      this.error.set(
        'Complete the required fields and upload each required document before submitting.',
      );
      return;
    }
    const company = this.company();
    if (!company) return;
    this.uploading.set(true);
    try {
      const vacancy = this.vacancy() as RecruitmentVacancy;
      await publicRecruitment(
        `/public/companies/${company.id}/vacancies/${vacancy.id}/applications`,
        {
          vacancy_id: vacancy.id,
          vacancy_version: vacancy.version,
          name: this.details.name.trim(),
          email: this.details.email.trim(),
          phone: this.details.phone.trim(),
          location: this.details.location.trim(),
          consent: this.consent,
          answers: (vacancy.fields ?? []).map((field) => ({
            field_id: field.id,
            value: String(this.answers[field.id] ?? '').trim(),
          })),
          file_ids: Object.values(this.files()).map((file) => file.id),
          upload_tokens: this.uploadTokens,
        },
        { 'Idempotency-Key': this.submissionKey },
      );
      this.sent.set(true);
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Your application could not be submitted.',
      );
    } finally {
      this.uploading.set(false);
    }
  }
}
