import { Component, computed, inject, signal, DestroyRef, effect, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { JournalTask } from '../journal/journal.models';
import { addDays } from '../rota/rota.models';
import { PortalService } from './portal.service';
import { AccessRequired } from '../shared/access-required';
import { PortalEvidence } from './portal-evidence';
@Component({
  selector: 'cv-portal-tasks',
  imports: [
    AccessRequired,
    DatePipe,
    FormsModule,
    RouterLink,
    MatSelectModule,
    CvSelect,
    PortalEvidence,
  ],
  templateUrl: './portal-tasks.html',
  styleUrls: ['./portal-ui.css', './portal-forms.css', './portal-profile.css'],
})
export class PortalTasks {
  protected readonly portal = inject(PortalService);
  protected journalRoute(clientId: string) {
    return this.route.snapshot.data?.['careJournalTasks'] && clientId
      ? ['/manage/clients', clientId, 'journal']
      : ['/staff-portal/journal'];
  }
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly queries = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly lockedClient = !!this.route.snapshot.data?.['careJournalTasks'];
  private clientContext(): string {
    return this.lockedClient
      ? (this.params()?.get('id') ?? '')
      : (this.queries().get('client') ?? '');
  }
  protected readonly clientMode =
    !!this.route.snapshot.queryParamMap.get('client') &&
    !this.route.snapshot.queryParamMap.get('new') &&
    !this.route.snapshot.queryParamMap.get('task');
  protected readonly staff = signal(
    this.route.snapshot.queryParamMap.get('staff') ?? this.portal.journal.email(),
  );
  protected readonly person = computed(() =>
    this.portal.contacts().find((p) => p.email.toLowerCase() === this.staff()),
  );
  protected readonly record = computed(
    () => undefined as ReturnType<typeof this.portal.store.staff>[number] | undefined,
  );
  protected readonly profileTab = signal('Tasks & actions');
  protected readonly filter = signal('All');
  protected readonly search = signal('');
  protected readonly editing = signal(false);
  protected readonly uploading = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected task = this.portal.newTask();
  private clean = JSON.stringify(this.task);
  protected readonly ownTasks = computed(() =>
    this.portal
      .tasks()
      .filter(
        (t) =>
          (this.clientMode || t.owner === this.staff()) &&
          (!this.clientContext() || t.clientId === this.clientContext()),
      ),
  );
  protected readonly tasks = computed(() =>
    this.ownTasks()
      .filter(
        (t) =>
          (this.filter() === 'All' || t.status === this.filter()) &&
          (!this.search() ||
            [t.title, t.notes ?? '', this.portal.clientName(t.clientId)].some((v) =>
              v.toLowerCase().includes(this.search().toLowerCase()),
            )),
      )
      .sort((a, b) => a.due.localeCompare(b.due)),
  );
  protected readonly unresolved = computed(() => []);
  protected readonly pending = computed(() =>
    this.ownTasks().filter((t) => t.status !== 'Resolved'),
  );
  protected get escalatedCount(): number {
    return this.ownTasks().filter((t) => t.status === 'Escalated').length;
  }
  protected readonly resolved = computed(() =>
    this.ownTasks().filter(
      (t) => t.status === 'Resolved' && (t.resolvedAt ?? '').slice(0, 10) >= this.portal.weekStart,
    ),
  );
  protected readonly awaitingReplies = computed(
    () =>
      this.portal.journal
        .entries()
        .filter(
          (e) =>
            e.authorEmail === this.staff() &&
            e.state === 'Sent' &&
            e.responseRequired &&
            e.responseStatus !== 'Responded',
        ).length,
  );
  protected readonly overdueCount = computed(
    () => this.pending().filter((t) => t.due < this.portal.today).length,
  );
  protected readonly dueWeek = computed(
    () =>
      this.pending().filter(
        (t) => t.due >= this.portal.weekStart && t.due <= addDays(this.portal.weekStart, 6),
      ).length,
  );
  protected count(status: string): number {
    return this.ownTasks().filter((t) => status === 'All' || t.status === status).length;
  }
  protected visits() {
    return this.portal.journal.visits();
  }
  protected clientChanged(): void {
    this.task.visitId = '';
    this.task.journalId = '';
    this.task.concernId = '';
    void this.portal.journal.loadOptions(this.task.clientId);
  }
  private generation = 0;
  constructor() {
    const release = this.portal.journal.activate();
    inject(DestroyRef).onDestroy(() => {
      this.generation++;
      release();
    });
    effect(() => {
      this.portal.journal.scope();
      this.params();
      this.queries();
      untracked(() => {
        this.generation++;
        this.editing.set(false);
        this.task = this.portal.newTask();
        this.clean = JSON.stringify(this.task);
        this.portal.journal.selectClient(this.clientContext());
        if (this.portal.journal.allowed()) void this.initialize();
      });
    });
  }
  private async initialize(): Promise<void> {
    const service = this.portal.journal,
      scope = service.scope(),
      generation = this.generation,
      clientId = this.clientContext(),
      id = this.queries().get('task'),
      create = this.queries().get('new');
    const current = () =>
      generation === this.generation &&
      scope === service.scope() &&
      clientId === this.clientContext();
    await service.loadOptions(clientId);
    if (!current()) return;
    await service.setQuery({
      client_id: clientId || undefined,
      folder: 'Inbox',
      search: '',
      category: '',
      filter: 'All messages',
      order: 'Newest first',
      page: 1,
    });
    if (!current()) return;
    if (id)
      try {
        const task = await service.getTask(id);
        if (current()) {
          if (clientId && task.clientId !== clientId)
            throw Error('This task belongs to a different service user.');
          this.staff.set(task.owner);
          this.edit(task);
        }
      } catch (error) {
        if (current())
          this.error.set(error instanceof Error ? error.message : 'The task is unavailable.');
      }
    else if (create) this.edit();
  }
  protected readonly uploadEvidence = (file: File) =>
    this.portal.journal.upload(file, this.task.id);
  protected readonly downloadEvidence = (
    file: import('../journal/journal.models').JournalAttachment,
  ) => this.portal.journal.download(file);
  protected changeStaff(email: string): void {
    if (!this.canLeave()) return;
    this.staff.set(email);
    this.editing.set(false);
  }
  protected edit(task?: JournalTask): void {
    if (task && this.lockedClient && task.clientId !== this.clientContext()) {
      this.error.set('This task belongs to a different service user.');
      return;
    }
    if (!this.canLeave()) return;
    this.task = task
      ? structuredClone(task)
      : this.portal.newTask(this.clientContext(), this.staff());
    if (!task) {
      this.task.journalId = this.route.snapshot.queryParamMap.get('journal') ?? '';
      this.task.concernId = this.route.snapshot.queryParamMap.get('concern') ?? '';
      this.task.visitId = this.route.snapshot.queryParamMap.get('visit') ?? '';
    }
    this.clean = JSON.stringify(this.task);
    this.editing.set(true);
    this.error.set('');
  }
  protected async save(resolve = false): Promise<void> {
    if (this.uploading() || this.portal.journal.busy()) return;
    const scope = this.portal.journal.scope(),
      generation = this.generation,
      draft = this.task;
    const current = () =>
      scope === this.portal.journal.scope() &&
      generation === this.generation &&
      draft === this.task;
    if (this.lockedClient && draft.clientId !== this.clientContext()) {
      this.error.set('This task belongs to a different service user.');
      return;
    }
    const next = { ...this.task, status: resolve ? ('Resolved' as const) : this.task.status };
    if (next.attachments?.length) {
      try {
        next.attachments = await Promise.all(
          next.attachments.map((file) => this.portal.journal.checkFile(file.id)),
        );
        if (next.attachments.some((file) => file.state !== 'clean')) {
          if (!current()) return;
          this.error.set(
            'Attachments must finish scanning before saving. Remove any rejected files.',
          );
          return;
        }
      } catch (error) {
        if (current())
          this.error.set(error instanceof Error ? error.message : 'Attachments are unavailable.');
        return;
      }
    }
    if (!current()) return;
    const error = await this.portal.saveTask(next);
    if (!current()) return;
    this.error.set(error ?? '');
    if (!error) {
      this.staff.set(next.owner);
      this.editing.set(false);
      this.notice.set(resolve ? 'Task marked as resolved.' : 'Task updates saved.');
    }
  }
  protected cancel(): void {
    if (this.canLeave()) this.editing.set(false);
  }
  canLeave(): boolean {
    if (this.portal.journal.busy()) return false;
    return (
      (!this.uploading() && (!this.editing() || JSON.stringify(this.task) === this.clean)) ||
      window.confirm('Discard unsaved task changes?')
    );
  }
  protected initials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('');
  }
}
