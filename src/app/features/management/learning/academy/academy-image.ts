import { Component, effect, inject, input, signal } from '@angular/core';
import { AcademyAssets } from './academy-assets.service';
@Component({
  selector: 'cv-academy-image',
  template: `@if (url()) {
      <img [src]="url()" [alt]="alt()" />
    } @else {
      <span class="material-symbols-outlined" aria-hidden="true">{{ icon() }}</span>
    }`,
  styles: [
    `
      :host {
        display: grid;
        place-items: center;
        overflow: hidden;
        background: #eaf5fc;
        color: #00528c;
        border-radius: 7px;
        min-height: 80px;
      }
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .material-symbols-outlined {
        font-size: 36px;
      }
    `,
  ],
})
export class AcademyImage {
  readonly id = input('');
  readonly alt = input('');
  readonly icon = input('school');
  protected readonly url = signal('');
  private readonly files = inject(AcademyAssets);
  constructor() {
    effect((cleanup) => {
      const id = this.id();
      let disposed = false;
      let url = '';
      this.url.set('');
      if (id)
        this.files
          .url(id)
          .then((value) => {
            url = value;
            if (disposed) URL.revokeObjectURL(value);
            else this.url.set(value);
          })
          .catch(() => {});
      cleanup(() => {
        disposed = true;
        if (url) URL.revokeObjectURL(url);
      });
    });
  }
}
