import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { ToastService } from '../../../shared/ui/toast.service';
import { AccessRequired } from '../shared/access-required';
import { EcmService } from './ecm.service';
import { EcmOperations } from './ecm.operations';
import { EcmDemo } from './ecm.demo';
import { VisitEvidence } from './visit-evidence';
import { londonDate, completedVisit } from '../rota/rota.models';
import { liveVisit, EcmEscalation, ClientInvoice } from './ecm.models';
@Component({
  selector: 'cv-ecm-workflows',
  imports: [
    FormsModule,
    RouterLink,
    MatSelectModule,
    CvSelect,
    DecimalPipe,
    AccessRequired,
    VisitEvidence,
  ],
  templateUrl: './ecm-workflows.html',
  styles: [
    `
      :host {
        display: block;
      }
      .workflow-nav {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 16px;
      }
      .workflow-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
        gap: 16px;
        align-items: start;
      }
      .workflow-record {
        border: 1px solid #dce5ee;
        border-radius: 10px;
        padding: 16px;
        display: grid;
        gap: 8px;
        min-width: 0;
      }
      .workflow-record p {
        margin: 0;
        overflow-wrap: anywhere;
      }
      .workflow-record .row {
        flex-wrap: wrap;
      }
      .workflow-record small {
        color: #667085;
      }
      .workflow-stack {
        display: grid;
        gap: 12px;
      }
      .workflow-error {
        background: #fff1f0;
        color: #b42318;
        padding: 12px;
        border-radius: 8px;
      }
      .workflow-context {
        background: #e6f7f5;
        border-radius: 10px;
        padding: 12px 16px;
        margin-bottom: 16px;
      }
      .workflow-nav .active {
        background: #0f2d4a;
        color: white;
      }
      .mobile-preview {
        max-width: 600px;
        margin: auto;
      }
      .workflow-header {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        align-items: end;
        margin-bottom: 16px;
      }
      .workflow-header label {
        min-width: 180px;
        flex: 1;
      }
      .workflow-record h3 {
        margin: 0;
      }
      .workflow-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .workflow-kpis {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 12px;
        margin-bottom: 16px;
      }
      .workflow-kpis > div {
        background: white;
        padding: 16px;
        border: 1px solid #dce5ee;
        border-radius: 10px;
        display: grid;
        gap: 6px;
      }
      .workflow-kpis strong {
        font-size: 26px;
        color: #0f2d4a;
      }
    `,
  ],
})
export class EcmWorkflows {
  protected readonly service = inject(EcmService);
  protected readonly ops = inject(EcmOperations);
  protected readonly demo = inject(EcmDemo);
  private readonly toast = inject(ToastService);
  protected readonly tabs = [
    'Demo setup',
    'Staff visit preview',
    'Notifications',
    'Escalations',
    'Billing & outcomes',
  ];
  protected readonly tab = signal('Demo setup');
  protected readonly date = signal(londonDate());
  protected readonly error = signal('');
  protected readonly running = signal(false);
  protected readonly person = signal('');
  protected readonly evidence = signal('');
  protected readonly visits = computed(() =>
    this.service.rota.can('view')
      ? this.service.rota
          .data()
          .visits.filter((v) => v.state === 'Published' && v.date === this.date())
      : [],
  );
  protected readonly mobile = computed(() =>
    this.visits().filter((v) => v.staffIds.includes(this.person())),
  );
  protected readonly kpis = computed(() => this.ops.kpis(this.date()));
  private timer: ReturnType<typeof setInterval> | null = null;
  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }
  protected result(error: string | null, success = 'Demo record saved.'): void {
    this.error.set(error ?? '');
    if (!error) this.toast.success(success);
  }
  protected setup(): void {
    this.result(this.demo.setup(), 'Demo clients, carers and visits are ready.');
    this.date.set(londonDate());
    this.person.set(this.demo.visits().at(-1)?.staffIds[0] ?? '');
  }
  protected next(): void {
    const error = this.demo.next();
    this.result(error, 'Mobile update applied to the board.');
    if (error || !this.demo.waiting().length) this.stop();
  }
  protected start(): void {
    if (this.timer) return;
    this.running.set(true);
    this.next();
    if (this.running()) this.timer = setInterval(() => this.next(), 10000);
  }
  protected stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.running.set(false);
  }
  protected stamp(value: string): string {
    return value
      ? new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Europe/London',
          dateStyle: 'medium',
          timeStyle: 'medium',
        }).format(new Date(value))
      : '';
  }
  protected name(id: string): string {
    return (
      this.ops.store.data().people.find((p) => p.id === id)?.name ??
      this.ops.store.data().members.find((m) => m.id === id)?.name ??
      'Unassigned'
    );
  }
  protected title(id: string): string {
    const v = this.service.rota.data().visits.find((v) => v.id === id);
    return v ? `${v.clientName} · ${v.callName} · ${v.date} ${v.start}` : 'Visit unavailable';
  }
  protected attendance(id: string, kind: 'Check in' | 'Check out'): void {
    this.result(
      this.service.attendance(
        id,
        this.person(),
        new Date().toISOString(),
        kind,
        'Actual time recorded in the dummy mobile preview.',
      ),
    );
  }
  protected state(v: Parameters<typeof liveVisit>[0]): string {
    return liveVisit(v, Date.now(), this.service.data()).status;
  }
  protected checked(id: string): boolean {
    return !!this.visits()
      .find((v) => v.id === id)
      ?.attendance.some((a) => a.personId === this.person());
  }
  protected finished(id: string): boolean {
    return !!this.visits()
      .find((v) => v.id === id)
      ?.attendance.some((a) => a.personId === this.person() && a.end);
  }
  protected complete = completedVisit;
  protected cases: Record<string, { owner: string; state: EcmEscalation['state']; note: string }> =
    {};
  protected caseForm(c: EcmEscalation) {
    return (this.cases[c.id] ??= { owner: c.ownerId, state: c.state, note: '' });
  }
  protected updateCase(c: EcmEscalation): void {
    const f = this.caseForm(c);
    this.result(this.ops.escalation(c.id, f.owner, f.state, f.note));
    if (!this.error()) f.note = '';
  }
  protected deliver(id: string, state: 'Delivered' | 'Failed' | 'Queued'): void {
    this.result(this.ops.delivery(id, state));
  }
  protected bill(): void {
    this.result(this.ops.createInvoices(this.date()), 'Client billing drafts created.');
  }
  protected approve(i: ClientInvoice): void {
    this.result(this.ops.invoiceState(i.id, 'Approved'));
  }
  protected exportInvoice(i: ClientInvoice): void {
    const error = this.ops.invoiceState(i.id, 'Exported');
    this.result(error);
    if (!error)
      this.ops.store.download(
        `${i.number}.json`,
        JSON.stringify({ ...i, state: 'Exported', demo: true }, null, 2),
        'application/json',
      );
  }
  protected clientName(id: string): string {
    return this.service.rota.data().clients.find((c) => c.id === id)?.name ?? 'Former client';
  }
  protected total(i: ClientInvoice): number {
    return i.lines.reduce((sum, l) => sum + l.amount, 0);
  }
  protected payroll(): void {
    this.result(
      this.service.rota.sendToPayroll(this.date()),
      'Verified attendance transferred to demo payroll.',
    );
  }
  protected pack(): void {
    this.result(this.ops.createPack(this.date()), 'Evidence pack prepared.');
  }
  protected downloadPack(id: string): void {
    if (!this.service.rota.can('export')) return;
    const p = this.ops.data().packs.find((p) => p.id === id);
    if (p) this.ops.store.download(`care-evidence-${p.date}.json`, p.snapshot, 'application/json');
  }
}
