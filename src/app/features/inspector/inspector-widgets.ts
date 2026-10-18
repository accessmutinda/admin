import { Component, input } from '@angular/core';
import { QUESTIONS, InspectionDraft, InspectorDocument } from './inspector.models';
export interface InspectionMetric {
  label: string;
  value: string | number;
  detail: string;
  icon: string;
  color?: string;
  progress?: number;
}
@Component({
  selector: 'cv-inspection-metrics',
  template: `<div class="metrics">
    @for (metric of items(); track metric.label) {
      <article>
        <span
          class="material-symbols-outlined"
          aria-hidden="true"
          [style.color]="metric.color || '#008afa'"
          >{{ metric.icon }}</span
        >
        <div>
          <h3>{{ metric.label }}</h3>
          <strong>{{ metric.value }}</strong>
          <p>{{ metric.detail }}</p>
          @if (metric.progress !== undefined) {
            <progress
              max="100"
              [value]="metric.progress"
              [attr.aria-label]="metric.label + ': ' + metric.progress + '%'"
            ></progress>
          }
        </div>
      </article>
    }
  </div>`,
  styles: [
    `
      :host {
        display: block;
        margin-bottom: 12px;
      }
      .metrics {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(155px, 1fr));
        gap: 10px 8px;
      }
      article {
        display: flex;
        flex-direction: row-reverse;
        justify-content: space-between;
        gap: 14px;
        padding: 8px 9px 7px 13px;
        border: 1px solid #e9eff3;
        border-radius: 9px;
        background: linear-gradient(120deg, #fff, #fcfefe);
        box-shadow: 0 2px 7px #123c541f;
        min-height: 86px;
      }
      article > div {
        min-width: 0;
        flex: 1;
      }
      .material-symbols-outlined {
        font-size: 25px;
        margin-top: 3px;
      }
      h3 {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: -0.15px;
        color: #002b60;
        margin: 0;
      }
      strong {
        display: block;
        font-size: 20px;
        line-height: 1.15;
        margin: 2px 0;
        color: #081334;
      }
      p {
        font-size: 11px;
        color: #6c7587;
        margin: 0;
      }
      progress {
        appearance: none;
        width: 100%;
        height: 6px;
        border: 0;
        border-radius: 5px;
        overflow: hidden;
        margin-top: 6px;
        background: #e8eef1;
      }
      progress::-webkit-progress-bar {
        background: #e8eef1;
      }
      progress::-webkit-progress-value {
        background: linear-gradient(90deg, #35c07d, #27b969);
      }
      progress::-moz-progress-bar {
        background: #27b969;
      }
      @media (max-width: 760px) {
        .metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .metrics article:last-child:nth-child(odd) {
          grid-column: 1/-1;
        }
      }
    `,
  ],
})
export class InspectionMetrics {
  readonly items = input<InspectionMetric[]>([]);
}
@Component({
  selector: 'cv-inspection-questions',
  template: `<div class="questions">
    @for (question of questions; track question.key) {
      <article>
        <div>
          <span
            class="material-symbols-outlined"
            aria-hidden="true"
            [style.background]="question.color"
            >{{ question.icon }}</span
          >
          <h3>{{ question.key }}</h3>
        </div>
        <strong
          [class.concern]="
            ['Requires improvement', 'Inadequate'].includes(draft().ratings[question.key])
          "
          >{{ draft().ratings[question.key] || 'Not assessed' }}</strong
        >
        <p>
          {{ count(question.key) }} linked evidence
          {{ count(question.key) === 1 ? 'item' : 'items' }}
        </p>
        <small>Inspector recommendation</small>
      </article>
    }
  </div>`,
  styles: [
    `
      :host {
        display: block;
      }
      .questions {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 6px;
      }
      article {
        background: #f6fafc;
        border: 1px solid #edf2f5;
        border-radius: 7px;
        padding: 10px;
      }
      article > div {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }
      .material-symbols-outlined {
        border-radius: 50%;
        padding: 6px;
        color: #fff;
        font-size: 21px;
      }
      h3 {
        font-size: 12px;
        font-weight: 700;
        margin: 0;
        color: #06376b;
      }
      strong {
        display: block;
        color: #087337;
        font-size: 14px;
        line-height: 1.3;
      }
      .concern {
        color: #b55a00;
      }
      p {
        font-size: 11px;
        color: #657184;
        margin: 6px 0;
      }
      small {
        font-size: 10px;
        color: #657184;
      }
      @media (max-width: 1100px) {
        .questions {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }
      @media (max-width: 540px) {
        .questions {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        article {
          padding: 8px;
        }
        article:last-child {
          grid-column: 1/-1;
        }
      }
    `,
  ],
})
export class InspectionQuestions {
  readonly questions = QUESTIONS;
  readonly draft = input.required<InspectionDraft>();
  readonly documents = input<InspectorDocument[]>([]);
  count(question: string): number {
    return this.documents().filter((d) => d.questions.some((q) => q === question)).length;
  }
}
@Component({
  selector: 'cv-inspection-fields',
  template: `@if (isArray(value())) {
      @for (item of array(value()); track $index) {
        <div class="item"><cv-inspection-fields [value]="item" /></div>
      } @empty {
        <p>No records available.</p>
      }
    } @else if (isObject(value())) {
      <dl>
        @for (item of entries(value()); track item[0]) {
          <div>
            <dt>{{ label(item[0]) }}</dt>
            <dd><cv-inspection-fields [value]="item[1]" /></dd>
          </div>
        } @empty {
          <p>Not recorded.</p>
        }
      </dl>
    } @else {
      <span>{{ display(value()) }}</span>
    }`,
  styles: [
    `
      :host {
        display: block;
        overflow-wrap: anywhere;
      }
      dl {
        margin: 0;
      }
      dl > div {
        display: grid;
        grid-template-columns: minmax(90px, 1fr) minmax(0, 2fr);
        gap: 12px;
        border-bottom: 1px solid #edf2f5;
        padding: 7px 0;
      }
      dt {
        color: #657184;
        font-size: 11px;
      }
      dd {
        margin: 0;
        min-width: 0;
      }
      .item {
        padding: 7px;
        border: 1px solid #e9eff3;
        border-radius: 5px;
        margin-bottom: 6px;
      }
      p {
        color: #657184;
        font-size: 11px;
        margin: 4px 0;
      }
      span {
        white-space: pre-wrap;
      }
      @media (max-width: 540px) {
        dl > div {
          grid-template-columns: 1fr;
          gap: 3px;
        }
      }
    `,
  ],
})
export class InspectionFields {
  readonly value = input<unknown>();
  isArray(value: unknown): boolean {
    return Array.isArray(value);
  }
  isObject(value: unknown): boolean {
    return typeof value === 'object' && value !== null;
  }
  array(value: unknown): unknown[] {
    return value as unknown[];
  }
  entries(value: unknown): [string, unknown][] {
    return Object.entries(value as Record<string, unknown>).filter(
      ([key]) =>
        !['content', 'data', 'signature', 'userId', 'id', 'personId', 'photo'].includes(key),
    );
  }
  label(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
  }
  display(value: unknown): string {
    return value === null || value === undefined || value === ''
      ? 'Not recorded'
      : typeof value === 'boolean'
        ? value
          ? 'Yes'
          : 'No'
        : String(value);
  }
}
