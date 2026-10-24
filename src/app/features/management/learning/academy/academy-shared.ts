import { Component, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AcademyService } from './academy.service';

@Component({
  selector: 'cv-academy-admin-nav',
  imports: [RouterLink, RouterLinkActive],
  template: ` <nav class="academy-nav" aria-label="Training administration">
    <a routerLink="/manage/learning">Academy home</a>
    @for (link of links; track link.path) {
      <a
        [routerLink]="['/manage/learning', link.path]"
        routerLinkActive="active"
        ariaCurrentWhenActive="page"
        ><span class="material-symbols-outlined" aria-hidden="true">{{ link.icon }}</span
        >{{ link.label }}</a
      >
    }
  </nav>`,
  styles: [
    `
      .academy-nav {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 12px;
      }
      .academy-nav a {
        display: flex;
        align-items: center;
        gap: 6px;
        min-height: 36px;
        padding: 6px 10px;
        border: 1px solid #e5edf1;
        border-radius: 6px;
        background: #fff;
        color: #123352;
        font-size: 12px;
        text-decoration: none;
      }
      .academy-nav .active {
        border-color: #008afa;
        background: #eaf5fc;
        color: #007bcc;
      }
      .material-symbols-outlined {
        font-size: 18px;
      }
      a:focus-visible {
        outline: 2px solid #008bd9;
        outline-offset: 2px;
      }
      @media (pointer: coarse) {
        .academy-nav a {
          min-height: 44px;
        }
      }
    `,
  ],
})
export class AcademyAdminNav {
  readonly links = [
    { path: 'courses', label: 'Courses & content', icon: 'menu_book' },
    { path: 'manage', label: 'Manage training', icon: 'groups' },
    { path: 'questions', label: 'Question bank', icon: 'quiz' },
    { path: 'assets', label: 'Asset library', icon: 'perm_media' },
    { path: 'reports', label: 'Compliance & reports', icon: 'monitoring' },
    { path: 'settings', label: 'Academy settings', icon: 'settings' },
  ];
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
