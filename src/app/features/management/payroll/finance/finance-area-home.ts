import { Component, computed, inject, input } from '@angular/core';
import { RouterLink, Params } from '@angular/router';
import { WorkspaceCards } from '../../shared/workspace-cards';
import { QuickActions } from '../../shared/quick-actions';
import { ManagementStore } from '../../shared/management.store';
import { EcmOperations } from '../../ecm/ecm.operations';
import { PayrollService } from '../payroll.service';
import { invoiceBalance } from '../payroll.models';

interface WorkspaceLink {
  title: string;
  description: string;
  icon: string;
  link: string;
  query: Params;
}
interface ReviewItem {
  id: string;
  title: string;
  detail: string;
  link: string;
  query: Params;
}
interface ReviewGroup {
  title: string;
  empty: string;
  rows: ReviewItem[];
}
@Component({
  selector: 'cv-finance-area-home',
  imports: [RouterLink, WorkspaceCards, QuickActions],
  styleUrl: './finance-area-home.css',
  template: `
    <div class="co-main-grid area-home-grid">
      <section
        cvWorkspaceCards
        headingId="finance-area-workspace-title"
        [title]="area() === 'payroll' ? 'Payroll Workspace' : 'Billing & Payments Workspace'"
        [icon]="area() === 'payroll' ? 'payments' : 'receipt_long'"
      >
        @for (item of cards(); track item.title; let i = $index) {
          <a class="co-check-card" [routerLink]="item.link" [queryParams]="item.query"
            ><span
              class="material-symbols-outlined"
              [style.color]="['#008d9f', '#008eff', '#00aac4', '#ff8a00'][i % 4]"
              aria-hidden="true"
              >{{ item.icon }}</span
            >
            <div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.description }}</p>
            </div></a
          >
        }
      </section>
      <section cvQuickActions headingId="finance-area-actions" [actionCount]="actions().length">
        @for (item of actions(); track item.title) {
          <a [class.co-primary]="$first" [routerLink]="item.link" [queryParams]="item.query"
            ><span class="material-symbols-outlined" aria-hidden="true">{{ item.icon }}</span
            >{{ item.title
            }}<span class="material-symbols-outlined" aria-hidden="true">chevron_right</span></a
          >
        }
      </section>
    </div>
    <section class="co-surface area-attention" aria-labelledby="finance-area-attention-title">
      <h2 id="finance-area-attention-title">
        <span class="material-symbols-outlined" aria-hidden="true">fact_check</span>Needs attention
        <small>All dates</small>
      </h2>
      <div class="area-attention-grid">
        @for (group of reviewGroups(); track group.title) {
          <section>
            <h3>
              {{ group.title }} <span>{{ group.rows.length }}</span>
            </h3>
            @for (item of group.rows.slice(0, 4); track item.id) {
              <a class="area-review-row" [routerLink]="item.link" [queryParams]="item.query"
                ><span
                  ><strong>{{ item.title }}</strong
                  ><small>{{ item.detail }}</small></span
                ><span class="material-symbols-outlined" aria-hidden="true">chevron_right</span></a
              >
            } @empty {
              <p class="area-empty">{{ group.empty }}</p>
            }
            @if (group.rows.length > 4) {
              <p class="area-empty">
                Showing 4 of {{ group.rows.length }}. Open the relevant workspace to review all
                records.
              </p>
            }
          </section>
        }
      </div>
    </section>
  `,
})
export class FinanceAreaHome {
  readonly area = input.required<string>();
  readonly today = input.required<string>();
  private readonly payroll = inject(PayrollService);
  private readonly ops = inject(EcmOperations);
  private readonly store = inject(ManagementStore);
  protected readonly cards = computed<WorkspaceLink[]>(() =>
    this.area() === 'payroll'
      ? [
          {
            title: 'Staff Pay',
            description: 'Manage effective pay profiles and rates.',
            icon: 'badge',
            link: '/manage/finance/payroll',
            query: { view: 'Payroll', payrollView: 'Staff pay' },
          },
          {
            title: 'Timesheets',
            description: 'Review actual work and approve recorded hours.',
            icon: 'schedule',
            link: '/manage/finance/payroll',
            query: { view: 'Payroll', payrollView: 'Timesheets' },
          },
          {
            title: 'Overtime',
            description: 'Review additional work and approvals.',
            icon: 'more_time',
            link: '/manage/finance/payroll',
            query: { view: 'Overtime' },
          },
          {
            title: 'Pay Runs',
            description: 'Prepare, review and lock estimated gross payroll.',
            icon: 'payments',
            link: '/manage/finance/payroll',
            query: { view: 'Payroll', payrollView: 'Pay runs' },
          },
          {
            title: 'Pay Settings',
            description: 'Configure pay rules, mileage and allowances.',
            icon: 'settings',
            link: '/manage/finance/payroll',
            query: { view: 'Settings' },
          },
        ]
      : [
          {
            title: 'Client Invoices',
            description: 'Prepare and review billing from completed care.',
            icon: 'request_quote',
            link: '/manage/finance/billing',
            query: { view: 'Invoices', invoiceView: 'Clients' },
          },
          {
            title: 'Supplier Invoices',
            description: 'Review supplier costs and recorded payments.',
            icon: 'receipt_long',
            link: '/manage/finance/billing',
            query: { view: 'Invoices', invoiceView: 'Suppliers' },
          },
          {
            title: 'Contractors & Agencies',
            description: 'Manage supplier agreements and contacts.',
            icon: 'handshake',
            link: '/manage/finance/billing',
            query: { view: 'Contractors' },
          },
          {
            title: 'Awaiting Payment',
            description: 'Approved supplier invoices with unpaid or partial balances.',
            icon: 'account_balance',
            link: '/manage/finance/billing',
            query: { view: 'Invoices', invoiceView: 'Suppliers', status: 'Outstanding' },
          },
        ],
  );
  protected readonly actions = computed(() => {
    const cards = this.cards();
    const indices = this.area() === 'payroll' ? [3, 1, 0, 2, 4] : [0, 1, 3, 2];
    const titles =
      this.area() === 'payroll'
        ? [
            'Prepare a Pay Run',
            'Review Timesheets',
            'Manage Staff Pay',
            'Review Overtime',
            'Pay Settings',
          ]
        : [
            'Review Client Invoices',
            'Review Supplier Invoices',
            'Record Supplier Payments',
            'Manage Contractors',
          ];
    return indices.map((index, position) => ({ ...cards[index], title: titles[position] }));
  });
  protected readonly reviewGroups = computed<ReviewGroup[]>(() => {
    const data = this.payroll.data();
    if (this.area() === 'payroll')
      return [
        {
          title: 'Pay setup needed',
          empty: 'All hired staff have an effective pay profile.',
          rows: this.store
            .staff()
            .filter((person) => !this.payroll.profile(person.id, this.today()))
            .map((person) => ({
              id: person.id,
              title: person.name,
              detail: 'No effective pay profile',
              link: '/manage/finance/payroll',
              query: { view: 'Payroll', payrollView: 'Staff pay', search: person.name },
            })),
        },
        {
          title: 'Work awaiting review',
          empty: 'No work records awaiting review.',
          rows: data.work
            .filter((work) => !['Approved', 'Rejected'].includes(work.status))
            .map((work) => ({
              id: work.id,
              title:
                this.store.data().people.find((person) => person.id === work.personId)?.name ??
                'Former employee',
              detail: `${work.kind} · ${work.date} · ${work.status}`,
              link: '/manage/finance/payroll',
              query: {
                view: work.kind === 'Overtime' ? 'Overtime' : 'Payroll',
                payrollView: 'Timesheets',
                kind: 'work',
                record: work.id,
              },
            })),
        },
        {
          title: 'Runs awaiting review',
          empty: 'No draft or locked runs awaiting review.',
          rows: data.runs
            .filter((run) => ['Draft', 'Locked'].includes(run.status))
            .map((run) => ({
              id: run.id,
              title: run.name,
              detail: `${run.payday} · ${run.status}`,
              link: '/manage/finance/payroll',
              query: { view: 'Payroll', payrollView: 'Pay runs', kind: 'run', record: run.id },
            })),
        },
      ];
    return [
      {
        title: 'Client invoice drafts',
        empty: 'No client invoice drafts awaiting review.',
        rows: this.ops
          .data()
          .invoices.filter((invoice) => invoice.state === 'Draft')
          .map((invoice) => ({
            id: invoice.id,
            title: invoice.number,
            detail: `${this.ops.rota.data().clients.find((client) => client.id === invoice.clientId)?.name ?? 'Former client'} · ${invoice.date}`,
            link: '/manage/finance/billing',
            query: { view: 'Invoices', invoiceView: 'Clients', clientInvoice: invoice.id },
          })),
      },
      {
        title: 'Supplier reviews',
        empty: 'No supplier invoices awaiting review.',
        rows: data.invoices
          .filter((invoice) => ['Recorded', 'Returned', 'Work confirmed'].includes(invoice.status))
          .map((invoice) => ({
            id: invoice.id,
            title: invoice.number,
            detail: `${invoice.issued} · ${invoice.status}`,
            link: '/manage/finance/billing',
            query: {
              view: 'Invoices',
              invoiceView: 'Suppliers',
              kind: 'invoice',
              record: invoice.id,
            },
          })),
      },
      {
        title: 'Supplier payments outstanding',
        empty: 'No approved supplier invoices have an outstanding balance.',
        rows: data.invoices
          .filter((invoice) => invoice.status === 'Approved' && invoiceBalance(invoice) > 0)
          .map((invoice) => ({
            id: invoice.id,
            title: invoice.number,
            detail: `Due ${invoice.due} · ${invoice.payments.length ? 'Partially paid' : 'Awaiting payment'}`,
            link: '/manage/finance/billing',
            query: {
              view: 'Invoices',
              invoiceView: 'Suppliers',
              kind: 'invoice',
              record: invoice.id,
            },
          })),
      },
    ];
  });
}
