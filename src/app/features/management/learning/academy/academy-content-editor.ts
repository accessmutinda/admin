import { Component, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../../shared/ui/select';
import { AcademyService } from './academy.service';
import { AcademyCourseSteps } from './academy-course-steps';
import { AcademyAssets } from './academy-assets.service';
import { AcademyAdminNav, AcademyMessage } from './academy-shared';
import { AcademyAsset, AcademyLesson, courseMediaLessons } from './academy.models';
import { AcademyImage } from './academy-image';
@Component({
  host: {
    class: 'module-page academy-page',
    '[attr.inert]': 'academy.api.saving() ? "" : null',
    '[attr.aria-busy]': 'academy.api.saving()',
  },
  selector: 'cv-academy-content-editor',
  imports: [
    AcademyCourseSteps,
    FormsModule,
    RouterLink,
    MatSelectModule,
    CvSelect,
    AcademyAdminNav,
    AcademyMessage,
    AcademyImage,
  ],
  templateUrl: './academy-content-editor.html',
  styleUrls: [
    './academy-forms.css',
    './academy.css',
    './academy-workflows.css',
    './academy-content-editor.css',
  ],
})
export class AcademyContentEditor {
  protected readonly academy = inject(AcademyService);
  protected readonly files = inject(AcademyAssets);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workspace = this.academy.store.companyId();
  protected course = structuredClone(
    this.academy.course(this.route.snapshot.paramMap.get('courseId') ?? '') ?? null,
  );
  protected lesson = this.course?.lessons.find(
    (l) => l.id === this.route.snapshot.paramMap.get('lessonId'),
  );
  private original = JSON.stringify(this.course);
  protected readonly dragging = signal(false);
  protected readonly detailsOpen = signal(false);
  protected readonly uploadingName = signal('');
  protected readonly failedUploads = signal<{ name: string; error: string }[]>([]);
  protected readonly tab = signal('Details');
  protected readonly videoUrl = signal('');
  protected readonly captionUrl = signal('');
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly busy = signal(false);
  protected readonly metadata = signal('');
  protected mediaRights = 'Provider-owned course material';
  protected mediaLanguage = 'en';
  protected mediaReplacementId = '';
  protected videoDetails: { durationSeconds?: number; width?: number; height?: number } = {};
  protected async saveMetadata() {
    const ids = [
      this.lesson?.videoId,
      this.lesson?.captionId,
      ...(this.lesson?.handoutIds ?? []),
    ].filter((id): id is string => !!id);
    if (!ids.length) {
      this.error.set('Select uploaded media first.');
      return;
    }
    for (const id of ids) {
      const error = await this.saveMediaMetadata(
        id,
        {
          rights: this.mediaRights,
          language: this.mediaLanguage,
          ...(id === ids[0] && this.mediaReplacementId
            ? { replacesId: this.mediaReplacementId }
            : {}),
          ...(id === this.lesson?.videoId ? this.videoDetails : {}),
        },
        this.workspace,
      );
      if (error) {
        this.error.set(error);
        return;
      }
    }
    this.error.set('');
    this.notice.set('Media rights, language and available video metadata saved.');
  }
  private async saveMediaMetadata(id: string, values: Partial<AcademyAsset>, workspace: string) {
    if (workspace !== this.academy.store.companyId()) return 'The workspace changed.';
    try {
      await this.academy.api.metadata(id, values);
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }
  protected captionLanguage() {
    return (
      this.academy.state().assets.find((a) => a.id === this.lesson?.captionId)?.language ?? 'en'
    );
  }
  private disposed = false;
  private generation = 0;
  constructor() {
    this.lesson ??=
      courseMediaLessons(this.course).find((l) => !!l.videoId) ?? this.course?.lessons[0];
    void this.loadMedia();
    inject(DestroyRef).onDestroy(() => {
      this.disposed = true;
      this.generation++;
      this.revoke();
    });
  }
  private revoke() {
    if (this.videoUrl()) URL.revokeObjectURL(this.videoUrl());
    if (this.captionUrl()) URL.revokeObjectURL(this.captionUrl());
    this.videoUrl.set('');
    this.captionUrl.set('');
  }
  protected async loadMedia(): Promise<void> {
    const generation = ++this.generation;
    this.revoke();
    this.error.set('');
    for (const [id, target] of [
      [this.lesson?.videoId, this.videoUrl],
      [this.lesson?.captionId, this.captionUrl],
    ] as const) {
      if (!id) continue;
      try {
        const url = await this.files.url(id);
        if (this.disposed || generation !== this.generation) URL.revokeObjectURL(url);
        else target.set(url);
      } catch (e) {
        if (!this.disposed && generation === this.generation) this.error.set((e as Error).message);
      }
    }
  }
  protected async upload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    await this.uploadVideos(files);
  }
  protected async drop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragging.set(false);
    await this.uploadVideos(Array.from(event.dataTransfer?.files ?? []));
  }
  protected async uploadVideos(files: File[]): Promise<void> {
    if (!this.course || this.busy() || !files.length) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    this.failedUploads.set([]);
    let added = 0;
    try {
      for (const file of files) {
        this.uploadingName.set(file.name);
        try {
          if (!['video/mp4', 'video/webm'].includes(file.type))
            throw new Error('Choose an MP4 or WebM video.');
          const id = await this.files.upload(file, this.workspace);
          if (this.disposed) return;
          const target =
            (this.route.snapshot.paramMap.get('lessonId') && this.lesson && !this.lesson.videoId
              ? this.lesson
              : undefined) ?? this.newLesson(file.name);
          target.videoId = id;
          target.type = 'Video';
          target.title ||= file.name.replace(/\.[^.]+$/, '').replaceAll('_', ' ');
          this.lesson = target;
          added++;
        } catch (e) {
          if (this.disposed) return;
          this.failedUploads.update((items) => [
            ...items,
            { name: file.name, error: (e as Error).message },
          ]);
        }
      }
      await this.loadMedia();
      if (this.failedUploads().length)
        this.error.set('Some files could not be uploaded. Review the file errors and try again.');
      if (added)
        this.notice.set(
          `Uploaded: ${added} file${added === 1 ? '' : 's'} added to the course. Review captions and save. Add unused uploads to modules in Step 3.`,
        );
    } finally {
      if (!this.disposed) {
        this.uploadingName.set('');
        this.busy.set(false);
      }
    }
  }
  private newLesson(name = 'Supporting resources'): AcademyLesson {
    const lesson: AcademyLesson = {
      id: crypto.randomUUID(),
      moduleId: '',
      moduleTitle: '',
      type: 'Reading',
      mandatory: true,
      prerequisiteIds: [],
      watchThreshold: this.course?.modules?.[0]?.watchThreshold ?? 90,
      requireResourceAck: this.course?.modules?.[0]?.requireResourceAck ?? true,
      title: name.replace(/\.[^.]+$/, '').replaceAll('_', ' '),
      minutes: 10,
      content: '',
      transcript: '',
      videoId: '',
      thumbnailId: '',
      captionId: '',
      handoutIds: [],
    };
    (this.course!.pendingLessons ??= []).push(lesson);
    return lesson;
  }
  protected videos() {
    return courseMediaLessons(this.course).filter((l) => !!l.videoId);
  }
  protected asset(id: string): AcademyAsset | undefined {
    return this.academy.state().assets.find((a) => a.id === id);
  }
  protected resources() {
    const ids = new Set(courseMediaLessons(this.course).flatMap((l) => l.handoutIds));
    return this.academy.state().assets.filter((a) => ids.has(a.id));
  }
  protected processed(id: string) {
    return ['READY', 'CAPTIONS_REVIEW'].includes(this.asset(id)?.status ?? '');
  }
  protected reviewed(item: AcademyLesson) {
    return (
      this.asset(item.videoId)?.status === 'READY' && !!item.captionId && !!item.transcript.trim()
    );
  }
  protected size(bytes: number) {
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }
  protected duration(minutes: number) {
    return Math.floor(minutes) + ':' + String(Math.round((minutes % 1) * 60)).padStart(2, '0');
  }
  protected selectLesson(lesson: AcademyLesson) {
    this.lesson = lesson;
    this.metadata.set('');
    void this.loadMedia();
  }
  protected removeVideo(lesson: AcademyLesson) {
    lesson.videoId = '';
    lesson.captionId = '';
    lesson.transcript = '';
    if (this.course)
      this.course.pendingLessons = this.course.pendingLessons?.filter(
        (l) => l.videoId || l.handoutIds.length,
      );
    if (this.lesson?.id === lesson.id) {
      this.lesson = this.videos()[0] ?? lesson;
      void this.loadMedia();
    }
  }
  protected mandatoryResource(id: string) {
    return !!courseMediaLessons(this.course).some(
      (l) =>
        l.handoutIds.includes(id) && l.requireResourceAck && !l.optionalHandoutIds?.includes(id),
    );
  }
  protected setMandatoryResource(id: string, required: boolean) {
    for (const lesson of courseMediaLessons(this.course)) {
      if (!lesson.handoutIds.includes(id)) continue;
      if (required && !lesson.requireResourceAck)
        lesson.optionalHandoutIds = [
          ...new Set([
            ...(lesson.optionalHandoutIds ?? []),
            ...lesson.handoutIds.filter((x) => x !== id),
          ]),
        ];
      lesson.optionalHandoutIds = (lesson.optionalHandoutIds ?? []).filter((x) => x !== id);
      if (required) lesson.requireResourceAck = true;
      else lesson.optionalHandoutIds.push(id);
    }
  }
  protected removeResource(id: string) {
    for (const lesson of courseMediaLessons(this.course)) {
      lesson.handoutIds = lesson.handoutIds.filter((x) => x !== id);
      lesson.optionalHandoutIds = lesson.optionalHandoutIds?.filter((x) => x !== id);
    }
    if (this.course)
      this.course.pendingLessons = this.course.pendingLessons?.filter(
        (l) => l.videoId || l.handoutIds.length,
      );
  }
  protected async uploadResources(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!this.course || this.busy() || !files.length) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    const errors: string[] = [];
    let added = 0;
    const target = this.route.snapshot.paramMap.get('lessonId') ? this.lesson : undefined;
    try {
      for (const file of files) {
        try {
          if (!/\.(pdf|docx)$/i.test(file.name)) throw new Error('Choose a PDF or DOCX resource.');
          const id = await this.files.upload(file, this.workspace);
          if (this.disposed) return;
          const placement = target ?? this.newLesson(file.name);
          placement.handoutIds.push(id);
          if (!placement.requireResourceAck)
            placement.optionalHandoutIds = [
              ...new Set([
                ...(placement.optionalHandoutIds ?? []),
                ...placement.handoutIds.filter((x) => x !== id),
              ]),
            ];
          placement.requireResourceAck = true;
          this.lesson ??= placement;
          added++;
        } catch (e) {
          errors.push(`${file.name}: ${(e as Error).message}`);
        }
      }
      if (!this.disposed) {
        this.error.set(errors.join(' '));
        if (added)
          this.notice.set(
            `${added} supporting resource${added === 1 ? '' : 's'} added. Save, then place unused resources in Step 3.`,
          );
      }
    } finally {
      if (!this.disposed) this.busy.set(false);
    }
  }
  protected async uploadCaptions(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    let file = input.files?.[0];
    input.value = '';
    const lesson = this.lesson;
    if (!file || !lesson || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      if (/\.srt$/i.test(file.name)) {
        const text = await file.text();
        if (!/\d{2}:\d{2}:\d{2},\d{3}\s+-->/.test(text))
          throw new Error('Use a valid SRT subtitle file.');
        file = new File(
          ['WEBVTT\n\n' + text.replaceAll(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')],
          file.name.replace(/\.srt$/i, '.vtt'),
          { type: 'text/vtt' },
        );
      }
      const id = await this.files.upload(file, this.workspace);
      if (!this.disposed) {
        lesson.captionId = id;
        await this.loadMedia();
        this.notice.set(
          'Subtitles attached. Review the captions and transcript before approving accessibility.',
        );
      }
    } catch (e) {
      if (!this.disposed) this.error.set((e as Error).message);
    } finally {
      if (!this.disposed) this.busy.set(false);
    }
  }
  protected captionReview() {
    this.detailsOpen.set(true);
    this.tab.set('Captions & transcript');
  }
  protected async generateCaptions() {
    const lesson = this.lesson;
    if (!lesson?.transcript.trim()) {
      this.captionReview();
      this.error.set('Add the video transcript below before generating draft captions.');
      return;
    }
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const seconds = Math.max(1, Math.round(lesson.minutes * 60));
      const end =
        String(Math.floor(seconds / 3600)).padStart(2, '0') +
        ':' +
        String(Math.floor(seconds / 60) % 60).padStart(2, '0') +
        ':' +
        String(seconds % 60).padStart(2, '0') +
        '.000';
      const file = new File(
        ['WEBVTT\n\n00:00:00.000 --> ' + end + '\n' + lesson.transcript.trim() + '\n'],
        'draft-captions.vtt',
        { type: 'text/vtt' },
      );
      const id = await this.files.upload(file, this.workspace);
      if (!this.disposed) {
        lesson.captionId = id;
        await this.loadMedia();
        this.captionReview();
        this.notice.set(
          'Draft captions created from the transcript. Review and edit timing in the subtitle file before approving accessibility.',
        );
      }
    } catch (e) {
      if (!this.disposed) this.error.set((e as Error).message);
    } finally {
      if (!this.disposed) this.busy.set(false);
    }
  }
  protected pipeline() {
    const asset = this.asset(this.lesson?.videoId ?? '');
    const processed = !!asset && ['CAPTIONS_REVIEW', 'READY'].includes(asset.status ?? '');
    const reviewed =
      asset?.status === 'READY' && !!this.lesson?.captionId && !!this.lesson?.transcript.trim();
    return [
      {
        title: 'Upload Complete',
        detail: asset?.name ?? 'Choose a training video to begin',
        done: !!asset,
        status: asset ? 'Received' : 'Pending',
      },
      {
        title: 'Virus Scan',
        detail: processed ? 'File scanning completed' : 'Waiting for upload',
        done: processed,
        status: processed ? 'Clean' : 'Pending',
      },
      {
        title: 'Playback format',
        detail: processed
          ? 'Original file validated and available for playback'
          : 'Waiting for file checks',
        done: processed,
        status: processed ? 'Ready' : 'Pending',
      },
      {
        title: 'Preview Generation',
        detail: processed
          ? 'Original video available in the preview below'
          : 'Waiting for processing',
        done: processed,
        status: processed ? 'Available' : 'Pending',
      },
      {
        title: 'Closed Captions (CC)',
        detail: reviewed
          ? 'Captions and transcript reviewed'
          : this.lesson?.captionId
            ? 'Subtitles attached; transcript review required'
            : 'Attach subtitles and an approved transcript',
        done: reviewed,
        status: reviewed ? 'Reviewed' : 'Review needed',
      },
      {
        title: 'Versioning',
        detail: 'Save the draft to update the course media library',
        done: !!asset && JSON.stringify(this.course) === this.original,
        status: !!asset && JSON.stringify(this.course) === this.original ? 'Saved' : 'Pending',
      },
    ];
  }
  protected async back() {
    await this.save(false);
    if (!this.error() && this.course)
      void this.router.navigate(['/manage/learning/courses', this.course.id]);
  }
  protected async saveContinue() {
    await this.save(false);
    if (!this.error() && this.course)
      void this.router.navigate(['/manage/learning/structure', this.course.id]);
  }
  protected async approveVideo() {
    if (!this.course || !this.lesson) return;
    await this.save(false);
    if (this.error()) return;
    let error = '';
    try {
      await this.academy.api.approve(this.course.id, this.lesson.id);
    } catch (e) {
      error = (e as Error).message;
    }
    this.error.set(error ?? '');
    if (!error) this.notice.set('Video captions and transcript reviewed and approved.');
  }
  protected async save(publish: boolean): Promise<void> {
    if (!this.course) return;
    this.notice.set('');
    this.academy.api.mediaError.set('');
    for (const id of new Set(
      courseMediaLessons(this.course)
        .flatMap((l) => [l.videoId, l.captionId, ...l.handoutIds])
        .filter(Boolean),
    )) {
      if (this.asset(id)?.status === 'SCAN_PENDING') {
        try {
          await this.academy.api.process(id);
        } catch (e) {
          this.academy.api.mediaError.set((e as Error).message);
        }
      }
    }
    const error = await this.academy.persistCourse(
      { ...this.course, status: publish ? 'Published' : 'Draft' },
      this.workspace,
      JSON.parse(this.original).updatedAt,
    );
    this.error.set(error ?? '');
    if (!error) {
      this.course = structuredClone(this.academy.course(this.course.id)!);
      this.lesson = courseMediaLessons(this.course).find((l) => l.id === this.lesson?.id);
      this.original = JSON.stringify(this.course);
      this.notice.set(
        publish
          ? 'Course content published.'
          : 'Draft saved. Existing published content remains live.',
      );
    }
  }
  protected async download(id: string) {
    try {
      await this.files.download(id);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
  protected videoMetadata(event: Event) {
    const video = event.target as HTMLVideoElement;
    if (Number.isFinite(video.duration))
      this.videoDetails = {
        durationSeconds: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      };
    if (Number.isFinite(video.duration))
      this.metadata.set(
        Math.floor(video.duration / 60) +
          ':' +
          String(Math.floor(video.duration % 60)).padStart(2, '0') +
          ' · ' +
          video.videoWidth +
          ' × ' +
          video.videoHeight,
      );
  }
  protected transcriptDownload() {
    if (!this.lesson?.transcript) return;
    this.academy.store.download('lesson-transcript.txt', this.lesson.transcript);
  }
  protected canEdit() {
    return (
      this.workspace === this.academy.store.companyId() &&
      this.academy.api.available() &&
      !this.academy.api.error()
    );
  }
  canLeave(): boolean {
    if (!this.canEdit()) return true;
    if (this.academy.api.saving()) return false;
    return (
      (!this.busy() && JSON.stringify(this.course) === this.original) ||
      window.confirm('Discard unsaved video and lesson changes?')
    );
  }
  @HostListener('window:beforeunload', ['$event']) protected unload(event: BeforeUnloadEvent) {
    if (this.busy() || JSON.stringify(this.course) !== this.original) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
