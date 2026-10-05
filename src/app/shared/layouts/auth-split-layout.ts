import { Component } from '@angular/core';
import { Logo } from '../ui/logo';

@Component({
  selector: 'cv-auth-split-layout',
  imports: [Logo],
  template: `
    <div class="cv-auth-shell flex min-h-screen flex-col bg-white lg:flex-row">
      <aside
        class="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-navy px-12 py-12 text-white lg:flex xl:px-16"
      >
        <div
          class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(0,168,150,0.12),transparent_65%)]"
        ></div>
        <cv-logo tone="light" class="relative z-10 block" />
        <div class="relative z-10 max-w-sm py-16">
          <span class="mb-8 block h-1 w-10 rounded-full bg-teal"></span>
          <h2 class="text-[2.75rem] font-semibold leading-[1.15] tracking-tight xl:text-5xl">
            Secure care.<br /><span class="text-white/75">Brighter tomorrows.</span>
          </h2>
          <p class="mt-6 max-w-xs text-base leading-7 text-white/65">
            A connected workspace for the people who make better care possible.
          </p>
          <ul class="mt-8 space-y-4 text-sm">
            @for (item of checklist; track item.label) {
              <li class="flex items-center gap-3">
                <span aria-hidden="true" class="material-symbols-outlined text-[20px] text-teal"
                  >check_circle</span
                >
                <span class="text-white/85">{{ item.label }}</span>
              </li>
            }
          </ul>
        </div>
        <p class="relative z-10 flex items-center gap-2 text-xs text-white/60">
          <span aria-hidden="true" class="material-symbols-outlined text-[16px]">shield</span>
          Built for care providers across the UK
        </p>
      </aside>
      <main class="flex min-h-screen flex-1 flex-col px-6 py-8 sm:px-10 lg:px-16 lg:py-12">
        <div class="lg:hidden"><cv-logo /></div>
        <div class="flex flex-1 items-center justify-center py-12 lg:py-16">
          <div class="cv-enter w-full max-w-[25rem]"><ng-content /></div>
        </div>
        <p class="text-center text-xs text-slate">
          Need help?
          <a class="cv-auth-link ml-1" href="mailto:support@careverity.com">Contact support</a>
        </p>
      </main>
    </div>
  `,
})
export class AuthSplitLayout {
  protected readonly checklist = [
    { label: 'Secure and compliant' },
    { label: 'Built for care providers' },
    { label: 'CQC evidence-ready' },
  ];
}
