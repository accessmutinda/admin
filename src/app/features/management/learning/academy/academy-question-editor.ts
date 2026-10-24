import { Component, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../../shared/ui/select';
import { AcademyService } from './academy.service';
import { AcademyQuestion } from './academy.models';
import { AcademyAdminNav, AcademyMessage } from './academy-shared';
import { AcademyImage } from './academy-image';
@Component({
  selector: 'cv-academy-question-editor',
  imports: [
    FormsModule,
    RouterLink,
    MatSelectModule,
    CvSelect,
    AcademyAdminNav,
    AcademyMessage,
    AcademyImage,
  ],
  templateUrl: './academy-question-editor.html',
  styleUrls: ['./academy-forms.css', './academy.css', './academy-workflows.css'],
})
export class AcademyQuestionEditor {
  protected readonly academy = inject(AcademyService);
  private readonly route = inject(ActivatedRoute);
  private readonly workspace = this.academy.store.companyId();
  private readonly id = this.route.snapshot.paramMap.get('questionId');
  private readonly source = this.academy.editableQuestions().find((q) => q.id === this.id);
  protected readonly unavailable = !!this.id && !this.source;
  protected draft: AcademyQuestion = structuredClone(
    this.source ?? {
      id: crypto.randomUUID(),
      courseId:
        this.route.snapshot.queryParamMap.get('course') ??
        this.academy.editableCourses()[0]?.id ??
        '',
      lessonId:
        this.academy.course(
          this.route.snapshot.queryParamMap.get('course') ??
            this.academy.editableCourses()[0]?.id ??
            '',
        )?.lessons[0]?.id ?? '',
      type: 'Single choice',
      text: '',
      scenario: '',
      category: 'General',
      difficulty: 'Medium',
      weight: 1,
      required: true,
      shuffle: true,
      imageId: '',
      options: ['A', 'B', 'C', 'D'].map((id) => ({ id: crypto.randomUUID(), text: '' })),
      correctIds: [],
      explanation: '',
      correctFeedback: '',
      incorrectFeedback: '',
      tags: [],
      status: 'Draft',
      version: 0,
      updatedAt: '',
    },
  );
  private original = JSON.stringify(this.draft);
  protected tags = this.draft.tags.join(', ');
  protected readonly mobilePreview = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected lessons() {
    return this.academy.course(this.draft.courseId)?.lessons ?? [];
  }
  protected changeCourse(): void {
    this.draft.lessonId = this.lessons()[0]?.id ?? '';
  }
  protected changeType(): void {
    if (this.draft.type === 'True / false') {
      this.draft.options = [
        { id: crypto.randomUUID(), text: 'True' },
        { id: crypto.randomUUID(), text: 'False' },
      ];
      this.draft.correctIds = [];
    } else if (this.draft.type === 'Single choice')
      this.draft.correctIds = this.draft.correctIds.slice(0, 1);
  }
  protected toggleCorrect(id: string): void {
    this.draft.correctIds =
      this.draft.type !== 'Multiple choice'
        ? [id]
        : this.draft.correctIds.includes(id)
          ? this.draft.correctIds.filter((v) => v !== id)
          : [...this.draft.correctIds, id];
  }
  protected addOption(): void {
    if (this.draft.options.length < 8)
      this.draft.options.push({ id: crypto.randomUUID(), text: '' });
  }
  protected removeOption(id: string): void {
    if (this.draft.options.length <= 2) return;
    this.draft.options = this.draft.options.filter((o) => o.id !== id);
    this.draft.correctIds = this.draft.correctIds.filter((v) => v !== id);
  }
  protected save(publish: boolean): void {
    this.draft.tags = this.tags
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    this.draft.status = publish ? 'Published' : 'Draft';
    const error = this.academy.saveQuestion(
      this.draft,
      this.workspace,
      JSON.parse(this.original).updatedAt,
    );
    this.error.set(error ?? '');
    if (!error) {
      this.draft = structuredClone(
        this.academy.editableQuestions().find((q) => q.id === this.draft.id)!,
      );
      this.original = JSON.stringify(this.draft);
      this.tags = this.draft.tags.join(', ');
      this.notice.set(
        publish
          ? 'Question published for new assessment attempts. Existing attempts retain their question snapshots.'
          : 'Draft saved. A previously published version remains live.',
      );
    }
  }
  protected history() {
    return this.academy
      .state()
      .events.filter(
        (e) => e.action === 'Question saved' && e.detail.startsWith(this.draft.id + ' ·'),
      )
      .slice(0, 8);
  }
  canLeave(): boolean {
    return (
      (JSON.stringify(this.draft) === this.original && this.tags === this.draft.tags.join(', ')) ||
      window.confirm('Discard unsaved question changes?')
    );
  }
  @HostListener('window:beforeunload', ['$event']) protected unload(event: BeforeUnloadEvent) {
    if (JSON.stringify(this.draft) !== this.original || this.tags !== this.draft.tags.join(', ')) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
