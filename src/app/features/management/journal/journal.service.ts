import { Injectable, computed, inject } from '@angular/core';
import { RotaService } from '../rota/rota.service';
import { ROLES } from '../../../core/auth/models/role';
import { AuthService } from '../../../core/auth/auth.service';
import { ManagementStore } from '../shared/management.store';
import { JournalData, JournalEntry, JournalTask } from './journal.models';

@Injectable({ providedIn: 'root' })
export class JournalService {
  readonly store = inject(ManagementStore);
  readonly auth = inject(AuthService);
  private readonly rota = inject(RotaService);
  readonly email = computed(() => this.auth.currentUser()?.email.toLowerCase() ?? '');
  readonly data = computed<JournalData>(
    () => this.store.data().journal ?? { entries: [], tasks: [], events: [] },
  );
  readonly contacts = computed(() => {
    const user = this.auth.currentUser();
    const correspondents = this.data()
      .entries.filter((e) => e.state === 'Sent' && this.visible(e))
      .filter(
        (e) =>
          !this.store
            .data()
            .members.some((m) => m.email.toLowerCase() === e.authorEmail && m.status !== 'Active'),
      )
      .map((e) => ({ name: e.author, email: e.authorEmail, role: 'Team member' }));
    const all = [
      ...this.store.data().members.filter((m) => m.status === 'Active'),
      ...this.store.staff(),
      ...(user ? [{ name: user.name, email: user.email, role: ROLES[user.roleCode].label }] : []),
      ...correspondents,
    ];
    return all.filter(
      (p, i) =>
        p.email &&
        all.findIndex((other) => other.email.toLowerCase() === p.email.toLowerCase()) === i,
    );
  });
  readonly clients = computed(() => (this.rota.can('view') ? this.rota.data().clients : []));
  recipients(clientId = ''): { name: string; email: string; role: string }[] {
    const professionals = this.clients().find((c) => c.id === clientId)?.file?.contacts ?? [];
    const choices = [
      ...this.contacts(),
      ...professionals
        .filter((c) => c.email)
        .map((c) => ({ name: c.name, email: c.email, role: c.relationship || c.type })),
    ];
    return choices.filter(
      (c, i) => choices.findIndex((p) => p.email.toLowerCase() === c.email.toLowerCase()) === i,
    );
  }
  readonly entries = computed(() => this.data().entries.filter((e) => this.visible(e)));
  readonly tasks = computed(() => this.data().tasks.filter((t) => t.owner === this.email()));
  readonly events = computed(() =>
    this.data()
      .events.filter((e) => e.audience.includes(this.email()))
      .slice()
      .sort((a, b) => b.at.localeCompare(a.at)),
  );
  private visible(e: JournalEntry): boolean {
    return (
      !!this.email() &&
      (e.authorEmail === this.email() ||
        (e.state === 'Sent' && [...e.to, ...e.cc].includes(this.email())))
    );
  }
  newEntry(): JournalEntry {
    return {
      id: crypto.randomUUID(),
      author: this.auth.currentUser()?.name ?? '',
      authorEmail: this.email(),
      to: [],
      cc: [],
      subject: '',
      clientId: '',
      category: 'Care update',
      priority: 'Normal',
      body: '',
      attachments: [],
      state: 'Draft',
      createdAt: new Date().toISOString(),
      readBy: [],
      archivedBy: [],
      starredBy: [],
      followUpBy: [],
    };
  }
  private commit(
    action: string,
    subject: string,
    audience: string[],
    change: (data: JournalData) => JournalData,
  ): string | null {
    if (!this.email()) return 'Sign in to use the staff journal.';
    const saved = this.store.saveWorkspace((d) => {
      const next = change(d.journal ?? { entries: [], tasks: [], events: [] });
      return {
        ...d,
        journal: {
          ...next,
          events: [
            {
              id: crypto.randomUUID(),
              actor: this.auth.currentUser()!.name,
              audience: [...new Set([this.email(), ...audience])],
              action,
              subject,
              at: new Date().toISOString(),
            },
            ...next.events,
          ],
        },
      };
    });
    return saved
      ? null
      : 'Your changes could not be saved. Free some browser storage and try again.';
  }
  save(input: JournalEntry, send: boolean): string | null {
    const existing = this.data().entries.find((e) => e.id === input.id);
    if (
      input.authorEmail !== this.email() ||
      (existing && (existing.authorEmail !== this.email() || existing.state !== 'Draft'))
    )
      return 'Only your own drafts can be edited.';
    const entry = structuredClone(input);
    entry.author = this.auth.currentUser()?.name ?? '';
    entry.subject = entry.subject.trim();
    entry.body = entry.body.trim();
    entry.to = [...new Set(entry.to.map((e) => e.toLowerCase()))];
    entry.cc = [...new Set(entry.cc.map((e) => e.toLowerCase()))].filter(
      (e) => !entry.to.includes(e),
    );
    if (!entry.subject) return 'Enter a subject before saving.';
    if (send && (!entry.to.length || !entry.body)) return 'Choose a recipient and enter a message.';
    if (
      [...entry.to, ...entry.cc].some(
        (email) => !this.recipients(entry.clientId).some((c) => c.email.toLowerCase() === email),
      )
    )
      return 'Choose current staff members or linked professional contacts as recipients.';
    if (entry.clientId && !this.clients().some((c) => c.id === entry.clientId))
      return 'Choose a current service user.';
    if (
      !['Normal', 'High'].includes(entry.priority) ||
      !['Care update', 'Safeguarding', 'Training', 'General', 'Meetings'].includes(entry.category)
    )
      return 'Choose a valid category and priority.';
    if (entry.attachments.reduce((sum, a) => sum + a.size, 0) > 5 * 1024 * 1024)
      return 'Attachments must total 5 MB or less.';
    entry.state = send ? 'Sent' : 'Draft';
    entry.createdAt = new Date().toISOString();
    entry.readBy = [this.email()];
    return this.commit(
      send ? 'Journal entry sent' : 'Draft saved',
      entry.subject,
      send ? [...entry.to, ...entry.cc] : [],
      (d) => ({ ...d, entries: [entry, ...d.entries.filter((e) => e.id !== entry.id)] }),
    );
  }
  mark(
    id: string,
    field: 'readBy' | 'archivedBy' | 'starredBy' | 'followUpBy',
    enabled: boolean,
  ): string | null {
    const entry = this.entries().find((e) => e.id === id);
    if (!entry) return 'This entry is unavailable.';
    const action = {
      readBy: enabled ? 'Entry read' : 'Marked unread',
      archivedBy: enabled ? 'Entry archived' : 'Entry restored',
      starredBy: enabled ? 'Entry starred' : 'Star removed',
      followUpBy: enabled ? 'Follow-up flagged' : 'Follow-up cleared',
    }[field];
    return this.commit(action, entry.subject, [], (d) => ({
      ...d,
      entries: d.entries.map((e) =>
        e.id === id
          ? {
              ...e,
              [field]: enabled
                ? [...new Set([...e[field], this.email()])]
                : e[field].filter((email) => email !== this.email()),
            }
          : e,
      ),
    }));
  }
  saveTask(input: JournalTask): string | null {
    const existing = this.data().tasks.find((t) => t.id === input.id);
    if (input.owner !== this.email() || (existing && existing.owner !== this.email()))
      return 'You can only update your own tasks.';
    if (input.shared && input.status === 'Resolved' && !(input.actions ?? '').trim())
      return 'Record the action taken before resolving this task.';
    if (
      !['Open', 'In progress', 'Awaiting response', 'Escalated', 'Resolved'].includes(input.status)
    )
      return 'Choose a valid task status.';
    if (
      !input.title.trim() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(input.due) ||
      Number.isNaN(Date.parse(input.due)) ||
      new Date(input.due).toISOString().slice(0, 10) !== input.due
    )
      return 'Enter a task title and a valid due date.';
    if (input.clientId && !this.clients().some((c) => c.id === input.clientId))
      return 'Choose a current service user.';
    return this.commit(existing ? 'Task updated' : 'Task created', input.title, [], (d) => ({
      ...d,
      tasks: [{ ...input, title: input.title.trim() }, ...d.tasks.filter((t) => t.id !== input.id)],
    }));
  }
}
