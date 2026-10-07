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
  readonly company = input<Company>();
  readonly preview = input(false);
  protected readonly store = inject(ManagementStore);
  protected readonly sent = signal(false);
  private readonly pendingUploads = signal(0);
  protected readonly busy = computed(() => this.pendingUploads() > 0);
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
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Could not read document'));
        reader.readAsDataURL(file);
      });
      if (this.uploadVersions[id] !== version) return;
      this.files.update((files) => ({
        ...files,
        [id]: {
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          content,
          requirement: label,
          requirementId: id,
        },
      }));
    } catch {
      this.fileErrors.update((errors) => ({
        ...errors,
        [id]: 'Could not read this document. Please choose it again.',
      }));
    } finally {
      this.pendingUploads.update((n) => n - 1);
    }
  }
  protected submit(form: NgForm): void {
    if (this.preview() || this.busy()) return;
    this.error.set('');
    const vacancy = this.vacancy();
    const missing = (vacancy.documents ?? []).filter((d) => d.required && !this.files()[d.id]);
    const missingAnswers = (vacancy.fields ?? []).some(
      (f) => f.required && !String(this.answers[f.id] ?? '').trim(),
    );
    if (
      form.invalid ||
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
    const error = this.store.submitApplication(company.id, vacancy.id, {
      id: crypto.randomUUID(),
      name: this.details.name.trim(),
      email: this.details.email.trim(),
      location: this.details.location.trim(),
      role: vacancy.title,
      vacancy: vacancy.title,
      vacancyId: vacancy.id,
      stage: 'Applied',
      start: '',
      notes: [],
      checks: Array(7).fill(false),
      onboarding: Array(8).fill(false),
      learning: [],
      progress: {},
      documents: Object.values(this.files()),
      application: {
        submitted: new Date().toISOString(),
        phone: this.details.phone.trim(),
        answers: (vacancy.fields ?? []).map((f) => ({
          fieldId: f.id,
          label: f.label,
          value: String(this.answers[f.id] ?? '').trim(),
        })),
      },
    });
    if (error) this.error.set(error);
    else this.sent.set(true);
  }
}
