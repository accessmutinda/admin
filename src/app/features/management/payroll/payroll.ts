import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { CvSelect } from '../../../shared/ui/select';
import { ToastService } from '../../../shared/ui/toast.service';
import { ManagementStore } from '../shared/management.store';
import {
  Attachment,
  Contractor,
  Invoice,
  invoiceBalance,
  invoiceTotal,
  PayProfile,
  PayrollSettings,
  PayRun,
  WorkRecord,
  money,
} from './payroll.models';
import { PayrollService } from './payroll.service';
import { AccessRequired } from '../shared/access-required';

@Component({
  selector: 'cv-payroll',
  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule,
    A11yModule,
    MatSelectModule,
    CvSelect,
    RouterLink,
    AccessRequired,
  ],
  templateUrl: './payroll.html',
  styleUrl: './payroll.css',
})
export class Payroll {
  protected readonly service = inject(PayrollService);
  protected readonly store = inject(ManagementStore);
  private readonly toast = inject(ToastService);
  protected readonly tabs = [
    'Overview',
    'Payroll',
    'Overtime',
    'Contractors',
    'Invoices',
    'Settings',
  ];
  protected readonly tab = signal('Overview');
  protected readonly payrollTab = signal('Pay runs');
  protected readonly query = signal('');
  protected readonly status = signal('All');
  protected readonly modal = signal('');
  protected readonly error = signal('');
  protected readonly uploading = signal(false);
  protected readonly selected = signal<{
    kind: 'work' | 'invoice' | 'run' | 'contractor';
    id: string;
  } | null>(null);
  protected readonly workRecord = computed(() =>
    this.selected()?.kind === 'work'
      ? this.service.data().work.find((w) => w.id === this.selected()?.id)
      : undefined,
  );
  protected readonly invoiceRecord = computed(() =>
    this.selected()?.kind === 'invoice'
      ? this.service.data().invoices.find((i) => i.id === this.selected()?.id)
      : undefined,
  );
  protected readonly runRecord = computed(() =>
    this.selected()?.kind === 'run'
      ? this.service.data().runs.find((r) => r.id === this.selected()?.id)
      : undefined,
  );
  protected readonly contractorRecord = computed(() =>
    this.selected()?.kind === 'contractor'
      ? this.service.data().contractors.find((c) => c.id === this.selected()?.id)
      : undefined,
  );
  protected readonly filteredWork = computed(() =>
    this.service
      .data()
      .work.filter(
        (w) =>
          (this.tab() === 'Overtime' ? w.kind === 'Overtime' : w.kind !== 'Overtime') &&
          this.match(
            `${this.personName(w.personId)} ${w.date} ${w.kind} ${w.reason} ${w.status}`,
          ) &&
          (this.status() === 'All' || w.status === this.status()),
      ),
  );
  protected readonly filteredInvoices = computed(() =>
    this.service
      .data()
      .invoices.filter(
        (i) =>
          this.match(
            `${this.contractorName(i.contractorId)} ${i.number} ${i.due} ${this.invoiceStatus(i)}`,
          ) &&
          (this.status() === 'All' || this.invoiceStatus(i) === this.status()),
      ),
  );
  protected readonly filteredContractors = computed(() =>
    this.service
      .data()
      .contractors.filter((c) => this.match(`${c.name} ${c.email} ${c.type} ${c.reference}`)),
  );
  protected readonly filteredRuns = computed(() =>
    this.service.data().runs.filter((r) => this.match(`${r.name} ${r.start} ${r.end} ${r.status}`)),
  );
  protected readonly filteredProfiles = computed(() =>
    this.service
      .data()
      .profiles.filter((p) =>
        this.match(`${this.personName(p.personId)} ${p.basis} ${p.frequency} ${p.effective}`),
      )
      .sort((a, b) => b.effective.localeCompare(a.effective)),
  );
  protected readonly pendingWork = computed(() =>
    this.service.data().work.filter((w) => !['Approved', 'Rejected'].includes(w.status)),
  );
  protected readonly pendingOvertime = computed(() =>
    this.pendingWork().filter((w) => w.kind === 'Overtime'),
  );
  protected readonly outstandingInvoices = computed(() =>
    this.service
      .data()
      .invoices.filter(
        (i) => !['Cancelled', 'Rejected'].includes(i.status) && invoiceBalance(i) > 0,
      ),
  );
  protected readonly invoiceDue = computed(() =>
    this.outstandingInvoices().reduce((sum, i) => sum + invoiceBalance(i), 0),
  );
  protected readonly gross = computed(() =>
    this.service
      .data()
      .runs.filter((r) => ['Draft', 'Locked', 'Exported'].includes(r.status))
      .reduce((sum, r) => sum + this.runTotal(r), 0),
  );
  protected readonly frequencies = ['Weekly', 'Fortnightly', 'Monthly'];
  protected readonly today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  protected profile: PayProfile = this.newProfile();
  protected work: WorkRecord = this.newWork();
  protected contractor: Contractor = this.newContractor();
  protected invoice: Invoice = this.newInvoice();
  protected run: PayRun = this.newRun();
  protected settings: PayrollSettings = structuredClone(this.service.data().settings);
  protected note = '';
  protected actualHours = 0;
  protected payment = { date: this.today, amount: 0, reference: '' };
  protected adjustment = { personId: '', amount: 0, reason: '' };
  protected invoiceTotal = invoiceTotal;
  protected invoiceBalance = invoiceBalance;
  protected personName(id: string): string {
    return this.store.data().people.find((p) => p.id === id)?.name ?? 'Former employee';
  }
  protected contractorName(id: string): string {
    return this.service.data().contractors.find((c) => c.id === id)?.name ?? 'Supplier';
  }
  protected memberName(id: string): string {
    return this.store.data().members.find((m) => m.id === id)?.name ?? 'Not assigned';
  }
  private match(text: string): boolean {
    return text.toLowerCase().includes(this.query().trim().toLowerCase());
  }
  protected choose(tab: string): void {
    this.tab.set(tab);
    this.query.set('');
    this.status.set('All');
    this.selected.set(null);
    this.error.set('');
    if (tab === 'Settings') this.settings = structuredClone(this.service.data().settings);
  }
  protected invoiceStatus(i: Invoice): string {
    return i.status === 'Approved'
      ? invoiceBalance(i) <= 0
        ? 'Paid'
        : i.payments.length
          ? 'Partially paid'
          : 'Awaiting payment'
      : i.status;
  }
  protected runTotal(r: PayRun): number {
    return money(r.lines.reduce((sum, l) => sum + l.total, 0));
  }
  protected rateWarning(i: Invoice): boolean {
    const c = this.service.data().contractors.find((c) => c.id === i.contractorId);
    return !!c && i.lines.some((l) => l.rate > c.rate);
  }
  protected missingProfiles(): number {
    return this.store.staff().filter((p) => !this.service.profile(p.id, this.today)).length;
  }
  protected previousRun(r: PayRun): PayRun | undefined {
    return this.service
      .data()
      .runs.filter(
        (p) =>
          p.id !== r.id &&
          p.frequency === r.frequency &&
          p.end < r.start &&
          p.status !== 'Cancelled',
      )
      .sort((a, b) => b.end.localeCompare(a.end))[0];
  }
  protected auditDate(value: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }
  private newProfile(): PayProfile {
    return {
      id: crypto.randomUUID(),
      personId: '',
      basis: 'Hourly',
      rate: 0,
      weeklyHours: 0,
      effective: this.today,
      frequency: this.service.data().settings.frequency,
    };
  }
  private newWork(): WorkRecord {
    return {
      id: crypto.randomUUID(),
      personId: '',
      date: this.today,
      hours: 0,
      actualHours: 0,
      rate: 0,
      kind: 'Overtime',
      category: '',
      reason: '',
      status: 'Requested',
      audit: [],
    };
  }
  private newContractor(): Contractor {
    return {
      id: crypto.randomUUID(),
      name: '',
      email: '',
      type: 'Contractor',
      rate: 0,
      unit: 'Hour',
      terms: 30,
      start: this.today,
      end: '',
      reference: '',
      managerId: '',
    };
  }
  private newInvoice(): Invoice {
    return {
      id: crypto.randomUUID(),
      contractorId: '',
      number: '',
      issued: this.today,
      due: '',
      start: this.today,
      end: this.today,
      lines: [{ description: '', quantity: 1, rate: 0, vat: 0 }],
      status: 'Recorded',
      createdBy: '',
      audit: [],
      payments: [],
    };
  }
  private newRun(): PayRun {
    return {
      id: crypto.randomUUID(),
      name: '',
      start: '',
      end: '',
      payday: '',
      cutoff: '',
      frequency: this.service.data().settings.frequency,
      status: 'Draft',
      createdBy: '',
      lines: [],
      audit: [],
    };
  }
  protected open(kind: string): void {
    this.error.set('');
    this.selected.set(null);
    if (kind === 'profile') this.profile = this.newProfile();
    if (kind === 'work') {
      this.work = this.newWork();
      if (this.tab() !== 'Overtime') this.work.kind = 'Regular';
    }
    if (kind === 'contractor') this.contractor = this.newContractor();
    if (kind === 'invoice') this.invoice = this.newInvoice();
    if (kind === 'run') this.run = this.newRun();
    this.modal.set(kind);
  }
  protected profileUsed(id: string): boolean {
    return this.service
      .data()
      .runs.some((r) => r.status !== 'Cancelled' && r.lines.some((l) => l.profileId === id));
  }
  protected editProfile(p: PayProfile): void {
    this.profile = structuredClone(p);
    this.error.set('');
    this.modal.set('profile');
  }
  protected editContractor(c: Contractor): void {
    this.contractor = structuredClone(c);
    this.error.set('');
    this.modal.set('contractor');
  }
  protected view(kind: 'work' | 'invoice' | 'run' | 'contractor', id: string): void {
    this.selected.set({ kind, id });
    this.error.set('');
    this.note = '';
    this.actualHours = this.workRecord()?.hours ?? 0;
    this.payment = {
      date: this.today,
      amount: this.invoiceRecord() ? invoiceBalance(this.invoiceRecord()!) : 0,
      reference: '',
    };
    this.adjustment = {
      personId: this.runRecord()?.lines[0]?.personId ?? '',
      amount: 0,
      reason: '',
    };
    setTimeout(() => document.getElementById('payroll-record-title')?.focus());
  }
  protected close(): void {
    if (!this.uploading()) this.modal.set('');
  }
  protected save(): void {
    if (this.uploading()) return;
    const kind = this.modal();
    const error =
      kind === 'profile'
        ? this.service.saveProfile(this.profile)
        : kind === 'work'
          ? this.service.saveWork(this.work)
          : kind === 'contractor'
            ? this.service.saveContractor(this.contractor)
            : kind === 'invoice'
              ? this.service.saveInvoice(this.invoice)
              : this.service.buildRun(this.run);
    if (this.result(error, 'Record saved.')) this.modal.set('');
  }
  private result(error: string | null, message: string): boolean {
    this.error.set(error ?? '');
    if (error) return false;
    this.toast.success(message);
    return true;
  }
  protected workAction(decision: 'Authorise' | 'Confirm' | 'Approve' | 'Return' | 'Reject'): void {
    const w = this.workRecord();
    if (w)
      this.result(
        this.service.workDecision(w.id, decision, this.note, this.actualHours),
        'Work record updated.',
      );
  }
  protected invoiceAction(
    decision: 'Confirm work' | 'Approve' | 'Return' | 'Reject' | 'Cancel',
  ): void {
    const i = this.invoiceRecord();
    if (i)
      this.result(
        this.service.invoiceDecision(i.id, decision, this.note),
        'Invoice review recorded.',
      );
  }
  protected payInvoice(): void {
    const i = this.invoiceRecord();
    if (i)
      this.result(
        this.service.recordInvoicePayment(
          i.id,
          this.payment.date,
          this.payment.amount,
          this.payment.reference,
        ),
        'Payment recorded.',
      );
  }
  protected runAction(decision: 'Lock' | 'Export' | 'Pay' | 'Cancel'): void {
    const r = this.runRecord();
    if (r)
      this.result(
        this.service.runDecision(r.id, decision, this.payment.date, this.payment.reference),
        'Pay run updated.',
      );
  }
  protected saveAdjustment(): void {
    const r = this.runRecord();
    if (r)
      this.result(
        this.service.adjustRun(
          r.id,
          this.adjustment.personId,
          this.adjustment.amount,
          this.adjustment.reason,
        ),
        'Adjustment saved.',
      );
  }
  protected exportRegister(): void {
    this.result(
      this.service.exportRegister(this.tab() === 'Invoices' ? 'invoices' : 'work'),
      'Register exported.',
    );
  }
  protected saveSettings(): void {
    this.result(this.service.saveSettings(this.settings), 'Payroll settings saved.');
  }
  protected discardSettings(): void {
    this.settings = structuredClone(this.service.data().settings);
    this.error.set('');
  }
  protected async upload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024 || !/\.(pdf|png|jpg|jpeg|doc|docx)$/i.test(file.name)) {
      this.error.set('Choose a PDF, Word document or image up to 1 MB.');
      input.value = '';
      return;
    }
    this.uploading.set(true);
    try {
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error());
        reader.readAsDataURL(file);
      });
      const attachment = { name: file.name, type: file.type, content };
      if (this.modal() === 'contractor') this.contractor.attachment = attachment;
      else this.invoice.attachment = attachment;
      this.error.set('');
    } catch {
      this.error.set('Could not read the attachment. Choose it again.');
    } finally {
      this.uploading.set(false);
    }
  }
  protected download(file: Attachment): void {
    const a = document.createElement('a');
    a.href = file.content;
    a.download = file.name;
    a.click();
  }
}
