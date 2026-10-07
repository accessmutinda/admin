import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { ROLES } from '../../../core/auth/models/role';
import { ManagementStore, COURSES } from '../shared/management.store';
import { validVacancyDate } from '../recruitment/vacancy-deadline';
import { PayrollService } from '../payroll/payroll.service';
import { WorkRecord, money } from '../payroll/payroll.models';
import {
  RotaCall,
  RotaClient,
  RotaData,
  RotaAction,
  rotaDefaults,
  RotaVisit,
  addDays,
  completedVisit,
  emptyRota,
  londonInstant,
  validTime,
  visitWindow,
} from './rota.models';

@Injectable({ providedIn: 'root' })
export class RotaService {
  private readonly store = inject(ManagementStore);
  private readonly auth = inject(AuthService);
  private readonly payroll = inject(PayrollService);
  readonly data = computed(() => this.store.data().rota ?? emptyRota());
  readonly role = computed(() => ROLES[this.auth.currentUser()?.roleCode ?? 'CW'].label);
  readonly permissions = computed(
    () => this.store.data().rotaPermissions?.[this.role()] ?? rotaDefaults(this.role()),
  );
  can(action: RotaAction): boolean {
    const permissions = this.store.data().permissions[this.role() + ':Care delivery'];
    const index = { view: 0, manage: 2, publish: 2, attendance: 2, export: 4 }[action];
    return (
      !!this.auth.currentUser() &&
      !!this.store.company()?.modules.includes('Care delivery') &&
      this.permissions().includes('view') &&
      this.permissions().includes(action) &&
      (!permissions ||
        (!!permissions[0] && !!permissions[index] && (action !== 'manage' || !!permissions[1])))
    );
  }
  private entry(action: string, detail: string) {
    return {
      id: crypto.randomUUID(),
      userId: this.auth.currentUser()!.id,
      at: new Date().toISOString(),
      user: this.auth.currentUser()!.name,
      action,
      detail,
    };
  }
  private commit(data: RotaData, action: string, detail: string): string | null {
    return this.store.saveWorkspace((d) => ({
      ...d,
      rota: { ...data, audit: [...data.audit, this.entry(action, detail)] },
    }))
      ? null
      : 'Could not save rota changes. Free some browser storage and try again.';
  }
  private denied(action: 'manage' | 'publish' | 'attendance'): string | null {
    return this.can(action) ? null : 'Your role does not have permission for this rota action.';
  }
  saveClient(client: RotaClient): string | null {
    if (this.denied('manage')) return this.denied('manage');
    if (
      !client.name.trim() ||
      !client.reference.trim() ||
      !client.address.trim() ||
      !client.postcode.trim() ||
      !['Local authority', 'Private', 'NHS'].includes(client.funding) ||
      !['Standard', 'High'].includes(client.priority)
    )
      return 'Enter the service user name, reference, address, postcode, funding and priority.';
    if (
      this.data().clients.some(
        (c) =>
          c.id !== client.id && c.reference.toLowerCase() === client.reference.trim().toLowerCase(),
      )
    )
      return 'A service user with this reference already exists.';
    const saved = {
      ...client,
      name: client.name.trim(),
      reference: client.reference.trim(),
      address: client.address.trim(),
      postcode: client.postcode.trim().toUpperCase(),
    };
    return this.commit(
      {
        ...this.data(),
        clients: [...this.data().clients.filter((c) => c.id !== client.id), saved],
      },
      'Service user saved',
      saved.name,
    );
  }
  saveCall(call: RotaCall): string | null {
    if (this.denied('manage')) return this.denied('manage');
    if (
      !this.data().clients.some((c) => c.id === call.clientId) ||
      !call.name.trim() ||
      !validTime(call.start) ||
      !validTime(call.end) ||
      call.start === call.end ||
      !Number.isInteger(call.carers) ||
      call.carers < 1 ||
      call.carers > 2 ||
      !call.weekdays.length ||
      call.weekdays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)
    )
      return 'Choose a service user, call name, different start/end times, weekdays and one or two carers.';
    if (
      new Set(call.regularStaffIds).size !== call.regularStaffIds.length ||
      call.regularStaffIds.length > call.carers ||
      call.regularStaffIds.some((id) => !this.store.staff().some((p) => p.id === id))
    )
      return 'Choose distinct hired staff within the required carer count.';
    if (call.skills.some((skill) => !COURSES.some((course) => course.id === skill)))
      return 'Choose recognised training requirements.';
    const prospective = this.makeVisit(call, '2000-01-01', call.regularStaffIds, 'Regular');
    const skills = call.regularStaffIds.flatMap((id) => this.skillConflicts(prospective, id));
    if (skills.length) return skills.join(' ');
    return this.commit(
      {
        ...this.data(),
        calls: [
          ...this.data().calls.filter((c) => c.id !== call.id),
          { ...call, name: call.name.trim() },
        ],
      },
      'Call package saved',
      call.name,
    );
  }
  private makeVisit(
    call: RotaCall,
    date: string,
    staffIds: string[],
    allocation: RotaVisit['allocation'],
  ): RotaVisit {
    const client = this.data().clients.find((c) => c.id === call.clientId)!;
    return {
      id: crypto.randomUUID(),
      callId: call.id,
      clientId: client.id,
      clientName: client.name,
      address: `${client.address}, ${client.postcode}`,
      callName: call.name,
      date,
      start: call.start,
      end: call.end,
      carers: call.carers,
      skills: [...call.skills],
      tasks: call.tasks,
      staffIds: [...staffIds],
      allocation,
      state: 'Draft',
      priority: client.priority,
      attendance: [],
      exception: '',
    };
  }
  private skillConflicts(visit: RotaVisit, id: string): string[] {
    const person = this.store.staff().find((p) => p.id === id);
    if (!person) return ['A selected carer is no longer hired.'];
    return visit.skills
      .filter((s) => (person.progress[s] ?? 0) < 100)
      .map((s) => `${person.name} has not completed ${s} training.`);
  }
  conflicts(visit: RotaVisit, all = this.data().visits): string[] {
    const client = this.data().clients.find((c) => c.id === visit.clientId);
    const call = this.data().calls.find((c) => c.id === visit.callId);
    if (!client?.active || !call?.active) return ['Service user or call package is inactive.'];
    const problems: string[] = [];
    const [start, end] = visitWindow(visit);
    if (
      !validVacancyDate(visit.date) ||
      !validTime(visit.start) ||
      !validTime(visit.end) ||
      start === end
    )
      return ['Invalid visit date or times.'];
    if (
      !londonInstant(visit.date, visit.start) ||
      !londonInstant(visit.end > visit.start ? visit.date : addDays(visit.date, 1), visit.end)
    )
      problems.push(
        'Visit times are missing or ambiguous during a UK clock change. Choose a different time.',
      );
    if (
      new Set(visit.staffIds).size !== visit.staffIds.length ||
      visit.staffIds.length > visit.carers
    )
      problems.push('Choose distinct carers within the required carer count.');
    for (const id of visit.staffIds) {
      const person = this.store.staff().find((p) => p.id === id);
      problems.push(...this.skillConflicts(visit, id));
      if (!person) continue;
      if (person.start && person.start > visit.date)
        problems.push(`${person.name} has not reached their employment start date.`);
      if (
        this.store
          .data()
          .leaves.some(
            (l) =>
              l.person === person.name &&
              l.start <= addDays(visit.date, visit.end <= visit.start ? 1 : 0) &&
              l.end >= visit.date,
          )
      )
        problems.push(`${person.name} has recorded leave or training on this date.`);
      if (
        Object.entries(person.checkExpiry ?? {}).some(
          ([, expiry]) => expiry && (!validVacancyDate(expiry) || expiry < visit.date),
        ) ||
        (person.visaExpiry && person.visaExpiry < visit.date)
      )
        problems.push(`${person.name} has an expired employment check.`);
      if (person.checks.some((check) => !check))
        problems.push(`${person.name} has incomplete employment checks.`);
      const clash = all.find(
        (other) =>
          other.id !== visit.id &&
          other.state !== 'Cancelled' &&
          other.staffIds.includes(id) &&
          (() => {
            const [a, b] = visitWindow(other);
            const buffer = other.clientId === visit.clientId ? 0 : this.data().travelMinutes;
            return start < b + buffer && end + buffer > a;
          })(),
      );
      if (clash)
        problems.push(
          `${person.name} overlaps ${clash.callName} on ${clash.date}, including the travel buffer.`,
        );
    }
    const duplicate = all.find(
      (other) =>
        other.id !== visit.id &&
        other.state !== 'Cancelled' &&
        other.clientId === visit.clientId &&
        (() => {
          const [a, b] = visitWindow(other);
          return start < b && end > a;
        })(),
    );
    if (duplicate)
      problems.push(`This service user already has an overlapping ${duplicate.callName} visit.`);
    return [...new Set(problems)];
  }
  generate(
    clientId: string,
    callIds: string[],
    from: string,
    to: string,
    staffIds: string[] | null = null,
    allocation: RotaVisit['allocation'] = 'Regular',
  ): string | null {
    if (this.denied('manage')) return this.denied('manage');
    if (!validVacancyDate(from) || !validVacancyDate(to) || to < from || to > addDays(from, 30))
      return 'Choose a date range of up to 31 days.';
    const client = this.data().clients.find((c) => c.id === clientId && c.active);
    const calls = this.data().calls.filter(
      (c) => c.clientId === clientId && c.active && callIds.includes(c.id),
    );
    if (!client || !calls.length || calls.length !== new Set(callIds).size)
      return 'Choose an active service user and at least one active call.';
    const existing = this.data().visits.filter((v) => v.state !== 'Cancelled');
    const added: RotaVisit[] = [];
    for (let date = from; date <= to; date = addDays(date, 1)) {
      const weekday = new Date(date + 'T12:00:00Z').getUTCDay();
      for (const call of calls.filter((c) => c.weekdays.includes(weekday))) {
        if (existing.some((v) => v.callId === call.id && v.date === date)) continue;
        const visit = this.makeVisit(call, date, staffIds ?? call.regularStaffIds, allocation);
        const issues = this.conflicts(visit, [...existing, ...added]);
        if (issues.length) return `${date} · ${call.name}: ${issues.join(' ')}`;
        added.push(visit);
      }
    }
    if (!added.length)
      return 'No new visits match these weekdays and dates. Existing visits are left unchanged.';
    const updatedCalls =
      staffIds && allocation === 'Regular'
        ? this.data().calls.map((c) =>
            callIds.includes(c.id) && c.clientId === clientId
              ? { ...c, regularStaffIds: [...staffIds] }
              : c,
          )
        : this.data().calls;
    return this.commit(
      { ...this.data(), calls: updatedCalls, visits: [...this.data().visits, ...added] },
      'Visits planned',
      `${client.name} · ${added.length} draft visits · ${from} to ${to}`,
    );
  }
  allocate(
    id: string,
    staffIds: string[],
    allocation: RotaVisit['allocation'],
    reason: string,
  ): string | null {
    if (this.denied('manage')) return this.denied('manage');
    const visit = this.data().visits.find((v) => v.id === id);
    if (!visit || visit.state === 'Cancelled' || visit.attendance.length)
      return 'This visit cannot be reallocated after attendance has been recorded.';
    if (!['Regular', 'Temporary'].includes(allocation) || !reason.trim())
      return 'Choose an allocation type and enter the reason for this change.';
    const updated = { ...visit, staffIds: [...staffIds], allocation };
    if (visit.state === 'Published' && staffIds.length !== visit.carers)
      return 'A published visit must retain all required carers.';
    const issues = this.conflicts(updated);
    if (issues.length) return issues.join(' ');
    return this.commit(
      { ...this.data(), visits: this.data().visits.map((v) => (v.id === id ? updated : v)) },
      'Visit allocation changed',
      `${visit.clientName} · ${visit.date} ${visit.start} · ${allocation} · ${visit.staffIds.map((id) => this.store.data().people.find((p) => p.id === id)?.name ?? id).join(', ') || 'Unallocated'} → ${staffIds.map((id) => this.store.data().people.find((p) => p.id === id)?.name ?? id).join(', ') || 'Unallocated'} · ${reason.trim()}`,
    );
  }
  publish(ids: string[]): string | null {
    if (this.denied('publish')) return this.denied('publish');
    const visits = this.data().visits.filter((v) => ids.includes(v.id) && v.state === 'Draft');
    if (!visits.length) return 'Select draft visits to publish.';
    for (const v of visits) {
      if (v.staffIds.length !== v.carers)
        return `${v.clientName} · ${v.date} ${v.start} still needs ${v.carers - v.staffIds.length} carer(s).`;
      const issues = this.conflicts(v);
      if (issues.length) return `${v.clientName} · ${v.date}: ${issues.join(' ')}`;
    }
    return this.commit(
      {
        ...this.data(),
        visits: this.data().visits.map((v) =>
          ids.includes(v.id) && v.state === 'Draft' ? { ...v, state: 'Published' } : v,
        ),
      },
      'Rota published',
      `${visits.length} visits made visible in the published rota and expected-visit board. No external notification sent.`,
    );
  }
  cancel(id: string, reason: string): string | null {
    if (this.denied('manage')) return this.denied('manage');
    const visit = this.data().visits.find((v) => v.id === id);
    if (!visit || visit.state === 'Cancelled' || visit.attendance.length || !reason.trim())
      return 'Enter a reason. Visits with attendance cannot be cancelled.';
    return this.commit(
      {
        ...this.data(),
        visits: this.data().visits.map((v) =>
          v.id === id ? { ...v, state: 'Cancelled', exception: reason.trim() } : v,
        ),
      },
      'Visit cancelled',
      `${visit.clientName} · ${visit.date} · ${reason.trim()}`,
    );
  }
  copyWeek(source: string, target: string): string | null {
    if (this.denied('manage')) return this.denied('manage');
    if (!validVacancyDate(source) || !validVacancyDate(target) || target <= addDays(source, 6))
      return 'Choose a target week after the source week.';
    const days = Math.round((Date.parse(target) - Date.parse(source)) / 86400000);
    const original = this.data().visits.filter(
      (v) => v.state !== 'Cancelled' && v.date >= source && v.date <= addDays(source, 6),
    );
    const added: RotaVisit[] = [];
    for (const v of original) {
      const date = addDays(v.date, days);
      if (
        this.data().visits.some(
          (existing) =>
            existing.state !== 'Cancelled' &&
            existing.callId === v.callId &&
            existing.date === date,
        )
      )
        continue;
      const clone: RotaVisit = {
        ...v,
        id: crypto.randomUUID(),
        date,
        state: 'Draft',
        staffIds: [...v.staffIds],
        attendance: [],
        exception: '',
      };
      const issues = this.conflicts(clone, [...this.data().visits, ...added]);
      if (issues.length) return `${date}: ${issues.join(' ')}`;
      added.push(clone);
    }
    if (!added.length) return 'No visits to copy, or the target visits already exist.';
    return this.commit(
      { ...this.data(), visits: [...this.data().visits, ...added] },
      'Week copied',
      `${source} to ${target} · ${added.length} draft visits`,
    );
  }
  recordAttendance(
    id: string,
    personId: string,
    start: string,
    end: string,
    note: string,
  ): string | null {
    if (this.denied('attendance')) return this.denied('attendance');
    const visit = this.data().visits.find((v) => v.id === id);
    if (
      !visit ||
      visit.state !== 'Published' ||
      !visit.staffIds.includes(personId) ||
      visit.attendance.some((a) => a.personId === personId && a.end)
    )
      return 'Choose an allocated carer on a published visit. Completed attendance is locked.';
    const startAt = Date.parse(start),
      endAt = Date.parse(end);
    const scheduled = londonInstant(visit.date, visit.start);
    if (
      !scheduled ||
      !Number.isFinite(startAt) ||
      !Number.isFinite(endAt) ||
      endAt <= startAt ||
      endAt - startAt > 86400000 ||
      Math.abs(startAt - Date.parse(scheduled)) > 86400000 ||
      endAt > Date.now() ||
      !note.trim()
    )
      return 'Enter actual UK start/end times near this visit, up to 24 hours apart and not in the future, plus a review note.';
    const updated = {
      ...visit,
      attendance: [
        ...visit.attendance.filter((a) => a.personId !== personId),
        { personId, start: new Date(startAt).toISOString(), end: new Date(endAt).toISOString() },
      ],
    };
    const clash = this.data().visits.some(
      (v) =>
        v.id !== id &&
        v.attendance.some(
          (a) =>
            a.personId === personId &&
            a.end &&
            startAt < Date.parse(a.end) &&
            endAt > Date.parse(a.start),
        ),
    );
    if (clash) return 'These actual times overlap another recorded visit for this carer.';
    return this.commit(
      { ...this.data(), visits: this.data().visits.map((v) => (v.id === id ? updated : v)) },
      'Attendance recorded',
      `${visit.clientName} · ${visit.date} · ${this.store.data().people.find((p) => p.id === personId)?.name ?? personId} · ${start} to ${end} · ${note.trim()}`,
    );
  }
  saveTravel(value: number): string | null {
    if (this.denied('manage')) return this.denied('manage');
    if (!Number.isInteger(value) || value < 0 || value > 120)
      return 'Choose a travel buffer between 0 and 120 minutes.';
    return this.commit(
      { ...this.data(), travelMinutes: value },
      'Planning rules saved',
      `${value} minute minimum buffer between different service users`,
    );
  }
  sendToPayroll(date: string): string | null {
    if (this.denied('manage')) return this.denied('manage');
    if (!this.payroll.can('manage'))
      return 'Payroll management access is required to transfer completed visits.';
    if (!validVacancyDate(date)) return 'Choose a valid visit date.';
    const visits = this.data().visits.filter((v) => v.date === date && completedVisit(v));
    if (!visits.length) return 'No completed published visits on this date.';
    const payroll = structuredClone(this.payroll.data());
    let added = 0;
    for (const personId of new Set(visits.flatMap((v) => v.staffIds))) {
      const profile = this.payroll.profile(personId, date);
      if (!profile) return 'Every carer needs an effective pay profile before transfer.';
      const existing = payroll.work.find(
        (w) =>
          w.personId === personId &&
          w.date === date &&
          w.kind === 'Regular' &&
          w.status !== 'Rejected',
      );
      if (existing && (!existing.rotaVisitIds || existing.runId || existing.status !== 'Confirmed'))
        return 'Existing regular work for a carer on this date needs reconciliation in Payroll before transfer.';
      const fresh = visits.filter(
        (v) =>
          v.staffIds.includes(personId) &&
          !payroll.work.some((w) => w.personId === personId && w.rotaVisitIds?.includes(v.id)),
      );
      if (!fresh.length) continue;
      const hours = fresh.reduce((total, v) => {
        const a = v.attendance.find((a) => a.personId === personId)!;
        return total + (Date.parse(a.end) - Date.parse(a.start)) / 3600000;
      }, 0);
      const totalHours =
        payroll.work
          .filter(
            (w) =>
              w.personId === personId &&
              w.date === date &&
              w.status !== 'Rejected' &&
              w.kind !== 'Allowance',
          )
          .reduce(
            (sum, w) =>
              sum + (['Requested', 'Authorised'].includes(w.status) ? w.hours : w.actualHours),
            0,
          ) + hours;
      if (totalHours > 24)
        return 'Combined recorded work cannot exceed 24 hours per carer per day.';
      const audit = {
        at: new Date().toISOString(),
        userId: this.auth.currentUser()!.id,
        user: this.auth.currentUser()!.name,
        action: 'Rota attendance imported',
        note: `${fresh.length} completed visit(s); requires payroll approval`,
      };
      if (existing) {
        existing.hours = money(existing.hours + hours);
        existing.actualHours = existing.hours;
        existing.rotaVisitIds!.push(...fresh.map((v) => v.id));
        existing.audit.push(audit);
      } else {
        const work: WorkRecord = {
          id: crypto.randomUUID(),
          personId,
          date,
          hours: money(hours),
          actualHours: money(hours),
          rate: profile.basis === 'Hourly' ? profile.rate : 0,
          kind: 'Regular',
          category: 'Rota',
          reason: 'Completed rota visits (actual recorded attendance)',
          status: 'Confirmed',
          audit: [audit],
          rotaVisitIds: fresh.map((v) => v.id),
        };
        payroll.work.push(work);
      }
      added += fresh.length;
    }
    if (!added) return 'These visits have already been transferred to payroll.';
    return this.store.saveWorkspace((d) => ({
      ...d,
      payroll,
      rota: {
        ...this.data(),
        audit: [
          ...this.data().audit,
          this.entry(
            'Attendance sent to payroll',
            `${date} · ${added} carer visits; payroll approval required`,
          ),
        ],
      },
    }))
      ? null
      : 'Could not save the payroll transfer. Free some browser storage and try again.';
  }
}
