import { Component, input, output } from '@angular/core';
export interface CareEditStep {
  id: string;
  label: string;
}
@Component({
  selector: 'cv-care-plan-edit-layout',
  template: `
    <nav class="edit-stepper" aria-label="Edit steps">
      @for (item of steps(); track item.id; let i = $index) {
        <button
          type="button"
          [class.active]="step() === i"
          [class.confirmed]="confirmed().includes(i)"
          [attr.aria-current]="step() === i ? 'step' : null"
          (click)="stepChange.emit(i)"
        >
          <span>{{ confirmed().includes(i) ? '✓' : i + 1 }}</span
          >{{ item.label }}
        </button>
        @if (i < steps().length - 1) {
          <span class="connector" aria-hidden="true"></span>
        }
      }
    </nav>
    <header class="edit-heading">
      <span class="step-number">{{ step() + 1 }}</span>
      <div>
        <h2 id="care-plan-edit-title">{{ steps()[step()].label }}</h2>
        <p>{{ description() }}</p>
      </div>
      <div class="edit-actions">
        <button type="button" class="confirm" (click)="confirm.emit()">
          <span class="material-symbols-outlined" aria-hidden="true">check</span>Confirm All</button
        ><button type="button" class="primary" [disabled]="!dirty()" (click)="save.emit()">
          <span class="material-symbols-outlined" aria-hidden="true">check</span>Save Changes</button
        ><button type="button" (click)="cancel.emit()">Cancel</button>
      </div>
    </header>
    <ng-content />
    <footer class="edit-footer">
      <button type="button" [disabled]="step() === 0" (click)="stepChange.emit(step() - 1)">
        ← Previous</button
      ><span>Step {{ step() + 1 }} of {{ steps().length }}</span
      ><button
        type="button"
        [disabled]="step() === steps().length - 1"
        (click)="stepChange.emit(step() + 1)"
      >
        Next: {{ steps()[step() + 1]?.label || 'Complete' }} →
      </button>
    </footer>
  `,
  styleUrl: './care-plan-edit-layout.css',
})
export class CarePlanEditLayout {
  readonly steps = input.required<CareEditStep[]>();
  readonly step = input(0);
  readonly description = input(
    'Confirm and update the information already recorded in this care plan.',
  );
  readonly confirmed = input<number[]>([]);
  readonly dirty = input(false);
  readonly stepChange = output<number>();
  readonly confirm = output<void>();
  readonly save = output<void>();
  readonly cancel = output<void>();
}
