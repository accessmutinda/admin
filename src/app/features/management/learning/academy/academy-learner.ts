import {
  Component,
  DestroyRef,
  HostListener,
  NgZone,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { addDays, londonDate } from '../../rota/rota.models';
import { AcademyDate } from './academy-date';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../../shared/ui/select';
import { AcademyService } from './academy.service';
import { AcademyAssets } from './academy-assets.service';
import { AcademyCertificate, AcademyQuestionGroup } from './academy.models';
import { AcademyImage } from './academy-image';
import { AcademyCertificateView } from './academy-certificate';
import { AcademyMessage } from './academy-shared';
import { downloadAcademyCertificate } from './academy-pdf';

@Component({
  host: {
    class: 'module-page academy-page',
    '[attr.inert]': 'academy.resultsApi.saving() ? "" : null',
    '[attr.aria-busy]': 'academy.resultsApi.saving()',
  },
  selector: 'cv-academy-learner',
  imports: [
    AcademyDate,
    NgTemplateOutlet,
    FormsModule,
    RouterLink,
    MatSelectModule,
    CvSelect,
    AcademyImage,
    AcademyCertificateView,
    AcademyMessage,
  ],
  templateUrl: './academy-learner.html',
  styleUrls: [
    './academy-forms.css',
    './academy.css',
    './academy-workflows.css',
    './academy-portal.css',
    './academy-lesson-view.css',
  ],
})
export class AcademyLearner {
  protected readonly academy = inject(AcademyService);
  protected readonly files = inject(AcademyAssets);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly query = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  private readonly data = toSignal(this.route.data, { initialValue: this.route.snapshot.data });
  protected readonly view = computed(() => this.data()['view'] as string);
  protected readonly person = computed(() => {
    const selected = this.query().get('person');
    return this.academy.canManage() && selected
      ? this.academy.resultsApi.people().find((p) => p.id === selected)
      : (this.academy.me() ??
          (this.academy.canManage() ? this.academy.resultsApi.people()[0] : undefined));
  });
  protected readonly preview = computed(
    () =>
      !!this.person() &&
      (!this.academy.owns(this.person()!.id) ||
        (this.academy.canManage() && this.query().get('preview') === '1')),
  );
  protected readonly assignments = computed(() =>
    this.academy.assignments().filter((a) => a.personId === this.person()?.id && !a.archived),
  );
  protected readonly course = computed(() => {
    const id = this.params().get('courseId') ?? '';
    if (this.query().get('preview') === '1' && this.academy.canManage())
      return this.academy.course(id);
    const assignment = this.assignments().find((a) => a.courseId === id);
    return assignment ? this.academy.assignedCourse(assignment) : this.academy.course(id);
  });
  protected readonly assignment = computed(() =>
    this.assignments().find((a) => a.courseId === this.course()?.id),
  );
  protected readonly lesson = computed(() => {
    const course = this.course();
    const index = course?.lessons.findIndex((l) => l.id === this.params().get('lessonId')) ?? -1;
    if (!course || index < 0) return undefined;
    if (this.preview()) return course.lessons[index];
    const assignment = this.assignment();
    if (!assignment || this.academy.lessonBlock(assignment, course.lessons[index].id))
      return undefined;
    return course.lessons[index];
  });
  protected readonly attempts = computed(() =>
    this.academy
      .state()
      .attempts.filter((a) => a.personId === this.person()?.id)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
  );
  protected readonly certificates = computed(() =>
    this.academy
      .state()
      .certificates.filter((c) => c.personId === this.person()?.id)
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)),
  );
  protected readonly certificate = computed(() =>
    this.academy.certificate(this.params().get('certificateId') ?? ''),
  );
  protected readonly notices = computed(() =>
    this.academy
      .state()
      .notices.filter((n) => n.personId === this.person()?.id)
      .slice(0, 100),
  );
  protected search = '';
  protected category = 'All';
  protected tab = 'Lesson details';
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly videoUrl = signal('');
  protected readonly captionUrl = signal('');
  protected note = '';
  protected readonly notePending = signal(false);
  private noteKey = '';
  private noteWorkspace = '';
  private noteAssignment = '';
  private noteLesson = '';
  private readonly mediaKey = computed(() =>
    [this.lesson()?.videoId ?? '', this.lesson()?.captionId ?? ''].join('|'),
  );
  private readonly clock = signal(Date.now());
  constructor() {
    const timer = inject(NgZone).runOutsideAngular(() =>
      setInterval(() => this.clock.set(Date.now()), 30000),
    );
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
    effect((cleanup) => {
      const key = this.mediaKey();
      let disposed = false;
      const urls: string[] = [];
      this.videoUrl.set('');
      this.captionUrl.set('');
      const [video, captions] = key.split('|');
      for (const [id, target] of [
        [video, this.videoUrl],
        [captions, this.captionUrl],
      ] as const)
        if (id)
          this.files
            .url(id)
            .then((url) => {
              urls.push(url);
              if (disposed) URL.revokeObjectURL(url);
              else target.set(url);
            })
            .catch((e) => {
              if (!disposed) this.error.set((e as Error).message);
            });
      cleanup(() => {
        disposed = true;
        urls.forEach((url) => URL.revokeObjectURL(url));
      });
    });
    effect(() => {
      const assignment = this.assignment();
      const lesson = this.lesson();
      const key =
        assignment && lesson && !this.preview()
          ? 'cv_academy_note:' +
            JSON.stringify([
              this.academy.auth.currentUser()?.id,
              this.academy.store.companyId(),
              assignment.id,
              lesson.id,
            ])
          : '';
      if (key === this.noteKey) return;
      this.noteKey = key;
      this.noteWorkspace = this.academy.store.companyId();
      this.noteAssignment = assignment?.id ?? '';
      this.noteLesson = lesson?.id ?? '';
      this.note = this.preview() ? '' : (assignment?.notes[lesson?.id ?? ''] ?? '');
      this.notePending.set(false);
    });
  }
  protected context() {
    return this.academy.canManage() && this.person()
      ? {
          person: this.person()!.id,
          ...(this.query().get('preview') === '1' ? { preview: '1' } : {}),
        }
      : {};
  }
  protected changePerson(id: string) {
    if (!this.canLeave()) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { person: id },
      queryParamsHandling: 'merge',
    });
  }
  protected courses() {
    return this.academy
      .state()
      .courses.map((c) => {
        const a = this.assignments().find((a) => a.courseId === c.id);
        return a ? (this.academy.assignedCourse(a) ?? c) : c;
      })
      .filter(
        (c) =>
          c.status === 'Published' &&
          this.academy.canBrowseCourse(c) &&
          `${c.title} ${c.description}`.toLowerCase().includes(this.search.toLowerCase()) &&
          (this.category === 'All' || c.category === this.category),
      );
  }
  protected categories() {
    return [
      'All',
      ...new Set(
        this.academy
          .state()
          .courses.filter((c) => c.status === 'Published')
          .map((c) => c.category),
      ),
    ];
  }
  protected completedLessons(courseId: string) {
    const assignmentRecord = this.assignments().find((a) => a.courseId === courseId);
    const course = assignmentRecord
      ? this.academy.assignedCourse(assignmentRecord)
      : this.academy.state().courses.find((c) => c.id === courseId);
    const a = this.assignments().find((a) => a.courseId === courseId);
    return course?.lessons.filter((l) => a?.completedLessonIds.includes(l.id)).length ?? 0;
  }
  protected completedVersion() {
    return this.certificates().find((c) => c.assignmentId === this.assignment()?.id)?.courseVersion;
  }
  protected assignedCourses() {
    return this.courses().filter((c) => this.assignments().some((a) => a.courseId === c.id));
  }
  protected progress(courseId: string) {
    const assignmentRecord = this.assignments().find((a) => a.courseId === courseId);
    const course = assignmentRecord
      ? this.academy.assignedCourse(assignmentRecord)
      : this.academy.state().courses.find((c) => c.id === courseId);
    const assignment = this.assignments().find((a) => a.courseId === courseId);
    return course?.lessons.length && assignment
      ? Math.round(
          (course.lessons.filter((l) => assignment.completedLessonIds.includes(l.id)).length /
            course.lessons.length) *
            100,
        )
      : 0;
  }
  protected status(courseId: string) {
    const a = this.assignments().find((a) => a.courseId === courseId);
    return a ? this.academy.status(a) : 'Not assigned';
  }
  protected stats() {
    const a = this.assignments();
    const attempts = this.attempts().filter((v) => v.submittedAt);
    return [
      { label: 'Assigned courses', value: a.length, icon: 'school' },
      {
        label: 'Due soon',
        value: a.filter((v) => ['Due soon', 'Expiring soon'].includes(this.academy.status(v)))
          .length,
        icon: 'schedule',
      },
      { label: 'Completed', value: a.filter((v) => !!v.completedAt).length, icon: 'check_circle' },
      {
        label: 'Overdue / expired',
        value: a.filter((v) => ['Overdue', 'Expired'].includes(this.academy.status(v))).length,
        icon: 'error',
      },
      {
        label: 'Average score',
        value: attempts.length
          ? Math.round(attempts.reduce((sum, v) => sum + (v.score ?? 0), 0) / attempts.length) + '%'
          : '—',
        icon: 'star',
      },
    ];
  }
  protected nextLesson(courseId: string) {
    const a = this.assignments().find((a) => a.courseId === courseId);
    const c = a
      ? this.academy.assignedCourse(a)
      : this.academy.state().courses.find((c) => c.id === courseId);
    const incomplete = c?.lessons.filter((l) => !a?.completedLessonIds.includes(l.id)) ?? [];
    return incomplete.length
      ? incomplete.find((l) => !a || !this.academy.lessonBlock(a, l.id))
      : c?.lessons[0];
  }
  protected locked(index: number) {
    const a = this.assignment();
    const lesson = this.course()?.lessons[index];
    return !a || !lesson || !!this.academy.lessonBlock(a, lesson.id);
  }
  protected unlocked() {
    const a = this.assignment();
    return !!a && !this.academy.assessmentAvailability(a, this.clock()).reason;
  }
  protected availability() {
    const a = this.assignment();
    return a ? this.academy.assessmentAvailability(a, this.clock()) : undefined;
  }
  protected adjacent(direction: number) {
    const lessons = this.course()?.lessons ?? [];
    const index = lessons.findIndex((l) => l.id === this.lesson()?.id) + direction;
    return index >= 0 && index < lessons.length && (this.preview() || !this.locked(index))
      ? lessons[index]
      : undefined;
  }
  protected watched() {
    const a = this.assignment();
    const l = this.lesson();
    return a && l ? this.academy.watchedPercent(a, l.id) : 0;
  }
  protected lessonPosition() {
    return (this.course()?.lessons.findIndex((l) => l.id === this.lesson()?.id) ?? -1) + 1;
  }
  protected followingLesson() {
    const lessons = this.course()?.lessons ?? [];
    const index = lessons.findIndex((l) => l.id === this.lesson()?.id);
    return index >= 0 ? lessons[index + 1] : this.nextLesson(this.course()?.id ?? '');
  }
  protected canOpenLesson(id: string) {
    const assignment = this.assignment();
    return this.preview() || (!!assignment && !this.academy.lessonBlock(assignment, id));
  }
  protected currentLessonDone() {
    return !!this.assignment()?.completedLessonIds.includes(this.lesson()?.id ?? '');
  }
  protected requiredResources() {
    const lesson = this.lesson();
    return lesson?.requireResourceAck
      ? lesson.handoutIds.filter((id) => !lesson.optionalHandoutIds?.includes(id))
      : [];
  }
  protected resourceOpened(id: string) {
    return !!this.assignment()?.openedResourceIds?.includes(id);
  }
  protected resourcesOpenedCount() {
    return this.requiredResources().filter((id) => this.resourceOpened(id)).length;
  }
  protected resourcesAcknowledgedCount() {
    return this.requiredResources().filter((id) => this.resourceDone(id)).length;
  }
  protected lessonRequirementsMet() {
    const lesson = this.lesson();
    return (
      !!lesson &&
      (!lesson.videoId || this.watched() >= (lesson.watchThreshold ?? 90)) &&
      this.requiredResources().every((id) => this.resourceDone(id))
    );
  }
  protected allRequiredLessonsDone() {
    return (
      !!this.assignment() &&
      !!this.course()?.lessons.every(
        (l) => l.mandatory === false || this.assignment()!.completedLessonIds.includes(l.id),
      )
    );
  }
  protected resourceFormat(id: string) {
    const asset = this.academy.state().assets.find((a) => a.id === id);
    return asset?.mime === 'application/pdf' || asset?.name.toLowerCase().endsWith('.pdf')
      ? 'PDF'
      : 'DOCX';
  }
  protected resourceDone(id: string) {
    return !!this.assignment()?.resourceAcknowledgements?.includes(id);
  }
  protected totalMinutes() {
    return this.course()?.lessons.reduce((sum, l) => sum + l.minutes, 0) ?? 0;
  }
  protected moduleCount() {
    return new Set(this.course()?.lessons.map((l) => l.moduleTitle || 'Course lessons')).size;
  }
  protected learningHistory() {
    return this.academy
      .assignments()
      .filter((a) => a.personId === this.person()?.id)
      .sort((a, b) => b.assignedAt.localeCompare(a.assignedAt));
  }
  protected latestAttempt(assignmentId: string) {
    return this.attempts().find((a) => a.assignmentId === assignmentId && !a.groupId);
  }
  protected renewals() {
    const latest = this.certificates().filter(
      (c, i, all) => all.findIndex((v) => v.courseId === c.courseId) === i,
    );
    return latest
      .filter(
        (c) =>
          c.expires &&
          c.expires <= addDays(londonDate(), this.academy.state().settings.refresherDays),
      )
      .sort((a, b) => a.expires.localeCompare(b.expires));
  }
  protected refresherAssignments() {
    return this.assignments().filter(
      (a) =>
        !a.completedAt &&
        (a.type === 'Refresher' || ['Overdue', 'Due soon'].includes(this.academy.status(a))),
    );
  }
  protected noticeCourse(id: string) {
    return (
      this.academy.assignments().find((a) => a.id === id && a.personId === this.person()?.id)
        ?.courseId ?? ''
    );
  }
  protected requests() {
    return (
      this.academy.state().accessRequests?.filter((r) => r.personId === this.person()?.id) ?? []
    );
  }
  protected async requestRecords() {
    if (this.preview()) return;
    const error = await this.academy.requestTrainingRecords(this.academy.store.companyId());
    this.error.set(error ?? '');
    if (!error)
      this.notice.set(
        'Your training-record access request is recorded for HR review. No external message has been sent.',
      );
  }
  protected pendingRequest() {
    return this.requests().some((r) => r.status === 'Requested');
  }
  protected groupPlacement(group: AcademyQuestionGroup) {
    const target = ['Before module', 'After module'].includes(group.placement)
      ? this.course()?.modules?.find((m) => m.id === group.moduleId)?.title
      : ['After lesson', 'Within module'].includes(group.placement)
        ? this.course()?.lessons.find((l) => l.id === group.lessonId)?.title
        : '';
    return group.placement + (target ? ': ' + target : '');
  }
  protected placedGroups(lessonId: string, before: boolean) {
    const course = this.course();
    const index = course?.lessons.findIndex((l) => l.id === lessonId) ?? -1;
    if (!course || index < 0) return [];
    const lesson = course.lessons[index];
    return (course.questionGroups ?? []).filter((g) =>
      before
        ? g.placement === 'Before module' &&
          g.moduleId === lesson.moduleId &&
          !course.lessons.slice(0, index).some((l) => l.moduleId === lesson.moduleId)
        : (['After lesson', 'Within module'].includes(g.placement) && g.lessonId === lessonId) ||
          (g.placement === 'After module' &&
            g.moduleId === lesson.moduleId &&
            !course.lessons.slice(index + 1).some((l) => l.moduleId === lesson.moduleId)),
    );
  }
  protected endingGroups() {
    return (
      this.course()?.questionGroups?.filter((g) =>
        ['Course completion', 'Scheduled'].includes(g.placement),
      ) ?? []
    );
  }
  protected groupAvailability(id: string) {
    const assignment = this.assignment();
    return assignment
      ? this.academy.assessmentAvailability(assignment, this.clock(), id)
      : undefined;
  }
  protected async start(assignmentId: string, groupId = '') {
    if (this.preview()) return;
    const result = await this.academy.startAttempt(
      assignmentId,
      this.academy.store.companyId(),
      groupId,
    );
    this.error.set(result.error ?? '');
    if (!result.error) void this.router.navigate(['/staff-portal/training/assessment', result.id]);
  }
  protected async complete() {
    const a = this.assignment();
    const lesson = this.lesson();
    if (!a || !lesson || this.preview()) return;
    if (!(await this.flushNote())) return;
    const error = await this.academy.saveLesson(
      a.id,
      lesson.id,
      null,
      null,
      true,
      this.academy.store.companyId(),
    );
    this.error.set(error ?? '');
    if (!error)
      this.notice.set('Lesson completed. Complete every lesson to unlock the assessment.');
  }
  protected editNote(value: string) {
    this.note = value;
    this.notePending.set(true);
  }
  private noteSave?: Promise<boolean>;
  protected async flushNote(): Promise<boolean> {
    if (this.noteSave) return this.noteSave;
    this.noteSave = this.persistNote();
    try {
      return await this.noteSave;
    } finally {
      this.noteSave = undefined;
    }
  }
  private async persistNote(): Promise<boolean> {
    if (!this.notePending() || !this.noteKey) return true;
    const error = await this.academy.saveLesson(
      this.noteAssignment,
      this.noteLesson,
      this.note,
      null,
      false,
      this.noteWorkspace,
    );
    this.error.set(error ?? '');
    if (error) return false;
    this.notePending.set(false);
    return true;
  }
  private playback = { lessonId: '', position: 0, at: 0 };
  protected resume(event: Event) {
    const video = event.target as HTMLVideoElement;
    const saved = this.assignment()?.positions[this.lesson()?.id ?? ''] ?? 0;
    if (saved > 0 && saved < video.duration) video.currentTime = saved;
    this.playback = {
      lessonId: this.lesson()?.id ?? '',
      position: video.currentTime,
      at: performance.now(),
    };
  }
  protected position(event: Event) {
    const a = this.assignment();
    const lesson = this.lesson();
    if (!a || !lesson || this.preview()) return;
    const video = event.target as HTMLVideoElement;
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    const now = performance.now();
    const previous = this.playback;
    if (event.type === 'timeupdate' && previous.lessonId === lesson.id && now - previous.at < 5000)
      return;
    this.playback = { lessonId: lesson.id, position: video.currentTime, at: now };
    if (previous.lessonId !== lesson.id || !previous.at) return;
    const error = this.academy.recordVideoProgress(
      a.id,
      lesson.id,
      event.type === 'seeking' ? video.currentTime : previous.position,
      video.currentTime,
      video.duration,
      (now - previous.at) / 1000,
      this.academy.store.companyId(),
    );
    if (error) this.error.set(error);
  }
  protected toggleCaptions(video: HTMLVideoElement) {
    for (let i = 0; i < video.textTracks.length; i++)
      video.textTracks[i].mode = video.textTracks[i].mode === 'showing' ? 'hidden' : 'showing';
  }
  protected assetName(id: string) {
    return this.academy.state().assets.find((a) => a.id === id)?.name ?? 'handout';
  }
  protected async download(id: string) {
    try {
      await this.files.download(id);
      const assignment = this.assignment();
      if (assignment && !this.preview()) {
        const error = await this.academy.recordResourceOpen(
          assignment.id,
          id,
          this.academy.store.companyId(),
        );
        if (error) this.error.set(error);
      }
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
  protected async acknowledge(id: string) {
    const a = this.assignment();
    if (!a || this.preview()) return;
    const error = await this.academy.acknowledgeResource(a.id, id, this.academy.store.companyId());
    this.error.set(error ?? '');
    if (!error) this.notice.set('Resource read acknowledgement saved.');
  }
  protected captionLanguage(id: string) {
    return this.academy.state().assets.find((a) => a.id === id)?.language ?? 'en';
  }
  protected async downloadCertificate(c: AcademyCertificate) {
    try { await this.academy.certificatesApi.download(c.id, true); }
    catch(e) { this.error.set((e as Error).message); }
  }
  protected enrol() {
    if (!this.course()) return;
    const error = this.academy.enrol(this.course()!.id, this.academy.store.companyId());
    this.error.set(error ?? '');
    if (!error) this.notice.set('You are enrolled on this course.');
  }
  protected deadlines() {
    return this.assignments()
      .filter((a) => !a.completedAt && a.due)
      .sort((a, b) => a.due.localeCompare(b.due))
      .slice(0, 5);
  }
  async canLeave(): Promise<boolean> {
    if (this.academy.resultsApi.saving()) return false;
    return (
      (await this.flushNote()) ||
      window.confirm(
        'Your notes could not be saved. Leave this lesson and discard the unsaved notes?',
      )
    );
  }
  @HostListener('window:beforeunload', ['$event']) protected unload(event: BeforeUnloadEvent) {
    if (this.notePending()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
