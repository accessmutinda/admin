import {
  Component,
  DestroyRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
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
import { CareService } from './care.service';
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
  imports: [
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
  protected readonly care = inject(CareService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  protected readonly id = computed(() => this.params().get('id') ?? '');
  protected readonly client = computed(() => this.care.client(this.id()));
  protected readonly notes = computed(() =>
    this.care
      .visitNotes(this.id())
      .slice()
      .sort((a, b) =>
        (b.date + b.start + b.createdAt).localeCompare(a.date + a.start + a.createdAt),
      ),
  );
  protected readonly today = londonDate();
  protected readonly audiences: VisitNoteAudience[] = ['staff', 'family', 'inspector'];
  protected readonly query = signal({ from: '', to: '', carer: '', type: '' });
  protected filters = { from: '', to: '', carer: '', type: '' };
  protected readonly filtered = computed(() => {
    const f = this.query();
    return this.notes().filter(
      (n) =>
        (!f.from || n.date >= f.from) &&
        (!f.to || n.date <= f.to) &&
        (!f.carer || n.carerId === f.carer) &&
        (!f.type || n.visitType === f.type),
    );
  });
  protected readonly page = signal(1);
  protected readonly pageSize = signal(8);
  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / this.pageSize())),
  );
  protected readonly currentPage = computed(() => Math.min(this.page(), this.pageCount()));
  protected readonly rows = computed(() =>
    this.filtered().slice(
      (this.currentPage() - 1) * this.pageSize(),
      this.currentPage() * this.pageSize(),
    ),
  );
  protected readonly pageNumbers = computed(() => {
    const start = Math.max(1, Math.min(this.currentPage() - 2, this.pageCount() - 4));
    return Array.from({ length: Math.min(5, this.pageCount()) }, (_, i) => start + i);
  });
  protected readonly selectedId = signal('');
  protected readonly panelOpen = signal(true);
  protected readonly selected = computed(() =>
    this.panelOpen()
      ? (this.rows().find((n) => n.id === this.selectedId()) ?? this.rows()[0])
      : undefined,
  );
  protected readonly staff = computed(() =>
    this.care.store
      .staff()
      .filter(
        (p) =>
          this.care.auth.currentUser()?.roleCode !== 'CW' ||
          p.email.toLowerCase() === this.care.auth.currentUser()?.email.toLowerCase(),
      ),
  );
  protected readonly carers = computed(() =>
    [...new Set(this.notes().map((n) => n.carerId))].map((id) => ({
      id,
      name: this.carerName(id),
    })),
  );
  protected readonly types = computed(() =>
    [
      ...new Set([
        'Personal Care',
        'Evening Care',
        'Domestic Support',
        'Medication',
        'Observation',
        ...this.notes().map((n) => n.visitType),
        ...this.care.rota
          .data()
          .calls.filter((c) => c.clientId === this.id())
          .map((c) => c.name),
      ]),
    ].sort(),
  );
  protected readonly visits = computed(() =>
    this.care.rota
      .data()
      .visits.filter(
        (v) =>
          v.clientId === this.id() &&
          v.state !== 'Cancelled' &&
          v.date <= this.today &&
          (this.care.auth.currentUser()?.roleCode !== 'CW' ||
            v.staffIds.some((id) => this.staff().some((s) => s.id === id))),
      )
      .sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start)),
  );
  protected readonly editing = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected draft: VisitNoteDraft = blankVisitNote(this.today);
  private baseline = '';
  private owner: { client: string; company: string; version?: number } | null = null;
  private destroyed = false;
  protected readonly ukStamp = ukStamp;
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
    });
    effect(() => {
      this.id();
      this.care.store.companyId();
      this.selectedId.set('');
      this.page.set(1);
      this.panelOpen.set(true);
    });
  }
  protected carerName(id: string): string {
    return (
      this.care.store.data().people.find((p) => p.id === id)?.name ?? 'Carer no longer available'
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
    this.error.set('');
    if (this.filters.from && this.filters.to && this.filters.from > this.filters.to) {
      this.error.set('The end date must be on or after the start date.');
      return;
    }
    this.query.set({ ...this.filters });
    this.page.set(1);
    this.selectedId.set('');
    this.panelOpen.set(true);
  }
  protected reset(): void {
    this.filters = { from: '', to: '', carer: '', type: '' };
    this.search();
  }
  protected select(note: VisitNote, event?: Event): void {
    if (event?.target instanceof Element && event.target.closest('button, a, input')) return;
    event?.preventDefault();
    this.selectedId.set(note.id);
    this.panelOpen.set(true);
  }
  protected toggle(note: VisitNote, audience: VisitNoteAudience): void {
    const error = this.care.setVisitNoteVisibility(
      this.id(),
      this.care.store.companyId(),
      note.id,
      audience,
      !note.visibility[audience],
      note.version,
    );
    this.error.set(error ?? '');
    if (!error) {
      this.notice.set('');
      this.toast.success('Visit note visibility updated.', {
        duration: 2000,
        horizontalPosition: 'left',
        verticalPosition: 'bottom',
      });
    }
  }
  protected open(note?: VisitNote): void {
    if (note ? !this.care.canEditVisitNote(note) : !this.care.canWriteVisitNotes()) return;
    this.owner = {
      client: this.id(),
      company: this.care.store.companyId(),
      version: note?.version,
    };
    this.draft = note ? structuredClone(note) : blankVisitNote(this.today);
    if (!note && this.staff().length === 1) this.draft.carerId = this.staff()[0].id;
    this.baseline = JSON.stringify(this.draft);
    this.error.set('');
    this.editing.set(true);
  }
  protected isEditingExisting(): boolean {
    return this.owner?.version !== undefined;
  }
  protected chooseVisit(): void {
    const visit = this.visits().find((v) => v.id === this.draft.visitId);
    if (!visit) return;
    this.draft.date = visit.date;
    this.draft.start = visit.start;
    this.draft.end = visit.end;
    this.draft.visitType = visit.callName;
    this.draft.carerId = visit.staffIds.find((id) => this.staff().some((p) => p.id === id)) ?? '';
  }
  protected close(): void {
    if (!this.canLeave()) return;
    this.editing.set(false);
    this.error.set('');
    this.owner = null;
  }
  protected save(): void {
    const owner = this.owner;
    if (!owner || owner.client !== this.id() || owner.company !== this.care.store.companyId()) {
      this.error.set('The service user or workspace changed. Reopen the note before saving.');
      return;
    }
    const error = this.care.saveVisitNote(owner.client, owner.company, this.draft, owner.version);
    this.error.set(error ?? '');
    if (error) return;
    this.reset();
    this.selectedId.set(this.draft.id);
    const position = this.filtered().findIndex((n) => n.id === this.draft.id);
    this.page.set(Math.floor(Math.max(position, 0) / this.pageSize()) + 1);
    this.panelOpen.set(true);
    this.editing.set(false);
    this.owner = null;
    this.notice.set('Visit note saved.');
  }
  protected async upload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length || this.busy()) return;
    const owner = this.owner;
    const draft = this.draft;
    this.busy.set(true);
    this.error.set('');
    try {
      if (
        files.length + draft.attachments.length > 10 ||
        files.reduce((sum, f) => sum + f.size, 0) +
          draft.attachments.reduce((sum, a) => sum + a.size, 0) >
          5 * 1024 * 1024
      )
        throw new Error('Use up to 10 attachments totalling no more than 5 MB.');
      const attachments: VisitNoteAttachment[] = [];
      for (const file of files) {
        const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
        const mime = (
          {
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            pdf: 'application/pdf',
          } as Record<string, string>
        )[extension];
        if (!mime || !file.size || (file.type && file.type !== mime))
          throw new Error('Use nonempty PNG, JPEG or PDF files.');
        const bytes = new Uint8Array(await file.arrayBuffer());
        const valid =
          mime === 'application/pdf'
            ? new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-'
            : mime === 'image/png'
              ? [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)
              : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
        if (!valid) throw new Error('The attachment content does not match its file type.');
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Could not read this attachment.'));
          reader.readAsDataURL(file);
        });
        attachments.push({ id: crypto.randomUUID(), name: file.name, size: file.size, mime, data });
      }
      if (
        this.destroyed ||
        owner !== this.owner ||
        owner?.company !== this.care.store.companyId() ||
        owner?.client !== this.id() ||
        draft !== this.draft
      )
        return;
      draft.attachments.push(...attachments);
    } catch (e) {
      if (!this.destroyed && owner === this.owner)
        this.error.set(e instanceof Error ? e.message : 'Could not read attachments.');
    } finally {
      if (!this.destroyed) this.busy.set(false);
    }
  }
  protected removeAttachment(id: string): void {
    if (this.isSavedAttachment(id)) return;
    this.draft.attachments = this.draft.attachments.filter((a) => a.id !== id);
  }
  protected isSavedAttachment(id: string): boolean {
    return !!this.notes()
      .find((n) => n.id === this.draft.id)
      ?.attachments.some((a) => a.id === id);
  }
  protected download(note: VisitNote, attachment: VisitNoteAttachment): void {
    const current = this.care.visitNotes(this.id()).find((n) => n.id === note.id);
    const file = current?.attachments.find((a) => a.id === attachment.id);
    if (!file || !this.care.rota.can('export')) return;
    const anchor = document.createElement('a');
    anchor.href = file.data;
    anchor.download = file.name;
    anchor.click();
  }
  protected size(bytes: number): string {
    return bytes < 1024 * 1024
      ? Math.ceil(bytes / 1024) + ' KB'
      : (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  protected duration(note: VisitNote): string {
    const start = londonInstant(note.date, note.start);
    const end = londonInstant(note.end < note.start ? addDays(note.date, 1) : note.date, note.end);
    if (!start || !end) return 'Not available';
    const minutes = Math.round((Date.parse(end) - Date.parse(start)) / 60000);
    return minutes % 60 === 0
      ? `${minutes / 60} ${minutes === 60 ? 'hour' : 'hours'}`
      : `${minutes} minutes`;
  }
  canLeave(): boolean {
    return (
      !this.editing() ||
      (!this.busy() && JSON.stringify(this.draft) === this.baseline) ||
      window.confirm('Discard the unsaved visit note changes?')
    );
  }
  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.editing() && (this.busy() || JSON.stringify(this.draft) !== this.baseline)) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
