import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { CvSelect } from '../../../../shared/ui/select';
import { ToastService } from '../../../../shared/ui/toast.service';
import { EcmOperations } from '../../ecm/ecm.operations';
import { ClientInvoice } from '../../ecm/ecm.models';
import { londonDate } from '../../rota/rota.models';
import { clientInvoiceTotal } from './finance.models';

@Component({
  selector: 'cv-client-billing',
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    FormsModule,
    A11yModule,
    MatSelectModule,
    CvSelect,
    RouterLink,
  ],
  templateUrl: './client-billing.html',
  styleUrls: ['../payroll.css', './client-billing.css'],
})
export class ClientBilling {
  protected readonly ops = inject(EcmOperations);
  private readonly toast = inject(ToastService);
  protected readonly query = signal('');
  protected readonly status = signal('All');
  protected readonly funding = signal('All');
  protected readonly error = signal('');
  protected readonly selectedId = signal('');
  protected readonly selected = computed(() =>
    this.ops.data().invoices.find((i) => i.id === this.selectedId()),
  );
  protected readonly filtered = computed(() =>
    this.ops
      .data()
      .invoices.filter(
        (i) =>
          (this.status() === 'All' || i.state === this.status()) &&
          (this.funding() === 'All' || this.clientFunding(i.clientId) === this.funding()) &&
          `${i.number} ${this.clientName(i.clientId)} ${i.date} ${i.state}`
            .toLowerCase()
            .includes(this.query().trim().toLowerCase()),
      )
      .sort((a, b) => b.date.localeCompare(a.date)),
  );
  protected date = londonDate();
  protected readonly total = clientInvoiceTotal;
  protected clientName(id: string): string {
    return this.ops.rota.data().clients.find((c) => c.id === id)?.name ?? 'Former client';
  }
  protected clientFunding(id: string): string {
    return this.ops.rota.data().clients.find((c) => c.id === id)?.funding ?? 'Not recorded';
  }
  protected clear(): void {
    this.query.set('');
    this.status.set('All');
    this.funding.set('All');
  }
  protected prepare(): void {
    const error = this.ops.createInvoices(this.date);
    this.error.set(error ?? '');
    if (!error) this.toast.success('Client invoice drafts prepared.');
  }
  protected review(id: string): void {
    this.error.set('');
    this.selectedId.set(id);
  }
  protected close(): void {
    this.selectedId.set('');
    this.error.set('');
  }
  protected update(invoice: ClientInvoice, state: 'Approved' | 'Exported'): void {
    const error = this.ops.invoiceState(invoice.id, state);
    this.error.set(error ?? '');
    if (error) return;
    this.toast.success(
      state === 'Approved' ? 'Client invoice approved.' : 'Client invoice exported.',
    );
    setTimeout(() => document.getElementById('client-invoice-title')?.focus());
    if (state === 'Exported')
      this.ops.store.download(
        `${invoice.number}.json`,
        JSON.stringify(this.selected(), null, 2),
        'application/json',
      );
  }
  protected auditDate(date: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(date));
  }
}
