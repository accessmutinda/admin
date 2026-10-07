import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { ManagementStore, WorkspaceData } from '../shared/management.store';
import { PayrollService } from '../payroll/payroll.service';
import { PayrollAction } from '../payroll/payroll.models';
import { RotaService } from '../rota/rota.service';
import {
  RotaVisit,
  emptyRota,
  londonInstant,
  minutes,
  completedVisit,
  addDays,
} from '../rota/rota.models';
import { validVacancyDate } from '../recruitment/vacancy-deadline';
import { EcmData, EcmEscalation, emptyEcm, liveVisit, onBoardDate } from './ecm.models';

@Injectable({ providedIn: 'root' })
export class EcmOperations {
  readonly store = inject(ManagementStore);
  readonly rota = inject(RotaService);
  readonly payroll = inject(PayrollService);
  private readonly auth = inject(AuthService);
  readonly data = computed(() => ({ ...emptyEcm(), ...this.rota.data().ecm }));
  readonly manager = computed(
    () =>
      this.rota.can('manage') &&
      ['Company Admin', 'Platform Owner', 'Registered Manager'].includes(this.rota.role()),
  );
  private entry(action: string, detail: string) {
    const user = this.auth.currentUser()!;
    return {
      id: crypto.randomUUID(),
      userId: user.id,
      user: user.name,
      at: new Date().toISOString(),
      action,
      detail,
    };
  }
  private commit(
    action: string,
    detail: string,
    change: (d: WorkspaceData, e: EcmData) => WorkspaceData,
    financeAction?: PayrollAction,
  ): string | null {
    if (financeAction ? !this.payroll.can(financeAction) : !this.rota.can('manage'))
      return financeAction
        ? 'Your payroll role cannot perform this billing action.'
        : 'Your role cannot manage ECM workflows.';
    return this.store.saveWorkspace((d) => {
      const rota = d.rota ?? emptyRota();
      const changed = change({ ...d, rota }, { ...emptyEcm(), ...rota.ecm });
      return {
        ...changed,
        rota: { ...changed.rota!, audit: [...changed.rota!.audit, this.entry(action, detail)] },
      };
    })
      ? null
      : 'Could not save. Free some browser storage and try again.';
  }
  reschedule(
    id: string,
    date: string,
    start: string,
    reason: string,
    accepted: boolean,
  ): string | null {
    const visit = this.rota.data().visits.find((v) => v.id === id && v.state === 'Published');
    if (
      !visit ||
      visit.attendance.length ||
      !validVacancyDate(date) ||
      !londonInstant(date, start) ||
      !reason.trim() ||
      !accepted
    )
      return 'Choose an unstarted visit, a valid new date and time, a reason and confirmation that the change was agreed.';
    const duration = (minutes(visit.end) - minutes(visit.start) + 1440) % 1440;
    const endMinutes = (minutes(start) + duration) % 1440;
    const end = `${Math.floor(endMinutes / 60)
      .toString()
      .padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;
    const updated = { ...visit, date, start, end };
    const issues = this.rota.conflicts(updated);
    if (issues.length) return issues.join(' ');
    return this.commit(
      'Visit rescheduled',
      `${visit.clientName} · ${visit.date} ${visit.start} → ${date} ${start} · ${reason.trim()}`,
      (d, e) => ({
        ...d,
        rota: {
          ...d.rota!,
          visits: d.rota!.visits.map((v) => (v.id === id ? updated : v)),
          ecm: {
            ...e,
            records: [
              ...e.records,
              {
                id: crypto.randomUUID(),
                visitId: id,
                at: new Date().toISOString(),
                user: this.auth.currentUser()!.name,
                action: 'Agreed time change applied',
                note: reason.trim(),
                contact: '',
                outcome: 'Agreed',
                eta: start,
                accepted: true,
                concern: false,
                followUp: '',
              },
            ],
          },
        },
      }),
    );
  }
  override(id: string, staffIds: string[], reason: string, acknowledged: boolean): string | null {
    if (!this.manager())
      return 'A registered manager or administrator must approve a manual override.';
    const v = this.rota.data().visits.find((v) => v.id === id && v.state === 'Published');
    if (
      !v ||
      v.attendance.length ||
      !reason.trim() ||
      !acknowledged ||
      staffIds.length !== v.carers ||
      new Set(staffIds).size !== staffIds.length ||
      staffIds.some((id) => !this.store.staff().some((p) => p.id === id)) ||
      !this.rota.data().clients.find((c) => c.id === v.clientId)?.active ||
      !this.rota.data().calls.find((c) => c.id === v.callId)?.active ||
      this.data().styles[v.callName]?.active === false ||
      !londonInstant(v.date, v.start) ||
      !londonInstant(v.end <= v.start ? addDays(v.date, 1) : v.date, v.end)
    )
      return 'Choose all required hired carers on an active, unstarted visit. Enter a reason and acknowledge the conflicts.';
    const conflicts = this.rota.conflicts({ ...v, staffIds });
    return this.commit(
      'Manual allocation override',
      `${v.clientName} · ${reason.trim()} · ${conflicts.join('; ') || 'No availability conflicts'}`,
      (d, e) => ({
        ...d,
        rota: {
          ...d.rota!,
          ecm: e,
          visits: d.rota!.visits.map((r) =>
            r.id === id
              ? {
                  ...r,
                  staffIds: [...staffIds],
                  allocation: 'Temporary',
                  manualOverride: {
                    at: new Date().toISOString(),
                    by: this.auth.currentUser()!.name,
                    reason: reason.trim(),
                    conflicts,
                  },
                }
              : r,
          ),
        },
      }),
    );
  }
  delivery(id: string, outcome: 'Delivered' | 'Failed' | 'Queued'): string | null {
    const n = this.data().notifications.find((n) => n.id === id);
    if (!n) return 'Notification is no longer available.';
    if (n.state === 'Delivered') return 'This demo notification is already delivered.';
    if (outcome === 'Queued' && n.state !== 'Failed')
      return 'Only failed demo notifications can be retried.';
    return this.commit('Demo notification updated', `${n.subject} · ${outcome}`, (d, e) => ({
      ...d,
      rota: {
        ...d.rota!,
        ecm: {
          ...e,
          notifications: e.notifications.map((r) =>
            r.id === id
              ? {
                  ...r,
                  state: outcome,
                  updatedAt: new Date().toISOString(),
                  attempts: outcome === 'Queued' ? r.attempts : r.attempts + 1,
                  error:
                    outcome === 'Failed' ? 'Simulated delivery failure. Retry when ready.' : '',
                }
              : r,
          ),
        },
      },
    }));
  }
  escalation(
    id: string,
    ownerId: string,
    state: EcmEscalation['state'],
    note: string,
  ): string | null {
    const c = this.data().escalations.find((c) => c.id === id);
    if (
      !c ||
      !this.store.data().members.some((m) => m.id === ownerId && m.status === 'Active') ||
      !['Open', 'In review', 'Resolved'].includes(state) ||
      !note.trim()
    )
      return 'Choose an active owner, status and a review or resolution note.';
    return this.commit('Escalation updated', `${id} · ${state} · ${note.trim()}`, (d, e) => ({
      ...d,
      rota: {
        ...d.rota!,
        ecm: {
          ...e,
          escalations: e.escalations.map((r) =>
            r.id === id
              ? {
                  ...r,
                  ownerId,
                  state,
                  resolution: state === 'Resolved' ? note.trim() : '',
                  history: [
                    ...r.history,
                    {
                      at: new Date().toISOString(),
                      user: this.auth.currentUser()!.name,
                      note: note.trim(),
                    },
                  ],
                }
              : r,
          ),
        },
      },
    }));
  }
  kpis(date: string) {
    const visits = this.rota
      .data()
      .visits.filter((v) => v.state === 'Published' && onBoardDate(v, date));
    const complete = visits.filter(completedVisit);
    const late = visits.filter((v) => {
      const start = londonInstant(v.date, v.start);
      return (
        start &&
        v.attendance.some(
          (a) => Date.parse(a.start) > Date.parse(start) + this.data().lateMinutes * 60000,
        )
      );
    });
    const hours = complete.reduce(
      (sum, v) =>
        sum +
        v.attendance
          .filter((a) => v.staffIds.includes(a.personId))
          .reduce((h, a) => h + (Date.parse(a.end) - Date.parse(a.start)) / 3600000, 0),
      0,
    );
    return {
      expected: visits.length,
      completed: complete.length,
      late: late.length,
      missed: visits.filter((v) => liveVisit(v, Date.now(), this.data()).status === 'Missed visit')
        .length,
      coverage: visits.length
        ? Math.round(
            (visits.filter((v) => v.staffIds.length === v.carers).length / visits.length) * 100,
          )
        : 0,
      completion: visits.length ? Math.round((complete.length / visits.length) * 100) : 0,
      hours: Math.round(hours * 100) / 100,
    };
  }
  createInvoices(date: string): string | null {
    if (!this.payroll.can('manage'))
      return 'Payroll management access is required to prepare billing drafts.';
    if (!validVacancyDate(date)) return 'Choose a valid date.';
    const completed = this.rota
      .data()
      .visits.filter(
        (v) =>
          v.date === date &&
          completedVisit(v) &&
          !this.data().invoices.some((i) => i.lines.some((l) => l.visitId === v.id)),
      );
    if (!completed.length) return 'No new completed visits to invoice on this date.';
    for (const v of completed) {
      const c = this.rota.data().clients.find((c) => c.id === v.clientId);
      if (!c?.billingRate || c.billingRate <= 0)
        return `${v.clientName} needs a positive billing rate in Client files.`;
    }
    return this.commit(
      'Client billing drafts prepared',
      date,
      (d, e) => {
        const invoices = [...e.invoices];
        for (const clientId of new Set(completed.map((v) => v.clientId))) {
          const c = d.rota!.clients.find((c) => c.id === clientId)!;
          const lines = completed
            .filter((v) => v.clientId === clientId)
            .map((v) => {
              const hours =
                c.billingBasis === 'Carer hour'
                  ? v.attendance.reduce(
                      (sum, a) => sum + (Date.parse(a.end) - Date.parse(a.start)) / 3600000,
                      0,
                    )
                  : (Math.max(...v.attendance.map((a) => Date.parse(a.end))) -
                      Math.min(...v.attendance.map((a) => Date.parse(a.start)))) /
                    3600000;
              return {
                visitId: v.id,
                date: v.date,
                call: v.callName,
                hours: Math.round(hours * 10000) / 10000,
                rate: c.billingRate!,
                amount: Math.round(hours * c.billingRate! * 100) / 100,
                basis: c.billingBasis ?? 'Visit hour',
              };
            });
          invoices.push({
            id: crypto.randomUUID(),
            clientId,
            number: `ECM-${date.replaceAll('-', '')}-${invoices.length + 1}`,
            date,
            state: 'Draft',
            lines,
            audit: [
              {
                at: new Date().toISOString(),
                user: this.auth.currentUser()!.name,
                note: 'Draft from verified visit attendance',
              },
            ],
          });
        }
        return { ...d, rota: { ...d.rota!, ecm: { ...e, invoices } } };
      },
      'manage',
    );
  }
  invoiceState(id: string, state: 'Approved' | 'Exported'): string | null {
    if (!this.payroll.can(state === 'Approved' ? 'approve' : 'export'))
      return 'Your payroll role cannot perform this billing action.';
    const i = this.data().invoices.find((i) => i.id === id);
    if (
      !i ||
      (state === 'Approved' && i.state !== 'Draft') ||
      (state === 'Exported' && i.state !== 'Approved')
    )
      return 'Approve a draft before exporting. Exported invoices are locked.';
    return this.commit(
      'Client billing status changed',
      `${i.number} · ${state}`,
      (d, e) => ({
        ...d,
        rota: {
          ...d.rota!,
          ecm: {
            ...e,
            invoices: e.invoices.map((r) =>
              r.id === id
                ? {
                    ...r,
                    state,
                    audit: [
                      ...r.audit,
                      {
                        at: new Date().toISOString(),
                        user: this.auth.currentUser()!.name,
                        note: state,
                      },
                    ],
                  }
                : r,
            ),
          },
        },
      }),
      state === 'Approved' ? 'approve' : 'export',
    );
  }
  createPack(date: string): string | null {
    if (!this.rota.can('export')) return 'Export permission is required for evidence packs.';
    if (!validVacancyDate(date)) return 'Choose a valid date.';
    const visits = this.rota
      .data()
      .visits.filter((v) => v.state === 'Published' && onBoardDate(v, date));
    if (!visits.length) return 'There are no published visits to include.';
    const ids = visits.map((v) => v.id);
    const e = this.data();
    const snapshot = JSON.stringify(
      {
        title: 'Care delivery evidence pack',
        demo: true,
        date,
        generatedAt: new Date().toISOString(),
        kpis: this.kpis(date),
        visits,
        followUp: e.records.filter((r) => ids.includes(r.visitId)),
        notifications: e.notifications.filter((r) => ids.includes(r.visitId)),
        escalations: e.escalations.filter((r) => ids.includes(r.visitId)),
        evidence: e.evidence
          .filter((r) => ids.includes(r.visitId))
          .map(({ photo, audio, ...record }) => ({
            ...record,
            photoAttached: !!photo,
            audioAttached: !!audio,
          })),
      },
      null,
      2,
    );
    return this.commit('CQC evidence pack prepared', date, (d, e) => ({
      ...d,
      rota: {
        ...d.rota!,
        ecm: {
          ...e,
          packs: [
            ...e.packs,
            {
              id: crypto.randomUUID(),
              date,
              at: new Date().toISOString(),
              user: this.auth.currentUser()!.name,
              visitIds: ids,
              snapshot,
            },
          ],
        },
      },
    }));
  }
}
