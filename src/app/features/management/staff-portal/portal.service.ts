import { Injectable, computed, inject } from '@angular/core';
import { ManagementStore, WorkspaceData } from '../shared/management.store';
import { JournalService } from '../journal/journal.service';
import { JournalTask } from '../journal/journal.models';
import { CareService } from '../care/care.service';
import { validDate } from '../care/care.models';
import {
  CONCERN_STATUSES,
  PortalConcern,
  ProfessionalRecord,
  PortalEvent,
  emptyPortal,
} from './portal.models';
@Injectable({ providedIn: 'root' })
export class PortalService {
  readonly store = inject(ManagementStore);
  readonly journal = inject(JournalService);
  readonly care = inject(CareService);
  readonly data = computed(() => this.store.data().staffPortal ?? emptyPortal());
  readonly tasks = computed(() =>
    this.journal.data().tasks.filter((t) => t.shared || t.owner === this.journal.email()),
  );
  readonly concerns = computed(() => this.data().concerns);
  readonly communications = computed(() =>
    this.care.rota.can('view') ? this.data().communications : [],
  );
  readonly clients = this.care.clients;
  readonly contacts = this.journal.contacts;
  readonly today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
  readonly me = computed(() => this.journal.auth.currentUser()?.name ?? 'Staff member');
  readonly openTasks = computed(() => this.tasks().filter((t) => t.status !== 'Resolved'));
  readonly openConcerns = computed(() =>
    this.concerns().filter((c) => !['Resolved', 'Closed'].includes(c.status)),
  );
  readonly events = computed(() =>
    this.data().events.filter((e) => !e.audience || e.audience.includes(this.journal.email())),
  );
  readonly timeline = computed<PortalEvent[]>(() =>
    [
      ...this.events(),
      ...this.journal.events().map((e) => ({
        id: e.id,
        entityId: e.id,
        clientId: '',
        actor: e.actor,
        action: e.action,
        detail: e.subject,
        at: e.at,
        category: 'Journal',
        status: 'Recorded',
      })),
    ].sort((a, b) => b.at.localeCompare(a.at)),
  );
  person(email: string): string {
    return this.contacts().find((c) => c.email.toLowerCase() === email)?.name ?? email;
  }
  clientName(id: string): string {
    return this.clients().find((c) => c.id === id)?.name ?? 'General';
  }
  private event(
    action: string,
    detail: string,
    clientId = '',
    entityId = '',
    category = 'Staff action',
    status = 'Recorded',
  ): PortalEvent {
    return {
      id: crypto.randomUUID(),
      actor: this.me(),
      action,
      detail,
      clientId,
      entityId,
      category,
      status,
      at: new Date().toISOString(),
    };
  }
  private commit(
    event: PortalEvent,
    change: (data: WorkspaceData) => WorkspaceData,
  ): string | null {
    if (!this.journal.email()) return 'Sign in to use the staff portal.';
    return this.store.saveWorkspace((data) => {
      const next = change(data);
      return {
        ...next,
        staffPortal: {
          ...(next.staffPortal ?? emptyPortal()),
          events: [event, ...(next.staffPortal?.events ?? [])],
        },
      };
    })
      ? null
      : 'Could not save your changes. Free some device storage and try again. Your draft is retained.';
  }
  newTask(clientId = '', owner = this.journal.email()): JournalTask {
    return {
      id: crypto.randomUUID(),
      owner,
      title: '',
      clientId,
      due: this.today,
      priority: 'Normal',
      status: 'Open',
      shared: true,
      assignedBy: this.journal.email(),
      notes: '',
      actions: '',
      followUp: '',
      attachments: [],
    };
  }
  saveTask(input: JournalTask): string | null {
    const existing = this.journal.data().tasks.find((t) => t.id === input.id);
    if (existing && !existing.shared && existing.owner !== this.journal.email())
      return 'This task is private to its owner.';
    if (
      !input.title.trim() ||
      !validDate(input.due) ||
      (input.followUp && !validDate(input.followUp))
    )
      return 'Enter a task title and valid dates.';
    if (!this.contacts().some((p) => p.email.toLowerCase() === input.owner))
      return 'Choose a current staff member.';
    if (input.clientId && !this.clients().some((c) => c.id === input.clientId))
      return 'Choose a current service user.';
    if (
      !['Open', 'In progress', 'Awaiting response', 'Escalated', 'Resolved'].includes(
        input.status,
      ) ||
      !['Normal', 'High', 'Low', 'Medium'].includes(input.priority)
    )
      return 'Choose a valid status and priority.';
    if ((input.attachments ?? []).reduce((s, f) => s + f.size, 0) > 5 * 1024 * 1024)
      return 'Evidence must total 5 MB or less.';
    if (input.status === 'Resolved' && !(input.actions ?? '').trim())
      return 'Record the action taken before resolving this task.';
    const task = {
      ...structuredClone(input),
      title: input.title.trim(),
      shared: existing ? !!existing.shared : true,
      assignedBy: existing?.assignedBy ?? this.journal.email(),
    };
    const event = this.event(
      existing ? 'Task updated' : 'Task created',
      task.title,
      task.clientId,
      task.id,
      'Staff action',
      task.status,
    );
    if (!task.shared) event.audience = [task.owner];
    return this.commit(event, (d) => ({
      ...d,
      journal: {
        ...(d.journal ?? { entries: [], tasks: [], events: [] }),
        tasks: [task, ...(d.journal?.tasks ?? []).filter((t) => t.id !== task.id)],
      },
    }));
  }
  newConcern(): PortalConcern {
    return {
      id: crypto.randomUUID(),
      reference: '',
      title: '',
      description: '',
      type: 'Safeguarding',
      priority: 'High',
      clientId: '',
      staffEmail: '',
      assignedTo: this.journal.email(),
      followers: [],
      visitDate: this.today,
      raisedBy: this.me(),
      raisedAt: new Date().toISOString(),
      status: 'Raised',
      checklist: [
        'Review initial report and care records',
        'Gather and review visit notes',
        'Collect evidence and documents',
        'Interview staff members involved',
        'Speak with service user / family',
        'Review care plan and risk assessments',
      ].map((title) => ({ id: crypto.randomUUID(), title, done: false })),
      notes: [],
      evidence: [],
      outcome: '',
    };
  }
  saveConcern(input: PortalConcern): string | null {
    const existing = this.concerns().find((c) => c.id === input.id);
    if (!input.title.trim() || !input.description.trim())
      return 'Enter the concern title and details.';
    if (input.clientId && !this.clients().some((c) => c.id === input.clientId))
      return 'Choose a current service user.';
    if (!validDate(input.visitDate) || !CONCERN_STATUSES.includes(input.status))
      return 'Choose a valid visit date and concern status.';
    if (!this.contacts().some((c) => c.email.toLowerCase() === input.assignedTo))
      return 'Choose a current investigator.';
    if (['Resolved', 'Closed'].includes(input.status) && !input.outcome.trim())
      return 'Record the investigation outcome before resolving or closing this concern.';
    if (
      input.status === 'Closed' &&
      existing?.status !== 'Resolved' &&
      existing?.status !== 'Closed'
    )
      return 'Resolve the concern before closing it.';
    if (input.evidence.reduce((s, f) => s + f.size, 0) > 5 * 1024 * 1024)
      return 'Evidence must total 5 MB or less.';
    const concern = {
      ...structuredClone(input),
      title: input.title.trim(),
      notes: existing?.notes ?? [],
      reference:
        existing?.reference ?? `SC-${this.today.slice(0, 4)}-${input.id.slice(0, 8).toUpperCase()}`,
      raisedBy: existing?.raisedBy ?? this.me(),
      raisedAt: existing?.raisedAt ?? new Date().toISOString(),
    };
    return this.commit(
      this.event(
        existing ? 'Concern updated' : 'Concern raised',
        concern.title,
        concern.clientId,
        concern.id,
        'Concern',
        concern.status,
      ),
      (d) => ({
        ...d,
        staffPortal: {
          ...(d.staffPortal ?? emptyPortal()),
          concerns: [
            concern,
            ...(d.staffPortal?.concerns ?? []).filter((c) => c.id !== concern.id),
          ],
        },
      }),
    );
  }
  addNote(id: string, text: string): string | null {
    const concern = this.concerns().find((c) => c.id === id);
    if (!concern || !text.trim()) return 'Enter a comment for the investigation.';
    if (concern.status === 'Closed') return 'Reopen the concern before adding comments.';
    const note = {
      id: crypto.randomUUID(),
      author: this.me(),
      text: text.trim(),
      at: new Date().toISOString(),
    };
    return this.commit(
      this.event(
        'Investigation note added',
        text.trim(),
        concern.clientId,
        id,
        'Concern',
        concern.status,
      ),
      (d) => ({
        ...d,
        staffPortal: {
          ...(d.staffPortal ?? emptyPortal()),
          concerns: (d.staffPortal?.concerns ?? []).map((c) =>
            c.id === id ? { ...c, notes: [...c.notes, note] } : c,
          ),
        },
      }),
    );
  }
  newCommunication(clientId: string): ProfessionalRecord {
    return {
      id: crypto.randomUUID(),
      clientId,
      contactId: '',
      direction: 'Received',
      type: 'GP note',
      subject: '',
      details: '',
      at: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
      loggedBy: this.me(),
      followUp: '',
      status: 'Open',
      attachments: [],
    };
  }
  saveCommunication(input: ProfessionalRecord): string | null {
    if (!this.care.rota.can('manage'))
      return 'You do not have permission to record care communications.';
    const client = this.clients().find((c) => c.id === input.clientId);
    if (!client) return 'Choose a current service user.';
    if (!client.file?.contacts?.some((c) => c.id === input.contactId))
      return 'Choose a professional contact from this service user’s record.';
    if (
      !input.subject.trim() ||
      !input.details.trim() ||
      !Number.isFinite(Date.parse(input.at)) ||
      (input.followUp && !validDate(input.followUp))
    )
      return 'Enter the subject, details and valid communication and follow-up dates.';
    if (!['Open', 'In progress', 'Resolved'].includes(input.status))
      return 'Choose a valid communication status.';
    if (input.attachments.reduce((s, f) => s + f.size, 0) > 5 * 1024 * 1024)
      return 'Attachments must total 5 MB or less.';
    const existing = this.communications().find((c) => c.id === input.id);
    const record = {
      ...structuredClone(input),
      at: new Date(input.at).toISOString(),
      loggedBy: existing?.loggedBy ?? this.me(),
      loggedByEmail: existing?.loggedByEmail ?? this.journal.email(),
    };
    const event = this.event(
      'Professional communication recorded',
      record.subject,
      record.clientId,
      record.id,
      record.type,
      record.status,
    );
    event.direction = record.direction ?? 'Internal';
    event.recipient = client.file?.contacts?.find((c) => c.id === record.contactId)?.name;
    return this.commit(event, (d) => ({
      ...d,
      staffPortal: {
        ...(d.staffPortal ?? emptyPortal()),
        communications: [
          record,
          ...(d.staffPortal?.communications ?? []).filter((c) => c.id !== record.id),
        ],
      },
    }));
  }
  clientTimeline(clientId: string): PortalEvent[] {
    const client = this.clients().find((c) => c.id === clientId);
    return [
      ...this.events().filter((e) => e.clientId === clientId),
      ...(client?.file?.audit ?? []).map((e) => ({
        id: e.id,
        actor: e.by,
        action: e.action,
        detail: e.detail,
        at: e.at,
        clientId,
        entityId: e.id,
        category: 'Care record',
        status: 'Recorded',
      })),
      ...this.journal
        .entries()
        .filter((e) => e.clientId === clientId && e.state === 'Sent')
        .map((e) => ({
          id: e.id,
          actor: e.author,
          action: 'Journal entry',
          direction: 'Internal',
          recipient: [...e.to, ...e.cc]
            .map(
              (email) =>
                this.journal.recipients(clientId).find((c) => c.email.toLowerCase() === email)
                  ?.name ?? email,
            )
            .join(', '),
          detail: e.subject,
          at: e.createdAt,
          clientId,
          entityId: e.id,
          category: 'Journal',
          status: e.readBy.includes(this.journal.email()) ? 'Viewed' : 'Unread',
        })),
      ...(this.care.rota.can('view') ? this.care.rota.data().audit : [])
        .filter(
          (e) => e.clientId === clientId || e.detail.startsWith((client?.name ?? '\0') + ' ·'),
        )
        .map((e) => ({
          id: e.id,
          actor: e.user,
          action: e.action,
          detail: e.detail,
          at: e.at,
          clientId,
          entityId: e.id,
          category: 'Allocation',
          status: 'Recorded',
        })),
    ].sort((a, b) => b.at.localeCompare(a.at));
  }
}
