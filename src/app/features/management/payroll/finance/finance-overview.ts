import { Component, computed, inject, input, output } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { QuickActions } from '../../shared/quick-actions';
import { WorkspaceCards } from '../../shared/workspace-cards';
import { PayrollService } from '../payroll.service';
import { EcmOperations } from '../../ecm/ecm.operations';
import { PayRun, invoiceBalance, money } from '../payroll.models';
import { clientInvoiceTotal, financeMonths } from './finance.models';

@Component({
  selector: 'cv-finance-overview',
  imports: [CurrencyPipe, DatePipe, RouterLink, QuickActions, WorkspaceCards],
  templateUrl: './finance-overview.html',
  styleUrl: './finance-overview.css',
})
export class FinanceOverview {
  protected readonly payroll = inject(PayrollService);
  protected readonly ops = inject(EcmOperations);
  readonly today = input.required<string>();
  readonly navigate = output<'Clients' | 'Suppliers' | 'Payroll'>();
  readonly reviewRun = output<PayRun>();
  readonly period = input(6);
  readonly missingProfiles = input(0);
  protected readonly unpaidSuppliers = computed(() =>
    this.payroll
      .data()
      .invoices.filter((invoice) => !['Cancelled', 'Rejected'].includes(invoice.status))
      .reduce((sum, invoice) => sum + invoiceBalance(invoice), 0),
  );
  protected readonly pendingWork = computed(
    () =>
      this.payroll.data().work.filter((work) => !['Approved', 'Rejected'].includes(work.status))
        .length,
  );
  protected readonly workspaceLinks = [
    {
      key: 'staff',
      title: 'Staff Pay',
      description: 'Effective pay profiles and employment rates.',
      icon: 'badge',
      link: '/manage/finance/payroll',
      query: { view: 'Payroll', payrollView: 'Staff pay' },
    },
    {
      key: 'timesheets',
      title: 'Timesheets',
      description: 'Review actual work and approve recorded hours.',
      icon: 'schedule',
      link: '/manage/finance/payroll',
      query: { view: 'Payroll', payrollView: 'Timesheets' },
    },
    {
      key: 'overtime',
      title: 'Overtime',
      description: 'Review additional work and its approval status.',
      icon: 'more_time',
      link: '/manage/finance/payroll',
      query: { view: 'Overtime' },
    },
    {
      key: 'runs',
      title: 'Pay Runs',
      description: 'Prepare, review and lock staff payroll.',
      icon: 'payments',
      link: '/manage/finance/payroll',
      query: { view: 'Payroll', payrollView: 'Pay runs' },
    },
    {
      key: 'clients',
      title: 'Client Billing',
      description: 'Prepare care invoices and review billing.',
      icon: 'request_quote',
      link: '/manage/finance/billing',
      query: { view: 'Invoices', invoiceView: 'Clients' },
    },
    {
      key: 'suppliers',
      title: 'Supplier Invoices',
      description: 'Review supplier invoices and recorded payments.',
      icon: 'receipt_long',
      link: '/manage/finance/billing',
      query: { view: 'Invoices', invoiceView: 'Suppliers' },
    },
    {
      key: 'contractors',
      title: 'Contractors & Agencies',
      description: 'Manage supplier agreements and contacts.',
      icon: 'handshake',
      link: '/manage/finance/billing',
      query: { view: 'Contractors' },
    },
    {
      key: 'settings',
      title: 'Pay Settings',
      description: 'Configure pay rules, mileage and allowances.',
      icon: 'settings',
      link: '/manage/finance/payroll',
      query: { view: 'Settings' },
    },
  ];
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
        (i) =>
          i.state !== 'Draft' &&
          this.ops.rota.data().clients.find((c) => c.id === i.clientId)?.funding === funding,
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
