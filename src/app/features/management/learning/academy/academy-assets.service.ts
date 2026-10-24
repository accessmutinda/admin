import { Injectable, inject } from '@angular/core';
import { AcademyService } from './academy.service';
import { AcademyAsset } from './academy.models';

@Injectable({ providedIn: 'root' })
export class AcademyAssets {
  private readonly academy = inject(AcademyService);
  private database(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('careverity-academy-media', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('files');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Media storage is unavailable in this browser.'));
    });
  }
  private async access<T>(workspace: string, id: string, write?: Blob | null): Promise<T> {
    const database = await this.database();
    try {
      return await new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(
          'files',
          write === undefined ? 'readonly' : 'readwrite',
        );
        const store = transaction.objectStore('files');
        const key = workspace + ':' + id;
        const request =
          write === undefined
            ? store.get(key)
            : write === null
              ? store.delete(key)
              : store.put(write, key);
        let result: T;
        request.onsuccess = () => {
          result = request.result as T;
        };
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () =>
          reject(new Error('Could not save media. Browser storage may be full.'));
        transaction.onabort = () =>
          reject(new Error('The media storage operation was interrupted.'));
      });
    } finally {
      database.close();
    }
  }
  async upload(file: File, workspace: string): Promise<string> {
    if (!this.academy.canManage() || workspace !== this.academy.store.companyId())
      throw new Error('Workspace or media permission changed.');
    if (!file.type && file.name.toLowerCase().endsWith('.vtt'))
      file = new File([file], file.name, { type: 'text/vtt' });
    const types: Record<string, string[]> = {
      Video: ['video/mp4', 'video/webm'],
      Image: ['image/png', 'image/jpeg', 'image/webp'],
      Document: ['application/pdf'],
      Captions: ['text/vtt', 'text/plain'],
    };
    const kind = Object.keys(types).find((k) => types[k].includes(file.type)) as
      AcademyAsset['kind'] | undefined;
    if (!kind || !file.size || file.size > (kind === 'Video' ? 2 * 1024 ** 3 : 10 * 1024 ** 2))
      throw new Error(
        'Use MP4/WebM video up to 2 GB, or PNG/JPEG/WebP, PDF or VTT up to 10 MB. Browser storage limits apply.',
      );
    if (kind === 'Captions' && !(await file.text()).trimStart().startsWith('WEBVTT'))
      throw new Error('Caption files must use the WEBVTT format.');
    const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const text = new TextDecoder().decode(bytes);
    if (
      (file.type === 'video/mp4' && text.slice(4, 8) !== 'ftyp') ||
      (file.type === 'video/webm' &&
        ![0x1a, 0x45, 0xdf, 0xa3].every((byte, index) => bytes[index] === byte)) ||
      (file.type === 'image/webp' && !(text.startsWith('RIFF') && text.slice(8, 12) === 'WEBP'))
    )
      throw new Error('The media content does not match its declared format.');
    if (
      (file.type === 'application/pdf' &&
        new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') ||
      (file.type === 'image/png' && !(bytes[0] === 137 && bytes[1] === 80)) ||
      (file.type === 'image/jpeg' && !(bytes[0] === 255 && bytes[1] === 216))
    )
      throw new Error('The file content does not match its declared format.');
    const id = crypto.randomUUID();
    await this.access(workspace, id, file);
    const error = this.academy.saveAsset(
      {
        id,
        name: file.name,
        mime: file.type === 'text/plain' ? 'text/vtt' : file.type,
        size: file.size,
        kind,
        at: new Date().toISOString(),
        by: this.academy.auth.currentUser()!.name,
      },
      workspace,
    );
    if (error) {
      await this.access(workspace, id, null);
      throw new Error(error);
    }
    return id;
  }
  async url(id: string): Promise<string> {
    const workspace = this.academy.store.companyId();
    if (!this.academy.assetReadable(id)) throw new Error('You do not have access to this asset.');
    const blob = await this.access<Blob | undefined>(workspace, id);
    if (workspace !== this.academy.store.companyId() || !this.academy.assetReadable(id))
      throw new Error('Workspace or asset access changed.');
    if (!blob)
      throw new Error(
        'This media file is not stored in this browser. Upload it again from the asset library.',
      );
    return URL.createObjectURL(blob);
  }
  async download(id: string): Promise<void> {
    const asset = this.academy.state().assets.find((a) => a.id === id);
    if (!asset) throw new Error('Asset unavailable.');
    const url = await this.url(id);
    const a = document.createElement('a');
    a.href = url;
    a.download = asset.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async remove(id: string, workspace: string): Promise<void> {
    const error = this.academy.removeAsset(id, workspace);
    if (error) throw new Error(error);
    await this.access(workspace, id, null);
  }
}
