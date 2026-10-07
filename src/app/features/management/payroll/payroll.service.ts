import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { ROLES } from '../../../core/auth/models/role';
import { ManagementStore } from '../shared/management.store';
import { validVacancyDate } from '../recruitment/vacancy-deadline';
import {
  AuditEntry,
  Contractor,
  emptyPayroll,
  Invoice,
  invoiceBalance,
  invoiceTotal,
  money,
  PayProfile,
  PayrollAction,
  PayrollData,
  payrollDefaults,
  PayrollSettings,
  PayRun,
  WorkRecord,
} from './payroll.models';

@Injectable({ providedIn: 'root' })
export class PayrollService {
  private readonly store = inject(ManagementStore);
  private readonly auth = inject(AuthService);
  readonly data = computed(() => this.store.data().payroll ?? emptyPayroll());
  readonly role = computed(() => ROLES[this.auth.currentUser()?.roleCode ?? 'CW'].label);
  readonly permissions = computed(
    () => this.store.data().payrollPermissions?.[this.role()] ?? payrollDefaults(this.role()),
  );
  can(action: PayrollAction): boolean {
    const index = { view: 0, manage: 2, approve: 2, finalise: 2, export: 4, pay: 2 }[action];
    const finance = this.store.data().permissions[this.role() + ':Finance'];
    return (
      !!this.auth.currentUser() &&
      !!this.store.company()?.modules.includes('Finance') &&
      (!finance || (finance[0] && finance[index] && (action !== 'manage' || finance[1]))) &&
      this.permissions().includes('view') &&
      this.permissions().includes(action)
    );
  }
  private actor(): string {
    return this.auth.currentUser()?.id ?? '';
  }
  private entry(action: string, note = ''): AuditEntry {
    return {
      at: new Date().toISOString(),
      userId: this.actor(),
      user: this.auth.currentUser()!.name,
      action,
      note,
    };
  }
  private commit(data: PayrollData): string | null {
    return this.store.savePayroll({
      ...data,
      audit: [...(this.data().audit ?? []), this.entry('Payroll records updated')],
    })
      ? null
      : 'Could not save payroll changes. Free some browser storage and try again.';
  }
  private allowed(action: PayrollAction): string | null {
    return this.can(action) ? null : 'Your role does not have permission for this action.';
  }
  private date(value: string): boolean {
    return validVacancyDate(value);
  }
  private finite(value: number, min = 0): boolean {
    return Number.isFinite(value) && value >= min;
  }
  profile(personId: string, date: string): PayProfile | undefined {
    return this.data()
      .profiles.filter((p) => p.personId === personId && p.effective <= date)
      .sort((a, b) => b.effective.localeCompare(a.effective))[0];
  }
  private reviewer(workflow: string, index: number): boolean {
    const defaults: Record<string, string[]> = {
      Overtime: ['Registered Manager', 'Finance Officer'],
      Timesheets: ['Registered Manager'],
      'Contractor invoices': ['Registered Manager', 'Finance Officer'],
      'Payroll runs': ['Finance Officer'],
    };
    const route = this.store.data().workflows[workflow] ?? defaults[workflow];
    if (!route.length) return false;
    return (
      ['Company Admin', 'Platform Owner'].includes(this.role()) || this.role() === route[index]
    );
  }
  saveProfile(profile: PayProfile): string | null {
    if (this.allowed('manage')) return this.allowed('manage');
    if (
      !this.store.staff().some((p) => p.id === profile.personId) ||
      !this.date(profile.effective) ||
      !this.finite(profile.rate, 0.01) ||
      !this.finite(profile.weeklyHours, 0.01) ||
      profile.weeklyHours > 168
    )
      return 'Choose a hired staff member, valid effective date, positive rate and weekly hours from 0.01 to 168.';
    const previous = this.data().profiles.find((p) => p.id === profile.id);
    if (
      previous &&
      this.data().runs.some(
        (r) => r.status !== 'Cancelled' && r.lines.some((l) => l.profileId === previous.id),
      )
    )
      return 'This profile is used in a pay run. Add a new effective-dated profile to change the rate.';
    if (
      this.data().profiles.some(
        (p) =>
          p.id !== profile.id &&
          p.personId === profile.personId &&
          p.effective === profile.effective,
      )
    )
      return 'A pay profile already exists for this employee and effective date.';
    return this.commit({
      ...this.data(),
      profiles: [...this.data().profiles.filter((p) => p.id !== profile.id), profile],
    });
  }
  saveWork(work: WorkRecord): string | null {
    if (this.allowed('manage')) return this.allowed('manage');
    const profile = this.profile(work.personId, work.date);
    if (
      !this.store.staff().some((p) => p.id === work.personId) ||
      !this.date(work.date) ||
      !profile ||
      !this.finite(work.hours, 0.01) ||
      work.hours > 1000 ||
      !work.reason.trim()
    )
      return 'Choose a hired employee with an effective pay profile, date, positive hours or units (up to 1,000), and a reason.';
    const dailyHours = this.data()
      .work.filter(
        (w) =>
          w.personId === work.personId &&
          w.date === work.date &&
          w.kind !== 'Allowance' &&
          w.status !== 'Rejected',
      )
      .reduce(
        (sum, w) =>
          sum + (['Requested', 'Authorised'].includes(w.status) ? w.hours : w.actualHours),
        0,
      );
    if (work.kind !== 'Allowance' && dailyHours + work.hours > 24)
      return 'Regular hours and overtime combined cannot exceed 24 hours in a day.';
    if (work.kind !== 'Allowance' && work.hours > 24)
      return 'A daily work record cannot exceed 24 hours.';
    const allowance = this.data().settings.allowances.find((a) => a.id === work.category);
    const rate =
      work.kind === 'Allowance'
        ? allowance?.rate
        : work.kind === 'Overtime'
          ? profile.basis === 'Hourly'
            ? profile.rate * this.data().settings.overtimeMultiplier
            : (profile.rate / 52 / profile.weeklyHours) * this.data().settings.overtimeMultiplier
          : profile.basis === 'Hourly'
            ? profile.rate
            : 0;
    if (rate === undefined || !this.finite(rate))
      return 'Choose an allowance with a configured rate.';
    if (
      this.data().work.some(
        (w) =>
          w.personId === work.personId &&
          w.date === work.date &&
          w.kind === work.kind &&
          w.category === work.category &&
          w.status !== 'Rejected',
      )
    )
      return 'A work record already exists for this employee, date and category.';
    return this.commit({
      ...this.data(),
      work: [
        ...this.data().work,
        {
          ...work,
          rate: money(rate),
          actualHours: work.kind === 'Overtime' ? 0 : work.hours,
          status: work.kind === 'Overtime' ? 'Requested' : 'Confirmed',
          audit: [this.entry('Recorded', work.reason)],
        },
      ],
    });
  }
  workDecision(
    id: string,
    decision: 'Authorise' | 'Confirm' | 'Approve' | 'Return' | 'Reject',
    note: string,
    actualHours: number,
  ): string | null {
    if (this.allowed(decision === 'Confirm' ? 'manage' : 'approve'))
      return this.allowed(decision === 'Confirm' ? 'manage' : 'approve');
    const work = this.data().work.find((w) => w.id === id);
    if (!work || work.runId || ['Approved', 'Rejected'].includes(work.status))
      return 'This work record cannot be changed.';
    const employee = this.store.staff().find((p) => p.id === work.personId);
    if (
      decision !== 'Confirm' &&
      (employee?.email.toLowerCase() === this.auth.currentUser()?.email.toLowerCase() ||
        employee?.id === this.actor())
    )
      return 'You cannot approve your own work.';
    const index =
      work.kind === 'Overtime' &&
      work.status !== 'Requested' &&
      !(work.status === 'Returned' && work.returnStage === 'Requested')
        ? 1
        : 0;
    if (
      decision !== 'Confirm' &&
      !this.reviewer(work.kind === 'Overtime' ? 'Overtime' : 'Timesheets', index)
    )
      return 'This decision belongs to the configured reviewer role. Ask a company administrator if the route needs updating.';
    let status: WorkRecord['status'];
    if (
      decision === 'Authorise' &&
      (work.status === 'Requested' ||
        (work.status === 'Returned' && work.returnStage === 'Requested'))
    )
      status = 'Authorised';
    else if (
      decision === 'Confirm' &&
      (work.status === 'Authorised' ||
        (work.status === 'Returned' && work.returnStage !== 'Requested'))
    ) {
      if (
        !this.finite(actualHours, 0.01) ||
        actualHours > (work.kind === 'Allowance' ? 1000 : 24) ||
        !note.trim()
      )
        return 'Enter actual hours or units and a confirmation note.';
      const otherHours = this.data()
        .work.filter(
          (w) =>
            w.id !== id &&
            w.personId === work.personId &&
            w.date === work.date &&
            w.kind !== 'Allowance' &&
            w.status !== 'Rejected',
        )
        .reduce(
          (sum, w) =>
            sum + (['Requested', 'Authorised'].includes(w.status) ? w.hours : w.actualHours),
          0,
        );
      if (work.kind !== 'Allowance' && otherHours + actualHours > 24)
        return 'Regular hours and overtime combined cannot exceed 24 hours in a day.';
      status = 'Confirmed';
    } else if (decision === 'Approve' && work.status === 'Confirmed') {
      if (
        money(work.actualHours * work.rate) > this.data().settings.approvalThreshold &&
        !['Company Admin', 'Platform Owner', 'Finance Officer'].includes(this.role())
      )
        return 'This amount exceeds the approval threshold. Finance or a company administrator must approve it.';
      status = 'Approved';
    } else if (decision === 'Return') status = 'Returned';
    else if (decision === 'Reject') status = 'Rejected';
    else return 'This action is not available at the current stage.';
    if ((decision === 'Return' || decision === 'Reject') && !note.trim())
      return 'Enter a reason for returning or rejecting the record.';
    return this.commit({
      ...this.data(),
      work: this.data().work.map((w) =>
        w.id === id
          ? {
              ...w,
              status,
              returnStage:
                decision === 'Return'
                  ? work.status === 'Requested'
                    ? 'Requested'
                    : (work.returnStage ?? 'Confirmed')
                  : undefined,
              actualHours: decision === 'Confirm' ? actualHours : w.actualHours,
              audit: [...w.audit, this.entry(decision, note)],
            }
          : w,
      ),
    });
  }
  saveContractor(contractor: Contractor): string | null {
    if (this.allowed('manage')) return this.allowed('manage');
    if (
      !contractor.name.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contractor.email) ||
      !this.finite(contractor.rate, 0.01) ||
      !Number.isInteger(contractor.terms) ||
      contractor.terms < 0 ||
      contractor.terms > 365 ||
      !this.date(contractor.start) ||
      (contractor.end && (!this.date(contractor.end) || contractor.end < contractor.start)) ||
      !this.store.data().members.some((m) => m.id === contractor.managerId && m.status === 'Active')
    )
      return 'Enter a name, valid email, positive rate, payment terms (0–365 days), contract dates and active manager.';
    return this.commit({
      ...this.data(),
      contractors: [...this.data().contractors.filter((c) => c.id !== contractor.id), contractor],
    });
  }
  saveInvoice(invoice: Invoice): string | null {
    if (this.allowed('manage')) return this.allowed('manage');
    const contractor = this.data().contractors.find((c) => c.id === invoice.contractorId);
    if (
      !contractor ||
      !invoice.number.trim() ||
      ![invoice.issued, invoice.due, invoice.start, invoice.end].every((d) => this.date(d)) ||
      invoice.due < invoice.issued ||
      invoice.end < invoice.start ||
      invoice.start < contractor.start ||
      (contractor.end && invoice.end > contractor.end)
    )
      return 'Enter an invoice number, valid dates and service dates within the contract.';
    if (
      !invoice.lines.length ||
      invoice.lines.some(
        (l) =>
          !l.description.trim() ||
          !this.finite(l.quantity, 0.01) ||
          !this.finite(l.rate, 0.01) ||
          !this.finite(l.vat) ||
          l.vat > 100,
      )
    )
      return 'Each invoice line needs a description, positive quantity and rate, and VAT from 0 to 100%.';
    if (
      this.data().invoices.some(
        (i) =>
          i.contractorId === invoice.contractorId &&
          i.number.trim().toLowerCase() === invoice.number.trim().toLowerCase(),
      )
    )
      return 'This invoice number has already been recorded for this supplier.';
    return this.commit({
      ...this.data(),
      invoices: [
        ...this.data().invoices,
        {
          ...invoice,
          status: 'Recorded',
          createdBy: this.actor(),
          audit: [this.entry('Recorded')],
          payments: [],
        },
      ],
    });
  }
  invoiceDecision(
    id: string,
    decision: 'Confirm work' | 'Approve' | 'Return' | 'Reject' | 'Cancel',
    note: string,
  ): string | null {
    if (this.allowed('approve')) return this.allowed('approve');
    const invoice = this.data().invoices.find((i) => i.id === id);
    if (!invoice || invoice.payments.length || ['Rejected', 'Cancelled'].includes(invoice.status))
      return 'This invoice cannot be changed.';
    if (invoice.createdBy === this.actor())
      return 'Another authorised administrator must review this invoice. You cannot approve your own submission.';
    if (!this.reviewer('Contractor invoices', invoice.status === 'Work confirmed' ? 1 : 0))
      return 'This decision belongs to the configured reviewer role.';
    if (!note.trim())
      return 'Record a review note, including any rate discrepancy or work confirmation.';
    let status: Invoice['status'];
    if (decision === 'Confirm work' && ['Recorded', 'Returned'].includes(invoice.status))
      status = 'Work confirmed';
    else if (decision === 'Approve' && invoice.status === 'Work confirmed') {
      if (
        invoiceTotal(invoice) > this.data().settings.approvalThreshold &&
        !['Company Admin', 'Platform Owner', 'Finance Officer'].includes(this.role())
      )
        return 'Finance or a company administrator must approve invoices above the threshold.';
      status = 'Approved';
    } else if (decision === 'Return' && invoice.status !== 'Approved') status = 'Returned';
    else if (decision === 'Reject' && invoice.status !== 'Approved') status = 'Rejected';
    else if (decision === 'Cancel') status = 'Cancelled';
    else return 'This action is not available at the current stage.';
    return this.commit({
      ...this.data(),
      invoices: this.data().invoices.map((i) =>
        i.id === id ? { ...i, status, audit: [...i.audit, this.entry(decision, note)] } : i,
      ),
    });
  }
  recordInvoicePayment(id: string, date: string, amount: number, reference: string): string | null {
    if (this.allowed('pay')) return this.allowed('pay');
    const invoice = this.data().invoices.find((i) => i.id === id);
    if (
      !invoice ||
      invoice.status !== 'Approved' ||
      !this.date(date) ||
      !this.finite(amount, 0.01) ||
      money(amount) > invoiceBalance(invoice) ||
      !reference.trim()
    )
      return 'Choose an approved invoice, valid payment date, positive amount within the balance and a payment reference.';
    if (invoice.payments.some((p) => p.reference.toLowerCase() === reference.trim().toLowerCase()))
      return 'This payment reference has already been recorded for the invoice.';
    return this.commit({
      ...this.data(),
      invoices: this.data().invoices.map((i) =>
        i.id === id
          ? {
              ...i,
              payments: [
                ...i.payments,
                { date, amount: money(amount), reference: reference.trim() },
              ],
              audit: [...i.audit, this.entry('Payment recorded', reference)],
            }
          : i,
      ),
    });
  }
  buildRun(run: PayRun): string | null {
    if (this.allowed('manage')) return this.allowed('manage');
    if (
      !run.name.trim() ||
      ![run.start, run.end, run.payday, run.cutoff].every((d) => this.date(d)) ||
      run.end < run.start ||
      run.payday < run.end ||
      run.cutoff > run.payday
    )
      return 'Enter a name and valid dates. Payday must follow the period end, and cutoff cannot be after payday.';
    if (
      this.data().runs.some(
        (r) =>
          r.status !== 'Cancelled' &&
          r.frequency === run.frequency &&
          r.start <= run.end &&
          r.end >= run.start,
      )
    )
      return 'An overlapping pay run already exists for this frequency.';
    const profiles = this.store
      .staff()
      .map((p) => ({ person: p, profile: this.profile(p.id, run.start) }))
      .filter((p) => p.profile?.frequency === run.frequency);
    if (!profiles.length)
      return 'Set up an effective pay profile for at least one hired employee in this pay frequency.';
    if (
      profiles.some(
        ({ person, profile }) =>
          profile!.basis === 'Salary' &&
          this.data().profiles.some(
            (p) => p.personId === person.id && p.effective > run.start && p.effective <= run.end,
          ),
      )
    )
      return 'A salaried employee has a pay change within this period. Split the pay period before preparing the run.';
    if (
      this.data().runs.some(
        (r) =>
          r.status !== 'Cancelled' &&
          r.start <= run.end &&
          r.end >= run.start &&
          r.lines.some((l) => profiles.some((p) => p.person.id === l.personId)),
      )
    )
      return 'An employee is already included in another pay run for these dates.';
    const factor = { Weekly: 52, Fortnightly: 26, Monthly: 12 }[run.frequency];
    const lines = profiles.map(({ person, profile }) => {
      const work = this.data().work.filter(
        (w) =>
          w.personId === person.id &&
          !w.runId &&
          w.status === 'Approved' &&
          w.date >= run.start &&
          w.date <= run.end,
      );
      const hours = work
        .filter((w) => w.kind === 'Regular')
        .reduce((sum, w) => sum + w.actualHours, 0);
      const basic =
        profile!.basis === 'Salary'
          ? money(profile!.rate / factor)
          : money(
              work
                .filter((w) => w.kind === 'Regular')
                .reduce((sum, w) => sum + w.actualHours * w.rate, 0),
            );
      const overtime = money(
        work
          .filter((w) => w.kind === 'Overtime')
          .reduce((sum, w) => sum + w.actualHours * w.rate, 0),
      );
      const allowances = money(
        work
          .filter((w) => w.kind === 'Allowance')
          .reduce((sum, w) => sum + w.actualHours * w.rate, 0),
      );
      return {
        personId: person.id,
        name: person.name,
        profileId: profile!.id,
        basis: profile!.basis,
        rate: profile!.rate,
        hours,
        basic,
        overtime,
        allowances,
        adjustment: 0,
        adjustmentReason: '',
        total: money(basic + overtime + allowances),
        workIds: work.map((w) => w.id),
      };
    });
    const ids = lines.flatMap((l) => l.workIds);
    return this.commit({
      ...this.data(),
      runs: [
        ...this.data().runs,
        {
          ...run,
          lines,
          status: 'Draft',
          createdBy: this.actor(),
          audit: [this.entry('Prepared')],
        },
      ],
      work: this.data().work.map((w) => (ids.includes(w.id) ? { ...w, runId: run.id } : w)),
    });
  }
  adjustRun(id: string, personId: string, amount: number, reason: string): string | null {
    if (this.allowed('manage')) return this.allowed('manage');
    const run = this.data().runs.find((r) => r.id === id);
    if (
      !run ||
      run.status !== 'Draft' ||
      !Number.isFinite(amount) ||
      (amount !== 0 && !reason.trim())
    )
      return 'Only draft runs can be adjusted. Enter an amount and explain the adjustment.';
    const line = run.lines.find((l) => l.personId === personId);
    if (!line || money(line.basic + line.overtime + line.allowances + amount) < 0)
      return 'The adjustment cannot produce negative gross pay.';
    return this.commit({
      ...this.data(),
      runs: this.data().runs.map((r) =>
        r.id === id
          ? {
              ...r,
              lines: r.lines.map((l) =>
                l.personId === personId
                  ? {
                      ...l,
                      adjustment: money(amount),
                      adjustmentReason: reason,
                      total: money(l.basic + l.overtime + l.allowances + amount),
                    }
                  : l,
              ),
              audit: [...r.audit, this.entry('Adjustment', reason)],
            }
          : r,
      ),
    });
  }
  runDecision(
    id: string,
    decision: 'Lock' | 'Export' | 'Pay' | 'Cancel',
    date = '',
    reference = '',
  ): string | null {
    const permission = decision === 'Export' ? 'export' : decision === 'Pay' ? 'pay' : 'finalise';
    if (this.allowed(permission)) return this.allowed(permission);
    const run = this.data().runs.find((r) => r.id === id);
    if (!run) return 'Pay run not found.';
    let status: PayRun['status'];
    if (decision === 'Lock' && run.status === 'Draft') {
      if (run.createdBy === this.actor())
        return 'Another authorised administrator must sign off this pay run.';
      if (!this.reviewer('Payroll runs', 0))
        return 'This sign-off belongs to the configured payroll reviewer.';
      if (
        this.data().work.some(
          (w) =>
            w.date >= run.start &&
            w.date <= run.end &&
            run.lines.some((l) => l.personId === w.personId) &&
            !w.runId &&
            w.status !== 'Rejected',
        )
      )
        return 'Resolve outstanding work records in this period before locking the run. Cancel and prepare the draft again to include newly approved work.';
      if (run.lines.some((l) => l.basis === 'Hourly' && l.hours <= 0))
        return 'Every hourly employee needs approved regular hours before finalisation.';
      status = 'Locked';
    } else if (decision === 'Export' && ['Locked', 'Exported'].includes(run.status))
      status = 'Exported';
    else if (decision === 'Pay' && ['Locked', 'Exported'].includes(run.status)) {
      if (!this.date(date) || !reference.trim()) return 'Enter the payment date and reference.';
      status = 'Paid';
    } else if (decision === 'Cancel' && run.status === 'Draft') status = 'Cancelled';
    else return 'This action is not available at the current stage.';
    const error = this.commit({
      ...this.data(),
      runs: this.data().runs.map((r) =>
        r.id === id
          ? {
              ...r,
              status,
              ...(decision === 'Pay' ? { paymentDate: date, paymentReference: reference } : {}),
              audit: [...r.audit, this.entry(decision, reference)],
            }
          : r,
      ),
      work:
        decision === 'Cancel'
          ? this.data().work.map((w) => (w.runId === id ? { ...w, runId: undefined } : w))
          : this.data().work,
    });
    if (!error && decision === 'Export') {
      const escape = (s: string | number) => '"' + String(s).replaceAll('"', '""') + '"';
      const rows = [
        [
          'Employee ID',
          'Name',
          'Period start',
          'Period end',
          'Payday',
          'Regular hours',
          'Basic gross',
          'Overtime',
          'Allowances',
          'Adjustment',
          'Estimated gross',
        ],
        ...run.lines.map((l) => [
          l.personId,
          l.name,
          run.start,
          run.end,
          run.payday,
          l.hours,
          l.basic,
          l.overtime,
          l.allowances,
          l.adjustment,
          l.total,
        ]),
      ];
      this.store.download(
        'payroll-' + run.start + '.csv',
        rows.map((r) => r.map(escape).join(',')).join('\r\n'),
        'text/csv',
      );
    }
    return error;
  }
  exportRegister(kind: 'work' | 'invoices'): string | null {
    if (this.allowed('export')) return this.allowed('export');
    const rows: (string | number)[][] =
      kind === 'work'
        ? [
            [
              'Employee',
              'Date',
              'Category',
              'Hours or units',
              'Rate',
              'Amount',
              'Status',
              'Pay run',
            ],
            ...this.data().work.map((w) => [
              this.store.data().people.find((p) => p.id === w.personId)?.name ?? w.personId,
              w.date,
              w.kind,
              w.actualHours,
              w.rate,
              money(w.actualHours * w.rate),
              w.status,
              w.runId ?? '',
            ]),
          ]
        : [
            [
              'Supplier',
              'Invoice',
              'Due date',
              'Total',
              'Balance',
              'Review status',
              'Payment count',
            ],
            ...this.data().invoices.map((i) => [
              this.data().contractors.find((c) => c.id === i.contractorId)?.name ?? i.contractorId,
              i.number,
              i.due,
              invoiceTotal(i),
              invoiceBalance(i),
              i.status,
              i.payments.length,
            ]),
          ];
    const escape = (value: string | number) => '"' + String(value).replaceAll('"', '""') + '"';
    this.store.download(
      'payroll-' + kind + '.csv',
      rows.map((r) => r.map(escape).join(',')).join('\r\n'),
      'text/csv',
    );
    return null;
  }
  saveSettings(settings: PayrollSettings): string | null {
    if (this.allowed('manage')) return this.allowed('manage');
    if (
      !this.finite(settings.overtimeMultiplier, 1) ||
      settings.overtimeMultiplier > 5 ||
      !this.finite(settings.approvalThreshold) ||
      settings.allowances.some((a) => !a.name.trim() || !a.unit.trim() || !this.finite(a.rate))
    )
      return 'Enter an overtime multiplier from 1 to 5, a non-negative approval threshold, and named allowances with valid rates.';
    return this.commit({ ...this.data(), settings });
  }
}
