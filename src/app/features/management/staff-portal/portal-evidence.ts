import { Component, input, output, signal } from '@angular/core';
import { JournalAttachment } from '../journal/journal.models';
@Component({
  selector: 'cv-portal-evidence',
  template: `<div class="evidence">
    @if (!readonly()) {
      <label class="evidence-upload" (dragover)="$event.preventDefault()" (drop)="drop($event)"
        ><span class="material-symbols-outlined" aria-hidden="true">attach_file</span
        >{{ busy() ? 'Reading files…' : 'Attach evidence' }}<small>Up to 5 MB total</small
        ><input
          type="file"
          multiple
          aria-label="Attach evidence"
          [disabled]="busy()"
          (change)="upload($event)"
      /></label>
    }
    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }
    @for (file of files(); track file.id) {
      <div class="evidence-file">
        <button type="button" (click)="download(file)">
          <span class="material-symbols-outlined" aria-hidden="true">description</span
          ><span
            >{{ file.name }}<small>{{ (file.size / 1024).toFixed(1) }} KB</small></span
          >
        </button>
        @if (!readonly()) {
          <button type="button" [attr.aria-label]="'Remove ' + file.name" (click)="remove(file.id)">
            ×
          </button>
        }
      </div>
    }
  </div>`,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .evidence {
        display: grid;
        gap: 8px;
      }
      .evidence-upload {
        position: relative;
        display: flex;
        align-items: center;
        gap: 8px;
        border: 1px dashed #aacde7;
        border-radius: 6px;
        padding: 12px;
        color: #007ed8;
        font-size: 12px;
        cursor: pointer;
      }
      .evidence-upload small {
        margin-left: auto;
        color: #8a9cad;
        font-size: 10px;
      }
      .evidence-upload input {
        position: absolute;
        inset: 0;
        width: 100%;
        opacity: 0;
        cursor: pointer;
      }
      .evidence-upload:focus-within {
        outline: 2px solid #008eff;
      }
      .evidence-file {
        display: flex;
        border: 1px solid #e3ebf2;
        border-radius: 5px;
        padding: 5px;
      }
      .evidence-file > button {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 40px;
        border: 0;
        background: none;
        color: #3b6688;
        font-size: 11px;
        text-align: left;
        cursor: pointer;
        overflow-wrap: anywhere;
      }
      .evidence-file > button:first-child {
        flex: 1;
        min-width: 0;
      }
      .evidence-file > button:last-child {
        min-width: 40px;
      }
      .evidence-file small {
        display: block;
        font-size: 10px;
        color: #8a9cad;
        margin-top: 3px;
      }
      .evidence p {
        font-size: 11px;
        color: #c54b60;
      }
    `,
  ],
})
export class PortalEvidence {
  readonly files = input<JournalAttachment[]>([]);
  readonly filesChange = output<JournalAttachment[]>();
  readonly loading = output<boolean>();
  readonly readonly = input(false);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected async upload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const selected = Array.from(input.files ?? []);
    input.value = '';
    await this.addFiles(selected);
  }
  protected async drop(event: DragEvent): Promise<void> {
    event.preventDefault();
    await this.addFiles(Array.from(event.dataTransfer?.files ?? []));
  }
  private async addFiles(selected: File[]): Promise<void> {
    if (!selected.length || this.busy() || this.readonly()) return;
    if (
      selected.reduce(
        (s, f) => s + f.size,
        this.files().reduce((s, f) => s + f.size, 0),
      ) >
      5 * 1024 * 1024
    ) {
      this.error.set('Files must total 5 MB or less.');
      return;
    }
    this.busy.set(true);
    this.loading.emit(true);
    this.error.set('');
    try {
      const added = await Promise.all(
        selected.map(
          (file) =>
            new Promise<JournalAttachment>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () =>
                resolve({
                  id: crypto.randomUUID(),
                  name: file.name,
                  size: file.size,
                  content: String(reader.result),
                });
              reader.onerror = reject;
              reader.readAsDataURL(file);
            }),
        ),
      );
      this.filesChange.emit([...this.files(), ...added]);
    } catch {
      this.error.set('Could not read the selected files. Try again.');
    } finally {
      this.busy.set(false);
      this.loading.emit(false);
    }
  }
  protected remove(id: string): void {
    this.filesChange.emit(this.files().filter((f) => f.id !== id));
  }
  protected download(file: JournalAttachment): void {
    try {
      const bytes = Uint8Array.from(atob(file.content.split(',')[1]), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      this.error.set('This file could not be downloaded.');
    }
  }
}
