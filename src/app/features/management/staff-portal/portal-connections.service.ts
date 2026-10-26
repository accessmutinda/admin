import { Injectable, inject } from '@angular/core';
import { Params } from '@angular/router';
import { HrService } from '../people/hr.service';
import { PortalService } from './portal.service';

export interface ConnectedRecord {
  id: string;
  kind: string;
  title: string;
  date: string;
  status: string;
  path: string[];
  query?: Params;
}
export interface PortalConnection {
  name: string;
  tasks: number;
  concerns: number;
  communications: number;
  journals: number;
  path: string[];
  query?: Params;
  records: ConnectedRecord[];
}

@Injectable({ providedIn: 'root' })
export class PortalConnections {
  private readonly portal = inject(PortalService);
  private readonly hr = inject(HrService);

  client(id: string): PortalConnection | null {
    const client = this.portal.clients().find((c) => c.id === id);
    if (!client) return null;
    return this.records(
      client.name,
      this.portal.tasks().filter((t) => t.clientId === id),
      this.portal.concerns().filter((c) => c.clientId === id),
      this.portal.communications().filter((c) => c.clientId === id),
      this.portal.journal
        .entries()
        .filter(
          (e) =>
            e.clientId === id &&
            e.state === 'Sent' &&
            !(e.deletedBy ?? []).includes(this.portal.journal.email()),
        ),
      ['/staff-portal/service-users', id, 'overview'],
    );
  }

  staff(id: string): PortalConnection | null {
    const person = this.hr.staff().find((p) => p.id === id);
    if (!person) return null;
    const email = person.email.toLowerCase();
    const care = this.portal.care.rota.can('view');
    const connection = this.records(
      person.name,
      this.portal.tasks().filter((t) => t.owner.toLowerCase() === email && (care || !t.clientId)),
      this.portal
        .concerns()
        .filter(
          (c) =>
            [c.staffEmail, c.assignedTo].some((e) => e.toLowerCase() === email) &&
            (care || !c.clientId),
        ),
      this.portal.communications().filter((c) => c.loggedByEmail?.toLowerCase() === email),
      this.portal.journal
        .entries()
        .filter(
          (e) =>
            e.state === 'Sent' &&
            !(e.deletedBy ?? []).includes(this.portal.journal.email()) &&
            [e.authorEmail, ...e.to, ...e.cc].includes(email) &&
            (care || !e.clientId),
        ),
      ['/staff-portal/tasks'],
    );
    connection.query = { staff: email };
    return connection;
  }

  private records(
    name: string,
    tasks: ReturnType<PortalService['tasks']>,
    concerns: ReturnType<PortalService['concerns']>,
    communications: ReturnType<PortalService['communications']>,
    journals: ReturnType<PortalService['journal']['entries']>,
    path: string[],
  ): PortalConnection {
    const records: ConnectedRecord[] = [
      ...tasks.map((t) => ({
        id: 'task-' + t.id,
        kind: 'Task',
        title: t.title,
        date: t.due,
        status: t.status,
        path: ['/staff-portal/tasks'],
        query: { task: t.id },
      })),
      ...concerns.map((c) => ({
        id: 'concern-' + c.id,
        kind: 'Concern',
        title: c.title,
        date: c.raisedAt,
        status: c.status,
        path: ['/staff-portal/concerns', c.id],
      })),
      ...communications.map((c) => ({
        id: 'communication-' + c.id,
        kind: 'Professional',
        title: c.subject,
        date: c.at,
        status: c.status,
        path: ['/staff-portal/service-users', c.clientId, 'communications'],
        query: { record: c.id },
      })),
      ...journals.map((e) => ({
        id: 'journal-' + e.id,
        kind: 'Journal',
        title: e.subject,
        date: e.createdAt,
        status: e.responseRequired ? (e.responseStatus ?? 'Awaiting response') : 'Recorded',
        path: e.clientId
          ? ['/staff-portal/service-users', e.clientId, 'journal']
          : ['/staff-portal/journal'],
        query: { entry: e.id },
      })),
    ].sort((a, b) => b.date.localeCompare(a.date));
    return {
      name,
      path,
      tasks: tasks.filter((t) => t.status !== 'Resolved').length,
      concerns: concerns.filter((c) => !['Resolved', 'Closed'].includes(c.status)).length,
      communications: communications.length,
      journals: journals.length,
      records,
    };
  }
}
