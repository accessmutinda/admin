import { Component, inject, input } from '@angular/core';
import { AcademyService } from './academy.service';
import { AcademyDate } from './academy-date';
import { AcademySyncStatus } from './academy.models';
@Component({
  selector: 'cv-academy-timeline',
  imports: [AcademyDate],
  template: `<section class="timeline" aria-label="Completion evidence workflow">
    <h2>Automatic post-pass workflow</h2>
    <p class="state" role="status">
      {{ completion()?.status ?? 'No verified integration workflow recorded' }}
    </p>
    <ol>
      @for (step of steps; track step.label) {
        <li [class.acknowledged]="ack(step.stage)">
          <span class="material-symbols-outlined" aria-hidden="true">{{
            ack(step.stage) ? 'check_circle' : step.icon
          }}</span
          ><strong>{{ step.label }}</strong
          ><small>{{ ack(step.stage) ? 'Acknowledged' : 'Pending' }}</small>
          @if (ack(step.stage); as a) {
            <small>{{ a.at | ukDate: 'd MMM, HH:mm' }}</small
            ><small>{{ a.reference }}</small>
          }
        </li>
      }
    </ol>
    @if (completion(); as c) {
      <p>{{ c.error }}</p>
      <small>Trace {{ c.correlationId }} · Result {{ c.id }}</small>
    }
    <p>
      Knowledge completion, practical competency and visit-specific deployment readiness are
      assessed separately.
    </p>
  </section>`,
  styles: [
    `
      :host {
        display: block;
        font: 400 12px/1.5 var(--font-sans, Lato, sans-serif);
      }
      .timeline {
        padding: 8px;
        border: 1px solid #e9eff3;
        border-radius: 9px;
        background: linear-gradient(120deg, #fff, #fcfefe);
        margin-bottom: 12px;
      }
      h2 {
        font-size: 14px;
        color: #002b60;
        margin: 0 0 6px;
      }
      p,
      small {
        font-size: 12px;
        color: #657184;
        overflow-wrap: anywhere;
      }
      .state {
        color: #9b6200;
        font-weight: 700;
      }
      ol {
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 8px 6px;
        list-style: none;
        padding: 0;
      }
      li {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        text-align: center;
        border: 1px solid #e5edf1;
        border-radius: 7px;
        padding: 8px;
        background: #f6fafc;
        font-size: 12px;
        color: #123352;
      }
      li > span {
        font-size: 20px;
        color: #677488;
      }
      li.acknowledged {
        background: #edf9ef;
        border-color: #b9e5c2;
      }
      .acknowledged > span {
        color: #168833;
      }
      small {
        display: block;
      }
      @media (max-width: 850px) {
        ol {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }
      @media (max-width: 480px) {
        ol {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    `,
  ],
})
export class AcademyTimeline {
  protected readonly academy = inject(AcademyService);
  readonly assignmentId = input.required<string>();
  protected completion() {
    return this.academy.completion(this.assignmentId());
  }
  protected ack(stage: AcademySyncStatus) {
    return this.completion()?.acknowledgements.find((a) => a.stage === stage);
  }
  protected readonly steps: { stage: AcademySyncStatus; label: string; icon: string }[] = [
    { stage: 'CERTIFICATE_GENERATED', label: 'Certificate generated', icon: 'workspace_premium' },
    { stage: 'TRAINING_RECORD_PENDING', label: 'Filed in staff HR', icon: 'folder' },
    { stage: 'COMPLIANCE_PENDING', label: 'Training record & matrix', icon: 'grid_view' },
    { stage: 'ROTA_REFRESH_PENDING', label: 'Compliance recalculated', icon: 'verified_user' },
    { stage: 'COMPLETE_SYNCED', label: 'Rota refreshed', icon: 'event_available' },
    { stage: 'COMPLETE_SYNCED', label: 'Workflow complete', icon: 'task_alt' },
  ];
}
