import { Component } from '@angular/core';
import { Logo } from '../ui/logo';

@Component({
  selector: 'cv-auth-split-layout',
  imports: [Logo],
  template: `
    <div class="flex min-h-screen w-full flex-col lg:flex-row">
      <aside
        class="relative flex w-full flex-col justify-between gap-5 overflow-hidden bg-navy px-6 py-7 text-white sm:px-12 sm:py-10 lg:w-[44%] lg:gap-0 lg:px-16 lg:py-14"
      >
        <div
          class="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(1px_1px_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] [background-size:22px_22px]"
        ></div>
        <div
          class="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-teal/10 blur-3xl"
        ></div>
        <div
          class="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-brand-blue/10 blur-3xl"
        ></div>

        <cv-logo tone="light" size="hero" class="relative z-10 block" />

        <div class="relative z-10 text-center lg:max-w-sm lg:text-left">
          <h1 class="text-2xl font-bold leading-[1.08] tracking-tight sm:text-3xl lg:text-[2.75rem]">
            Secure Care.<span class="text-teal lg:block"> Brighter Tomorrows.</span>
          </h1>
          <p class="mt-4 hidden text-sm leading-relaxed text-white/60 lg:block">
            The complete care management platform for modern care providers.
          </p>

          <ul
            class="mt-5 hidden flex-wrap justify-center gap-x-6 gap-y-3 text-sm sm:flex lg:mt-8 lg:flex-col lg:justify-start lg:gap-4"
          >
            @for (item of checklist; track item.label) {
              <li class="flex items-center gap-3">
                <span
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] ring-1 ring-white/10"
                >
                  <span class="material-symbols-outlined text-[16px] text-teal">{{ item.icon }}</span>
                </span>
                <span class="font-medium text-white/90">{{ item.label }}</span>
              </li>
            }
          </ul>
        </div>

        <div class="relative z-10 mt-10 hidden lg:block">
          <p class="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/35">
            Trusted by care providers across the UK
          </p>
          <div
            class="mt-4 flex items-stretch overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-float backdrop-blur-sm"
          >
            @for (stat of stats; track stat.label; let last = $last) {
              <div class="flex-1 px-4 py-5 text-center {{ last ? '' : 'border-r border-white/10' }}">
                <p class="text-2xl font-bold tracking-tight text-white">{{ stat.value }}</p>
                <p class="mt-1 text-[11px] leading-tight text-white/45">{{ stat.label }}</p>
              </div>
            }
          </div>
        </div>
      </aside>

      <main
        class="relative flex w-full flex-1 flex-col items-center justify-center bg-white px-6 py-6 sm:px-10 sm:py-10 lg:py-12"
      >
        <!-- In flow above the form on small screens; pinned to the corner once
             the form has a full-height column to itself. -->
        <button
          type="button"
          class="mb-6 flex items-center gap-1.5 self-end rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-slate transition-colors hover:border-slate/40 hover:text-ink lg:absolute lg:right-10 lg:top-10 lg:mb-0"
        >
          <span class="material-symbols-outlined text-[16px] text-slate">language</span>
          English (UK)
          <span class="material-symbols-outlined text-[16px]">expand_more</span>
        </button>

        <div class="cv-enter w-full max-w-md">
          <ng-content />
        </div>
      </main>
    </div>
  `,
})
export class AuthSplitLayout {
  protected readonly checklist = [
    { icon: 'shield_lock', label: 'Secure and compliant' },
    { icon: 'favorite', label: 'Built for care providers' },
    { icon: 'fact_check', label: 'CQC evidence-ready' },
  ];

  protected readonly stats = [
    { value: '500', label: 'Care companies' },
    { value: '50,000+', label: 'Care workers' },
    { value: '250,000+', label: 'Service users' },
  ];
}
