import { DatePipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  PendingTasks,
  signal,
  untracked,
} from '@angular/core';
import { MedicationApi } from './medication-api.service';
import type { MedicationMarReport } from './medication.generated';

@Component({
  selector: 'cv-mar-report',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, DecimalPipe, NgTemplateOutlet],
  templateUrl: './mar-report.html',
  styleUrl: './mar-report.css',
})
export class MarReport {
  private readonly api = inject(MedicationApi);
  private readonly pending = inject(PendingTasks);
  readonly clientId = input.required<string>();
  readonly reportMonth = input.required<string>();
  readonly reportSheet = input.required<MedicationMarReport['sheet']>();
  readonly reportMonthChange = output<string>();
  private readonly query = computed(() => {
    const id = this.clientId();
    const month = this.reportMonth();
    const sheet = this.reportSheet();
    const scope = this.api.scope();
    const key = JSON.stringify({ id, month, sheet, scope });
    return { id, month, sheet, key, available: !!id && !!month && this.api.readable() };
  });
  private readonly result = signal<{
    key: string;
    report: MedicationMarReport | null;
    error: string;
  } | null>(null);
  protected readonly retry = signal(0);
  private readonly current = computed(() => {
    const query = this.query();
    const result = this.result();
    return query.available && result?.key === query.key ? result : null;
  });
  protected readonly report = computed(() => this.current()?.report);
  protected readonly reportError = computed(() => this.current()?.error);
  protected readonly noteLabels = {
    prescription: 'Prescription notes',
    reason: 'Administration reason',
    response: 'Recorded response',
  };
  protected readonly cellStates = {
    not_applicable: { symbol: '—', label: 'No scheduled dose' },
    pending: { symbol: '…', label: 'Pending' },
    unrecorded: { symbol: '?', label: 'Unrecorded' },
    recorded: { symbol: '?', label: 'Administration details unavailable' },
  };
  protected readonly expanded = signal(false);
  protected readonly columns = computed(() => {
    const dates = this.report()?.dates.map((date, index) => ({ date, index })) ?? [];
    return this.expanded() || dates.length <= 12
      ? dates
      : [...dates.slice(0, 5), null, ...dates.slice(-6)];
  });
  private readonly companyDate = computed(
    () =>
      new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: this.report()?.timezone ?? 'UTC',
      }),
  );

  constructor() {
    effect((onCleanup) => {
      this.retry();
      const { available, id, month, sheet, key } = this.query();
      this.result.set(null);
      if (!available) return;
      let active = true;
      onCleanup(() => {
        active = false;
      });
      untracked(() =>
        this.pending.run(async () => {
          try {
            const report = await this.api.marReport(id, month, sheet);
            if (active) this.result.set({ key, report, error: '' });
          } catch {
            if (active)
              this.result.set({
                key,
                report: null,
                error: 'Saved MAR information could not be loaded for this period.',
              });
          }
        }),
      );
    });
  }

  protected updateReportMonth(month: string): void {
    if (/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(month)) this.reportMonthChange.emit(month);
  }

  protected tone(code: string): string | null {
    return (
      (
        { G: 'given', R: 'refused', O: 'omitted', N: 'unavailable', NR: 'notRequired' } as Record<
          string,
          string
        >
      )[code] ?? null
    );
  }

  protected toneForOutcome(outcome: string): string | null {
    return this.tone(this.report()?.codes.find((item) => item.outcome === outcome)?.code ?? '');
  }

  protected localDate(timestamp: string): string {
    return this.companyDate().format(new Date(timestamp));
  }
}
