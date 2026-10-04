import { Component, input } from '@angular/core';

@Component({
  selector: 'cv-skeleton',
  template: ` <span class="block animate-pulse rounded-md bg-line/70 {{ sizeClass() }}"></span> `,
})
export class Skeleton {
  readonly sizeClass = input('h-4 w-full');
}
