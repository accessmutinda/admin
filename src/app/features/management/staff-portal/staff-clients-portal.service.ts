import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { StaffClientsApi } from './staff-clients-api.service';
import { JournalService } from '../journal/journal.service';
import { RotaData, RotaVisit, RotaCall } from '../rota/rota.models';
import { PortalConcern, PortalEvent, ProfessionalRecord } from './portal.models';
import { JournalTask, JournalEntry } from '../journal/journal.models';
@Injectable()
export class StaffClientsPortal {
  readonly connected = true;
  readonly api = inject(StaffClientsApi);
  readonly journal = inject(JournalService);
  readonly auth = inject(AuthService);
  readonly clients = this.api.clients;
  readonly store = {
    company: computed(() => this.api.context()?.company ?? null),
    companyId: this.api.companyId,
    staff: computed(() =>
      this.api.context()
        ? [
            {
              id: this.api.context()!.person_id,
              email: this.api.context()!.email,
              name: this.api.context()!.name,
            },
          ]
        : [],
    ),
  };
  readonly contacts = computed(() =>
    this.store.staff().map((p) => ({ name: p.name, email: p.email, role: 'Staff member' })),
  );
  get today() {
    return this.api.context()?.local_date ?? '';
  }
  get weekStart() {
    return this.today;
  }
  readonly tasks = computed<JournalTask[]>(
    () =>
      this.api.snapshot()?.tasks.map((row) => ({
        ...row,
        resolvedAt: row.resolvedAt ?? undefined,
        attachments: row.attachments.map((f) => ({ ...f, content: '' })),
      })) ?? [],
  );
  readonly concerns = computed<PortalConcern[]>(
    () =>
      this.api.snapshot()?.concerns.map((row) => ({
        ...row,
        checklist: row.checklist.map((c) => ({
          ...c,
          due: c.due ?? '',
          completedAt: c.completedAt ?? undefined,
        })),
        evidence: row.evidence.map((f) => ({ ...f, content: '' })),
        notes: row.notes.map((n) => ({
          ...n,
          kind: 'Note' as const,
          attachments: n.attachments.map((f) => ({ ...f, content: '' })),
        })),
      })) ?? [],
  );
  readonly communications = computed<ProfessionalRecord[]>(
    () =>
      this.api.snapshot()?.communications.map((row) => ({
        ...row,
        type: row.type as ProfessionalRecord['type'],
        status: row.status as ProfessionalRecord['status'],
        direction: row.direction as ProfessionalRecord['direction'],
        attachments: row.attachments.map((f) => ({ ...f, content: '' })),
        followUp: row.followUp ?? '',
        responseStatus:
          row.responseStatus === 'Responded'
            ? ('Responded' as const)
            : row.responseRequired
              ? ('Awaiting response' as const)
              : undefined,
      })) ?? [],
  );
  readonly journalEntries = computed<JournalEntry[]>(
    () =>
      this.api.snapshot()?.journal.map((row) => ({
        ...row,
        attachments: row.attachments.map((f) => ({ ...f, content: '' })),
      })) ?? [],
  );
  readonly openConcerns = computed(() =>
    this.concerns().filter((c) => !['Resolved', 'Closed'].includes(c.status)),
  );
  readonly events = computed<PortalEvent[]>(() => this.clientTimeline(this.api.currentId()));
  person(email: string) {
    return this.contacts().find((p) => p.email === email)?.name ?? email;
  }
  clientName(id: string) {
    return this.clients().find((c) => c.id === id)?.name ?? 'Service user unavailable';
  }
  clientTimeline(id: string): PortalEvent[] {
    const result: PortalEvent[] = [];
    for (const row of this.journalEntries())
      if (row.clientId === id && row.state === 'Sent')
        result.push({
          id: row.id,
          entityId: row.id,
          clientId: id,
          actor: row.author,
          action: row.subject,
          detail: row.body,
          at: row.createdAt,
          category: 'Journal',
          status: 'Recorded',
          direction: 'Internal',
        });
    for (const row of this.communications())
      if (row.clientId === id)
        result.push({
          id: row.id,
          entityId: row.id,
          clientId: id,
          actor: row.loggedBy,
          action: row.subject,
          detail: row.details,
          at: row.at,
          category: row.type,
          status: row.status,
          direction: row.direction,
          recipient:
            this.clients()
              .find((c) => c.id === id)
              ?.file?.contacts?.find((c) => c.id === row.contactId)?.name ?? '',
        });
    for (const row of this.concerns())
      if (row.clientId === id)
        for (const [index, event] of (row.history ?? []).entries())
          result.push({
            id: row.id + ':' + index,
            entityId: row.id,
            clientId: id,
            actor: event.actor,
            action: 'Concern ' + event.status,
            detail: row.title,
            at: event.at,
            category: 'Concern',
            status: event.status,
          });
    for (const row of this.api.snapshot()?.activity ?? [])
      result.push({
        id: String(row['id']),
        entityId: String(row['entityId']),
        clientId: id,
        actor: String(row['actor']),
        action: String(row['action']),
        detail: String(row['subject']),
        at: String(row['at']),
        category: String(row['category'] ?? 'Staff action'),
        status: 'Recorded',
      });
    return result.sort((a, b) => b.at.localeCompare(a.at));
  }
  readonly rota = {
    data: computed<RotaData>(() => ({
      clients: this.clients(),
      calls: (this.api.snapshot()?.calls ?? []).map((c) => ({
        ...c,
        priority: c.priority as RotaCall['priority'],
        location: c.location as RotaCall['location'],
        carers: c.carers ?? 0,
        travelMinutes: c.travelMinutes ?? undefined,
        mileage: c.mileage === null ? undefined : Number(c.mileage),
        toleranceMinutes: c.toleranceMinutes ?? undefined,
        backupStaffId: c.backupStaffId ?? undefined,
      })),
      visits: (this.api.snapshot()?.visits ?? []).map((v) => ({
        ...v,
        allocation: v.allocation as RotaVisit['allocation'],
        state: v.state as RotaVisit['state'],
        priority: v.priority as RotaVisit['priority'],
        location: v.location as RotaVisit['location'],
        carers: v.carers ?? 0,
        attendance: v.attendance.map((a) => ({ ...a, end: a.end ?? '' })),
        travelMinutes: v.travelMinutes ?? undefined,
        mileage: v.mileage === null ? undefined : Number(v.mileage),
        toleranceMinutes: v.toleranceMinutes ?? undefined,
        backupStaffId: v.backupStaffId ?? undefined,
      })),
      audit: [],
      travelMinutes: 0,
    })),
    can: (action: string) =>
      this.api.ready() &&
      this.api.available('rostering') &&
      (action === 'view' ||
        (this.api.access.can(
          'staff_portal',
          'clients',
          ['manage', 'cancel'].includes(action) ? 'edit' : action,
        ) &&
          this.api.access.can(
            'care',
            'rostering',
            action === 'manage' ? 'edit' : action === 'cancel' ? 'archive' : action,
          ))),
    generate: (
      client: string,
      callIds: string[],
      start: string,
      end: string,
      staffIds: string[] | null,
      allocation: string,
      _unused?: unknown,
      weekdays?: number[],
    ) =>
      this.api.allocation(client, {
        clientId: client,
        callIds,
        start,
        end,
        staffIds: staffIds ?? [this.api.context()!.person_id],
        allocation,
        weekdays: weekdays ?? null,
        reason: 'Allocate my assigned care calls',
      }),
    updateVisit: (visit: RotaVisit, _company: string, _original: string, reason: string) =>
      this.api.allocation(
        visit.clientId,
        {
          date: visit.date,
          start: visit.start,
          end: visit.end,
          staffIds: visit.staffIds,
          allocation: visit.allocation,
          reason,
          carers: visit.carers,
          skills: visit.skills,
          tasks: visit.tasks,
          priority: visit.priority,
          timeSensitive: visit.timeSensitive ?? false,
          toleranceMinutes: visit.toleranceMinutes ?? null,
          flexible: visit.flexible ?? false,
          location: visit.location ?? 'Home',
          taskType: visit.taskType ?? '',
          mileage: visit.mileage ?? null,
          driverRequired: visit.driverRequired ?? false,
          travelMinutes: visit.travelMinutes ?? null,
        },
        '/' + visit.id,
        'PATCH',
        visit.etag,
      ),
    cancel: (id: string, reason: string) => {
      const visit = this.api.snapshot()?.visits.find((v) => v.id === id);
      return this.api.allocation(
        this.api.currentId(),
        { reason },
        '/' + id + '/cancel',
        'POST',
        visit?.etag,
      );
    },
    cancelAllocation: (ids: string[], reason: string) =>
      this.api.allocation(
        this.api.currentId(),
        {
          reason,
          visits: ids.map((id) => ({
            id,
            etag: this.api.snapshot()?.visits.find((v) => v.id === id)?.etag ?? '',
          })),
        },
        '/cancel-batch',
      ),
  };
  readonly care = {
    auth: this.auth,
    store: this.store,
    rota: this.rota,
    clients: this.clients,
    client: (id: string) => this.clients().find((c) => c.id === id),
  };
}
