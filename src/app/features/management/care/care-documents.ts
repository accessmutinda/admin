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
import { of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { A11yModule } from '@angular/cdk/a11y';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { DomSanitizer } from '@angular/platform-browser';
import { CvSelect } from '../../../shared/ui/select';
import { ModuleDesign } from '../shared/module-design';
import { CareHeader } from './care-header';
import { CareDocumentsApi } from './care-documents-api.service';
import { CareDocument } from './care.models';
import { VisitNoteAudience } from './visit-notes.models';
import {
  DOCUMENT_GROUPS,
  DOCUMENT_TYPES,
  DocumentMetadata,
  documentGroup,
  documentMetadata,
  documentVisibility,
  documentMetadataError,
} from './care-documents.models';
import { londonDate } from '../rota/rota.models';

@Component({
  selector: 'cv-care-documents',
  imports: [
    ModuleDesign,
    CareHeader,
    FormsModule,
    A11yModule,
    MatMenuModule,
    MatSelectModule,
    CvSelect,
  ],
  providers: [CareDocumentsApi],
  host: { class: 'module-page operations-page documents-page' },
  templateUrl: './care-documents.html',
  styleUrls: [
    './service-user-spacing.css',
    './care-shared.css',
    './care-controls.css',
    './visit-notes.css',
    './care-documents.css',
    '../clients/service-user-dialogs.css',
  ],
})
export class CareDocuments {
  protected readonly api = inject(CareDocumentsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly routeQuery = toSignal(
    this.route.queryParamMap || of(this.route.snapshot.queryParamMap),
    {
      initialValue: this.route.snapshot.queryParamMap,
    },
  );
  private routeRequest = '';
  protected readonly id = computed(() => this.params().get('id') ?? '');
  protected readonly client = computed(() =>
    this.api.can('read') && this.api.records.selected()?.id === this.id()
      ? this.api.records.selected()
      : null,
  );
  protected readonly documents = computed(() => (this.api.can('read') ? this.api.documents() : []));
  protected readonly groups = DOCUMENT_GROUPS;
  protected readonly groupDocument = documentGroup;
  protected readonly types = DOCUMENT_TYPES;
  protected readonly audiences: VisitNoteAudience[] = ['staff', 'family', 'inspector'];
  protected readonly audienceLabels = { staff: 'Staff', family: 'Family', inspector: 'Inspector' };
  protected readonly audienceIcons = {
    staff: 'person',
    family: 'group',
    inspector: 'verified_user',
  };
  protected readonly visibility = documentVisibility;
  protected readonly group = signal('All Documents');
  protected readonly audience = signal<VisitNoteAudience | ''>('');
  protected readonly filtered = computed(() =>
    this.documents().filter(
      (d) =>
        (this.group() === 'All Documents' || documentGroup(d) === this.group()) &&
        (!this.audience() || documentVisibility(d)[this.audience() as VisitNoteAudience]),
    ),
  );
  protected readonly page = signal(1);
  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.filtered().length / 8)));
  protected readonly currentPage = computed(() => Math.min(this.page(), this.pageCount()));
  protected readonly rows = computed(() =>
    this.filtered().slice((this.currentPage() - 1) * 8, this.currentPage() * 8),
  );
  protected readonly selectedId = signal('');
  protected readonly panelOpen = signal(true);
  protected readonly selected = computed(() =>
    this.panelOpen()
      ? (this.rows().find((d) => d.id === this.selectedId()) ?? this.rows()[0])
      : undefined,
  );
  protected readonly counts = computed(
    () =>
      Object.fromEntries(
        this.audiences.map((a) => [
          a,
          this.documents().filter((d) => documentVisibility(d)[a]).length,
        ]),
      ) as Record<VisitNoteAudience, number>,
  );
  protected readonly visibilitySegments = computed(() => {
    const documents = this.documents();
    const counts = [0, 0, 0];
    for (const document of documents) {
      const visibility = documentVisibility(document);
      const shared = this.audiences.filter((a) => visibility[a]).length;
      counts[shared === 3 ? 0 : shared > 0 ? 1 : 2]++;
    }
    let offset = 0;
    return [
      { label: 'All audiences', color: '#009c65' },
      { label: 'Selected audiences', color: '#008afa' },
      { label: 'Not shared', color: '#c9d2db' },
    ].map((segment, i) => {
      const portion = documents.length ? (counts[i] / documents.length) * 100 : 0;
      const result = { ...segment, count: counts[i], portion, offset };
      offset += portion;
      return result;
    });
  });
  protected readonly visibilityChartLabel = computed(() =>
    this.api.loading() || this.api.error()
      ? 'Document visibility is unavailable.'
      : this.documents().length
        ? `Document visibility. ${this.visibilitySegments()
            .map((s) => `${s.label}: ${s.count}`)
            .join('. ')}.`
        : 'Document visibility: no documents.',
  );
  protected readonly error = signal('');
  protected readonly fieldErrors = signal<Record<string, string[]>>({});
  protected readonly notice = signal('');
  protected readonly editing = signal(false);
  protected readonly busy = signal(false);
  protected readonly preview = signal<{
    name: string;
    mime: string;
    url: string;
    resource: ReturnType<DomSanitizer['bypassSecurityTrustResourceUrl']>;
  } | null>(null);
  protected metadata: DocumentMetadata = this.blankMetadata();
  protected sharing = { staff: true, family: false, inspector: true };
  protected pending: CareDocument | null = null;
  protected existingId = '';
  private owner: { client: string; company: string; revision?: number } | null = null;
  private original: CareDocument | null = null;
  private pendingFile: File | null = null;
  private editorRequest = 0;
  private pollTimer: ReturnType<typeof setTimeout> | undefined;
  private baseline = '';
  private destroyed = false;
  private previewUrl = '';
  private previewRequest = 0;
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.editorRequest++;
      clearTimeout(this.pollTimer);
      this.closePreview();
    });
    effect(() => {
      const id = this.id(),
        scope = this.api.scope();
      untracked(() => {
        this.editorRequest++;
        this.editing.set(false);
        this.owner = null;
        this.pendingFile = null;
        this.pending = null;
        this.original = null;
        this.metadata = this.blankMetadata();
        this.sharing = { staff: true, family: false, inspector: false };
        this.existingId = '';
        this.error.set('');
        this.notice.set('');
        this.busy.set(false);
        this.group.set('All Documents');
        this.audience.set('');
        this.page.set(1);
        this.selectedId.set('');
        this.panelOpen.set(true);
        this.closePreview();
        if (id && this.api.can('read')) {
          void this.api.records.detail(id);
          void this.load();
        }
      });
    });
    effect(() => {
      if (!this.api.denied()) return;
      untracked(() => {
        this.editorRequest++;
        this.editing.set(false);
        this.owner = null;
        this.original = null;
        this.pending = null;
        this.pendingFile = null;
        this.metadata = this.blankMetadata();
        this.sharing = { staff: true, family: false, inspector: false };
        this.existingId = '';
        this.notice.set('');
        this.busy.set(false);
        this.closePreview();
      });
    });
    effect(() => {
      const p = this.preview();
      if (p && !this.documents().some((d) => d.id === this.previewDocumentId)) this.closePreview();
    });
    effect(() => {
      const query = this.routeQuery();
      const documentId = query?.get('document');
      const create = query?.get('create') === '1';
      if (!documentId && !create) {
        this.routeRequest = '';
        return;
      }
      const request = this.api.scope() + ':' + this.id() + ':' + (documentId || 'new');
      const document = documentId ? this.documents().find((d) => d.id === documentId) : undefined;
      if (this.routeRequest === request || (documentId && !document)) return;
      this.routeRequest = request;
      untracked(() => {
        if (this.editing() && !this.canLeave()) return;
        if (create) {
          void this.open();
          if (this.editing() && query?.get('section') === 'Mobility') {
            this.metadata.description = 'Supporting document for the Mobility care-plan section.';
            this.baseline = this.draftState();
          }
        } else if (document) {
          this.selectedId.set(document.id);
          void this.view(document);
        }
      });
    });
  }
  private previewDocumentId = '';
  private blankMetadata(): DocumentMetadata {
    return {
      name: '',
      category: 'Care Plan',
      version: '1.0',
      status: 'Current',
      issueDate: londonDate(),
      reviewDate: '',
      description: '',
    };
  }
  protected categoryCount(group: string): number | string {
    if (this.api.loading() || this.api.error()) return '—';
    return this.documents().filter((d) => group === 'All Documents' || documentGroup(d) === group)
      .length;
  }
  protected chooseGroup(group: string): void {
    this.group.set(group);
    this.page.set(1);
    this.panelOpen.set(true);
  }
  protected chooseAudience(audience: VisitNoteAudience | ''): void {
    this.audience.set(audience);
    this.group.set('All Documents');
    this.page.set(1);
    this.panelOpen.set(true);
  }
  protected select(d: CareDocument, event?: Event): void {
    if (event?.target instanceof Element && event.target.closest('button,a,input')) return;
    event?.preventDefault();
    this.selectedId.set(d.id);
    this.panelOpen.set(true);
  }
  private async load(): Promise<void> {
    clearTimeout(this.pollTimer);
    const scope = this.api.scope(),
      id = this.id();
    await this.api.load(id);
    if (
      !this.destroyed &&
      scope === this.api.scope() &&
      id === this.id() &&
      this.notice() === 'Document uploaded. Security scanning is pending.'
    ) {
      const uploaded = this.documents().find((d) => d.id === this.selectedId());
      if (uploaded?.state === 'clean')
        this.notice.set('Document uploaded and security scan passed.');
      else if (uploaded && uploaded.state !== 'quarantined')
        this.notice.set('Document uploaded. The file was blocked by security scanning.');
    }
    if (
      !this.destroyed &&
      scope === this.api.scope() &&
      id === this.id() &&
      this.documents().some((d) => d.state === 'quarantined')
    )
      this.pollTimer = setTimeout(() => void this.load(), 3000);
  }
  protected async toggle(d: CareDocument, a: VisitNoteAudience): Promise<void> {
    if (this.busy() || !this.api.can('publish')) return;
    const scope = this.api.scope(),
      id = this.id();
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.visibility(id, d, a);
      if (scope === this.api.scope() && id === this.id()) {
        this.notice.set('Document visibility updated.');
        await this.load();
      }
    } catch (e) {
      if (scope === this.api.scope() && id === this.id())
        this.error.set(e instanceof Error ? e.message : 'Could not update visibility.');
    } finally {
      if (scope === this.api.scope() && id === this.id()) this.busy.set(false);
    }
  }
  protected async open(d?: CareDocument): Promise<void> {
    if (this.busy() || !this.api.can(d ? 'edit' : 'create')) return;
    if (this.editing() && !this.canLeave()) return;
    const request = ++this.editorRequest,
      scope = this.api.scope(),
      id = this.id();
    this.error.set('');
    try {
      const original = d ? await this.api.detail(id, d.id) : null;
      if (
        this.destroyed ||
        request !== this.editorRequest ||
        scope !== this.api.scope() ||
        id !== this.id()
      )
        return;
      this.fieldErrors.set({});
      this.original = original;
      this.owner = {
        client: id,
        company: this.api.records.companyId(),
        revision: original?.revision,
      };
      this.metadata = original ? documentMetadata(original) : this.blankMetadata();
      this.sharing = original
        ? documentVisibility(original)
        : { staff: true, family: false, inspector: false };
      this.pending = null;
      this.pendingFile = null;
      this.existingId = original?.id ?? '';
      this.baseline = this.draftState();
      this.editing.set(true);
    } catch (e) {
      if (request === this.editorRequest && scope === this.api.scope())
        this.error.set(e instanceof Error ? e.message : 'Could not load document information.');
    }
  }
  private draftState(): string {
    return JSON.stringify([this.metadata, this.sharing, this.pending]);
  }
  protected close(): void {
    if (this.canLeave()) {
      this.editing.set(false);
      this.owner = null;
      this.pending = null;
      this.pendingFile = null;
      this.editorRequest++;
      this.error.set('');
    }
  }
  protected async save(): Promise<void> {
    const owner = this.owner,
      scope = this.api.scope();
    if (!owner || owner.client !== this.id() || owner.company !== this.api.records.companyId()) {
      this.error.set('The service user or workspace changed. Reopen the document.');
      return;
    }
    if (this.busy()) return;
    const validation = documentMetadataError(this.metadata);
    if (validation) {
      this.error.set(validation);
      return;
    }
    if (!this.existingId && !this.pendingFile) {
      this.error.set('Choose a document to upload.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.fieldErrors.set({});
    try {
      const row = await this.api.save(
        owner.client,
        this.metadata,
        this.sharing,
        this.original,
        this.pendingFile,
      );
      if (this.destroyed || owner !== this.owner || scope !== this.api.scope()) return;
      this.editing.set(false);
      this.owner = null;
      this.pending = null;
      this.pendingFile = null;
      this.original = null;
      this.group.set('All Documents');
      this.audience.set('');
      this.page.set(1);
      this.selectedId.set(row.id);
      this.panelOpen.set(true);
      this.notice.set(
        row.state === 'quarantined'
          ? 'Document uploaded. Security scanning is pending.'
          : 'Document saved.',
      );
      await this.load();
    } catch (e) {
      if (owner === this.owner && scope === this.api.scope()) {
        this.fieldErrors.set((e as { fieldErrors?: Record<string, string[]> }).fieldErrors ?? {});
        this.error.set(e instanceof Error ? e.message : 'Could not save document.');
      }
    } finally {
      if (scope === this.api.scope()) this.busy.set(false);
    }
  }
  protected async upload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    input.value = '';
    if (!file || this.busy() || !this.owner) return;
    const owner = this.owner;
    this.busy.set(true);
    this.error.set('');
    try {
      const mime = (
        {
          pdf: 'application/pdf',
          docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          png: 'image/png',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
        } as Record<string, string>
      )[file.name.split('.').pop()?.toLowerCase() ?? ''];
      if (!mime || !file.size || file.size > 5 * 1024 * 1024 || (file.type && file.type !== mime))
        throw new Error('Choose a PDF, DOCX, PNG or JPEG file up to 5 MB.');
      const bytes = new Uint8Array(await file.arrayBuffer());
      const valid =
        mime === 'application/pdf'
          ? new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-'
          : mime === 'image/png'
            ? [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)
            : mime === 'image/jpeg'
              ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
              : bytes[0] === 80 && bytes[1] === 75 && bytes[2] === 3 && bytes[3] === 4;
      if (!valid) throw new Error('The file content does not match its document type.');
      if (
        this.destroyed ||
        owner !== this.owner ||
        owner.client !== this.id() ||
        owner.company !== this.api.records.companyId()
      )
        return;
      this.pendingFile = file;
      this.pending = {
        id: crypto.randomUUID(),
        name: file.name,
        category: this.metadata.category,
        version: this.metadata.version,
        size: file.size,
        mime,
        data: '',
        at: '',
        by: '',
      };
      this.metadata.name = file.name;
    } catch (e) {
      if (!this.destroyed && owner === this.owner)
        this.error.set(e instanceof Error ? e.message : 'Could not read the document.');
    } finally {
      if (!this.destroyed && owner === this.owner) this.busy.set(false);
    }
  }
  protected async remove(d: CareDocument): Promise<void> {
    if (
      this.busy() ||
      !this.api.can('archive') ||
      !window.confirm(`Delete “${d.name}” from active documents? Its history will be retained.`)
    )
      return;
    const scope = this.api.scope(),
      id = this.id();
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.remove(id, d);
      if (scope === this.api.scope() && id === this.id()) {
        this.notice.set('Document removed from active documents.');
        await this.load();
      }
    } catch (e) {
      if (scope === this.api.scope() && id === this.id())
        this.error.set(e instanceof Error ? e.message : 'Could not remove document.');
    } finally {
      if (scope === this.api.scope() && id === this.id()) this.busy.set(false);
    }
  }
  protected closePreview(): void {
    this.previewRequest++;
    this.preview.set(null);
    this.previewDocumentId = '';
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = '';
  }
  protected async view(d: CareDocument, download = false): Promise<void> {
    const client = this.id(),
      company = this.api.records.companyId();
    const request = ++this.previewRequest;
    if (!this.api.can('export')) return;
    const current = this.documents().find((item) => item.id === d.id);
    if (!current) {
      this.error.set('This document is no longer available.');
      return;
    }
    this.error.set('');
    try {
      const blob = await this.api.content(client, current);
      if (
        this.destroyed ||
        request !== this.previewRequest ||
        client !== this.id() ||
        company !== this.api.records.companyId() ||
        !this.documents().some((item) => item.id === current.id) ||
        !this.api.can('export')
      )
        return;
      const previewable = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(
        current.mime,
      );
      if (!download && !previewable) {
        this.error.set(
          'Preview is available for PDF and image files. Use Download to open this document.',
        );
        return;
      }
      const url = URL.createObjectURL(new Blob([blob], { type: current.mime }));
      if (download) {
        const a = document.createElement('a');
        a.href = url;
        a.download = current.filename || current.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        this.closePreview();
        this.previewUrl = url;
        this.previewDocumentId = current.id;
        this.preview.set({
          name: current.name,
          mime: current.mime,
          url,
          resource: this.sanitizer.bypassSecurityTrustResourceUrl(url),
        });
      }
    } catch (e) {
      if (
        !this.destroyed &&
        request === this.previewRequest &&
        client === this.id() &&
        company === this.api.records.companyId()
      )
        this.error.set(e instanceof Error ? e.message : 'Could not open the document.');
    }
  }
  protected documentDate(value?: string): string {
    return value && Number.isFinite(Date.parse(value))
      ? new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Europe/London',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).format(new Date(value))
      : 'Not recorded';
  }
  protected size(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${Math.ceil(bytes / 1024)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.preview()) this.closePreview();
    else if (this.editing()) this.close();
  }
  canLeave(): boolean {
    if (this.busy()) return false;
    return (
      !this.editing() ||
      (!this.busy() && this.draftState() === this.baseline) ||
      window.confirm('Discard the unsaved document changes?')
    );
  }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent): void {
    if (this.editing() && (this.busy() || this.draftState() !== this.baseline)) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
