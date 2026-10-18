import type { Company } from '../shared/management.store';

export const MODULE_CATALOG = [
  {
    name: 'Care delivery',
    icon: 'description',
    color: '#008afa',
    description: 'Care plans, client records, visits and rota.',
    features: ['Client files', 'Visits & Rota', 'Live ECM board'],
  },
  {
    name: 'People & HR',
    icon: 'groups',
    color: '#00a34e',
    description: 'Recruitment, onboarding and staff records.',
    features: ['Recruitment pipeline', 'Staff records', 'Leave & reviews'],
  },
  {
    name: 'Training academy',
    icon: 'school',
    color: '#ff8a00',
    description: 'Learning, certificates and staff development.',
    features: ['Course library', 'Learning assignments', 'Training progress'],
  },
  {
    name: 'Quality & compliance',
    icon: 'verified_user',
    color: '#7c3aed',
    description: 'Supervision, quality checks and evidence.',
    features: ['Supervisor dashboard', 'Quality assessments', 'Compliance evidence'],
  },
  {
    name: 'Finance',
    icon: 'account_balance_wallet',
    color: '#03a6c1',
    description: 'Payroll, invoices and financial oversight.',
    features: ['Payroll', 'Client billing', 'Financial records'],
  },
  {
    name: 'Reports & insights',
    icon: 'monitoring',
    color: '#ed3988',
    description: 'Reporting entitlement and workspace exports.',
    features: ['Reporting entitlement', 'Existing workspace exports'],
  },
] as const;
export const ADDON_CATALOG = [
  {
    id: 'analytics',
    name: 'Advanced Analytics',
    icon: 'bar_chart',
    description: 'Additional dashboards and benchmarking.',
  },
  {
    id: 'mobile',
    name: 'Mobile App Access',
    icon: 'smartphone',
    description: 'Mobile access for your care teams.',
  },
  {
    id: 'sso',
    name: 'Single Sign-On (SSO)',
    icon: 'key',
    description: 'Access through your identity provider.',
  },
  {
    id: 'api',
    name: 'API Access',
    icon: 'link',
    description: 'Connections to third-party systems.',
  },
] as const;
export const SUBSCRIPTION_PLANS = [
  'Not recorded',
  'Starter',
  'Standard',
  'Professional',
  'Enterprise',
  'Custom',
];
export type ModuleSection =
  'overview' | 'subscription' | 'limits' | 'addons' | 'billing' | 'configure';
export interface SubscriptionInvoice {
  id: string;
  reference: string;
  date: string;
  dueDate: string;
  amount: number;
  status: 'Paid' | 'Outstanding' | 'Void';
  notes: string;
}
export interface CompanySubscription {
  plan: string;
  status: 'Not recorded' | 'Active' | 'Trial' | 'Suspended' | 'Cancelled';
  cycle: 'Not recorded' | 'Monthly' | 'Annual';
  renewalDate: string;
  userLimit: number | null;
  storageLimitGb: number | null;
  careRecordLimit: number | null;
  support: string;
  notes: string;
  addons: Record<string, { status: 'Requested' | 'Trial requested'; requestedAt: string }>;
  invoices: SubscriptionInvoice[];
}
export function initialSubscription(company?: Company): CompanySubscription {
  return structuredClone({
    plan: 'Not recorded',
    status: 'Not recorded',
    cycle: 'Not recorded',
    renewalDate: '',
    userLimit: null,
    storageLimitGb: null,
    careRecordLimit: null,
    support: '',
    notes: '',
    addons: {},
    invoices: [],
    ...company?.subscription,
  });
}
export function validSubscriptionDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function subscriptionErrors(value: CompanySubscription, users: number): string[] {
  const errors: string[] = [];
  if (!SUBSCRIPTION_PLANS.includes(value.plan)) errors.push('Choose a recorded plan.');
  if (!['Not recorded', 'Active', 'Trial', 'Suspended', 'Cancelled'].includes(value.status))
    errors.push('Choose a subscription status.');
  if (!['Not recorded', 'Monthly', 'Annual'].includes(value.cycle))
    errors.push('Choose a billing cycle.');
  if (value.renewalDate && !validSubscriptionDate(value.renewalDate))
    errors.push('Enter a valid renewal date.');
  for (const [name, limit] of [
    ['User limit', value.userLimit],
    ['Care record limit', value.careRecordLimit],
  ] as const) {
    if (limit !== null && (!Number.isSafeInteger(limit) || limit < 1))
      errors.push(name + ' must be a positive whole number.');
  }
  if (value.userLimit !== null && value.userLimit < users)
    errors.push('The user limit cannot be lower than active and invited users.');
  if (
    value.storageLimitGb !== null &&
    (!Number.isFinite(value.storageLimitGb) || value.storageLimitGb <= 0)
  )
    errors.push('Storage allocation must be greater than zero.');
  if (value.support.length > 100 || value.notes.length > 1000)
    errors.push('Keep support within 100 characters and notes within 1000 characters.');
  return errors;
}
export function invoiceErrors(
  invoice: SubscriptionInvoice,
  others: SubscriptionInvoice[],
): string[] {
  const errors: string[] = [];
  if (!invoice.reference.trim() || invoice.reference.trim().length > 80)
    errors.push('Enter an invoice reference, up to 80 characters.');
  if (
    others.some((v) => v.reference.toLowerCase().trim() === invoice.reference.toLowerCase().trim())
  )
    errors.push('This invoice reference already exists.');
  if (!validSubscriptionDate(invoice.date) || !validSubscriptionDate(invoice.dueDate))
    errors.push('Enter valid invoice and due dates.');
  else if (invoice.dueDate < invoice.date)
    errors.push('The due date cannot be before the invoice date.');
  if (
    !Number.isFinite(invoice.amount) ||
    invoice.amount <= 0 ||
    invoice.amount > 999999999 ||
    Math.abs(invoice.amount * 100 - Math.round(invoice.amount * 100)) > 0.00001
  )
    errors.push('Enter a positive GBP amount with no more than two decimal places.');
  if (!['Paid', 'Outstanding', 'Void'].includes(invoice.status))
    errors.push('Choose an invoice status.');
  if (invoice.notes.length > 500) errors.push('Keep invoice notes within 500 characters.');
  return errors;
}
export function subscriptionCsv(invoices: SubscriptionInvoice[]): string {
  const cell = (value: string | number) => {
    const text = String(value);
    const safe = /^\s*[=+@-]|^[\t\r\n]/.test(text) ? "'" + text : text;
    return '"' + safe.replaceAll('"', '""') + '"';
  };
  return [
    ['Reference', 'Invoice date', 'Due date', 'Amount (GBP)', 'Status', 'Notes'],
    ...invoices.map((v) => [
      v.reference,
      v.date,
      v.dueDate,
      v.amount.toFixed(2),
      v.status,
      v.notes,
    ]),
  ]
    .map((r) => r.map(cell).join(','))
    .join('\r\n');
}
