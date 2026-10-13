import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'cv-security-page-header',
  imports: [RouterLink],
  template: `
    <div class="page-heading">
      <div>
        <p class="eyebrow">YOUR ACCOUNT</p>
        <h1>Account security</h1>
        <p>Keep your sign-in details, authentication and devices in view.</p>
      </div>
      <a class="button" routerLink="/manage/companies">
        <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>Back to
        workspace
      </a>
    </div>
    <nav class="tabs" aria-label="Account security sections">
      <a
        class="security-tab"
        routerLink="/account/security"
        [class.active]="active() === 'overview'"
        [attr.aria-current]="active() === 'overview' ? 'page' : null"
      >
        <span class="material-symbols-outlined" aria-hidden="true">shield</span>Security overview
      </a>
      <a
        class="security-tab"
        routerLink="/account/security/login-history"
        [class.active]="active() === 'activity'"
        [attr.aria-current]="active() === 'activity' ? 'page' : null"
      >
        <span class="material-symbols-outlined" aria-hidden="true">devices</span>Login activity &
        devices
      </a>
    </nav>
  `,
})
export class SecurityPageHeader {
  readonly active = input.required<'overview' | 'activity'>();
}
