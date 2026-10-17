import { StaffAvailability } from './staff-availability';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { COURSES, Person } from '../shared/management.store';
import { HrService } from './hr.service';
import { StaffTraining, checkState, today } from './hr.models';
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
  @Input() compact = false;
  @Output() busyChange = new EventEmitter<boolean>();
  protected readonly hr = inject(HrService);
  protected readonly courses = COURSES;
  protected readonly checkState = checkState;
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
    const now = today();
    const years =
      Number(now.slice(0, 4)) - Number(birth.slice(0, 4)) - (now.slice(5) < birth.slice(5) ? 1 : 0);
    return years >= 0 && Number.isFinite(years) ? String(years) : 'Not recorded';
  }
  protected toggleCourse(id: string, selected: boolean): void {
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
    return COURSES.find((c) => c.id === id)?.title ?? id;
  }
  protected async upload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.error.set('');
    this.busy.set(true);
    this.busyChange.emit(true);
    try {
      const doc = await this.hr.document(file, this.category);
      const previous = this.p.documents?.find((d) => d.id === this.replacementId);
      if (previous) {
        doc.replacesId = previous.id;
        doc.version = (previous.version ?? 1) + 1;
      }
      this.p.documents = [...(this.p.documents ?? []), doc];
      this.replacementId = '';
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
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
      this.p.hr!.personal.photo = (await this.hr.document(file, 'Photo')).content;
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Photo could not be read.');
    } finally {
      this.busy.set(false);
      this.busyChange.emit(false);
      input.value = '';
    }
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
