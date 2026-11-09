import { Component, input } from '@angular/core';

@Component({
  selector: 'cv-skeleton',
  host: { 'aria-hidden': 'true', class: 'block' },
  template: `
    <span
      class="block animate-pulse motion-reduce:animate-none rounded-md bg-line/70 {{ sizeClass() }}"
    ></span>
  `,
})
export class Skeleton {
  readonly sizeClass = input('h-4 w-full');
}
