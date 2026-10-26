import { Component, computed, inject, signal, input, effect } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { ModuleDesign } from '../shared/module-design';
import { JournalService } from './journal.service';
import { JournalEntry } from './journal.models';

@Component({
  selector: 'cv-staff-journal',
  imports: [DatePipe, FormsModule, MatSelectModule, CvSelect, ModuleDesign, RouterLink],
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
  constructor() {
    effect(() => {
      const clientId = this.clientId();
      if (clientId) {
        this.draft.clientId = clientId;
        this.cleanDraft = JSON.stringify(this.draft);
      }
    });
  }
  private readonly route = inject(ActivatedRoute);
  ngOnInit(): void {
    const view = this.route.snapshot.queryParamMap.get('view');
    if (view && ['Journal', 'Tasks & actions', 'Activity timeline'].includes(view))
      this.view.set(view);
    const id = this.route.snapshot.queryParamMap.get('entry');
    const entry = this.service.entries().find((e) => e.id === id);
    if (entry && (!this.clientId() || entry.clientId === this.clientId())) {
      this.folder.set(entry.authorEmail === this.service.email() ? 'Sent' : 'Inbox');
      this.open(entry);
    }
  }
  protected readonly service = inject(JournalService);
  protected readonly view = signal('Journal');
  protected readonly folder = signal('Inbox');
  protected readonly search = signal('');
  protected readonly label = signal('');
  protected readonly order = signal('Newest first');
  protected readonly page = signal(1);
  protected readonly pageEntries = computed(() =>
    this.messages().slice((this.activePage() - 1) * 10, this.activePage() * 10),
  );
  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.messages().length / 10)),
  );
  protected readonly activePage = computed(() => Math.min(this.page(), this.pageCount()));
  protected readonly checked = signal<string[]>([]);
  protected readonly awaiting = computed(() =>
    this.service
      .entries()
      .filter(
        (e) =>
          e.state === 'Sent' &&
          e.responseRequired &&
          e.responseStatus !== 'Responded' &&
          e.to.includes(this.service.email()) &&
          !(e.deletedBy ?? []).includes(this.service.email()),
      ),
  );
  protected readonly linkedTasks = computed(() =>
    this.service.tasks().filter((t) => !!t.journalId && t.status !== 'Resolved'),
  );
  protected visits() {
    return (
      this.service.store
        .data()
        .rota?.visits.filter((v) => v.clientId === (this.clientId() || this.draft.clientId)) ?? []
    );
  }
  protected visitName(id?: string): string {
    const visit = this.service.store.data().rota?.visits.find((v) => v.id === id);
    return visit ? visit.date + ' · ' + visit.callName : 'No visit linked';
  }
  protected photo(email: string): string {
    return (
      this.service.store.staff().find((p) => p.email.toLowerCase() === email)?.hr?.personal.photo ??
      ''
    );
  }
  protected folderLabel(name: string): string {
    return this.clientId() && name === 'Inbox' ? 'All Journal' : name;
  }
  protected toggle(id: string): void {
    this.checked.update((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));
  }
  protected bulk(field: 'archivedBy' | 'deletedBy'): void {
    for (const id of this.checked()) {
      const error = this.service.mark(id, field, true);
      if (error) {
        this.error.set(error);
        return;
      }
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
  protected readonly unread = computed(
    () =>
      this.service
        .entries()
        .filter(
          (e) =>
            e.state === 'Sent' &&
            e.authorEmail !== this.service.email() &&
            !e.readBy.includes(this.service.email()) &&
            !e.archivedBy.includes(this.service.email()) &&
            !(e.deletedBy ?? []).includes(this.service.email()),
        ).length,
  );
  protected readonly followUps = computed(
    () =>
      this.service
        .entries()
        .filter(
          (e) =>
            e.followUpBy.includes(this.service.email()) &&
            !e.archivedBy.includes(this.service.email()) &&
            !(e.deletedBy ?? []).includes(this.service.email()),
        ).length,
  );
  protected readonly openTasks = computed(() =>
    this.service.tasks().filter((t) => t.status !== 'Resolved'),
  );
  protected readonly mentions = computed(
    () =>
      this.service
        .entries()
        .filter(
          (e) =>
            e.state === 'Sent' &&
            e.cc.includes(this.service.email()) &&
            !e.archivedBy.includes(this.service.email()) &&
            !(e.deletedBy ?? []).includes(this.service.email()),
        ).length,
  );
  protected readonly messages = computed(() =>
    this.folderEntries(this.folder())
      .filter((e) => {
        const q = this.search().toLowerCase().trim();
        return (
          (!this.label() || e.category === this.label()) &&
          (!q ||
            [e.subject, e.body, e.author, this.client(e.clientId)].some((v) =>
              v.toLowerCase().includes(q),
            )) &&
          (this.filter() !== 'Unread' || !e.readBy.includes(this.service.email())) &&
          (this.filter() !== 'High priority' || e.priority === 'High') &&
          (this.filter() !== 'With attachments' || e.attachments.length > 0)
        );
      })
      .sort((a, b) =>
        this.order() === 'Newest first'
          ? b.createdAt.localeCompare(a.createdAt)
          : a.createdAt.localeCompare(b.createdAt),
      ),
  );
  protected readonly tasks = computed(() =>
    this.service
      .tasks()
      .filter(
        (t) =>
          !this.search() ||
          [t.title, this.client(t.clientId), t.status].some((v) =>
            v.toLowerCase().includes(this.search().toLowerCase()),
          ),
      )
      .sort((a, b) => a.due.localeCompare(b.due)),
  );
  protected folderEntries(folder: string): JournalEntry[] {
    const email = this.service.email();
    return this.service.entries().filter((e) => {
      if (this.clientId() && e.clientId !== this.clientId()) return false;
      if (folder === 'Trash') return (e.deletedBy ?? []).includes(email);
      if ((e.deletedBy ?? []).includes(email)) return false;
      if (folder === 'Archived') return e.archivedBy.includes(email);
      if (e.archivedBy.includes(email)) return false;
      if (folder === 'Drafts') return e.state === 'Draft';
      if (e.state !== 'Sent') return false;
      if (folder === 'Internal Notes') return e.kind === 'Internal note';
      if (folder === 'From Professionals')
        return (this.service.clients().find((c) => c.id === e.clientId)?.file?.contacts ?? []).some(
          (c) => c.email.toLowerCase() === e.authorEmail,
        );
      if (folder === 'Awaiting My Response')
        return !!e.responseRequired && e.responseStatus !== 'Responded' && e.to.includes(email);
      if (this.clientId() && folder === 'Inbox') return true;
      if (folder === 'Sent') return e.authorEmail === email;
      if (folder === 'Mentions') return e.cc.includes(email);
      if (folder === 'Follow up') return e.followUpBy.includes(email);
      if (folder === 'Starred') return e.starredBy.includes(email);
      return [...e.to, ...e.cc].includes(email);
    });
  }
  protected client(id: string): string {
    return this.service.clients().find((c) => c.id === id)?.name ?? 'General / no service user';
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
    this.folder.set(folder);
    this.checked.set([]);
    this.page.set(1);
    this.selected.set(null);
  }
  protected open(entry: JournalEntry): void {
    if (entry.state === 'Draft') {
      if (!this.discard()) return;
      this.draft = structuredClone(entry);
      this.editorHtml = this.draft.bodyHtml || this.draft.body;
      this.cleanDraft = JSON.stringify(this.draft);
      this.composing.set(true);
      this.selected.set(null);
    } else {
      if (!this.discard()) return;
      this.composing.set(false);
      if (!entry.readBy.includes(this.service.email())) {
        const error = this.service.mark(entry.id, 'readBy', true);
        if (error) {
          this.error.set(error);
          return;
        }
      }
      this.selected.set(this.service.entries().find((e) => e.id === entry.id) ?? entry);
    }
  }
  protected newMessage(reply = false): void {
    if (!this.discard()) return;
    const source = reply ? this.selected() : null;
    this.draft = this.service.newEntry();
    this.draft.clientId = this.clientId();
    if (source) {
      this.draft.to = [
        source.authorEmail === this.service.email() ? source.to[0] : source.authorEmail,
      ].filter(Boolean);
      this.draft.subject = source.subject.startsWith('Re: ')
        ? source.subject
        : 'Re: ' + source.subject;
      this.draft.clientId = source.clientId;
      this.draft.category = source.category;
      this.draft.visitId = source.visitId;
      this.draft.replyToId = source.authorEmail === this.service.email() ? undefined : source.id;
    }
    this.editorHtml = this.draft.bodyHtml || this.draft.body;
    this.cleanDraft = JSON.stringify(this.draft);
    this.composing.set(true);
    this.selected.set(null);
    this.error.set('');
  }
  protected save(send: boolean): void {
    if (this.uploading()) return;
    const error = this.service.save(this.draft, send);
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
    return (
      ((!this.composing() || JSON.stringify(this.draft) === this.cleanDraft) &&
        !this.uploading()) ||
      window.confirm('Leave and discard unsaved journal changes?')
    );
  }
  protected mark(field: 'readBy' | 'archivedBy' | 'starredBy' | 'followUpBy' | 'deletedBy'): void {
    const entry = this.selected();
    if (!entry) return;
    const enabled = !(entry[field] ?? []).includes(this.service.email());
    const error = this.service.mark(entry.id, field, enabled);
    this.error.set(error ?? '');
    if (!error) {
      this.selected.set(
        field === 'archivedBy'
          ? null
          : (this.service.entries().find((e) => e.id === entry.id) ?? null),
      );
    }
  }
  protected has(
    field: 'readBy' | 'archivedBy' | 'starredBy' | 'followUpBy' | 'deletedBy',
  ): boolean {
    return this.selected()?.[field]?.includes(this.service.email()) ?? false;
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
      const attachments = await Promise.all(
        files.map(
          (file) =>
            new Promise<{ id: string; name: string; size: number; content: string }>(
              (resolve, reject) => {
                const reader = new FileReader();
                reader.onerror = () => reject(new Error('Could not read attachment.'));
                reader.onload = () =>
                  resolve({
                    id: crypto.randomUUID(),
                    name: file.name,
                    size: file.size,
                    content: String(reader.result),
                  });
                reader.readAsDataURL(file);
              },
            ),
        ),
      );
      this.draft.attachments.push(...attachments);
    } catch {
      this.error.set('Could not read the attachments. Please try again.');
    } finally {
      this.uploading.set(false);
    }
  }
  protected removeAttachment(id: string): void {
    this.draft.attachments = this.draft.attachments.filter((a) => a.id !== id);
  }
  protected download(id: string): void {
    const file = this.selected()?.attachments.find((a) => a.id === id);
    if (!file) return;
    const parts = file.content.split(',');
    try {
      const bytes = Uint8Array.from(atob(parts[1]), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      this.error.set('This attachment could not be downloaded.');
    }
  }
}
