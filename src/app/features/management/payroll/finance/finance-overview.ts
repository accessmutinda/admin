import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../../shared/ui/select';
import { PayrollService } from '../payroll.service';
import { EcmOperations } from '../../ecm/ecm.operations';
import { PayRun, money } from '../payroll.models';
import { clientInvoiceTotal, financeMonths } from './finance.models';

@Component({
  selector: 'cv-finance-overview',
  imports: [CurrencyPipe, DatePipe, FormsModule, MatSelectModule, CvSelect],
  templateUrl: './finance-overview.html',
  styleUrl: './finance-overview.css',
})
export class FinanceOverview {
  protected readonly payroll = inject(PayrollService);
  protected readonly ops = inject(EcmOperations);
  readonly today = input.required<string>();
  readonly navigate = output<'Clients' | 'Suppliers' | 'Payroll'>();
  readonly reviewRun = output<PayRun>();
  protected readonly period = signal(6);
  protected readonly months = computed(() =>
    financeMonths(this.today(), this.period(), this.payroll.data(), this.ops.data().invoices),
  );
  protected readonly totals = computed(() => ({
    revenue: money(this.months().reduce((sum, m) => sum + m.revenue, 0)),
    costs: money(this.months().reduce((sum, m) => sum + m.costs, 0)),
    pay: money(this.months().reduce((sum, m) => sum + m.pay, 0)),
    suppliers: money(this.months().reduce((sum, m) => sum + m.suppliers, 0)),
  }));
  protected readonly hasActivity = computed(() => this.months().some((m) => m.revenue || m.costs));
  protected readonly chartMax = computed(() =>
    Math.max(0.01, ...this.months().flatMap((m) => [m.revenue, m.costs])),
  );
  protected readonly nextRun = computed(
    () =>
      this.payroll
        .data()
        .runs.filter((r) => !['Paid', 'Cancelled'].includes(r.status))
        .sort((a, b) => a.payday.localeCompare(b.payday))[0],
  );
  protected readonly billing = computed(() => {
    const invoices = this.ops
      .data()
      .invoices.filter((i) => this.months().some((m) => i.date.startsWith(m.key)));
    return ['Local authority', 'Private', 'NHS'].map((funding) => {
      const records = invoices.filter(
        (i) => this.ops.rota.data().clients.find((c) => c.id === i.clientId)?.funding === funding,
      );
      return {
        funding,
        count: records.length,
        amount: money(
          records
            .filter((i) => i.state !== 'Draft')
            .reduce((sum, i) => sum + clientInvoiceTotal(i), 0),
        ),
      };
    });
  });
  protected readonly runTotal = (run: PayRun) =>
    money(run.lines.reduce((sum, line) => sum + line.total, 0));
}
