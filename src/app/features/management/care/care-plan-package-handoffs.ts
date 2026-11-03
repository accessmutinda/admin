import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CarePlanService } from './care-plan.service';
import { PackageHandoff } from './care-plan.models';

@Component({
  selector: 'cv-care-plan-package-handoffs',
  imports: [FormsModule, DatePipe, RouterLink],
  styleUrls: [
    './care-shared.css',
    './care-controls.css',
    './care-plan.css',
    './care-plan-demo-workflows.css',
  ],
  template: `<section class="plan-card demo-workflow">
    <div class="card-heading">
      <div>
        <p class="eyebrow">CARE PLAN → ROTA · DEMO</p>
        <h2>Care-package handoffs</h2>
      </div>
      @if (!rotaMode()) {
        <a
          class="button"
          routerLink="/manage/rota/call-packages"
          [queryParams]="{ client: clientId() }"
          >Open rota handoffs</a
        >
      }
    </div>
    <p class="message">
      Simulated handoff only. These steps do not alter recurring calls or published allocations.
    </p>
    @if (error()) {
      <p class="message error" role="alert">{{ error() }}</p>
    }
    @if (notice()) {
      <p class="message success" role="status">{{ notice() }}</p>
    }
    @for (row of rows(); track row.handoff.id) {
      <article class="demo-handoff">
        <div class="card-heading">
          <strong>{{ row.client.name }} · v{{ row.handoff.version }}</strong
          ><span class="pill">{{ row.handoff.status }}</span>
        </div>
        <p>{{ row.handoff.proposal }}</p>
        <ol class="demo-stages" aria-label="Handoff progress">
          @for (step of steps; track step; let i = $index) {
            <li
              [class.done]="steps.indexOf(row.handoff.status) >= i"
              [attr.aria-current]="row.handoff.status === step ? 'step' : null"
            >
              {{ step }}
            </li>
          }
        </ol>
        @if (row.handoff.status === 'Authorised' && service.canEdit()) {
          <button
            type="button"
            class="button primary"
            (click)="advance(row.client.id, row.handoff, row.revision)"
          >
            Send to rota queue
          </button>
        }
        @if (row.handoff.status === 'Awaiting rota update' && rotaMode() && service.canEdit()) {
          <label
            >Simulated update / completion note<textarea
              rows="2"
              [(ngModel)]="notes[row.handoff.id]"
              placeholder="Describe the demo package update and outcome"
            ></textarea>
          </label>
          <button
            type="button"
            class="button primary"
            (click)="advance(row.client.id, row.handoff, row.revision)"
          >
            Complete simulated rota update
          </button>
        }
        @if (row.handoff.note) {
          <p><strong>Completion note:</strong> {{ row.handoff.note }}</p>
        }
        <details>
          <summary>Handoff history</summary>
          @for (event of row.handoff.events; track $index) {
            <p>
              {{ event.action }} · {{ event.by }} · {{ event.at | date: 'dd MMM yyyy, HH:mm'
              }}<br />{{ event.detail }}
            </p>
          }
        </details>
        @if (rotaMode()) {
          <a
            [routerLink]="['/manage/care-plans', row.client.id]"
            [queryParams]="{ view: 'care-plan', stage: 'package', version: row.handoff.versionId }"
            >Return to care-plan recommendation</a
          >
        }
      </article>
    } @empty {
      <p>
        No authorised recommendations yet. Save a package change in the care-plan review, then ask a
        different manager to authorise it.
      </p>
    }
  </section>`,
})
export class CarePlanPackageHandoffs {
  readonly clientId = input('');
  readonly rotaMode = input(false);
  readonly changed = output<void>();
  protected readonly service = inject(CarePlanService);
  protected readonly steps: PackageHandoff['status'][] = [
    'Authorised',
    'Awaiting rota update',
    'Completed',
  ];
  protected notes: Record<string, string> = {};
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly rows = computed(() =>
    this.service.care
      .clients()
      .filter((client) => !this.clientId() || client.id === this.clientId())
      .flatMap((client) =>
        (client.file?.carePlan?.packageHandoffs || []).map((handoff) => ({
          client,
          handoff,
          revision: client.file!.carePlan!.revision,
        })),
      ),
  );
  protected advance(clientId: string, handoff: PackageHandoff, revision: number) {
    this.notice.set('');
    const error = this.service.advancePackageHandoff(
      clientId,
      this.service.care.store.companyId(),
      handoff.id,
      revision,
      this.notes[handoff.id] || '',
    );
    this.error.set(error || '');
    if (!error) {
      this.notice.set('Demo handoff updated. Live rota unchanged.');
      this.changed.emit();
    }
  }
}
