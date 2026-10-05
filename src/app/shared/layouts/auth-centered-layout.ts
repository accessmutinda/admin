import { Component, input } from '@angular/core';
import { Logo } from '../ui/logo';

@Component({
  selector: 'cv-auth-centered-layout',
  imports: [Logo],
  template: `
    <div class="cv-auth-shell cv-auth-flow">
      <div class="cv-auth-flow-panel cv-enter w-full {{ widthClass() }}">
        <header class="cv-auth-flow-logo"><cv-logo /></header>
        <main><ng-content /></main>
        <p class="cv-auth-flow-support">
          Need a hand?
          <a class="cv-auth-link" href="mailto:support@careverity.com"
            >Contact support <span aria-hidden="true">↗</span></a
          >
        </p>
        <p class="cv-auth-flow-footer">
          CareVerity <span aria-hidden="true">·</span> People. Purpose. Progress.
        </p>
      </div>
    </div>
  `,
})
export class AuthCenteredLayout {
  readonly width = input<'sm' | 'md' | 'lg'>('sm');
  protected widthClass(): string {
    return this.width() === 'lg'
      ? 'cv-auth-flow-panel-wide max-w-[38rem]'
      : this.width() === 'md'
        ? 'max-w-[30rem]'
        : 'max-w-[28rem]';
  }
}
