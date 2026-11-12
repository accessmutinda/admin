import type { WorkforceLeave } from './availability-leave.generated';
import { OnboardingStaffApi } from './onboarding-staff-api.service';
import { RecruitmentApi } from '../recruitment/recruitment-api.service';
import { StaffAvailability } from './staff-availability';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { Component, DestroyRef, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { COURSES, Person, StaffDocument } from '../shared/management.store';
import { HrService } from './hr.service';
import { StaffTraining, StaffCheck, checkState, today } from './hr.models';
@Component({
  selector: 'cv-staff-fields',
  host: { '[class.hr-compact-editor]': 'compact' },
  imports: [StaffAvailability, MatSelectModule, CvSelect, FormsModule],
  templateUrl: './staff-fields.html',
  styleUrls: ['./hr.css', './hr-forms.css', './staff-editor.css'],
})
export class StaffFields {
  @Input({ required: true }) p!: Person;
  @Input() step = 0;
  @Input() staffId = '';
  @Input() approvedLeaves: WorkforceLeave[] = [];
  @Input() localDate = '';
  protected readonly staffApi = inject(OnboardingStaffApi);
  @Input() applicationId = '';
  private readonly recruitmentApi = inject(RecruitmentApi);
  @Input() compact = false;
  @Output() savedVersion = new EventEmitter<string>();
  @Output() busyChange = new EventEmitter<boolean>();
  protected readonly hr = inject(HrService);
  @Input() courses = COURSES;
  protected readonly checkState = (check: StaffCheck) =>
    checkState(check, this.staffId ? this.staffApi.localDate() : today());
  private readonly photoUrls: string[] = [];
  constructor() {
    inject(DestroyRef).onDestroy(() => this.photoUrls.forEach((url) => URL.revokeObjectURL(url)));
  }
  protected replacementId = '';
  protected category = 'Employment & HR';
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  protected recruitment() {
    return (this.p.hr!.employment.recruitment ??= {});
  }
  protected languages(): string[] {
    return (this.p.hr!.personal.languages || '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  protected age(): string {
    const birth = this.p.hr!.personal.birthDate;
    if (!birth) return 'Not recorded';
    const now = this.staffId ? this.staffApi.localDate() : today();
    const years =
      Number(now.slice(0, 4)) - Number(birth.slice(0, 4)) - (now.slice(5) < birth.slice(5) ? 1 : 0);
    return years >= 0 && Number.isFinite(years) ? String(years) : 'Not recorded';
  }
  protected academyCourse(id: string): boolean {
    return this.p.hr?.training.some((t) => t.courseId === id && !!t.sourceCompletionId) ?? false;
  }
  protected toggleCourse(id: string, selected: boolean): void {
    if (this.academyCourse(id)) return;
    this.p.hr!.training = selected
      ? [
          ...this.p.hr!.training,
          {
            courseId: id,
            completed: '',
            expiry: '',
            assessor: '',
            competency: 'Not assessed',
            certificateId: '',
          } as StaffTraining,
        ]
      : this.p.hr!.training.filter((t) => t.courseId !== id);
    this.p.learning = this.p.hr!.training.map((t) => t.courseId);
  }
  protected title(id: string): string {
    return this.courses.find((c) => c.id === id)?.title ?? id;
  }
  protected async upload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.error.set('');
    this.busy.set(true);
    this.busyChange.emit(true);
    try {
      const doc = this.staffId
        ? await this.staffApi.upload(file, this.category, this.replacementId)
        : this.applicationId
          ? await this.recruitmentDocument(file, this.category)
          : await this.hr.document(file, this.category);
      const previous = this.p.documents?.find((d) => d.id === this.replacementId);
      if (previous && !this.staffId) {
        doc.replacesId = previous.id;
        doc.version = (previous.version ?? 1) + 1;
      }
      this.p.documents = [...(this.p.documents ?? []), doc];
      this.replacementId = '';
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      if (this.staffId && this.staffApi.lastUploadEtag === this.staffApi.value()?.etag)
        this.savedVersion.emit(this.staffApi.lastUploadEtag);
      this.busy.set(false);
      this.busyChange.emit(false);
      input.value = '';
    }
  }
  protected async photo(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      this.error.set('Choose a JPG or PNG photograph.');
      return;
    }
    this.busy.set(true);
    this.busyChange.emit(true);
    try {
      if (this.staffId) {
        const document = await this.staffApi.upload(file, 'Photo');
        this.p.hr!.personal.photoFileId = document.id;
        this.p.documents = [...(this.p.documents ?? []), document];
        this.p.hr!.personal.photo = URL.createObjectURL(file);
        this.photoUrls.push(this.p.hr!.personal.photo);
      } else if (this.applicationId) {
        const document = await this.recruitmentDocument(file, 'Photo');
        this.p.documents = [...(this.p.documents ?? []), document];
        this.p.hr!.personal.photo = URL.createObjectURL(file);
      } else this.p.hr!.personal.photo = (await this.hr.document(file, 'Photo')).content;
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Photo could not be read.');
    } finally {
      if (this.staffId && this.staffApi.lastUploadEtag === this.staffApi.value()?.etag)
        this.savedVersion.emit(this.staffApi.lastUploadEtag);
      this.busy.set(false);
      this.busyChange.emit(false);
      input.value = '';
    }
  }
  private async recruitmentDocument(file: File, category: string): Promise<StaffDocument> {
    const application = this.recruitmentApi.record();
    const vacancy = this.recruitmentApi
      .vacancies()
      .find((row) => row.id === application?.vacancyId);
    if (!vacancy || application?.id !== this.applicationId)
      throw Error('Reload the application before uploading.');
    const document = await this.recruitmentApi.upload(file, vacancy, undefined, this.applicationId);
    return {
      id: document.id,
      name: document.name,
      type: document.type,
      content: '',
      category,
      version: document.version,
    };
  }
  protected addReference(): void {
    this.p.hr!.references.push({
      id: crypto.randomUUID(),
      name: '',
      organisation: '',
      email: '',
      status: 'Requested',
    });
  }
}
