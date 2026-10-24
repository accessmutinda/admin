import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../../shared/ui/select';
import { AcademyService } from './academy.service';
import { AcademyAssets } from './academy-assets.service';
import { AcademyAdminNav, AcademyMessage } from './academy-shared';
import { AcademyImage } from './academy-image';
@Component({
  selector: 'cv-academy-catalog',
  imports: [
    FormsModule,
    RouterLink,
    MatSelectModule,
    CvSelect,
    AcademyAdminNav,
    AcademyMessage,
    AcademyImage,
  ],
  templateUrl: './academy-catalog.html',
  styleUrls: ['./academy-forms.css', './academy.css', './academy-workflows.css'],
})
export class AcademyCatalog {
  protected readonly academy = inject(AcademyService);
  protected readonly files = inject(AcademyAssets);
  protected readonly view = inject(ActivatedRoute).snapshot.data['view'] as
    'courses' | 'questions' | 'assets';
  protected search = '';
  protected filter = 'All';
  protected page = 1;
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly busy = signal(false);
  protected readonly previewVideo = signal('');
  private disposed = false;
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.disposed = true;
      if (this.previewVideo()) URL.revokeObjectURL(this.previewVideo());
    });
  }
  protected filtered() {
    const state = this.academy.state();
    const source =
      this.view === 'courses'
        ? this.academy.editableCourses()
        : this.view === 'questions'
          ? this.academy.editableQuestions()
          : state.assets;
    return source.filter((v) => {
      const item = v as unknown as Record<string, unknown>;
      return (
        `${item['title'] ?? item['text'] ?? item['name']} ${item['category'] ?? ''}`
          .toLowerCase()
          .includes(this.search.trim().toLowerCase()) &&
        (this.filter === 'All' || item['status'] === this.filter || item['kind'] === this.filter)
      );
    });
  }
  protected rows(): any[] {
    const rows = this.filtered();
    this.page = Math.min(this.page, Math.max(1, Math.ceil(rows.length / 8)));
    return rows.slice((this.page - 1) * 8, this.page * 8);
  }
  protected pages() {
    return Math.max(1, Math.ceil(this.filtered().length / 8));
  }
  protected async upload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    this.busy.set(true);
    this.error.set('');
    try {
      await this.files.upload(file, this.academy.store.companyId());
      if (!this.disposed) this.notice.set('Asset saved in this browser’s media library.');
    } catch (e) {
      if (!this.disposed)
        this.error.set(e instanceof Error ? e.message : 'Could not upload media.');
    } finally {
      if (!this.disposed) this.busy.set(false);
    }
  }
  protected async download(id: string) {
    try {
      await this.files.download(id);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
  protected async remove(id: string) {
    if (!window.confirm('Remove this unused asset from this browser?')) return;
    try {
      await this.files.remove(id, this.academy.store.companyId());
      this.notice.set('Asset removed.');
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
  protected closeVideo() {
    if (this.previewVideo()) URL.revokeObjectURL(this.previewVideo());
    this.previewVideo.set('');
  }
  protected async video(id: string) {
    try {
      const url = await this.files.url(id);
      if (this.disposed) {
        URL.revokeObjectURL(url);
        return;
      }
      if (this.previewVideo()) URL.revokeObjectURL(this.previewVideo());
      this.previewVideo.set(url);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
}
