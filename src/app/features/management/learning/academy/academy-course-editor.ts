import { Component, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../../shared/ui/select';
import { AcademyService } from './academy.service';
import { AcademyCourse, AcademyLesson } from './academy.models';
import { AcademyAdminNav, AcademyMessage } from './academy-shared';
import { AcademyImage } from './academy-image';
@Component({
  selector: 'cv-academy-course-editor',
  imports: [
    FormsModule,
    RouterLink,
    MatSelectModule,
    CvSelect,
    AcademyAdminNav,
    AcademyMessage,
    AcademyImage,
  ],
  templateUrl: './academy-course-editor.html',
  styleUrls: ['./academy-forms.css', './academy.css', './academy-workflows.css'],
})
export class AcademyCourseEditor {
  protected readonly academy = inject(AcademyService);
  private readonly route = inject(ActivatedRoute);
  private readonly workspace = this.academy.store.companyId();
  private readonly id = this.route.snapshot.paramMap.get('courseId');
  protected readonly unavailable = !!this.id && !this.academy.course(this.id);
  protected draft: AcademyCourse = structuredClone(
    this.academy.course(this.id ?? '') ?? {
      id: crypto.randomUUID(),
      title: '',
      description: '',
      category: 'Mandatory',
      mandatory: true,
      cpdHours: 1,
      passMark: null,
      validityMonths: null,
      status: 'Draft',
      sample: false,
      thumbnailId: '',
      lessons: [],
      version: 0,
      updatedAt: '',
    },
  );
  private original = JSON.stringify(this.draft);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected save(publish: boolean): void {
    this.draft.status = publish
      ? 'Published'
      : this.draft.status === 'Archived'
        ? 'Archived'
        : 'Draft';
    const error = this.academy.saveCourse(
      this.draft,
      this.workspace,
      JSON.parse(this.original).updatedAt,
    );
    this.error.set(error ?? '');
    if (!error) {
      this.draft = structuredClone(this.academy.course(this.draft.id)!);
      this.original = JSON.stringify(this.draft);
      this.notice.set('Course saved. Published content is available to assigned learners.');
    }
  }
  protected addLesson(): void {
    this.draft.lessons.push({
      id: crypto.randomUUID(),
      title: '',
      minutes: 10,
      content: '',
      transcript: '',
      videoId: '',
      thumbnailId: '',
      captionId: '',
      handoutIds: [],
    });
  }
  protected move(index: number, direction: number): void {
    const target = index + direction;
    if (target < 0 || target >= this.draft.lessons.length) return;
    const list = this.draft.lessons;
    [list[index], list[target]] = [list[target], list[index]];
  }
  protected remove(lesson: AcademyLesson): void {
    if (window.confirm('Remove this lesson from the course draft?'))
      this.draft.lessons = this.draft.lessons.filter((l) => l.id !== lesson.id);
  }
  protected lessonSaved(id: string): boolean {
    return !!this.academy.course(this.draft.id)?.lessons.some((l) => l.id === id);
  }
  protected saved(): boolean {
    return !!this.academy.course(this.draft.id);
  }
  canLeave(): boolean {
    return (
      JSON.stringify(this.draft) === this.original ||
      window.confirm('Discard unsaved course changes?')
    );
  }
  @HostListener('window:beforeunload', ['$event']) protected unload(event: BeforeUnloadEvent) {
    if (JSON.stringify(this.draft) !== this.original) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
