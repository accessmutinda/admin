import { Component, ViewEncapsulation, input } from '@angular/core';

@Component({
  selector: 'section[cvQuickActions]',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'cv-quick-actions co-actions co-surface',
    '[attr.aria-labelledby]': 'headingId()',
  },
  template: `
    <div class="co-section-header">
      <h2 [id]="headingId()">
        <span class="material-symbols-outlined" aria-hidden="true">bolt</span>Quick Actions
      </h2>
    </div>
    <div class="co-action-list" [style.--quick-action-count]="actionCount()"><ng-content /></div>
  `,
  styles: [
    `
      .cv-management .module-page .cv-quick-actions {
        display: flex;
        flex-direction: column;
        padding: 8px;
        border: 1px solid #e9eff3;
        border-radius: 9px;
        background: linear-gradient(120deg, #fff, #fcfefe);
        box-shadow: 0 2px 7px #123c541f;
      }
      .cv-management .module-page .cv-quick-actions > .co-section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-height: 30px;
        margin-bottom: 6px;
      }
      .cv-management .module-page .cv-quick-actions .co-section-header h2 {
        display: flex;
        align-items: center;
        gap: 9px;
        margin: 0;
        color: #002b60;
        font: 800 14px/1.4 var(--font-sans);
        letter-spacing: -0.35px;
      }
      .cv-management
        .module-page
        .cv-quick-actions
        .co-section-header
        h2
        > .material-symbols-outlined {
        color: #00528c;
        font-size: 20px;
        font-variation-settings: 'FILL' 1;
      }
      .cv-management .module-page .cv-quick-actions .co-action-list {
        display: grid;
        grid-template-rows: repeat(var(--quick-action-count, 5), minmax(27px, 1fr));
        flex: 1;
        gap: 6px;
      }
      .cv-management .module-page .cv-quick-actions .co-action-list > :is(a, button) {
        display: flex;
        align-items: center;
        box-sizing: border-box;
        width: 100%;
        gap: 13px;
        padding: 3px 8px;
        min-height: 27px;
        border: 1px solid #dfe6eb;
        border-radius: 5px;
        background: linear-gradient(#fff, #f9fcfd);
        color: #16375b;
        font: 400 12px/1.5 var(--font-sans);
        text-align: left;
        text-decoration: none;
        cursor: pointer;
      }
      .cv-management
        .module-page
        .cv-quick-actions
        .co-action-list
        > :is(a, button)
        > .material-symbols-outlined {
        flex-shrink: 0;
        font-size: 24px;
      }
      .cv-management
        .module-page
        .cv-quick-actions
        .co-action-list
        > :is(a, button)
        > .material-symbols-outlined:last-child:not(:first-child) {
        margin-left: auto;
        font-size: 18px;
      }
      .cv-management .module-page .cv-quick-actions .co-action-list > .co-primary {
        color: white;
        background: linear-gradient(#07577b, #00375e);
        border-color: #00456b;
      }
      .cv-management
        .module-page
        .cv-quick-actions
        .co-action-list
        > :is(a, button):hover:not(:disabled) {
        box-shadow: 0 0 0 2px #00a4ce30;
      }
      .cv-management .module-page .cv-quick-actions .co-action-list > :is(a, button):focus-visible {
        outline: 2px solid #008bd9;
        outline-offset: 2px;
      }
      .cv-management .module-page .cv-quick-actions .co-action-list > button:disabled {
        opacity: 0.5;
        cursor: default;
      }
      @media (pointer: coarse) {
        .cv-management .module-page .cv-quick-actions .co-action-list > :is(a, button) {
          min-height: 44px;
        }
      }
      @media print {
        .cv-quick-actions {
          display: none !important;
        }
      }
    `,
  ],
})
export class QuickActions {
  readonly headingId = input.required<string>();
  readonly actionCount = input(5);
}
