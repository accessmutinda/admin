import {
  Component,
  DestroyRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
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
import { CareService } from './care.service';
import { CareDocument } from './care.models';
import { VisitNoteAudience } from './visit-notes.models';
import {
  DOCUMENT_GROUPS,
  DOCUMENT_TYPES,
  DocumentMetadata,
  documentGroup,
  documentMetadata,
  documentVisibility,
  safeDocumentSource,
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
  host: { class: 'module-page operations-page documents-page' },
  templateUrl: './care-documents.html',
  styleUrls: [
    './service-user-spacing.css',
    './care-shared.css',
    './care-controls.css',
    './visit-notes.css',
    './care-documents.css',
  ],
})
export class CareDocuments {
  protected readonly care = inject(CareService);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  protected readonly id = computed(() => this.params().get('id') ?? '');
  protected readonly client = computed(() => this.care.client(this.id()));
  protected readonly documents = computed(() =>
    this.care
      .documents(this.id())
      .slice()
      .sort((a, b) => b.at.localeCompare(a.at)),
  );
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
  protected readonly error = signal('');
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
  private baseline = '';
  private destroyed = false;
  private previewUrl = '';
  private previewRequest = 0;
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.closePreview();
    });
    effect(() => {
      this.id();
      this.care.store.companyId();
      this.group.set('All Documents');
      this.audience.set('');
      this.page.set(1);
      this.selectedId.set('');
      this.panelOpen.set(true);
      this.closePreview();
    });
    effect(() => {
      const p = this.preview();
      if (p && !this.documents().some((d) => d.id === this.previewDocumentId)) this.closePreview();
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
  protected categoryCount(group: string): number {
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
  protected toggle(d: CareDocument, a: VisitNoteAudience): void {
    const error = this.care.setDocumentVisibility(
      this.id(),
      this.care.store.companyId(),
      d.id,
      a,
      !documentVisibility(d)[a],
      d.revision ?? 1,
    );
    this.error.set(error ?? '');
    if (!error) this.notice.set('Document visibility updated.');
  }
  protected open(d?: CareDocument): void {
    if (!this.care.canManageDocuments()) return;
    this.owner = {
      client: this.id(),
      company: this.care.store.companyId(),
      revision: d ? (d.revision ?? 1) : undefined,
    };
    this.metadata = d ? documentMetadata(d) : this.blankMetadata();
    this.sharing = d ? documentVisibility(d) : { staff: true, family: false, inspector: true };
    this.pending = null;
    this.existingId = d?.id ?? '';
    this.baseline = this.draftState();
    this.error.set('');
    this.editing.set(true);
  }
  private draftState(): string {
    return JSON.stringify([this.metadata, this.sharing, this.pending]);
  }
  protected close(): void {
    if (this.canLeave()) {
      this.editing.set(false);
      this.owner = null;
      this.pending = null;
      this.error.set('');
    }
  }
  protected save(): void {
    const owner = this.owner;
    if (!owner || owner.client !== this.id() || owner.company !== this.care.store.companyId()) {
      this.error.set('The service user or workspace changed. Reopen the document before saving.');
      return;
    }
    if (this.busy()) return;
    if (!this.existingId && !this.pending) {
      this.error.set('Choose a document to upload.');
      return;
    }
    const error = this.existingId
      ? this.care.updateDocument(
          owner.client,
          owner.company,
          this.existingId,
          this.metadata,
          owner.revision!,
        )
      : this.care.saveDocument(owner.client, owner.company, {
          ...this.pending!,
          ...this.metadata,
          visibility: { ...this.sharing },
        });
    this.error.set(error ?? '');
    if (error) return;
    const id = this.existingId || this.pending!.id;
    this.group.set('All Documents');
    this.audience.set('');
    this.page.set(
      Math.floor(
        Math.max(
          0,
          this.documents().findIndex((d) => d.id === id),
        ) / 8,
      ) + 1,
    );
    this.selectedId.set(id);
    this.panelOpen.set(true);
    this.editing.set(false);
    this.owner = null;
    this.pending = null;
    this.notice.set('Document saved.');
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
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Could not read this file.'));
        reader.readAsDataURL(file);
      });
      if (
        this.destroyed ||
        owner !== this.owner ||
        owner.client !== this.id() ||
        owner.company !== this.care.store.companyId()
      )
        return;
      this.pending = {
        id: crypto.randomUUID(),
        name: file.name,
        category: this.metadata.category,
        version: this.metadata.version,
        size: file.size,
        mime,
        data,
        at: '',
        by: '',
      };
      this.metadata.name = file.name;
    } catch (e) {
      if (!this.destroyed && owner === this.owner)
        this.error.set(e instanceof Error ? e.message : 'Could not read the document.');
    } finally {
      if (!this.destroyed) this.busy.set(false);
    }
  }
  protected remove(d: CareDocument): void {
    if (
      !this.care.canManageDocuments() ||
      !window.confirm(
        `Delete “${d.name}” from active documents? It will no longer be available in the portals.`,
      )
    )
      return;
    const error = this.care.removeDocument(
      this.id(),
      this.care.store.companyId(),
      d.id,
      d.revision ?? 1,
    );
    this.error.set(error ?? '');
    if (!error) this.notice.set('Document removed from active documents.');
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
      company = this.care.store.companyId();
    const request = ++this.previewRequest;
    if (download && !this.care.rota.can('export')) return;
    const current = this.care.documents(client).find((item) => item.id === d.id);
    if (!current || !safeDocumentSource(current.data)) {
      this.error.set('This document is no longer available.');
      return;
    }
    this.error.set('');
    try {
      const response = await fetch(current.data);
      if (!response.ok) throw new Error('The document could not be loaded.');
      const blob = await response.blob();
      if (
        this.destroyed ||
        request !== this.previewRequest ||
        client !== this.id() ||
        company !== this.care.store.companyId() ||
        !this.care.documents(client).some((item) => item.id === current.id) ||
        (download && !this.care.rota.can('export'))
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
        a.download = current.name;
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
        company === this.care.store.companyId()
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
  protected ring(a: VisitNoteAudience): number {
    return this.documents().length ? (this.counts()[a] / this.documents().length) * 100 : 0;
  }
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.preview()) this.closePreview();
    else if (this.editing()) this.close();
  }
  canLeave(): boolean {
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
