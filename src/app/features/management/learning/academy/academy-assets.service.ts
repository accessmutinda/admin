import { Injectable, inject } from '@angular/core';
import { AcademyService } from './academy.service';
@Injectable({ providedIn: 'root' })
export class AcademyAssets {
  private readonly academy = inject(AcademyService);
  async upload(file: File, workspace: string): Promise<string> {
    if (workspace !== this.academy.store.companyId() || !this.academy.can('author'))
      throw Error('The workspace or media permission changed.');
    if ((!file.type || file.type === 'text/plain') && file.name.toLowerCase().endsWith('.vtt'))
      file = new File([file], file.name, { type: 'text/vtt' });
    const asset = await this.academy.api.upload(file, crypto.randomUUID());
    if (asset.status === 'REJECTED') throw Error('The uploaded file failed scanning.');
    return asset.id;
  }
  async url(id: string): Promise<string> {
    return URL.createObjectURL(await (this.academy.api.available() ? this.academy.api.blob(id) : this.academy.resultsApi.blob(id)));
  }
  async download(id: string): Promise<void> {
    const asset = this.academy.state().assets.find((a) => a.id === id);
    if (!asset) throw Error('Media is unavailable.');
    const url = await this.url(id);
    const a = document.createElement('a');
    a.href = url;
    a.download = asset.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async remove(_id: string, _workspace: string): Promise<void> {
    throw Error(
      'Remove media placements from the course draft. Uploaded source files are retained.',
    );
  }
}
