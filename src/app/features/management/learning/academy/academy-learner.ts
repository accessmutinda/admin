import {
  Component,
  DestroyRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { AcademyDate } from './academy-date';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../../shared/ui/select';
import { AcademyService } from './academy.service';
import { AcademyAssets } from './academy-assets.service';
import { AcademyCertificate } from './academy.models';
import { AcademyImage } from './academy-image';
import { AcademyCertificateView } from './academy-certificate';
import { AcademyMessage } from './academy-shared';
import { downloadAcademyCertificate } from './academy-pdf';

@Component({
  selector: 'cv-academy-learner',
  imports: [
    AcademyDate,
    FormsModule,
    RouterLink,
    MatSelectModule,
    CvSelect,
    AcademyImage,
    AcademyCertificateView,
    AcademyMessage,
  ],
  templateUrl: './academy-learner.html',
  styleUrls: ['./academy-forms.css', './academy.css', './academy-workflows.css'],
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
      ? this.academy.store.staff().find((p) => p.id === selected)
      : (this.academy.me() ??
          (this.academy.canManage() ? this.academy.store.staff()[0] : undefined));
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
  protected readonly course = computed(() =>
    this.query().get('preview') === '1' && this.academy.canManage()
      ? this.academy.course(this.params().get('courseId') ?? '')
      : this.academy
          .state()
          .courses.find((c) => c.id === this.params().get('courseId') && c.status === 'Published'),
  );
  protected readonly assignment = computed(() =>
    this.assignments().find((a) => a.courseId === this.course()?.id),
  );
  protected readonly lesson = computed(() => {
    const course = this.course();
    const index = course?.lessons.findIndex((l) => l.id === this.params().get('lessonId')) ?? -1;
    if (!course || index < 0) return undefined;
    if (this.preview()) return course.lessons[index];
    const assignment = this.assignment();
    if (
      !assignment ||
      (this.academy.state().settings.sequentialLessons &&
        course.lessons.slice(0, index).some((l) => !assignment.completedLessonIds.includes(l.id)))
    )
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
      .slice(0, 8),
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
  private notesMemory = new Map<string, string>();
  private readonly mediaKey = computed(() =>
    [this.lesson()?.videoId ?? '', this.lesson()?.captionId ?? ''].join('|'),
  );
  constructor() {
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
      let cached: string | null = this.notesMemory.get(key) ?? null;
      if (key && cached === null)
        try {
          cached = sessionStorage.getItem(key);
        } catch {}
      this.note = cached ?? assignment?.notes[lesson?.id ?? ''] ?? '';
      this.notePending.set(
        cached !== null && cached !== (assignment?.notes[lesson?.id ?? ''] ?? ''),
      );
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
      .courses.filter(
        (c) =>
          c.status === 'Published' &&
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
    const course = this.academy.state().courses.find((c) => c.id === courseId);
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
    const course = this.academy.state().courses.find((c) => c.id === courseId);
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
    const c = this.academy.state().courses.find((c) => c.id === courseId);
    const a = this.assignments().find((a) => a.courseId === courseId);
    return c?.lessons.find((l) => !a?.completedLessonIds.includes(l.id)) ?? c?.lessons[0];
  }
  protected locked(index: number) {
    return (
      !this.assignment() ||
      (this.academy.state().settings.sequentialLessons &&
        !!this.course()
          ?.lessons.slice(0, index)
          .some((l) => !this.assignment()?.completedLessonIds.includes(l.id)))
    );
  }
  protected unlocked() {
    const c = this.course();
    const a = this.assignment();
    return (
      !!c?.lessons.length && !!a && c.lessons.every((l) => a.completedLessonIds.includes(l.id))
    );
  }
  protected start(assignmentId: string) {
    if (this.preview()) return;
    const result = this.academy.startAttempt(assignmentId, this.academy.store.companyId());
    this.error.set(result.error ?? '');
    if (!result.error) void this.router.navigate(['/staff-portal/training/assessment', result.id]);
  }
  protected complete() {
    const a = this.assignment();
    const lesson = this.lesson();
    if (!a || !lesson || this.preview()) return;
    if (!this.flushNote()) return;
    const error = this.academy.saveLesson(
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
    if (this.noteKey) {
      this.notesMemory.set(this.noteKey, value);
      try {
        sessionStorage.setItem(this.noteKey, value);
      } catch {}
    }
  }
  protected flushNote(): boolean {
    if (!this.notePending() || !this.noteKey) return true;
    const error = this.academy.saveLesson(
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
    this.notesMemory.delete(this.noteKey);
    try {
      sessionStorage.removeItem(this.noteKey);
    } catch {}
    return true;
  }
  protected resume(event: Event) {
    const video = event.target as HTMLVideoElement;
    const saved = this.assignment()?.positions[this.lesson()?.id ?? ''] ?? 0;
    if (saved > 0 && saved < video.duration) video.currentTime = saved;
  }
  protected position(event: Event) {
    const a = this.assignment();
    const lesson = this.lesson();
    if (!a || !lesson || this.preview()) return;
    const value = Math.floor((event.target as HTMLVideoElement).currentTime);
    if (Math.abs(value - (a.positions[lesson.id] ?? 0)) < 10) return;
    const error = this.academy.saveLesson(
      a.id,
      lesson.id,
      null,
      value,
      false,
      this.academy.store.companyId(),
    );
    if (error) this.error.set(error);
  }
  protected assetName(id: string) {
    return this.academy.state().assets.find((a) => a.id === id)?.name ?? 'handout';
  }
  protected async download(id: string) {
    try {
      await this.files.download(id);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
  protected async downloadCertificate(c: AcademyCertificate) {
    if (!this.academy.certificate(c.id)) return;
    try {
      await downloadAcademyCertificate(c, this.files);
      this.notice.set('Certificate PDF prepared.');
    } catch (e) {
      this.error.set((e as Error).message || 'Could not prepare the certificate PDF.');
    }
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
  canLeave(): boolean {
    return (
      this.flushNote() ||
      window.confirm(
        'Your notes could not be saved. Leave this lesson? The browser-session draft is retained where storage is available.',
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
