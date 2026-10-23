import { londonDate } from '../rota/rota.models';
import { FAMILY_UPDATE_CATEGORIES, FamilyUpdate } from './care.models';
import { ukStamp } from './care.models';
import { HostListener, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { A11yModule } from '@angular/cdk/a11y';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { ModuleDesign } from '../shared/module-design';
import { CareHeader } from './care-header';
import { CareService } from './care.service';
import { CareContact, CareDocument, FAMILY_SCOPES, FamilyAccess, csv } from './care.models';
@Component({
  selector: 'cv-care-records',
  imports: [
    ModuleDesign,
    CareHeader,
    FormsModule,
    RouterLink,
    A11yModule,
    MatSelectModule,
    CvSelect,
  ],
  host: { class: 'module-page operations-page' },
  templateUrl: './care-records.html',
  styleUrls: ['./care-shared.css', './care-controls.css'],
})
export class CareRecords {
  protected readonly ukStamp = ukStamp;
  protected readonly care = inject(CareService);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly routeData = toSignal(this.route.data, {
    initialValue: this.route.snapshot.data,
  });
  protected readonly id = computed(() => this.params().get('id') ?? '');
  protected readonly section = computed(() => this.routeData()['careSection'] as string);
  protected readonly client = computed(() => this.care.client(this.id()));
  protected readonly title = computed(
    () =>
      ({
        contacts: 'Contacts',
        documents: 'Documents',
        family: 'Family Portal Access',
        audit: 'Audit Trail',
      })[this.section()] ?? 'Care record',
  );
  protected readonly scopes = FAMILY_SCOPES;
  protected readonly modal = signal('');
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly busy = signal(false);
  protected readonly pendingDocument = signal<CareDocument | null>(null);
  private uploadWorkspace = '';
  private uploadClient = '';
  protected readonly query = signal('');
  protected readonly audit = computed(() =>
    [...(this.client()?.file?.audit ?? [])]
      .reverse()
      .filter((a) =>
        `${a.by} ${a.action} ${a.detail}`.toLowerCase().includes(this.query().toLowerCase()),
      ),
  );
  protected contact: CareContact = this.blankContact();
  protected access: FamilyAccess = this.blankAccess();
  protected category = 'Care plan';
  protected documentVersion = '1';
  protected readonly updateCategories = FAMILY_UPDATE_CATEGORIES;
  protected updateDate = londonDate();
  protected updateCategory: FamilyUpdate['category'] = 'General';
  protected updateText = '';
  private updateOwner: { id: string; workspace: string } | null = null;
  protected editUpdate(text: string): void {
    this.updateOwner ??= { id: this.id(), workspace: this.care.store.companyId() };
    this.updateText = text;
  }
  protected shareUpdate(): void {
    const owner = this.updateOwner;
    if (!owner || owner.id !== this.id() || owner.workspace !== this.care.store.companyId()) {
      this.error.set('The selected service user or workspace changed. Reopen the update.');
      return;
    }
    const error = this.care.shareFamilyUpdate(owner.id, owner.workspace, {
      date: this.updateDate,
      category: this.updateCategory,
      text: this.updateText,
    });
    if (error) {
      this.error.set(error);
      return;
    }
    this.updateText = '';
    this.updateOwner = null;
    this.error.set('');
    this.notice.set('Approved update shared with family accounts that have Notes permission.');
  }
  protected messageText = '';
  protected messageAccess = '';
  private workspace = '';
  private sourceId = '';
  private version = '';
  private destroyed = false;
  constructor() {
    inject(DestroyRef).onDestroy(() => (this.destroyed = true));
  }
  private blankContact(): CareContact {
    return {
      id: crypto.randomUUID(),
      name: '',
      relationship: '',
      phone: '',
      email: '',
      type: 'Family',
      nextOfKin: false,
    };
  }
  private blankAccess(): FamilyAccess {
    return {
      id: crypto.randomUUID(),
      name: '',
      email: '',
      relationship: '',
      status: 'Pending',
      scopes: [],
      at: '',
    };
  }
  @HostListener('window:beforeunload', ['$event'])
  protected beforeUnload(event: BeforeUnloadEvent): void {
    if (!!this.modal() || this.busy() || !!this.pendingDocument() || !!this.updateText) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
  canLeave(): boolean {
    return (
      (!this.modal() && !this.busy() && !this.pendingDocument() && !this.updateText) ||
      window.confirm('Discard the unsaved care record?')
    );
  }
  protected open(kind: string, value?: CareContact | FamilyAccess): void {
    this.workspace = this.care.store.companyId();
    this.sourceId = this.id();
    this.version = this.client()?.file?.updatedAt ?? '';
    this.error.set('');
    this.contact =
      kind === 'contact' && value ? structuredClone(value as CareContact) : this.blankContact();
    this.access =
      kind === 'access' && value ? structuredClone(value as FamilyAccess) : this.blankAccess();
    this.modal.set(kind);
  }
  protected close(): void {
    if (this.canLeave()) {
      this.modal.set('');
      this.error.set('');
    }
  }
  protected toggleScope(scope: (typeof FAMILY_SCOPES)[number]): void {
    this.access.scopes = this.access.scopes.includes(scope)
      ? this.access.scopes.filter((s) => s !== scope)
      : [...this.access.scopes, scope];
  }
  protected save(): void {
    if (this.sourceId !== this.id()) {
      this.error.set('Selected service user changed. Reopen this editor.');
      return;
    }
    const error =
      this.modal() === 'contact'
        ? this.care.saveContact(this.id(), this.workspace, this.contact, this.version)
        : this.care.saveAccess(this.id(), this.workspace, this.access, this.version);
    if (error) {
      this.error.set(error);
      return;
    }
    this.modal.set('');
    this.notice.set('Care record saved.');
  }
  protected async upload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    const workspace = this.care.store.companyId(),
      id = this.id();
    this.error.set('');
    const types: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
    };
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (
      !types[extension] ||
      file.size === 0 ||
      file.size > 5 * 1024 * 1024 ||
      (file.type && file.type !== types[extension])
    ) {
      this.error.set('Use a nonempty PDF, DOCX, PNG or JPEG up to 5 MB.');
      return;
    }
    this.busy.set(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const valid =
        extension === 'pdf'
          ? new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-'
          : extension === 'docx'
            ? bytes[0] === 0x50 && bytes[1] === 0x4b
            : extension === 'png'
              ? bytes[0] === 0x89 && bytes[1] === 0x50
              : bytes[0] === 0xff && bytes[1] === 0xd8;
      if (!valid) throw new Error('The file content does not match its extension.');
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Could not read the file.'));
        reader.readAsDataURL(file);
      });
      if (this.destroyed) return;
      if (id !== this.id() || workspace !== this.care.store.companyId())
        throw new Error('The selected record changed. Upload the file again.');
      const document: CareDocument = {
        id: crypto.randomUUID(),
        name: file.name,
        category: this.category,
        version: this.documentVersion,
        data,
        mime: types[extension],
        size: file.size,
        at: new Date().toISOString(),
        by: this.care.auth.currentUser()!.name,
      };
      this.pendingDocument.set(document);
      this.uploadWorkspace = workspace;
      this.uploadClient = id;
      this.savePendingDocument();
    } catch (e) {
      if (!this.destroyed)
        this.error.set(e instanceof Error ? e.message : 'Could not upload document.');
    } finally {
      if (!this.destroyed) this.busy.set(false);
    }
  }
  protected savePendingDocument(): void {
    const document = this.pendingDocument();
    if (!document) return;
    if (this.uploadClient !== this.id()) {
      this.error.set('Selected service user changed. Reopen the uploader.');
      return;
    }
    const error = this.care.saveDocument(this.uploadClient, this.uploadWorkspace, document);
    if (error) {
      this.error.set(error);
      return;
    }
    this.pendingDocument.set(null);
    this.error.set('');
    this.notice.set('Document saved on this device.');
  }
  protected toggleAccess(access: FamilyAccess, scope: (typeof FAMILY_SCOPES)[number]): void {
    const next = {
      ...access,
      scopes: access.scopes.includes(scope)
        ? access.scopes.filter((s) => s !== scope)
        : [...access.scopes, scope],
    };
    const error = this.care.saveAccess(
      this.id(),
      this.care.store.companyId(),
      next,
      this.client()?.file?.updatedAt ?? '',
    );
    if (error) this.error.set(error);
    else {
      this.error.set('');
      this.notice.set('Family sharing permission updated.');
    }
  }
  protected download(document: CareDocument): void {
    if (!this.care.rota.can('export')) return;
    const anchor = window.document.createElement('a');
    anchor.href = document.data;
    anchor.download = document.name;
    anchor.click();
  }
  protected share(document: CareDocument): void {
    const error = this.care.shareDocument(
      this.id(),
      this.care.store.companyId(),
      document.id,
      !document.familyShared,
    );
    if (error) this.error.set(error);
    else
      this.notice.set(
        document.familyShared
          ? 'Family sharing removed.'
          : 'Approved for family accounts with the matching document or photo permission.',
      );
  }
  protected remove(document: CareDocument): void {
    if (!window.confirm(`Remove ${document.name}?`)) return;
    const error = this.care.removeDocument(this.id(), this.care.store.companyId(), document.id);
    if (error) this.error.set(error);
  }
  protected sendMessage(): void {
    const error = this.care.message(
      this.id(),
      this.care.store.companyId(),
      this.messageAccess,
      this.messageText,
      false,
    );
    if (error) {
      this.error.set(error);
      return;
    }
    this.messageText = '';
    this.notice.set('Message recorded locally. External delivery is not configured.');
  }
  protected export(): void {
    if (this.care.rota.can('export'))
      this.care.store.download(
        'client-audit.csv',
        csv([
          ['Date', 'User', 'Action', 'Detail'],
          ...this.audit().map((a) => [a.at, a.by, a.action, a.detail]),
        ]),
        'text/csv',
      );
  }
}
