export const PAYROLL_ACTIONS = [
  { key: 'view', label: 'View payroll' },
  { key: 'manage', label: 'Manage pay records' },
  { key: 'approve', label: 'Approve work and invoices' },
  { key: 'finalise', label: 'Finalise pay runs' },
  { key: 'export', label: 'Export payroll data' },
  { key: 'pay', label: 'Record payments' },
] as const;
export type PayrollAction = (typeof PAYROLL_ACTIONS)[number]['key'];
export type Frequency = 'Weekly' | 'Fortnightly' | 'Monthly';
export interface AuditEntry {
  at: string;
  userId: string;
  user: string;
  action: string;
  note: string;
}
export interface PayProfile {
  id: string;
  personId: string;
  basis: 'Hourly' | 'Salary';
  rate: number;
  weeklyHours: number;
  effective: string;
  frequency: Frequency;
}
export interface WorkRecord {
  rotaVisitIds?: string[];
  id: string;
  personId: string;
  date: string;
  hours: number;
  actualHours: number;
  rate: number;
  kind: 'Regular' | 'Overtime' | 'Allowance';
  category: string;
  reason: string;
  status: 'Requested' | 'Authorised' | 'Confirmed' | 'Approved' | 'Returned' | 'Rejected';
  audit: AuditEntry[];
  runId?: string;
  returnStage?: 'Requested' | 'Confirmed';
}
export interface Contractor {
  attachment?: Attachment;
  id: string;
  name: string;
  email: string;
  type: 'Contractor' | 'Agency';
  rate: number;
  unit: 'Hour' | 'Day' | 'Fixed';
  terms: number;
  start: string;
  end: string;
  reference: string;
  managerId: string;
}
export interface InvoiceLine {
  description: string;
  quantity: number;
  rate: number;
  vat: number;
}
export interface Attachment {
  name: string;
  type: string;
  content: string;
}
export interface Invoice {
  id: string;
  contractorId: string;
  number: string;
  issued: string;
  due: string;
  start: string;
  end: string;
  lines: InvoiceLine[];
  attachment?: Attachment;
  status: 'Recorded' | 'Work confirmed' | 'Approved' | 'Returned' | 'Rejected' | 'Cancelled';
  createdBy: string;
  audit: AuditEntry[];
  payments: { date: string; amount: number; reference: string }[];
}
export interface PayLine {
  personId: string;
  name: string;
  profileId: string;
  basis: string;
  rate: number;
  hours: number;
  basic: number;
  overtime: number;
  allowances: number;
  adjustment: number;
  adjustmentReason: string;
  total: number;
  workIds: string[];
}
export interface PayRun {
  id: string;
  name: string;
  start: string;
  end: string;
  payday: string;
  cutoff: string;
  frequency: Frequency;
  status: 'Draft' | 'Locked' | 'Exported' | 'Paid' | 'Cancelled';
  createdBy: string;
  lines: PayLine[];
  audit: AuditEntry[];
  paymentDate?: string;
  paymentReference?: string;
}
export interface PayrollSettings {
  frequency: Frequency;
  overtimeMultiplier: number;
  approvalThreshold: number;
  allowances: { id: string; name: string; unit: string; rate: number }[];
}
export interface PayrollData {
  audit?: AuditEntry[];
  profiles: PayProfile[];
  work: WorkRecord[];
  contractors: Contractor[];
  invoices: Invoice[];
  runs: PayRun[];
  settings: PayrollSettings;
}
export function emptyPayroll(): PayrollData {
  return {
    profiles: [],
    work: [],
    contractors: [],
    invoices: [],
    runs: [],
    settings: {
      frequency: 'Monthly',
      overtimeMultiplier: 1.5,
      approvalThreshold: 500,
      allowances: [
        { id: 'night', name: 'Night supplement', unit: 'hours', rate: 0 },
        { id: 'weekend', name: 'Weekend supplement', unit: 'hours', rate: 0 },
        { id: 'bank', name: 'Bank holiday supplement', unit: 'hours', rate: 0 },
        { id: 'sleep', name: 'Sleep-in allowance', unit: 'shifts', rate: 0 },
        { id: 'travel', name: 'Travel time', unit: 'hours', rate: 0 },
        { id: 'mileage', name: 'Mileage', unit: 'miles', rate: 0 },
        { id: 'training', name: 'Training', unit: 'hours', rate: 0 },
      ],
    },
  };
}
export const money = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;
export function invoiceTotal(invoice: Invoice): number {
  return money(
    invoice.lines.reduce(
      (sum, line) =>
        sum +
        money(line.quantity * line.rate) +
        money((line.quantity * line.rate * line.vat) / 100),
      0,
    ),
  );
}
export function invoiceBalance(invoice: Invoice): number {
  return money(
    invoiceTotal(invoice) - invoice.payments.reduce((sum, payment) => sum + payment.amount, 0),
  );
}
export function payrollDefaults(role: string): PayrollAction[] {
  if (['Company Admin', 'Platform Owner', 'Finance Officer'].includes(role))
    return PAYROLL_ACTIONS.map((a) => a.key);
  if (['Registered Manager', 'HR Officer'].includes(role)) return ['view', 'manage', 'approve'];
  return [];
}
