import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { QualityService } from './quality.service';
import { Assessment, QualityEvidence, templateFor, ukTimestamp } from './quality.models';
import { ToastService } from '../../../shared/ui/toast.service';
import { AccessRequired } from '../shared/access-required';

@Component({
  selector: 'cv-assessment-editor',
  imports: [FormsModule, DatePipe, RouterLink, MatSelectModule, CvSelect, AccessRequired],
  templateUrl: './assessment-editor.html',
  styleUrls: ['./quality.css', './assessment-editor.css'],
  host: { '(window:beforeunload)': 'beforeUnload($event)' },
})
export class AssessmentEditor {
  protected readonly service = inject(QualityService);
  protected timestamp = ukTimestamp;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly id = this.route.snapshot.paramMap.get('id');
  protected readonly templateId =
    this.route.snapshot.paramMap.get('type') ??
    this.service.data().assessments.find((a) => a.id === this.id)?.templateId ??
    '';
  protected readonly template = templateFor(this.templateId);
  protected readonly found =
    !!this.template && (!this.id || this.service.data().assessments.some((a) => a.id === this.id));
  protected record: Assessment = structuredClone(
    this.service.data().assessments.find((a) => a.id === this.id) ??
      this.service.newAssessment(this.templateId),
  );
  private baseline = JSON.stringify(this.record);
  protected readonly step = signal(
    ['Submitted', 'Signed off'].includes(this.record.status) ? 4 : 0,
  );
  protected readonly steps = ['Context', 'Assessment', 'Findings', 'Evidence', 'Review'];
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  protected signatureName = '';
  protected declaration = false;
  protected reopenReason = '';
  protected readonly current = computed(() =>
    this.service.data().assessments.find((a) => a.id === this.record.id),
  );
  protected canEdit(): boolean {
    return (
      ['Draft', 'Scheduled'].includes(this.record.status) &&
      this.service.can(this.record.revision ? 'edit' : 'create')
    );
  }
  isDirty(): boolean {
    return this.canEdit() && (JSON.stringify(this.record) !== this.baseline || this.busy());
  }
  protected beforeUnload(event: BeforeUnloadEvent): void {
    if (this.isDirty()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
  protected subjectName(): string {
    return (
      this.service.subjects(this.templateId).find((s) => s.id === this.record.subjectId)?.name ??
      (this.record.subjectName || 'Not selected')
    );
  }
  protected assessorName(): string {
    return (
      this.assessors().find((s) => s.id === this.record.assessorId)?.name ??
      (this.record.assessorName || 'Not assigned')
    );
  }
  protected subjectLabel(): string {
    return this.template?.subject === 'staff'
      ? 'Care worker'
      : this.template?.subject === 'client'
        ? 'Service user'
        : 'Service';
  }
  protected assessors() {
    const user = this.service.auth.currentUser();
    return user && !this.service.assessors().some((m) => m.id === user.id)
      ? [{ id: user.id, name: user.name }, ...this.service.assessors()]
      : this.service.assessors();
  }
  protected next(): void {
    this.error.set('');
    if (
      this.step() === 0 &&
      (!this.record.subjectId ||
        !this.record.assessorId ||
        !this.record.date ||
        !this.record.context.trim())
    ) {
      this.error.set('Choose a person or service, assessor, date and assessment context.');
      return;
    }
    if (
      this.step() === 1 &&
      this.template?.fields.some((f) => !this.record.answers[f.id]?.trim())
    ) {
      this.error.set(
        'Answer every assessment question before continuing. You can save an unfinished draft.',
      );
      return;
    }
    if (this.step() === 2 && (!this.record.outcome.trim() || !this.record.recommendations.trim())) {
      this.error.set('Record the outcome and follow-up before continuing.');
      return;
    }
    this.step.update((n) => Math.min(4, n + 1));
  }
  protected save(mode: 'draft' | 'schedule' | 'submit'): void {
    if (this.busy()) return;
    const error = this.service.saveAssessment(this.record, mode);
    this.error.set(error ?? '');
    if (error) return;
    this.record = structuredClone(
      this.service.data().assessments.find((a) => a.id === this.record.id)!,
    );
    this.baseline = JSON.stringify(this.record);
    this.toast.success(
      mode === 'submit'
        ? 'Assessment submitted for review.'
        : mode === 'schedule'
          ? 'Review scheduled.'
          : 'Draft saved.',
    );
    if (mode === 'submit') this.step.set(4);
    if (!this.id)
      this.router.navigate(['/manage/quality/assessments', this.record.id], { replaceUrl: true });
  }
  protected discard(): void {
    this.record = JSON.parse(this.baseline);
    this.error.set('');
    if (!this.record.revision)
      this.router.navigate(['/manage/quality'], { queryParams: { tab: 'Assessment library' } });
  }
  protected reload(): void {
    const a = this.current();
    if (a) {
      this.record = structuredClone(a);
      this.baseline = JSON.stringify(this.record);
      this.error.set('');
      this.signatureName = '';
      this.declaration = false;
    }
  }
  protected signOff(): void {
    const error = this.service.signOff(
      this.record.id,
      this.record.revision,
      this.signatureName,
      this.declaration,
    );
    this.error.set(error ?? '');
    if (!error) {
      this.reload();
      this.toast.success('Assessment signed off.');
    }
  }
  protected reopen(): void {
    const error = this.service.reopen(this.record.id, this.record.revision, this.reopenReason);
    this.error.set(error ?? '');
    if (!error) {
      this.reload();
      this.step.set(0);
      this.reopenReason = '';
      this.toast.success('Assessment reopened as a draft.');
    }
  }
  protected async attach(event: Event): Promise<void> {
    if (!this.canEdit()) return;
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (
      this.record.evidence.length + files.length > 5 ||
      files.some(
        (f) => !['image/jpeg', 'image/png', 'application/pdf'].includes(f.type) || f.size > 500_000,
      )
    ) {
      this.error.set('Choose up to five JPG, PNG or PDF files, each no larger than 500 KB.');
      return;
    }
    this.error.set('');
    this.busy.set(true);
    try {
      const evidence = await Promise.all(
        files.map(
          (file) =>
            new Promise<QualityEvidence>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () =>
                resolve({
                  id: crypto.randomUUID(),
                  name: file.name,
                  type: file.type,
                  size: file.size,
                  content: String(reader.result),
                  caption: '',
                });
              reader.onerror = () => reject(new Error('Could not read the selected file.'));
              reader.readAsDataURL(file);
            }),
        ),
      );
      this.record.evidence.push(...evidence);
    } catch {
      this.error.set('Could not read the selected file. Choose it again.');
    } finally {
      this.busy.set(false);
    }
  }
  protected removeEvidence(id: string): void {
    this.record.evidence = this.record.evidence.filter((e) => e.id !== id);
  }
  protected downloadEvidence(e: QualityEvidence): void {
    if (!this.service.can('export')) return;
    const link = document.createElement('a');
    link.href = e.content;
    link.download = e.name;
    link.click();
  }
  protected exportAssessment(): void {
    if (!this.service.can('export') || !this.current()) return;
    const a = this.current()!;
    const report = {
      company: this.service.store.company()?.name,
      template: this.template?.title,
      ...a,
      evidence: a.evidence.map(({ content, ...e }) => e),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'assessment-' + a.id + '.json';
    link.click();
    URL.revokeObjectURL(url);
  }
}
