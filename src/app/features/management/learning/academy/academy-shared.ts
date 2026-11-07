import { Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'cv-academy-admin-nav',
  imports: [RouterLink],
  template: `<nav class="academy-breadcrumb" aria-label="Breadcrumb">
    <a routerLink="/manage/learning">CareVerity Academy</a>
    @if (section()) {
      <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span
      ><span aria-current="page">{{ section() }}</span>
    }
  </nav>`,
  styles: [
    `
      :host {
        display: block;
      }
      .academy-breadcrumb {
        display: flex;
        align-items: center;
        gap: 6px;
        min-height: 16px;
        margin-bottom: 8px;
        color: #657184;
        font: 11px/16px var(--font-sans);
      }
      a {
        color: #536781;
        text-decoration: none;
      }
      a:focus-visible {
        outline: 2px solid #008bd9;
        outline-offset: 2px;
      }
      .material-symbols-outlined {
        font-size: 16px;
      }
    `,
  ],
})
export class AcademyAdminNav {
  private readonly router = inject(Router);
  protected section() {
    const path = this.router.url.split(/[?#]/)[0].split('/')[3] ?? '';
    return (
      (
        {
          courses: 'Courses & content',
          manage: 'Staff assignments',
          questions: 'Question bank',
          results: 'Results & retakes',
          certificates: 'Certificates & compliance',
          reports: 'Compliance & reports',
          settings: 'Academy settings',
          governance: 'Policies & reviews',
          diagnostics: 'Restricted diagnostics',
          content: 'Lesson content',
          structure: 'Modules & lessons',
          rules: 'Assessment rules & assignments',
          publish: 'Review & publish',
        } as Record<string, string>
      )[path] ?? 'Dashboard'
    );
  }
}
@Component({
  selector: 'cv-academy-message',
  template: `@if (error()) {
      <p class="feedback error" role="alert">{{ error() }}</p>
    }
    @if (notice()) {
      <p class="feedback saved" role="status">{{ notice() }}</p>
    }`,
  styles: [
    `
      .feedback {
        padding: 10px 12px;
        border-radius: 7px;
        font-size: 12px;
      }
      .error {
        color: #a82437;
        background: #fff0f2;
      }
      .saved {
        color: #087337;
        background: #e5f8ed;
      }
    `,
  ],
})
export class AcademyMessage {
  readonly error = input('');
  readonly notice = input('');
}
