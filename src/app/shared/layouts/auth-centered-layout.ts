import { Component, input } from '@angular/core';
import { Logo } from '../ui/logo';

@Component({
  selector: 'cv-auth-centered-layout',
  imports: [Logo],
  template: `
    <div class="cv-auth-shell flex min-h-screen flex-col bg-cloud px-4 py-8 sm:px-6 sm:py-10">
      <header class="mx-auto w-full max-w-6xl px-2"><cv-logo /></header>
      <main class="flex flex-1 items-center justify-center py-10 sm:py-14">
        <div
          class="cv-enter w-full {{
            widthClass()
          }} rounded-2xl border border-line/80 bg-white p-6 shadow-[0_2px_12px_rgba(15,45,74,0.035)] sm:p-9"
        >
          <ng-content />
        </div>
      </main>
      <p class="text-center text-xs text-slate">
        Need help?
        <a class="cv-auth-link ml-1" href="mailto:support@careverity.com">Contact support</a>
      </p>
    </div>
  `,
})
export class AuthCenteredLayout {
  readonly width = input<'sm' | 'md'>('sm');
  protected widthClass(): string {
    return this.width() === 'md' ? 'max-w-[30rem]' : 'max-w-[28rem]';
  }
}
