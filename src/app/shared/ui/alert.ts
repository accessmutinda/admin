import { Component, computed, input } from '@angular/core';

export type AlertTone = 'info' | 'success' | 'warning' | 'error';

const TONE_CLASSES: Record<AlertTone, { container: string; icon: string }> = {
  info: { container: 'bg-info-50 border-info/20 text-navy', icon: 'text-brand-blue' },
  success: { container: 'bg-success-50 border-success/20 text-navy', icon: 'text-success' },
  warning: { container: 'bg-warning-50 border-warning/30 text-navy', icon: 'text-warning' },
  error: { container: 'bg-error-50 border-error/20 text-navy', icon: 'text-error' },
};

const TONE_ICON: Record<AlertTone, string> = {
  info: 'info',
  success: 'check_circle',
  warning: 'warning',
  error: 'error',
};

@Component({
  selector: 'cv-alert',
  template: `
    <div class="flex items-start gap-3 rounded-xl border p-4 text-sm {{ classes().container }}">
      <span class="material-symbols-outlined shrink-0 text-[20px] {{ classes().icon }}">{{
        iconName()
      }}</span>
      <div class="space-y-0.5 leading-snug">
        <ng-content />
      </div>
    </div>
  `,
})
export class Alert {
  readonly tone = input<AlertTone>('info');
  protected readonly classes = computed(() => TONE_CLASSES[this.tone()]);
  protected readonly iconName = computed(() => TONE_ICON[this.tone()]);
}
