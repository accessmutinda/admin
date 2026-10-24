import { Component, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../../shared/ui/select';
import { AcademyService } from './academy.service';
import { AcademyAssets } from './academy-assets.service';
import { AcademyAdminNav, AcademyMessage } from './academy-shared';
import { AcademyImage } from './academy-image';
@Component({
  selector: 'cv-academy-content-editor',
  imports: [
    FormsModule,
    RouterLink,
    MatSelectModule,
    CvSelect,
    AcademyAdminNav,
    AcademyMessage,
    AcademyImage,
  ],
  templateUrl: './academy-content-editor.html',
  styleUrls: ['./academy-forms.css', './academy.css', './academy-workflows.css'],
})
export class AcademyContentEditor {
  protected readonly academy = inject(AcademyService);
  protected readonly files = inject(AcademyAssets);
  private readonly route = inject(ActivatedRoute);
  private readonly workspace = this.academy.store.companyId();
  protected course = structuredClone(
    this.academy.course(this.route.snapshot.paramMap.get('courseId') ?? '') ?? null,
  );
  protected lesson = this.course?.lessons.find(
    (l) => l.id === this.route.snapshot.paramMap.get('lessonId'),
  );
  private original = JSON.stringify(this.course);
  protected readonly tab = signal('Details');
  protected readonly videoUrl = signal('');
  protected readonly captionUrl = signal('');
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly busy = signal(false);
  protected assetSearch = '';
  protected readonly metadata = signal('');
  private disposed = false;
  private generation = 0;
  constructor() {
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
    const file = input.files?.[0];
    if (!file || !this.lesson) return;
    input.value = '';
    this.busy.set(true);
    try {
      const id = await this.files.upload(file, this.workspace);
      if (!this.disposed) {
        this.lesson.videoId = id;
        await this.loadMedia();
        this.notice.set(
          'Video uploaded. Save the draft or publish the course update to place it in this lesson.',
        );
      }
    } catch (e) {
      if (!this.disposed) this.error.set((e as Error).message);
    } finally {
      if (!this.disposed) this.busy.set(false);
    }
  }
  protected save(publish: boolean): void {
    if (!this.course) return;
    this.course.status = publish ? 'Published' : 'Draft';
    const error = this.academy.saveCourse(
      this.course,
      this.workspace,
      JSON.parse(this.original).updatedAt,
    );
    this.error.set(error ?? '');
    if (!error) {
      this.course = structuredClone(this.academy.course(this.course.id)!);
      this.lesson = this.course.lessons.find((l) => l.id === this.lesson?.id);
      this.original = JSON.stringify(this.course);
      this.notice.set(
        publish
          ? 'Course content published.'
          : 'Draft saved. Existing published content remains live.',
      );
    }
  }
  protected assetList() {
    return this.academy
      .state()
      .assets.filter((a) => a.name.toLowerCase().includes(this.assetSearch.toLowerCase()))
      .slice(0, 8);
  }
  protected useVideo(id: string) {
    if (this.lesson) {
      this.lesson.videoId = id;
      void this.loadMedia();
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
  canLeave(): boolean {
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
