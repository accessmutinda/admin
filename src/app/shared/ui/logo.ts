import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'cv-logo',
  template: ` <img [src]="src()" alt="CareVerity" class="{{ sizeClass() }}" /> `,
})
export class Logo {
  /** 'dark' = full-colour logo for light backgrounds. 'light' = white/teal reversed logo for navy backgrounds. */
  readonly tone = input<'light' | 'dark'>('dark');
  /** 'default' = compact header lockup. 'lg' = larger standalone mark, e.g. above a centered card. 'hero' = fills most of its container's width — for the sign-in branding panel. */
  readonly size = input<'default' | 'lg' | 'hero'>('default');

  protected readonly src = computed(() =>
    this.tone() === 'light' ? '/brand/logo-full-reversed.png' : '/brand/logo-full.png',
  );

  protected readonly sizeClass = computed(() => {
    if (this.size() === 'hero') {
      return 'block w-[70%] h-auto mx-auto';
    }
    if (this.size() === 'lg') {
      return this.tone() === 'light' ? 'h-14 w-auto' : 'h-12 w-auto';
    }
    return this.tone() === 'light' ? 'h-12 w-auto' : 'h-9 w-auto';
  });
}
