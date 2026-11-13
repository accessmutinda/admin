import {
  Component,
  computed,
  inject,
  signal,
  input,
  output,
  effect,
  DestroyRef,
  untracked,
} from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { ModuleDesign } from '../shared/module-design';
import { JournalService } from './journal.service';
import { AccessRequired } from '../shared/access-required';
import { JournalEntry } from './journal.models';

@Component({
  selector: 'cv-staff-journal',
  imports: [
    DatePipe,
    FormsModule,
    MatSelectModule,
    CvSelect,
    ModuleDesign,
    RouterLink,
    AccessRequired,
  ],
  templateUrl: './staff-journal.html',
  styleUrls: [
    './staff-journal.css',
    './staff-journal-editor.css',
    './staff-journal-activity.css',
    './staff-journal-reference.css',
  ],
  host: {
    class: 'module-page operations-page staff-journal-page',
    '[class.compose-only]': 'composeOnly()',
  },
})
export class StaffJournal {
  readonly clientId = input('');
  readonly embedded = input(false);
  readonly composeOnly = input(false);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected taskRoute() {
    return this.router.url.startsWith('/manage/clients/') && this.clientId()
      ? ['/manage/clients', this.clientId(), 'journal', 'tasks']
      : ['/staff-portal/tasks'];
  }
  private openGeneration = 0;
  constructor() {
    const release = this.service.activate();
    inject(DestroyRef).onDestroy(() => {
      release();
      this.openGeneration++;
      this.service.closeEntry();
    });
    effect(() => {
      const clientId = this.clientId(),
        scope = this.service.scope();
      untracked(() => {
        this.service.selectClient(clientId);
        this.openGeneration++;
        this.selected.set(null);
        this.service.closeEntry();
        this.draft = this.service.newEntry();
        this.draft.clientId = clientId;
        this.editorHtml = '';
        this.cleanDraft = JSON.stringify(this.draft);
        this.composing.set(true);
        this.error.set('');
        this.notice.set('');
        this.checked.set([]);
        if (this.service.allowed()) void this.service.loadOptions(clientId);
      });
    });
    effect((onCleanup) => {
      this.service.scope();
      const query = {
        client_id: this.clientId() || undefined,
        folder: this.folder(),
        search: this.search(),
        category: this.label(),
        filter: this.filter(),
        order: this.order(),
        page: this.page(),
      };
      this.service.invalidateList();
      const timer = setTimeout(() => {
        if (this.service.allowed()) void this.service.setQuery(query);
      }, 200);
      onCleanup(() => clearTimeout(timer));
    });
    effect(() => {
      const value = this.service.detail();
      untracked(() => {
        if (value && this.selected()?.id === value.id) this.selected.set(value);
      });
    });
  }
  async ngOnInit(): Promise<void> {
    const view = this.route.snapshot.queryParamMap.get('view');
    if (view && ['Journal', 'Tasks & actions', 'Activity timeline'].includes(view))
      this.view.set(view);
    const id = this.route.snapshot.queryParamMap.get('entry');
    if (id)
      try {
        const entry = await this.service.getEntry(id);
        if (!this.clientId() || entry.clientId === this.clientId()) {
          this.folder.set(entry.authorEmail === this.service.email() ? 'Sent' : 'Inbox');
          await this.open(entry);
        }
      } catch (error) {
        this.error.set(
          error instanceof Error ? error.message : 'This journal entry is unavailable.',
        );
      }
  }
  protected readonly service = inject(JournalService);
  readonly saved = output<void>();
  protected readonly view = signal('Journal');
  protected readonly folder = signal('Inbox');
  protected readonly search = signal('');
  protected readonly label = signal('');
  protected readonly order = signal('Newest first');
  protected readonly page = signal(1);
  protected readonly pageEntries = computed(() => this.service.entries());
  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.service.count() / 10)));
  protected readonly activePage = computed(() => Math.min(this.page(), this.pageCount()));
  protected readonly checked = signal<string[]>([]);
  protected visits() {
    return this.service.visits();
  }
  protected visitName(id?: string): string {
    const visit = this.visits().find((visit) => visit.id === id);
    return visit ? visit.date + ' · ' + visit.callName : 'No visit linked';
  }
  protected photo(_email: string): string {
    return '';
  }
  protected canCompose(): boolean {
    return this.draft.etag
      ? this.service.capabilities().can_edit
      : this.service.capabilities().can_create;
  }
  protected folderLabel(name: string): string {
    return this.clientId() && name === 'Inbox' ? 'All Journal' : name;
  }
  protected toggle(id: string): void {
    this.checked.update((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));
  }
  protected async bulk(field: 'archivedBy' | 'deletedBy'): Promise<void> {
    const error = await this.service.bulkMark(this.checked(), field, true);
    if (error) {
      this.error.set(error);
      return;
    }
    this.checked.set([]);
    this.selected.set(null);
    this.notice.set(
      field === 'deletedBy' ? 'Selected entries moved to Trash.' : 'Selected entries archived.',
    );
  }
  protected changeClient(): void {
    this.draft.visitId = '';
    this.draft.to = [];
    this.draft.cc = [];
    void this.service.loadOptions(this.draft.clientId);
  }
  protected bodyChanged(event: Event): void {
    const node = event.target as HTMLElement;
    this.draft.body = node.innerText;
    this.draft.bodyHtml = node.innerHTML;
  }
  protected format(command: string, event: Event): void {
    event.preventDefault();
    document.execCommand(command);
  }

  protected readonly filter = signal('All messages');
  protected readonly selected = signal<JournalEntry | null>(null);
  protected readonly composing = signal(true);
  protected readonly notice = signal('');
  protected readonly error = signal('');
  protected readonly uploading = signal(false);
  protected readonly folders = [
    { name: 'Inbox', icon: 'inbox' },
    { name: 'Internal Notes', icon: 'description' },
    { name: 'From Professionals', icon: 'groups' },
    { name: 'Awaiting My Response', icon: 'reply' },
    { name: 'Sent', icon: 'send' },
    { name: 'Drafts', icon: 'draft' },
    { name: 'Mentions', icon: 'alternate_email' },
    { name: 'Follow up', icon: 'folder_open' },
    { name: 'Starred', icon: 'star' },
    { name: 'Archived', icon: 'archive' },
    { name: 'Trash', icon: 'delete' },
  ];
  protected readonly categories = [
    'Care update',
    'Safeguarding',
    'Training',
    'General',
    'Meetings',
  ];
  protected draft = this.service.newEntry();
  protected editorHtml = this.draft.bodyHtml || this.draft.body;
  private cleanDraft = JSON.stringify(this.draft);
  protected readonly unread = computed(() => this.service.summary().unread);
  protected readonly mentions = computed(() => this.service.summary().mentions);
  protected readonly activityEvents = computed(() =>
    this.service.events().filter((event) => !this.clientId() || event.clientId === this.clientId()),
  );
  protected readonly linkedTasks = computed(() =>
    this.service.tasks().filter((task) => !!task.journalId && task.status !== 'Resolved'),
  );
  protected readonly messages = computed(() => this.service.entries());
  protected folderCount(folder: string): number | string {
    return this.service.ready() ? (this.service.summary().folders[folder] ?? 0) : '—';
  }
  protected client(id: string): string {
    return (
      this.service.clients().find((c) => c.id === id)?.name ??
      (id ? 'Service user unavailable' : 'General / no service user')
    );
  }
  protected contact(email: string): string {
    return (
      this.service
        .recipients(this.selected()?.clientId ?? this.clientId())
        .find((c) => c.email.toLowerCase() === email)?.name ?? email
    );
  }
  protected initials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('');
  }
  protected changeView(view: string): void {
    this.view.set(view);
    this.search.set('');
  }
  protected openFolder(folder: string): void {
    this.openGeneration++;
    this.folder.set(folder);
    this.checked.set([]);
    this.page.set(1);
    this.selected.set(null);
    this.service.closeEntry();
  }
  protected async open(entry: JournalEntry): Promise<void> {
    const generation = ++this.openGeneration,
      scope = this.service.scope();
    if (this.service.busy() || !this.discard()) return;
    try {
      entry = await this.service.getEntry(entry.id);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'This journal entry is unavailable.');
      return;
    }
    if (generation !== this.openGeneration || scope !== this.service.scope()) return;
    if (this.clientId() && entry.clientId !== this.clientId()) return;
    if (
      entry.state === 'Draft' &&
      (entry.is_author ?? entry.authorEmail === this.service.email())
    ) {
      if (!this.discard()) return;
      this.draft = structuredClone(entry);
      this.editorHtml = this.draft.bodyHtml || this.draft.body;
      this.cleanDraft = JSON.stringify(this.draft);
      this.composing.set(true);
      this.selected.set(null);
    } else {
      if (!this.discard()) return;
      this.composing.set(false);
      if (this.service.capabilities().can_edit && entry.state_etag && !entry.readBy.length) {
        const error = await this.service.mark(entry.id, 'readBy', true);
        if (generation !== this.openGeneration || scope !== this.service.scope()) return;
        if (error) {
          this.error.set(error);
          return;
        }
      }
      this.selected.set(this.service.cached(entry.id) ?? entry);
    }
  }
  protected newMessage(reply = false): void {
    if (this.service.busy() || !this.service.capabilities().can_create) return;
    if (!this.discard()) return;
    const source = reply ? this.selected() : null;
    this.openGeneration++;
    this.service.closeEntry();
    this.draft = this.service.newEntry();
    this.draft.clientId = this.clientId();
    if (source) {
      this.draft.to = [
        (source.is_author ?? source.authorEmail === this.service.email())
          ? source.to[0]
          : source.authorEmail,
      ].filter(Boolean);
      this.draft.subject = source.subject.startsWith('Re: ')
        ? source.subject
        : 'Re: ' + source.subject;
      this.draft.clientId = source.clientId;
      this.draft.category = source.category;
      this.draft.visitId = source.visitId;
      this.draft.replyToId =
        (source.is_author ?? source.authorEmail === this.service.email()) ? undefined : source.id;
    }
    this.editorHtml = this.draft.bodyHtml || this.draft.body;
    this.cleanDraft = JSON.stringify(this.draft);
    this.composing.set(true);
    this.selected.set(null);
    this.error.set('');
  }
  protected async save(send: boolean): Promise<void> {
    if (this.uploading() || this.service.busy()) return;
    if (this.draft.attachments.length && !(await this.checkAttachments())) return;
    const scope = this.service.scope(),
      draft = this.draft;
    const error = await this.service.save(this.draft, send);
    if (scope !== this.service.scope() || draft !== this.draft) return;
    this.error.set(error ?? '');
    if (error) return;
    this.composing.set(false);
    this.cleanDraft = JSON.stringify(this.draft);
    this.folder.set(send ? 'Sent' : 'Drafts');
    this.label.set('');
    this.page.set(1);
    this.filter.set('All messages');
    this.search.set('');
    this.notice.set(
      send
        ? 'Journal entry sent to the selected recipients in this workspace.'
        : 'Draft saved. You can continue it from Drafts.',
    );
    this.saved.emit();
  }
  protected cancelCompose(): void {
    if (this.discard()) this.composing.set(false);
  }
  private discard(): boolean {
    return (
      !this.composing() ||
      JSON.stringify(this.draft) === this.cleanDraft ||
      window.confirm('Discard unsaved changes to this journal entry?')
    );
  }
  canLeave(): boolean {
    if (this.service.busy()) return false;
    return (
      ((!this.composing() || JSON.stringify(this.draft) === this.cleanDraft) &&
        !this.uploading()) ||
      window.confirm('Leave and discard unsaved journal changes?')
    );
  }
  protected async mark(
    field: 'readBy' | 'archivedBy' | 'starredBy' | 'followUpBy' | 'deletedBy',
  ): Promise<void> {
    const entry = this.selected();
    if (!entry) return;
    const enabled = !(entry[field] ?? []).length;
    const error = await this.service.mark(entry.id, field, enabled);
    this.error.set(error ?? '');
    if (!error && this.selected()?.id === entry.id) {
      this.selected.set(field === 'archivedBy' ? null : (this.service.cached(entry.id) ?? null));
    }
  }
  protected has(
    field: 'readBy' | 'archivedBy' | 'starredBy' | 'followUpBy' | 'deletedBy',
  ): boolean {
    return !!this.selected()?.[field]?.length;
  }
  protected async attach(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    await this.addFiles(files);
  }
  protected async drop(event: DragEvent): Promise<void> {
    event.preventDefault();
    await this.addFiles(Array.from(event.dataTransfer?.files ?? []));
  }
  private async addFiles(files: File[]): Promise<void> {
    if (!files.length || this.uploading()) return;
    if (
      files.reduce(
        (s, f) => s + f.size,
        this.draft.attachments.reduce((s, a) => s + a.size, 0),
      ) >
      5 * 1024 * 1024
    ) {
      this.error.set('Attachments must total 5 MB or less.');
      return;
    }
    this.uploading.set(true);
    this.error.set('');
    try {
      const scope = this.service.scope(),
        draft = this.draft;
      const attachments = await Promise.all(
        files.map((file) => this.service.upload(file, this.draft.id)),
      );
      if (scope !== this.service.scope() || draft !== this.draft) return;
      this.draft.attachments.push(...attachments);
    } catch (error) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'Could not upload the attachments. Please try again.',
      );
    } finally {
      this.uploading.set(false);
    }
  }
  protected removeAttachment(id: string): void {
    this.draft.attachments = this.draft.attachments.filter((a) => a.id !== id);
  }
  protected async download(id: string): Promise<void> {
    const file = this.selected()?.attachments.find((file) => file.id === id);
    if (!file) return;
    try {
      await this.service.download(file);
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'This attachment could not be downloaded.',
      );
    }
  }
  protected async checkAttachments(): Promise<boolean> {
    try {
      const scope = this.service.scope(),
        draft = this.draft;
      const files = await Promise.all(
        draft.attachments.map((file) => this.service.checkFile(file.id)),
      );
      if (scope !== this.service.scope() || draft !== this.draft) return false;
      draft.attachments = files;
      const pending = files.find((file) => file.state !== 'clean');
      if (pending) {
        this.error.set(
          pending.state === 'rejected'
            ? 'An attachment was rejected by the scanner. Remove it before saving.'
            : 'An attachment is still being scanned. Try saving again shortly.',
        );
        return false;
      }
      return true;
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Attachments are unavailable.');
      return false;
    }
  }
}
