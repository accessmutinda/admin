import { Component, input } from '@angular/core';
import { AuthCenteredLayout } from './auth-centered-layout';
import { AuthSplitLayout } from './auth-split-layout';
import { Skeleton } from '../ui/skeleton';
import { NgTemplateOutlet } from '@angular/common';
@Component({
  selector: 'cv-auth-loading',
  imports: [AuthCenteredLayout, AuthSplitLayout, Skeleton, NgTemplateOutlet],
  host: { role: 'status', 'aria-label': 'Loading authentication', 'aria-busy': 'true' },
  template: `
    @if (path().includes('sign-in') || path() === '/') {
      <cv-auth-split-layout
        ><cv-skeleton sizeClass="h-8 w-52 max-w-full" />
        <cv-skeleton sizeClass="mt-3 h-3 w-64 max-w-full" />
        <ng-container [ngTemplateOutlet]="fields"
      /></cv-auth-split-layout>
    } @else {
      <cv-auth-centered-layout width="md"
        ><cv-skeleton sizeClass="h-8 w-52 max-w-full" /> <ng-container [ngTemplateOutlet]="fields"
      /></cv-auth-centered-layout>
    }
    <ng-template #fields
      ><div class="mt-6" aria-hidden="true">
        @for (label of labels(); track label) {
          <cv-skeleton sizeClass="mb-2 h-3 w-24" />
          <cv-skeleton sizeClass="mb-5 h-12 w-full" />
        }
        <cv-skeleton sizeClass="mt-5 h-12 w-full" />
      </div>
      <span class="sr-only">Restoring your session.</span></ng-template
    >
  `,
})
export class AuthLoading {
  readonly path = input('/auth/sign-in');
  protected labels(): string[] {
    const path = this.path();
    return path.includes('change-password')
      ? ['Current password', 'New password', 'Confirm new password']
      : path.includes('mfa')
        ? ['Authenticator code']
        : path.includes('workspace')
          ? ['Search companies']
          : path.includes('invite')
            ? ['Invitation details']
            : path.includes('sign-in') || path === '/'
              ? ['Email address', 'Password']
              : ['Account details'];
  }
}
