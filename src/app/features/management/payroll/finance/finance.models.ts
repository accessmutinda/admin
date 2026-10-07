import { ClientInvoice } from '../../ecm/ecm.models';
import { PayrollData, invoiceTotal, money } from '../payroll.models';

export const clientInvoiceTotal = (invoice: ClientInvoice): number =>
  money(invoice.lines.reduce((sum, line) => sum + line.amount, 0));

export function financeMonths(
  today: string,
  count: number,
  payroll: PayrollData,
  invoices: ClientInvoice[],
) {
  const [year, month] = today.split('-').map(Number);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - count + index, 1));
    const key = date.toISOString().slice(0, 7);
    const revenue = money(
      invoices
        .filter((i) => i.date.startsWith(key) && i.state !== 'Draft')
        .reduce((sum, i) => sum + clientInvoiceTotal(i), 0),
    );
    const pay = money(
      payroll.runs
        .filter((r) => r.payday.startsWith(key) && r.status !== 'Cancelled')
        .reduce((sum, r) => sum + r.lines.reduce((total, line) => total + line.total, 0), 0),
    );
    const suppliers = money(
      payroll.invoices
        .filter((i) => i.issued.startsWith(key) && !['Rejected', 'Cancelled'].includes(i.status))
        .reduce((sum, i) => sum + invoiceTotal(i), 0),
    );
    return {
      key,
      label: new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' }).format(date),
      revenue,
      pay,
      suppliers,
      costs: money(pay + suppliers),
    };
  });
}
