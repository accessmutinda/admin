import { Component, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { A11yModule } from '@angular/cdk/a11y';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { CvSelect } from '../../../../shared/ui/select';
import { AcademyService } from './academy.service';
import { AcademyCourseSteps } from './academy-course-steps';
import { AcademyCourse, AcademyLesson, AcademyModule } from './academy.models';
import { AcademyAdminNav, AcademyMessage } from './academy-shared';

@Component({
  host: { class: 'module-page academy-page' },
  selector: 'cv-academy-structure-editor',
  imports: [
    AcademyCourseSteps,
    FormsModule,
    RouterLink,
    A11yModule,
    DragDropModule,
    MatSelectModule,
    MatMenuModule,
    MatTooltipModule,
    CvSelect,
    AcademyAdminNav,
    AcademyMessage,
  ],
  templateUrl: './academy-structure-editor.html',
  styleUrls: ['./academy-forms.css', './academy.css', './academy-structure-editor.css'],
})
export class AcademyStructureEditor {
  protected readonly academy = inject(AcademyService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workspace = this.academy.store.companyId();
  protected course = structuredClone(
    this.academy.course(this.route.snapshot.paramMap.get('courseId') ?? '') ?? null,
  );
  protected readonly selected = signal('');
  protected readonly outlineCollapsed = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly editor = signal<'module' | 'lesson' | null>(null);
  protected editId = '';
  protected form = {
    title: '',
    moduleId: '',
    type: 'Reading' as NonNullable<AcademyLesson['type']>,
    minutes: 5,
    mandatory: true,
    content: '',
    prerequisiteIds: [] as string[],
  };
  protected readonly lessonTypes = [
    'Video',
    'Reading',
    'Policy acknowledgement',
    'Interactive check',
  ];
  private original = '';

  constructor() {
    if (this.course) {
      this.course.modules ??= [];
      for (const lesson of this.course.lessons) {
        let module =
          this.course.modules.find((m) => m.id === lesson.moduleId) ??
          this.course.modules.find((m) => m.title === (lesson.moduleTitle || 'Introduction'));
        if (!module) {
          module = { id: crypto.randomUUID(), title: lesson.moduleTitle || 'Introduction' };
          this.course.modules.push(module);
        }
        lesson.type ??= lesson.videoId ? 'Video' : 'Reading';
        lesson.moduleId = module.id;
        lesson.moduleTitle = module.title;
      }
      this.course.lessons = this.modules().flatMap((m) => this.lessons(m));
      this.course.policy = { ...this.academy.policyFor(this.course) };
      this.selected.set(this.modules()[0]?.id ?? 'assessment');
    }
    this.original = JSON.stringify(this.course);
  }
  protected unusedUploads() {
    return this.course?.pendingLessons ?? [];
  }
  protected unusedVideos() {
    return this.unusedUploads().filter((l) => !!l.videoId);
  }
  protected uploadName(item: AcademyLesson) {
    return (
      this.academy.state().assets.find((a) => a.id === (item.videoId || item.handoutIds[0]))
        ?.name ?? item.title
    );
  }
  protected placingUpload() {
    return this.unusedUploads().some((l) => l.id === this.editId);
  }
  protected addUpload(item: AcademyLesson) {
    this.openLesson(item);
  }
  protected deleteUpload(item: AcademyLesson) {
    if (!this.course) return;
    this.course.pendingLessons = this.unusedUploads().filter((l) => l.id !== item.id);
    this.error.set('');
    this.notice.set('Upload deleted from this course. Save Structure to retain the change.');
  }
  protected modules() {
    return this.course?.modules ?? [];
  }
  protected lessons(module: AcademyModule) {
    return this.course?.lessons.filter((l) => l.moduleId === module.id) ?? [];
  }
  protected minutes(module?: AcademyModule) {
    return (module ? this.lessons(module) : (this.course?.lessons ?? [])).reduce(
      (sum, l) => sum + l.minutes,
      0,
    );
  }
  protected totalMinutes() {
    return this.minutes() + (this.course?.assessmentMinutes ?? 0);
  }
  protected duration(minutes: number) {
    const seconds = Math.round(minutes * 60);
    return (
      Math.floor(seconds / 60)
        .toString()
        .padStart(2, '0') +
      ':' +
      (seconds % 60).toString().padStart(2, '0')
    );
  }
  protected questions() {
    return this.academy.editableQuestions().filter((q) => q.courseId === this.course?.id);
  }
  protected finalQuestions() {
    return this.questions().filter((q) => !q.groupId || q.groupId === 'final');
  }
  protected moduleGroups(module: AcademyModule) {
    return (
      this.course?.questionGroups?.filter(
        (g) =>
          (['Before module', 'After module', 'Within module'].includes(g.placement) &&
            g.moduleId === module.id) ||
          (g.placement === 'After lesson' && this.lessons(module).some((l) => l.id === g.lessonId)),
      ) ?? []
    );
  }
  protected priorModules(module: AcademyModule) {
    return this.modules().slice(0, this.modules().indexOf(module));
  }
  protected readiness() {
    const issues: string[] = [];
    if (!this.modules().length) issues.push('Add a module.');
    if (this.unusedVideos().length)
      issues.push('Add every unused video to a module or delete it before continuing.');
    for (const module of this.modules()) {
      if (!this.lessons(module).length) issues.push(`${module.title}: add a lesson.`);
      for (const lesson of this.lessons(module)) {
        if (lesson.type === 'Video' ? !lesson.videoId : !lesson.content.trim())
          issues.push(
            `${lesson.title}: add ${lesson.type === 'Video' ? 'a video' : 'lesson content'}.`,
          );
      }
    }
    if (!this.finalQuestions().some((q) => q.status === 'Published'))
      issues.push('Add and publish final assessment questions.');
    for (const group of this.course?.questionGroups ?? [])
      if (!this.questions().some((q) => q.groupId === group.id && q.status === 'Published'))
        issues.push(group.title + ': publish checkpoint questions.');
    const orderError = this.orderError(this.course?.lessons ?? [], this.modules());
    if (orderError) issues.push(orderError);
    return issues;
  }
  private orderError(lessons: AcademyLesson[], modules: AcademyModule[]): string {
    if (
      modules.some((m, i) =>
        m.prerequisiteModuleIds?.some((id) => !modules.slice(0, i).some((p) => p.id === id)),
      )
    )
      return 'Keep prerequisite modules before the modules that depend on them.';
    if (
      lessons.some((l, i) =>
        l.prerequisiteIds?.some((id) => !lessons.slice(0, i).some((p) => p.id === id)),
      )
    )
      return 'Keep prerequisite lessons before the lessons that depend on them.';
    return '';
  }
  protected openModule(module?: AcademyModule) {
    this.error.set('');
    this.editId = module?.id ?? '';
    this.form = {
      title: module?.title ?? '',
      moduleId: '',
      type: 'Reading',
      minutes: 5,
      mandatory: true,
      content: '',
      prerequisiteIds: [],
    };
    this.editor.set('module');
  }
  protected openLesson(lesson?: AcademyLesson) {
    if (!this.modules().length) {
      this.openModule();
      this.notice.set('Create a module before adding lessons.');
      return;
    }
    this.error.set('');
    this.editId = lesson?.id ?? '';
    this.form = {
      title: lesson?.title ?? '',
      moduleId:
        lesson?.moduleId ||
        (this.modules().some((m) => m.id === this.selected())
          ? this.selected()
          : this.modules()[0].id),
      type: lesson?.type ?? (lesson?.videoId ? 'Video' : 'Reading'),
      minutes: lesson?.minutes ?? 5,
      mandatory: lesson?.mandatory !== false,
      content: lesson?.content ?? '',
      prerequisiteIds: [...(lesson?.prerequisiteIds ?? [])],
    };
    this.editor.set('lesson');
  }
  protected closeEditor() {
    this.editor.set(null);
  }
  protected submitEditor() {
    if (!this.course) return;
    const title = this.form.title.trim();
    if (!title || title.length > 180) {
      this.error.set('Enter a title of 1–180 characters.');
      return;
    }
    if (this.editor() === 'module') {
      if (
        this.modules().some(
          (m) => m.id !== this.editId && m.title.toLowerCase() === title.toLowerCase(),
        )
      ) {
        this.error.set('Use a unique module title.');
        return;
      }
      let module = this.modules().find((m) => m.id === this.editId);
      if (module) {
        module.title = title;
        this.lessons(module).forEach((l) => (l.moduleTitle = title));
      } else {
        module = {
          id: crypto.randomUUID(),
          title,
          watchThreshold: 90,
          requireResourceAck: true,
          prerequisiteModuleIds: [],
        };
        this.course.modules!.push(module);
      }
      this.selected.set(module.id);
    } else {
      const module = this.modules().find((m) => m.id === this.form.moduleId);
      if (
        !module ||
        !Number.isFinite(this.form.minutes) ||
        this.form.minutes < 1 ||
        this.form.minutes > 480
      ) {
        this.error.set('Choose a module and a lesson duration of 1–480 minutes.');
        return;
      }
      const pending = this.unusedUploads().find((l) => l.id === this.editId);
      if (pending && !this.form.content.trim()) {
        this.error.set('Add a brief description before adding this upload to a module.');
        return;
      }
      const existing = this.course.lessons.find((l) => l.id === this.editId) ?? pending;
      const lesson: AcademyLesson = {
        ...(existing ?? {
          id: crypto.randomUUID(),
          transcript: '',
          videoId: '',
          thumbnailId: '',
          captionId: '',
          handoutIds: [],
          prerequisiteIds: [],
          watchThreshold: module.watchThreshold ?? 90,
          requireResourceAck: module.requireResourceAck ?? true,
        }),
        title,
        moduleId: module.id,
        moduleTitle: module.title,
        type: pending?.videoId ? 'Video' : this.form.type,
        minutes: this.form.minutes,
        mandatory: this.form.mandatory,
        content: this.form.content,
        prerequisiteIds: [...this.form.prerequisiteIds],
      };
      const groups = this.modules().map((m) => ({
        module: m,
        lessons: this.lessons(m).filter((l) => l.id !== lesson.id),
      }));
      const destination = groups.find((g) => g.module.id === module.id)!;
      const oldIndex =
        existing?.moduleId === module.id
          ? this.lessons(module).findIndex((l) => l.id === existing.id)
          : -1;
      destination.lessons.splice(oldIndex < 0 ? destination.lessons.length : oldIndex, 0, lesson);
      const next = groups.flatMap((g) => g.lessons);
      const error = this.orderError(next, this.modules());
      if (error) {
        this.error.set(error);
        return;
      }
      this.course.lessons = next;
      if (pending)
        this.course.pendingLessons = this.unusedUploads().filter((l) => l.id !== pending.id);
      this.selected.set(module.id);
    }
    this.error.set('');
    this.notice.set('Structure updated. Save Structure to retain your changes.');
    this.closeEditor();
  }
  protected moveModule(module: AcademyModule, direction: number) {
    const index = this.modules().indexOf(module),
      target = index + direction;
    if (!this.course || target < 0 || target >= this.modules().length) return;
    const modules = [...this.modules()];
    [modules[index], modules[target]] = [modules[target], modules[index]];
    const lessons = modules.flatMap((m) => this.lessons(m));
    const error = this.orderError(lessons, modules);
    if (error) {
      this.error.set(error);
      return;
    }
    this.course.modules = modules;
    this.course.lessons = lessons;
    this.error.set('');
  }
  protected removeModule(module: AcademyModule) {
    if (!this.course) return;
    if (this.moduleGroups(module).length) {
      this.error.set('Move this module’s question groups before removing the module.');
      return;
    }
    if (this.lessons(module).length) {
      this.error.set('Move or remove this module’s lessons before removing the module.');
      return;
    }
    if (this.modules().some((m) => m.prerequisiteModuleIds?.includes(module.id))) {
      this.error.set('Remove this module from prerequisites before deleting it.');
      return;
    }
    this.course.modules = this.modules().filter((m) => m.id !== module.id);
    this.selected.set(this.modules()[0]?.id ?? 'assessment');
    this.error.set('');
  }
  protected removeLesson(lesson: AcademyLesson) {
    if (!this.course) return;
    if (
      this.course.questionGroups?.some((g) => g.lessonId === lesson.id) ||
      this.course.lessons.some((l) => l.prerequisiteIds?.includes(lesson.id)) ||
      this.questions().some((q) => q.lessonId === lesson.id)
    ) {
      this.error.set(
        'Update this lesson’s prerequisites and assessment question links before removing it.',
      );
      return;
    }
    if (lesson.videoId || lesson.handoutIds.length) {
      (this.course.pendingLessons ??= []).push({
        ...structuredClone(lesson),
        moduleId: '',
        moduleTitle: '',
        prerequisiteIds: [],
      });
      this.notice.set(
        'The lesson’s uploads are back in the unused list. Place them in a module or delete them.',
      );
    }
    this.course.lessons = this.course.lessons.filter((l) => l.id !== lesson.id);
    this.error.set('');
  }
  private placeLesson(id: string, moduleId: string, index: number) {
    const lesson = this.course?.lessons.find((l) => l.id === id),
      module = this.modules().find((m) => m.id === moduleId);
    if (!this.course || !lesson || !module) return;
    const moved = { ...lesson, moduleId, moduleTitle: module.title };
    const next = this.modules().flatMap((m) => {
      const rows = this.lessons(m).filter((l) => l.id !== id);
      if (m.id === moduleId) rows.splice(index, 0, moved);
      return rows;
    });
    const error = this.orderError(next, this.modules());
    if (error) {
      this.error.set(error);
      return;
    }
    this.course.lessons = next;
    this.error.set('');
    this.selected.set(moduleId);
  }
  protected drop(event: CdkDragDrop<string, string, string>) {
    this.placeLesson(event.item.data, event.container.data, event.currentIndex);
  }
  protected moveLesson(lesson: AcademyLesson, direction: number) {
    const module = this.modules().find((m) => m.id === lesson.moduleId)!;
    const index = this.lessons(module).indexOf(lesson),
      next = index + direction;
    if (next >= 0 && next < this.lessons(module).length)
      this.placeLesson(lesson.id, module.id, next);
  }
  protected watchThreshold(module: AcademyModule) {
    const values = new Set(this.lessons(module).map((l) => l.watchThreshold ?? 90));
    return values.size > 1
      ? -1
      : (this.lessons(module)[0]?.watchThreshold ?? module.watchThreshold ?? 90);
  }
  protected watchOptions(module: AcademyModule) {
    return [...new Set([0, 50, 75, 80, 85, 90, 95, 100, this.watchThreshold(module)])]
      .filter((value) => value >= 0)
      .sort((a, b) => a - b);
  }
  protected setWatch(module: AcademyModule, value: number) {
    module.watchThreshold = value;
    this.lessons(module).forEach((l) => (l.watchThreshold = value));
  }
  protected resourceAck(module: AcademyModule) {
    return this.lessons(module).length
      ? this.lessons(module).every((l) => l.requireResourceAck)
      : (module.requireResourceAck ?? true);
  }
  protected setResourceAck(module: AcademyModule, value: boolean) {
    module.requireResourceAck = value;
    this.lessons(module).forEach((l) => (l.requireResourceAck = value));
  }
  protected lessonReady(lesson: AcademyLesson) {
    return lesson.type === 'Video' ? !!lesson.videoId : !!lesson.content.trim();
  }
  protected mediaSaved(lesson: AcademyLesson) {
    return !!this.academy.course(this.course?.id ?? '')?.lessons.some((l) => l.id === lesson.id);
  }
  protected save() {
    if (!this.course) return false;
    this.notice.set('');
    const error = this.academy.saveCourse(
      { ...this.course, status: 'Draft' },
      this.workspace,
      JSON.parse(this.original)?.updatedAt ?? '',
    );
    this.error.set(error ?? '');
    if (error) return false;
    this.course = structuredClone(this.academy.course(this.course.id)!);
    this.original = JSON.stringify(this.course);
    this.notice.set(
      'Course structure saved as a draft. Existing assignments retain their original structure.',
    );
    return true;
  }
  protected preview() {
    if (this.save() && this.course)
      void this.router.navigate(['/staff-portal/training/courses', this.course.id], {
        queryParams: { preview: '1' },
      });
  }
  protected back() {
    if (this.save() && this.course)
      void this.router.navigate(['/manage/learning/content', this.course.id]);
  }
  protected continue() {
    if (this.unusedVideos().length) {
      this.error.set(
        'Add every unused video to a module or delete it from this course before continuing.',
      );
      return;
    }
    if (this.save() && this.course)
      void this.router.navigate(['/manage/learning/questions'], {
        queryParams: { course: this.course.id },
      });
  }
  canLeave() {
    return (
      JSON.stringify(this.course) === this.original ||
      window.confirm('Discard unsaved module and lesson changes?')
    );
  }
  @HostListener('window:keydown.escape') protected escape() {
    this.closeEditor();
  }
  @HostListener('window:beforeunload', ['$event']) protected unload(event: BeforeUnloadEvent) {
    if (JSON.stringify(this.course) !== this.original) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
