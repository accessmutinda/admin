import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EcmOperations } from '../../ecm/ecm.operations';
import { ClientInvoice } from '../../ecm/ecm.models';
import { PayrollService } from '../payroll.service';
import { emptyPayroll, Invoice, PayRun } from '../payroll.models';
import { FinanceOverview } from './finance-overview';

const supplier = (id: string, issued: string, rate: number, payment: number): Invoice =>
  ({
    id,
    issued,
    status: 'Recorded',
    lines: [{ quantity: 1, rate, vat: 0 }],
    payments: [{ amount: payment }],
  }) as Invoice;
const bill = (
  id: string,
  date: string,
  amount: number,
  state: ClientInvoice['state'] = 'Approved',
): ClientInvoice =>
  ({
    id,
    clientId: 'client',
    date,
    state,
    lines: [{ amount }],
  }) as ClientInvoice;

describe('Financial overview period scope', () => {
  it('updates period totals together while keeping all-date balances distinct and records unchanged', () => {
    const payroll = emptyPayroll();
    payroll.runs = [
      { payday: '2026-10-28', status: 'Draft', lines: [{ total: 100 }] },
      { payday: '2026-09-28', status: 'Locked', lines: [{ total: 50 }] },
      { payday: '2026-10-28', status: 'Cancelled', lines: [{ total: 900 }] },
    ] as PayRun[];
    payroll.invoices = [
      supplier('current', '2026-10-10', 20, 5),
      supplier('old', '2026-04-10', 40, 0),
    ];
    const state = signal(payroll);
    const invoices = signal({
      invoices: [
        bill('current', '2026-10-10', 1000),
        bill('previous', '2026-09-10', 200),
        bill('draft', '2026-10-10', 500, 'Draft'),
      ],
    });
    TestBed.configureTestingModule({
      imports: [FinanceOverview],
      providers: [
        provideRouter([]),
        { provide: PayrollService, useValue: { data: state } },
        {
          provide: EcmOperations,
          useValue: {
            data: invoices,
            rota: { data: () => ({ clients: [{ id: 'client', funding: 'Private' }] }) },
          },
        },
      ],
    });
    const before = JSON.stringify({ payroll: state(), invoices: invoices() });
    const fixture = TestBed.createComponent(FinanceOverview);
    fixture.componentRef.setInput('today', '2026-10-18');
    fixture.componentRef.setInput('period', 1);
    fixture.detectChanges();
    const values = () =>
      Array.from(
        fixture.nativeElement.querySelectorAll(
          '.finance-metrics strong',
        ) as NodeListOf<HTMLElement>,
      ).map((element) => element.textContent?.trim());
    expect(values().slice(0, 4)).toEqual(['£1,000.00', '£120.00', '£880.00', '£55.00']);
    expect(fixture.nativeElement.textContent).toContain('all dates');
    expect(
      fixture.nativeElement.querySelectorAll('.finance-funding-list button')[1].textContent,
    ).toContain('1 invoices');
    fixture.componentRef.setInput('period', 6);
    fixture.detectChanges();
    expect(values().slice(0, 4)).toEqual(['£1,200.00', '£170.00', '£1,030.00', '£55.00']);
    expect(JSON.stringify({ payroll: state(), invoices: invoices() })).toBe(before);
  });
});
