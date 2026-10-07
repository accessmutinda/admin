export type FinanceArea = 'overview' | 'payroll' | 'billing';

export const FINANCE_AREAS = [
  { key: 'overview', label: 'Financial overview', icon: 'monitoring' },
  { key: 'payroll', label: 'Payroll', icon: 'payments' },
  { key: 'billing', label: 'Billing & payments', icon: 'receipt_long' },
] as const;

export const AREA_VIEWS = {
  overview: ['Overview'],
  payroll: ['Payroll', 'Overtime', 'Settings'],
  billing: ['Invoices', 'Contractors'],
} as const;

export function financeArea(value: string | null): FinanceArea {
  return value === 'payroll' || value === 'billing' ? value : 'overview';
}

export function viewArea(view: string): FinanceArea {
  return view === 'Overview'
    ? 'overview'
    : ['Payroll', 'Overtime', 'Settings'].includes(view)
      ? 'payroll'
      : 'billing';
}

export function financeView(area: FinanceArea, value: string | null): string {
  return AREA_VIEWS[area].find((view) => view === value) ?? AREA_VIEWS[area][0];
}
