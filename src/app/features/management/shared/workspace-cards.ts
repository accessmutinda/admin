import { Component, ViewEncapsulation, input } from '@angular/core';

@Component({
  selector: 'section[cvWorkspaceCards]',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'cv-workspace-cards co-checklist co-surface',
    '[attr.aria-labelledby]': 'headingId()',
  },
  template: `<div class="co-section-header">
      <h2 [id]="headingId()">
        <span class="material-symbols-outlined" aria-hidden="true">{{ icon() }}</span
        >{{ title() }}
      </h2>
    </div>
    <div class="co-check-grid"><ng-content /></div>`,
  styles: [
    `
      .cv-management .module-page .cv-workspace-cards {
        padding: 8px;
        min-width: 0;
      }
      .cv-management .module-page .cv-workspace-cards > .co-section-header {
        display: flex;
        align-items: center;
        min-height: 30px;
        margin-bottom: 6px;
      }
      .cv-management .module-page .cv-workspace-cards .co-section-header h2 {
        display: flex;
        align-items: center;
        gap: 9px;
        margin: 0;
        color: #002b60;
        font: 800 14px/1.4 var(--font-sans);
      }
      .cv-management .module-page .cv-workspace-cards .co-section-header h2 > span {
        font-size: 20px;
        color: #00528c;
        font-variation-settings: 'FILL' 1;
      }
      .cv-management .module-page .cv-workspace-cards .co-check-card {
        text-align: left;
        text-decoration: none;
        cursor: pointer;
      }
      .cv-management .module-page .cv-workspace-cards .co-check-card > .material-symbols-outlined {
        font-size: 25px;
        color: #008d9f;
        flex-shrink: 0;
        font-variation-settings: 'FILL' 1;
      }
      .cv-management .module-page .cv-workspace-cards .co-check-card h3 {
        margin: 0;
        color: #06376b;
        font: 700 12px/1.35 var(--font-sans);
      }
      .cv-management .module-page .cv-workspace-cards .co-check-card p {
        margin: 2px 0 4px;
        color: #6b7688;
        font: 400 11px/1.35 var(--font-sans);
      }
      .cv-management .module-page .cv-workspace-cards .workspace-card-state {
        margin-top: auto;
        color: #657184;
        font-size: 11px;
      }
      .cv-management .module-page .cv-workspace-cards .co-check-card:focus-visible {
        outline: 2px solid #008bd9;
        outline-offset: 2px;
      }
      @media (max-width: 1100px) {
        .cv-management .module-page .cv-workspace-cards .co-check-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 540px) {
        .cv-management .module-page .cv-workspace-cards .co-check-grid {
          grid-template-columns: minmax(0, 1fr);
        }
      }
    `,
  ],
})
export class WorkspaceCards {
  readonly headingId = input.required<string>();
  readonly title = input.required<string>();
  readonly icon = input('dashboard');
}
