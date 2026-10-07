import { ClientInvoice } from '../../ecm/ecm.models';
import { emptyPayroll, Invoice, PayRun } from '../payroll.models';
import { clientInvoiceTotal, financeMonths } from './finance.models';

describe('Finance reporting', () => {
  const clientInvoice = (state: ClientInvoice['state'], date = '2026-10-08'): ClientInvoice => ({
    id: state,
    clientId: 'client',
    number: state,
    date,
    state,
    lines: [
      {
        visitId: 'visit',
        date,
        call: 'Morning',
        hours: 1,
        rate: 20,
        amount: 20,
        basis: 'Visit hour',
      },
    ],
    audit: [],
  });
  it('excludes unapproved client billing and rejected or cancelled costs without double-counting paid records', () => {
    const payroll = emptyPayroll();
    payroll.runs = ['Draft', 'Paid', 'Cancelled'].map(
      (status) => ({ payday: '2026-10-28', status, lines: [{ total: 10 }] }) as PayRun,
    );
    payroll.invoices = ['Recorded', 'Approved', 'Rejected', 'Cancelled'].map(
      (status) =>
        ({
          issued: '2026-10-08',
          status,
          lines: [{ quantity: 1, rate: 5, vat: 20 }],
          payments: [{ amount: 6 }],
        }) as Invoice,
    );
    const [month] = financeMonths('2026-10-08', 1, payroll, [
      clientInvoice('Draft'),
      clientInvoice('Approved'),
      clientInvoice('Exported'),
      clientInvoice('Approved', '2026-09-30'),
    ]);
    expect(month).toMatchObject({ key: '2026-10', revenue: 40, pay: 20, suppliers: 12, costs: 32 });
  });
  it('crosses year boundaries and retains zero-activity months', () => {
    const months = financeMonths('2026-01-01', 6, emptyPayroll(), []);
    expect(months.map((m) => m.key)).toEqual([
      '2025-08',
      '2025-09',
      '2025-10',
      '2025-11',
      '2025-12',
      '2026-01',
    ]);
    expect(months.every((m) => m.costs === 0 && m.revenue === 0)).toBe(true);
    expect(clientInvoiceTotal(clientInvoice('Draft'))).toBe(20);
  });
});
