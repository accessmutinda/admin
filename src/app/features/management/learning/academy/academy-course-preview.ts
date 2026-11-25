import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AcademyApi } from './academy-api.service';
import type { AcademyCourse } from './academy.models';

@Component({
  selector: 'cv-academy-course-preview',
  imports: [RouterLink],
  host: { class: 'module-page academy-page' },
  templateUrl: './academy-course-preview.html',
  styleUrls: ['./academy.css', './academy-lesson-view.css'],
})
export class AcademyCoursePreview {
  private readonly api = inject(AcademyApi);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly query = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly id = computed(() => this.params().get('courseId') ?? '');
  protected readonly returnPage = computed(() => {
    const from = this.query().get('from');
    return from === 'structure' || from === 'publish' ? from : 'courses';
  });
  protected readonly returnContext = computed(() => ({ person: this.query().get('person') }));
  private readonly source = signal<{ course: AcademyCourse; scope: string } | null>(null);
  protected readonly course = computed(() => {
    const source = this.source();
    return source?.course.id === this.id() && source.scope === this.api.scope()
      ? source.course
      : null;
  });
  protected readonly lesson = computed(() => {
    const lessons = this.course()?.lessons;
    const selected = this.query().get('lesson');
    return selected ? lessons?.find((lesson) => lesson.id === selected) : lessons?.[0];
  });
  protected readonly error = signal('');
  protected readonly mediaError = signal('');
  protected readonly video = signal('');
  protected readonly captions = signal('');

  constructor() {
    effect((cleanup) => {
      const id = this.id();
      const scope = this.api.scope();
      let cancelled = false;
      cleanup(() => (cancelled = true));
      this.source.set(null);
      this.error.set('');
      untracked(() => {
        void this.api.detail(id).then(
          ({ course }) => {
            if (!cancelled) this.source.set({ course, scope });
          },
          (error: unknown) => {
            if (!cancelled)
              this.error.set(error instanceof Error ? error.message : 'The course is unavailable.');
          },
        );
      });
    });
    effect((cleanup) => {
      const lesson = this.lesson();
      let cancelled = false;
      const urls: string[] = [];
      this.video.set('');
      this.captions.set('');
      this.mediaError.set('');
      cleanup(() => {
        cancelled = true;
        urls.forEach((url) => URL.revokeObjectURL(url));
      });
      for (const [id, target] of [
        [lesson?.videoId, this.video],
        [lesson?.captionId, this.captions],
      ] as const) {
        if (!id) continue;
        untracked(() => {
          void this.api.blob(id).then(
            (blob) => {
              if (cancelled) return;
              const url = URL.createObjectURL(blob);
              urls.push(url);
              target.set(url);
            },
            () => {
              if (!cancelled) this.mediaError.set('Some lesson media is unavailable.');
            },
          );
        });
      }
    });
  }

  protected assetName(id: string): string | undefined {
    return this.api.assets().find((asset) => asset.id === id)?.name;
  }

  protected captionLanguage(id: string): string {
    return this.api.assets().find((asset) => asset.id === id)?.language || 'en';
  }

  protected async downloadResource(id: string): Promise<void> {
    const lesson = this.lesson();
    this.mediaError.set('');
    try {
      const blob = await this.api.blob(id);
      if (!lesson || this.lesson() !== lesson) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = this.assetName(id) ?? 'Lesson resource';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      if (this.lesson() === lesson) this.mediaError.set('The resource could not be downloaded.');
    }
  }
}
