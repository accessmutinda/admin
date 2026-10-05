import { Component, input } from '@angular/core';
import { Logo } from '../ui/logo';

@Component({
  selector: 'cv-auth-centered-layout',
  imports: [Logo],
  template: `
    <div
      class="flex min-h-screen w-full flex-col items-center bg-cloud bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,color-mix(in_srgb,var(--color-teal)_7%,transparent),transparent)] px-4 py-6 sm:px-6 sm:py-12"
    >
      <div
        class="cv-enter w-full {{
          widthClass()
        }} rounded-2xl border border-line bg-white p-6 shadow-card sm:p-10"
      >
        <div class="mb-6 flex justify-center sm:mb-7">
          <cv-logo size="lg" />
        </div>
        <ng-content />
      </div>
    </div>
  `,
})
export class AuthCenteredLayout {
  readonly width = input<'sm' | 'md'>('sm');
  protected widthClass(): string {
    return this.width() === 'md' ? 'max-w-lg' : 'max-w-sm';
  }
}
