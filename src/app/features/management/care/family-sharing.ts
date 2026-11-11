import {
  Component,
  ChangeDetectorRef,
  DestroyRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { A11yModule } from '@angular/cdk/a11y';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { ModuleDesign } from '../shared/module-design';
import { CareHeader } from './care-header';
import { FamilySharingApi } from './family-sharing-api.service';
import { FAMILY_SCOPES, FAMILY_UPDATE_CATEGORIES } from './care.models';
import type {
  FamilyAccessRead,
  FamilyAccessWrite,
  FamilyPublicationOptions,
} from './family-sharing.generated';

@Component({
  selector: 'cv-family-sharing',
  imports: [
    FormsModule,
    RouterLink,
    A11yModule,
    MatSelectModule,
    CvSelect,
    ModuleDesign,
    CareHeader,
  ],
  providers: [FamilySharingApi],
  host: { class: 'module-page operations-page' },
  templateUrl: './family-sharing.html',
  styleUrls: [
    './service-user-spacing.css',
    './care-shared.css',
    './care-controls.css',
    './visit-notes.css',
    '../clients/service-user-dialogs.css',
    './family-sharing-admin.css',
  ],
})
export class FamilySharing {
  protected readonly api = inject(FamilySharingApi);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  protected readonly id = computed(() => this.params().get('id') ?? '');
  protected readonly client = computed(() =>
    this.api.can('read') && this.api.records.selected()?.id === this.id()
      ? this.api.records.selected()
      : null,
  );
  protected readonly scopes = FAMILY_SCOPES;
  protected readonly categories = FAMILY_UPDATE_CATEGORIES;
  protected readonly publicationOpen = signal(false);
  protected readonly publicationOptions = signal<FamilyPublicationOptions | null>(null);
  protected publicationKind: 'plan' | 'invoice' = 'plan';
  protected invoiceId = '';
  protected publicationReason = '';
  protected publicationConfirmed = false;
  protected readonly editing = signal(false);
  protected readonly busy = signal(false);
  protected readonly printing = signal(false);
  protected readonly savingAccess = signal<string | null>(null);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly fieldErrors = signal<Record<string, string[]>>({});
  protected access = this.blank();
  protected updateDate = '';
  protected updateCategory = 'General';
  protected updateText = '';
  protected messageAccess = '';
  protected messageText = '';
  protected readonly printed = signal<FamilyAccessRead[] | null>(null);
  protected readonly rows = computed(() => this.printed() ?? this.api.access());
  protected original: FamilyAccessRead | null = null;
  private owner: { id: string; scope: string } | null = null;
  private baseline = '';
  private request = 0;
  private destroyed = false;
  private blank(): FamilyAccessWrite {
    return { name: '', email: '', relationship: '', status: 'Pending', scopes: [] };
  }
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.request++;
    });
    effect(() => {
      const id = this.id(),
        scope = this.api.scope();
      untracked(() => {
        this.request++;
        this.reset();
        this.updateText = '';
        this.messageText = '';
        this.messageAccess = '';
        this.updateDate = '';
        this.error.set('');
        this.notice.set('');
        this.printed.set(null);
        this.savingAccess.set(null);
        this.printing.set(false);
        if (id && this.api.can('read')) {
          void this.api.records.detail(id);
          void this.api.load(id);
        }
      });
    });
    effect(() => {
      const today = this.api.workspace()?.today;
      if (today)
        untracked(() => {
          if (!this.updateDate) this.updateDate = today;
        });
    });
    effect(() => {
      if (this.api.denied())
        untracked(() => {
          this.request++;
          this.reset();
          this.updateText = '';
          this.messageText = '';
          this.printed.set(null);
        });
    });
  }
  private reset() {
    this.publicationOpen.set(false);
    this.publicationOptions.set(null);
    this.publicationReason = '';
    this.publicationConfirmed = false;
    this.editing.set(false);
    this.busy.set(false);
    this.owner = null;
    this.original = null;
    this.access = this.blank();
    this.baseline = '';
    this.fieldErrors.set({});
  }
  private current(id: string, scope: string) {
    return !this.destroyed && id === this.id() && scope === this.api.scope();
  }
  canLeave() {
    return (
      !this.busy() &&
      !this.savingAccess() &&
      !this.printing() &&
      (((!this.publicationOpen() || !this.publicationReason) &&
        (!this.editing() || JSON.stringify(this.access) === this.baseline) &&
        !this.updateText &&
        !this.messageText) ||
        window.confirm('Discard unsaved family sharing changes?'))
    );
  }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent) {
    if (
      this.busy() ||
      this.savingAccess() ||
      this.printing() ||
      (this.publicationOpen() && !!this.publicationReason) ||
      this.updateText ||
      this.messageText ||
      (this.editing() && JSON.stringify(this.access) !== this.baseline)
    ) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
  protected close() {
    if (this.busy()) return;
    if (
      JSON.stringify(this.access) !== this.baseline &&
      !window.confirm('Discard unsaved family access changes?')
    )
      return;
    this.request++;
    this.reset();
    this.error.set('');
  }
  protected async open(row?: FamilyAccessRead) {
    if (
      !this.api.can(row ? 'edit' : 'create') ||
      this.busy() ||
      this.savingAccess() ||
      this.printing()
    )
      return;
    const id = this.id(),
      scope = this.api.scope(),
      token = ++this.request;
    this.error.set('');
    try {
      const fresh = row
        ? ((await this.api.detail(id, 'access', row.id)) as FamilyAccessRead)
        : null;
      if (!this.current(id, scope) || token !== this.request) return;
      this.original = fresh;
      this.owner = { id, scope };
      this.access = fresh
        ? {
            name: fresh.name,
            email: fresh.email,
            relationship: fresh.relationship,
            status: fresh.status as FamilyAccessWrite['status'],
            scopes: [...fresh.scopes] as FamilyAccessWrite['scopes'],
          }
        : this.blank();
      this.baseline = JSON.stringify(this.access);
      this.fieldErrors.set({});
      this.editing.set(true);
    } catch (e) {
      if (this.current(id, scope)) this.fail(e);
    }
  }
  protected toggleDraft(scope: FamilyAccessWrite['scopes'][number]) {
    this.access.scopes = this.access.scopes.includes(scope)
      ? this.access.scopes.filter((s) => s !== scope)
      : [...this.access.scopes, scope];
  }
  private fail(e: unknown) {
    this.error.set(e instanceof Error ? e.message : 'Family sharing could not be saved.');
    this.fieldErrors.set((e as { field_errors?: Record<string, string[]> }).field_errors ?? {});
  }
  protected async save() {
    const owner = this.owner;
    if (!owner || !this.current(owner.id, owner.scope) || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.fieldErrors.set({});
    try {
      await this.api.save(owner.id, 'access', structuredClone(this.access), this.original);
      if (!this.current(owner.id, owner.scope)) return;
      this.reset();
      this.busy.set(true);
      this.notice.set('Family access saved.');
      await this.api.load(owner.id);
    } catch (e) {
      if (this.current(owner.id, owner.scope)) this.fail(e);
    } finally {
      if (this.current(owner.id, owner.scope)) this.busy.set(false);
    }
  }
  protected async toggle(row: FamilyAccessRead, scopeName: string) {
    if (!this.api.can('edit') || this.savingAccess() || this.busy() || this.printing()) return;
    const id = this.id(),
      scope = this.api.scope();
    this.savingAccess.set(row.id);
    this.error.set('');
    this.notice.set('');
    try {
      await this.api.permission(id, row, scopeName, !row.scopes.includes(scopeName));
      if (this.current(id, scope)) this.notice.set('Family sharing permission saved.');
    } catch (e) {
      if (this.current(id, scope)) {
        this.fail(e);
        await this.api.load(id);
      }
    } finally {
      if (this.current(id, scope)) this.savingAccess.set(null);
    }
  }
  protected async shareUpdate() {
    if (!this.api.can('create') || this.busy()) return;
    const id = this.id(),
      scope = this.api.scope();
    this.busy.set(true);
    this.error.set('');
    this.fieldErrors.set({});
    try {
      await this.api.save(
        id,
        'updates',
        {
          date: this.updateDate,
          category: this.updateCategory as 'General',
          text: this.updateText,
        },
        null,
      );
      if (!this.current(id, scope)) return;
      this.updateText = '';
      this.notice.set('Approved update shared with accounts that have Notes permission.');
      await this.api.load(id);
    } catch (e) {
      if (this.current(id, scope)) this.fail(e);
    } finally {
      if (this.current(id, scope)) this.busy.set(false);
    }
  }
  protected async sendMessage() {
    if (!this.api.can('create') || this.busy()) return;
    const id = this.id(),
      scope = this.api.scope();
    this.busy.set(true);
    this.error.set('');
    this.fieldErrors.set({});
    try {
      await this.api.save(
        id,
        'messages',
        { accessId: this.messageAccess, text: this.messageText },
        null,
      );
      if (!this.current(id, scope)) return;
      this.messageText = '';
      this.notice.set('Message sent inside CareVerity.');
      await this.api.load(id);
    } catch (e) {
      if (this.current(id, scope)) this.fail(e);
    } finally {
      if (this.current(id, scope)) this.busy.set(false);
    }
  }
  protected canPublish(kind: 'plan' | 'invoice') {
    return (
      this.api.can('publish') &&
      this.api.records.access.can(
        kind === 'plan' ? 'care' : 'finance',
        kind === 'plan' ? 'planning' : 'clients',
        'approve',
      ) &&
      this.api.records.access.can(
        kind === 'plan' ? 'care' : 'finance',
        kind === 'plan' ? 'planning' : 'clients',
        'read',
      )
    );
  }
  protected selectedInvoice() {
    return this.publicationOptions()?.invoices.find((r) => r.invoiceId === this.invoiceId);
  }
  protected publicationSource() {
    const options = this.publicationOptions();
    return this.publicationKind === 'plan'
      ? options?.plan
      : options?.invoices.find((r) => r.invoiceId === this.invoiceId);
  }
  protected originalPublication() {
    return (
      this.publicationOptions()?.publications.find(
        (r) =>
          r.kind === this.publicationKind &&
          (this.publicationKind === 'plan' || r.invoiceId === this.invoiceId),
      ) ?? null
    );
  }
  protected async openPublication(kind: 'plan' | 'invoice') {
    if (!this.canPublish(kind) || this.busy() || this.savingAccess() || this.printing()) return;
    const id = this.id(),
      scope = this.api.scope(),
      token = ++this.request;
    this.busy.set(true);
    this.error.set('');
    try {
      const options = await this.api.publicationOptions(id);
      if (!this.current(id, scope) || token !== this.request) return;
      this.publicationKind = kind;
      this.publicationOptions.set(options);
      this.invoiceId = options.invoices[0]?.invoiceId ?? '';
      this.publicationReason = '';
      this.publicationConfirmed = false;
      this.owner = { id, scope };
      this.publicationOpen.set(true);
    } catch (e) {
      if (this.current(id, scope)) this.fail(e);
    } finally {
      if (this.current(id, scope)) this.busy.set(false);
    }
  }
  protected closePublication() {
    if (this.busy()) return;
    if (this.publicationReason && !window.confirm('Discard the publication changes?')) return;
    this.publicationOpen.set(false);
    this.publicationOptions.set(null);
    this.publicationReason = '';
    this.publicationConfirmed = false;
    this.owner = null;
    this.error.set('');
  }
  protected async publish() {
    const owner = this.owner,
      source = this.publicationSource();
    if (
      !owner ||
      !this.current(owner.id, owner.scope) ||
      !source ||
      !source.eligible ||
      !this.publicationConfirmed ||
      !this.publicationReason.trim() ||
      this.busy()
    )
      return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.publish(
        owner.id,
        {
          kind: this.publicationKind,
          invoiceId: this.publicationKind === 'invoice' ? source.invoiceId : null,
          sourceDigest: source.sourceDigest,
          reason: this.publicationReason,
        },
        this.originalPublication(),
      );
      if (!this.current(owner.id, owner.scope)) return;
      this.publicationReason = '';
      this.busy.set(false);
      this.closePublication();
      this.notice.set('Reviewed information published to permitted family accounts.');
    } catch (e) {
      if (this.current(owner.id, owner.scope)) this.fail(e);
    } finally {
      if (this.current(owner.id, owner.scope)) this.busy.set(false);
    }
  }
  protected async unpublish() {
    const owner = this.owner,
      row = this.originalPublication();
    if (
      !owner ||
      !row ||
      !this.current(owner.id, owner.scope) ||
      !this.publicationReason.trim() ||
      this.busy()
    )
      return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.unpublish(owner.id, row, this.publicationReason);
      if (!this.current(owner.id, owner.scope)) return;
      this.publicationReason = '';
      this.busy.set(false);
      this.closePublication();
      this.notice.set('Publication withdrawn.');
    } catch (e) {
      if (this.current(owner.id, owner.scope)) this.fail(e);
    } finally {
      if (this.current(owner.id, owner.scope)) this.busy.set(false);
    }
  }
  protected async print() {
    if (!this.api.can('export') || this.printing() || this.busy() || this.savingAccess()) return;
    const id = this.id(),
      scope = this.api.scope();
    this.printing.set(true);
    this.error.set('');
    try {
      const rows = await this.api.pages<FamilyAccessRead>(id, 'access', true);
      if (!this.current(id, scope)) return;
      this.printed.set(rows);
      this.cdr.detectChanges();
      window.print();
    } catch (e) {
      if (this.current(id, scope)) this.fail(e);
    } finally {
      if (this.current(id, scope)) {
        this.printed.set(null);
        this.printing.set(false);
      }
    }
  }
}
