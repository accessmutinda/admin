import { ServiceUserState } from '../shared/service-user-state';
import {
  Component,
  DestroyRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { A11yModule } from '@angular/cdk/a11y';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { ToastService } from '../../../shared/ui/toast.service';
import { CvSelect } from '../../../shared/ui/select';
import { ModuleDesign } from '../shared/module-design';
import { CareHeader } from './care-header';
import { VisitNotesApi } from './visit-notes-api.service';
import { londonDate, londonInstant, addDays } from '../rota/rota.models';
import { ukStamp } from './care.models';
import {
  VisitNote,
  VisitNoteDraft,
  VisitNoteAudience,
  VisitNoteAttachment,
  blankVisitNote,
} from './visit-notes.models';

@Component({
  selector: 'cv-visit-notes',
  providers: [VisitNotesApi],
  imports: [
    ServiceUserState,
    ModuleDesign,
    CareHeader,
    DatePipe,
    FormsModule,
    A11yModule,
    MatSelectModule,
    MatMenuModule,
    CvSelect,
  ],
  host: { class: 'module-page operations-page visit-notes-page' },
  templateUrl: './visit-notes.html',
  styleUrls: [
    './service-user-spacing.css',
    './care-shared.css',
    './care-controls.css',
    './visit-notes.css',
  ],
})
export class VisitNotes {
  protected readonly api = inject(VisitNotesApi);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  protected readonly id = computed(() => this.params().get('id') ?? '');
  protected readonly client = computed(() =>
    this.api.can('read') && this.api.records.selected()?.id === this.id()
      ? this.api.records.selected()
      : null,
  );
  protected readonly notes = this.api.notes;
  protected readonly today = computed(() => this.api.options()?.today ?? londonDate());
  protected readonly audiences: VisitNoteAudience[] = ['staff', 'family', 'inspector'];
  protected readonly query = signal({ from: '', to: '', carer: '', type: '' });
  protected filters = { from: '', to: '', carer: '', type: '' };
  protected readonly filtered = this.notes;
  protected readonly page = signal(1);
  protected readonly pageSize = signal(8);
  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil((this.api.page()?.count ?? 0) / this.pageSize())),
  );
  protected readonly currentPage = computed(() => Math.min(this.page(), this.pageCount()));
  protected readonly printRows = signal<VisitNote[] | null>(null);
  protected readonly printing = signal(false);
  protected readonly rows = computed(() => this.printRows() ?? this.notes());
  protected readonly total = computed(() => this.api.page()?.count ?? 0);
  protected readonly pageNumbers = computed(() => {
    const start = Math.max(1, Math.min(this.currentPage() - 2, this.pageCount() - 4));
    return Array.from({ length: Math.min(5, this.pageCount()) }, (_, i) => start + i);
  });
  protected readonly selectedId = signal('');
  protected readonly panelOpen = signal(true);
  private readonly detail = signal<VisitNote | null>(null);
  protected readonly selected = computed(() =>
    this.panelOpen()
      ? this.detail()?.id === this.selectedId()
        ? this.detail()
        : (this.rows().find((n) => n.id === this.selectedId()) ?? this.rows()[0])
      : undefined,
  );
  protected readonly staff = computed(() => this.api.options()?.staff ?? []);
  protected readonly carers = computed(() => this.api.options()?.carers ?? []);
  protected readonly types = computed(() =>
    [
      ...new Set([
        'Personal Care',
        'Evening Care',
        'Domestic Support',
        'Medication',
        'Observation',
        ...(this.api.options()?.types ?? []),
        ...this.notes().map((n) => n.visitType),
      ]),
    ].sort(),
  );
  protected readonly visits = computed(() => this.api.options()?.visits ?? []);
  protected readonly editing = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly fieldErrors = signal<Record<string, string[]>>({});
  protected draft: VisitNoteDraft = blankVisitNote(londonDate());
  private baseline = '';
  private owner: {
    client: string;
    company: string;
    scope: string;
    original: VisitNote | null;
  } | null = null;
  private destroyed = false;
  private selectionGeneration = 0;
  private lastRequest = '';
  protected readonly ukStamp = ukStamp;
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.selectionGeneration++;
    });
    effect(() => {
      const id = this.id();
      this.api.scope();
      untracked(() => {
        this.selectionGeneration++;
        this.lastRequest = '';
        this.editing.set(false);
        this.owner = null;
        this.draft = blankVisitNote(londonDate());
        this.busy.set(false);
        this.selectedId.set('');
        this.detail.set(null);
        this.page.set(1);
        this.query.set({ from: '', to: '', carer: '', type: '' });
        this.filters = { from: '', to: '', carer: '', type: '' };
        this.error.set('');
        this.notice.set('');
        this.printRows.set(null);
        if (id && this.api.can('read')) {
          void this.api.records.detail(id);
          void this.api.loadOptions(id);
        }
      });
    });
    effect(() => {
      const id = this.id(),
        scope = this.api.scope(),
        query = this.queryString();
      const key = JSON.stringify([id, scope, query]);
      if (id && this.api.can('read') && key !== this.lastRequest) {
        this.lastRequest = key;
        untracked(() => void this.load(id, query, scope));
      }
    });
  }
  protected retry(): void {
    void this.api.records.detail(this.id());
    void this.api.loadOptions(this.id(), this.queryString(true));
    void this.load(this.id(), this.queryString(), this.api.scope());
  }
  private queryString(options = false): string {
    const f = this.query(),
      query = new URLSearchParams();
    if (f.from) query.set('from_date', f.from);
    if (f.to) query.set('to_date', f.to);
    if (f.carer) query.set('carer', f.carer);
    if (f.type) query.set('type', f.type);
    if (!options) {
      query.set('page', String(this.page()));
      query.set('page_size', String(this.pageSize()));
    }
    return query.toString();
  }
  private async load(id: string, query: string, scope: string): Promise<void> {
    this.selectionGeneration++;
    this.detail.set(null);
    this.selectedId.set('');
    if (
      (await this.api.load(id, query)) &&
      scope === this.api.scope() &&
      id === this.id() &&
      this.page() > this.pageCount()
    )
      this.page.set(this.pageCount());
  }
  protected carerName(id: string): string {
    return (
      this.api.options()?.staff.find((p) => p.id === id)?.name ??
      this.notes().find((n) => n.carerId === id)?.carerName ??
      'Carer record unavailable'
    );
  }
  protected initials(id: string): string {
    return this.carerName(id)
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0])
      .join('');
  }
  protected search(): void {
    if (this.busy()) return;
    this.error.set('');
    if (this.filters.from && this.filters.to && this.filters.from > this.filters.to) {
      this.error.set('The end date must be on or after the start date.');
      return;
    }
    this.query.set({ ...this.filters });
    this.page.set(1);
    this.selectedId.set('');
    this.panelOpen.set(true);
    this.lastRequest = JSON.stringify([this.id(), this.api.scope(), this.queryString()]);
    void this.load(this.id(), this.queryString(), this.api.scope());
    void this.api.loadOptions(this.id(), this.queryString(true));
  }
  protected reset(): void {
    this.filters = { from: '', to: '', carer: '', type: '' };
    this.search();
  }
  protected async select(note: VisitNote, event?: Event): Promise<void> {
    if (event?.target instanceof Element && event.target.closest('button,a,input')) return;
    event?.preventDefault();
    const scope = this.api.scope(),
      id = this.id(),
      generation = ++this.selectionGeneration;
    try {
      const fresh = await this.api.detail(id, note.id);
      if (
        this.destroyed ||
        generation !== this.selectionGeneration ||
        scope !== this.api.scope() ||
        id !== this.id()
      )
        return;
      this.selectedId.set(fresh.id);
      this.detail.set(fresh);
      this.panelOpen.set(true);
    } catch (e) {
      if (scope === this.api.scope()) this.fail(e);
    }
  }
  protected async toggle(note: VisitNote, audience: VisitNoteAudience): Promise<void> {
    if (!this.api.can('publish') || this.busy()) return;
    const scope = this.api.scope(),
      id = this.id();
    this.busy.set(true);
    try {
      const result = await this.api.visibility(id, note, audience);
      if (scope !== this.api.scope() || id !== this.id()) return;
      await this.api.load(id, this.queryString());
      if (scope !== this.api.scope() || id !== this.id()) return;
      this.selectedId.set(result.id);
      this.detail.set(result);
      this.error.set('');
      this.toast.success('Visit note visibility preference updated.', {
        duration: 2000,
        horizontalPosition: 'left',
        verticalPosition: 'bottom',
      });
    } catch (e) {
      if (scope === this.api.scope() && id === this.id()) this.fail(e);
    } finally {
      if (scope === this.api.scope() && id === this.id()) this.busy.set(false);
    }
  }
  protected async open(note?: VisitNote): Promise<void> {
    if (this.busy() || !this.api.can(note ? 'edit' : 'create')) return;
    const id = this.id(),
      scope = this.api.scope(),
      generation = ++this.selectionGeneration;
    this.error.set('');
    this.fieldErrors.set({});
    try {
      const fresh = note ? await this.api.detail(id, note.id) : null;
      if (
        this.destroyed ||
        scope !== this.api.scope() ||
        id !== this.id() ||
        generation !== this.selectionGeneration
      )
        return;
      this.owner = { client: id, company: this.api.records.companyId(), scope, original: fresh };
      this.draft = fresh ? structuredClone(fresh) : blankVisitNote(this.today());
      if (!fresh && this.staff().length === 1) this.draft.carerId = this.staff()[0].id;
      this.baseline = JSON.stringify(this.draft);
      this.editing.set(true);
    } catch (e) {
      if (scope === this.api.scope() && id === this.id()) this.fail(e);
    }
  }
  protected isEditingExisting(): boolean {
    return !!this.owner?.original;
  }
  protected chooseVisit(): void {
    const visit = this.visits().find((v) => v.id === this.draft.visitId);
    if (!visit) return;
    Object.assign(this.draft, {
      date: visit.date,
      start: visit.start,
      end: visit.end,
      visitType: visit.callName,
      carerId: visit.staffIds.find((id) => this.staff().some((p) => p.id === id)) ?? '',
    });
  }
  protected async close(): Promise<void> {
    if (this.busy() || !this.canLeave()) return;
    const owner = this.owner;
    if (!owner) return;
    this.busy.set(true);
    try {
      for (const file of this.draft.attachments.filter((file) => !this.isSavedAttachment(file.id)))
        await this.api.discard(owner.client, file);
      if (!this.same(owner)) return;
      this.editing.set(false);
      this.error.set('');
      this.owner = null;
    } catch (e) {
      if (this.same(owner)) this.fail(e);
    } finally {
      if (owner.scope === this.api.scope() && owner.client === this.id()) this.busy.set(false);
    }
  }
  protected async save(): Promise<void> {
    if (this.busy()) return;
    const owner = this.owner;
    if (!owner || owner.client !== this.id() || owner.scope !== this.api.scope()) {
      this.error.set('The service user or workspace changed. Reopen this note.');
      return;
    }
    this.busy.set(true);
    this.fieldErrors.set({});
    try {
      const saved = await this.api.save(owner.client, this.draft, owner.original);
      if (!this.same(owner)) return;
      this.draft = { ...this.draft, id: saved.id };
      this.editing.set(false);
      this.owner = null;
      this.query.set({ from: '', to: '', carer: '', type: '' });
      this.filters = { from: '', to: '', carer: '', type: '' };
      this.page.set(1);
      this.lastRequest = JSON.stringify([owner.client, owner.scope, this.queryString()]);
      await Promise.all([
        this.api.load(owner.client, 'page=1&page_size=' + this.pageSize()),
        this.api.loadOptions(owner.client),
      ]);
      if (owner.scope !== this.api.scope() || owner.client !== this.id()) return;
      this.selectedId.set(saved.id);
      this.detail.set(saved);
      this.panelOpen.set(true);
      this.error.set('');
      this.notice.set('Visit note saved.');
    } catch (e) {
      if (this.same(owner)) this.fail(e);
    } finally {
      if (owner.scope === this.api.scope() && owner.client === this.id()) this.busy.set(false);
    }
  }
  private same(owner: NonNullable<VisitNotes['owner']>): boolean {
    return (
      !this.destroyed &&
      this.owner === owner &&
      owner.client === this.id() &&
      owner.scope === this.api.scope()
    );
  }
  private fail(e: unknown): void {
    this.error.set(e instanceof Error ? e.message : 'The request could not be completed.');
    const fields = (e as { fieldErrors?: Record<string, string[]> })?.fieldErrors;
    this.fieldErrors.set(fields ?? {});
  }
  protected async upload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement,
      files = Array.from(input.files ?? []);
    input.value = '';
    const owner = this.owner;
    if (!files.length || !owner || this.busy()) return;
    const draft = this.draft;
    if (
      files.length + draft.attachments.length > 10 ||
      files.reduce((n, f) => n + f.size, 0) + draft.attachments.reduce((n, f) => n + f.size, 0) >
        5242880
    ) {
      this.error.set('Use up to 10 attachments totalling no more than 5 MB.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      for (const file of files) {
        const attached = await this.api.upload(owner.client, file);
        if (!this.same(owner) || draft !== this.draft) return;
        draft.attachments.push(attached);
      }
    } catch (e) {
      if (this.same(owner)) this.fail(e);
    } finally {
      if (this.same(owner)) this.busy.set(false);
    }
  }
  protected async removeAttachment(id: string): Promise<void> {
    const owner = this.owner,
      file = this.draft.attachments.find((a) => a.id === id);
    if (!owner || !file || this.busy() || this.isSavedAttachment(id)) return;
    this.busy.set(true);
    try {
      await this.api.discard(owner.client, file);
      if (this.same(owner))
        this.draft.attachments = this.draft.attachments.filter((a) => a.id !== id);
    } catch (e) {
      if (this.same(owner)) this.fail(e);
    } finally {
      if (this.same(owner)) this.busy.set(false);
    }
  }
  protected isSavedAttachment(id: string): boolean {
    return !!this.owner?.original?.attachments.some((a) => a.id === id);
  }
  protected async download(note: VisitNote, attachment: VisitNoteAttachment): Promise<void> {
    const scope = this.api.scope(),
      id = this.id();
    try {
      await this.api.download(this.id(), note, attachment);
    } catch (e) {
      if (scope === this.api.scope() && id === this.id()) this.fail(e);
    }
  }
  protected async print(): Promise<void> {
    if (this.printing() || this.busy()) return;
    const id = this.id(),
      scope = this.api.scope();
    this.printing.set(true);
    try {
      const rows = await this.api.print(id, this.queryString());
      if (scope !== this.api.scope() || id !== this.id()) return;
      this.printRows.set(rows);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      if (scope === this.api.scope() && id === this.id()) window.print();
    } catch (e) {
      if (scope === this.api.scope()) this.fail(e);
    } finally {
      this.printRows.set(null);
      this.printing.set(false);
    }
  }
  protected size(bytes: number): string {
    return bytes < 1048576 ? Math.ceil(bytes / 1024) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB';
  }
  protected duration(note: VisitNote): string {
    const a = londonInstant(note.date, note.start),
      b = londonInstant(note.end < note.start ? addDays(note.date, 1) : note.date, note.end);
    if ((!a || !b) && note.durationMinutes === undefined) return 'Not available';
    const minutes = note.durationMinutes ?? Math.round((Date.parse(b!) - Date.parse(a!)) / 60000);
    return minutes % 60 === 0
      ? `${minutes / 60} ${minutes === 60 ? 'hour' : 'hours'}`
      : `${minutes} minutes`;
  }
  canLeave(): boolean {
    return (
      !this.busy() &&
      (!this.editing() ||
        JSON.stringify(this.draft) === this.baseline ||
        window.confirm('Discard the unsaved visit note changes?'))
    );
  }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent): void {
    if (this.busy() || (this.editing() && JSON.stringify(this.draft) !== this.baseline)) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
