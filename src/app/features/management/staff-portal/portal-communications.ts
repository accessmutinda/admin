import {
  Component,
  computed,
  inject,
  signal,
  effect,
  untracked,
  DestroyRef,
  TemplateRef,
  viewChild,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CvSelect } from '../../../shared/ui/select';
import { ApiError } from '../../../core/auth/auth-api';
import { PortalEvidence } from './portal-evidence';
import { ProfessionalApi } from './professional-api.service';
import type {
  ProfessionalRead,
  ProfessionalContactRead,
  ProfessionalWorkspace,
  ProfessionalWrite,
  ProfessionalContactWrite,
} from './professional.generated';
import { JournalAttachment } from '../journal/journal.models';

type Draft = ProfessionalWrite & { id: string; attachments: JournalAttachment[] };
@Component({
  selector: 'cv-portal-communications',
  imports: [
    DatePipe,
    NgTemplateOutlet,
    FormsModule,
    MatSelectModule,
    CvSelect,
    PortalEvidence,
    MatDialogModule,
  ],
  providers: [ProfessionalApi],
  templateUrl: './portal-communications.html',
  styleUrls: ['./portal-ui.css', './portal-forms.css', './portal-communications.css'],
})
export class PortalCommunications {
  protected readonly api = inject(ProfessionalApi);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  protected readonly id = computed(() => this.params().get('id') ?? '');
  protected readonly data = signal<ProfessionalWorkspace | null>(null);
  protected readonly query = signal('');
  protected readonly type = signal('All');
  protected readonly period = signal('All time');
  protected readonly addingContact = signal(false);
  protected readonly uploading = signal(false);
  protected readonly saving = signal(false);
  protected readonly fetching = signal(false);
  protected readonly loading = signal(false);
  readonly printBusy = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly fields = signal<Record<string, string[]>>({});
  protected readonly types = [
    'GP note',
    'District nurse note',
    'OT request',
    'Social worker email',
    'Hospital communication',
    'Family update',
    'Phone call',
    'Email',
    'Management action',
  ];
  protected readonly records = computed(() => this.data()?.records ?? []);
  protected readonly contacts = computed(() => this.data()?.contacts ?? []);
  protected readonly keyContacts = computed(() =>
    this.contacts().filter((c) => !['Pharmacy', 'Emergency'].includes(c.type)),
  );
  protected record: Draft = this.blankRecord();
  protected contact: ProfessionalContactWrite = this.blankContact();
  private clean = JSON.stringify(this.record);
  private contactClean = JSON.stringify(this.contact);
  protected representativeContact(): boolean {
    return this.originalContact?.source === 'representative';
  }
  private handledRecordKey = '';
  private readonly uploadKeys = new Map<string, string>();
  private original: ProfessionalRead | null = null;
  private originalContact: ProfessionalContactRead | null = null;
  private readonly dialog = inject(MatDialog);
  private readonly cd = inject(ChangeDetectorRef);
  private recordRef: MatDialogRef<unknown> | null = null;
  private contactRef: MatDialogRef<unknown> | null = null;
  protected readonly recordDialogOpen = signal(false);
  protected readonly contactDialogOpen = signal(false);
  private readonly recordPopup = viewChild.required<TemplateRef<unknown>>('recordPopup');
  private readonly contactPopup = viewChild.required<TemplateRef<unknown>>('contactPopup');
  private generation = 0;
  private printEpoch = 0;
  private editorGeneration = 0;
  private contactGeneration = 0;
  private destroyed = false;
  private editorScope = '';
  private editorClient = '';
  private contactScope = '';
  private contactClient = '';
  private intent = '';
  private intentKey = '';
  private contactIntent = '';
  private contactKey = '';
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.generation++;
      this.editorGeneration++;
      this.contactGeneration++;
      this.recordRef?.close();
      this.contactRef?.close();
    });
    effect(() => {
      const id = this.id(),
        scope = this.api.scope();
      untracked(() => {
        this.editorGeneration++;
        this.contactGeneration++;
        this.recordRef?.close();
        this.contactRef?.close();
        this.recordRef = null;
        this.contactRef = null;
        this.recordDialogOpen.set(false);
        this.contactDialogOpen.set(false);
        this.addingContact.set(false);
        this.data.set(null);
        this.uploadKeys.clear();
        this.original = null;
        this.originalContact = null;
        this.saving.set(false);
        this.printEpoch++;
        this.printBusy.set(false);
        this.uploading.set(false);
        this.fetching.set(false);
        this.error.set('');
        this.notice.set('');
        this.resetRecord();
        this.contact = this.blankContact();
        this.contactClean = JSON.stringify(this.contact);
        if (id && this.api.can('read')) void this.reload();
        else {
          this.generation++;
          this.loading.set(false);
        }
      });
    });
    effect((onCleanup) => {
      this.query();
      this.type();
      this.period();
      const id = this.id();
      const scope = this.api.scope();
      const timer = setTimeout(() => {
        if (id && this.api.can('read')) void this.reload();
      }, 200);
      onCleanup(() => clearTimeout(timer));
    });
  }
  protected can(action: string): boolean {
    return this.api.can(action);
  }
  protected canContact(action: string): boolean {
    return this.api.can('read') && this.api.canContact(action);
  }
  protected fieldError(field: string): string {
    return (
      this.fields()[
        (
          { recordStatus: 'status', contact: 'contactId', contactType: 'type' } as Record<
            string,
            string
          >
        )[field] ?? field
      ]?.join(' ') ?? ''
    );
  }
  private message(error: unknown): string {
    if (error instanceof ApiError) {
      this.fields.set(error.fieldErrors);
      return [
        error.message,
        ...Object.entries(error.fieldErrors).map(
          ([field, value]) => `${field}: ${value.join(' ')}`,
        ),
      ].join(' ');
    }
    return error instanceof Error ? error.message : 'The communication could not be saved.';
  }
  private localDate(value: string): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.data()?.timezone ?? 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(value));
    const p = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return `${p['year']}-${p['month']}-${p['day']}T${p['hour']}:${p['minute']}`;
  }
  private blankRecord(): Draft {
    return {
      id: crypto.randomUUID(),
      contactId: '',
      contactSource: 'contact',
      type: 'GP note',
      subject: '',
      details: '',
      at: this.localDate(new Date().toISOString()),
      followUp: null,
      status: 'Open',
      direction: 'Received',
      responseRequired: false,
      responseStatus: '',
      attachment_ids: [],
      attachments: [],
    };
  }
  private resetRecord() {
    this.record = this.blankRecord();
    this.clean = JSON.stringify(this.record);
    this.editorScope = this.api.scope();
    this.editorClient = this.id();
    this.original = null;
  }
  private blankContact(): ProfessionalContactWrite {
    return {
      name: '',
      relationship: '',
      phone: '',
      email: '',
      type: 'Professional',
      nextOfKin: false,
    };
  }
  private filters(): URLSearchParams {
    return new URLSearchParams({ search: this.query(), type: this.type(), period: this.period() });
  }
  async reload(): Promise<void> {
    const generation = ++this.generation,
      id = this.id(),
      scope = this.api.scope();
    const recovering = !this.data();
    this.loading.set(true);
    try {
      const value = await this.api.load(id, this.filters());
      if (
        this.destroyed ||
        generation !== this.generation ||
        id !== this.id() ||
        scope !== this.api.scope()
      )
        return;
      const pristine = JSON.stringify(this.record) === this.clean && !this.recordDialogOpen();
      this.data.set(value);
      if (recovering && !Object.keys(this.fields()).length) this.error.set('');
      if (pristine) this.resetRecord();
      const requested = this.route.snapshot.queryParamMap.get('record');
      if (
        requested &&
        !this.recordDialogOpen() &&
        this.records().some((r) => r.id === requested) &&
        this.handledRecordKey !== scope + id + requested
      ) {
        this.handledRecordKey = scope + id + requested;
        void this.edit(this.records().find((r) => r.id === requested));
      }
    } catch (error) {
      if (generation === this.generation && scope === this.api.scope()) {
        this.data.set(null);
        this.error.set(this.message(error));
      }
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
  async print(): Promise<void> {
    if (!this.can('export') || this.printBusy() || this.saving() || this.uploading()) return;
    const scope = this.api.scope(),
      id = this.id(),
      generation = ++this.generation,
      filters = this.filters(),
      epoch = ++this.printEpoch;
    this.loading.set(false);
    this.printBusy.set(true);
    try {
      const value = await this.api.load(id, filters, true);
      if (this.destroyed || scope !== this.api.scope() || id !== this.id()) return;
      if (generation !== this.generation || filters.toString() !== this.filters().toString())
        throw Error('The communication filters changed. Retry printing.');
      this.data.set(value);
      this.cd.detectChanges();
      window.print();
    } catch (error) {
      if (scope === this.api.scope()) this.error.set(this.message(error));
    } finally {
      if (epoch === this.printEpoch) this.printBusy.set(false);
    }
  }
  protected stamp(value: string, time = false): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: this.data()?.timezone ?? 'UTC',
      ...(time ? { timeStyle: 'short' } : { dateStyle: 'medium' }),
    }).format(new Date(value));
  }
  protected tone(type: string): string {
    return type.includes('GP')
      ? 'purple'
      : type.includes('District')
        ? 'red'
        : type.includes('OT')
          ? 'green'
          : type.includes('Social')
            ? 'amber'
            : type.includes('Family')
              ? 'red'
              : 'blue';
  }
  protected contactName(id: string): string {
    return this.contacts().find((c) => c.id === id)?.name ?? 'Contact unavailable';
  }
  protected lastContact(id: string): string {
    return this.contacts().find((c) => c.id === id)?.lastContact ?? '';
  }
  protected nextContact(id: string): string {
    return this.contacts().find((c) => c.id === id)?.nextFollowUp ?? '';
  }
  protected selectContact(id: string) {
    this.record.contactId = id;
    this.record.contactSource = this.contacts().find((c) => c.id === id)?.source ?? 'contact';
  }
  protected async edit(record?: ProfessionalRead): Promise<void> {
    if (
      this.saving() ||
      this.uploading() ||
      this.fetching() ||
      !(record ? this.can('read') : this.can('create')) ||
      !this.discardRecord()
    )
      return;
    this.error.set('');
    this.fields.set({});
    if (!record) {
      this.resetRecord();
      return;
    }
    const generation = ++this.editorGeneration,
      scope = this.api.scope(),
      id = this.id();
    this.fetching.set(true);
    try {
      const fresh = await this.api.detail(id, record.id);
      if (
        this.destroyed ||
        generation !== this.editorGeneration ||
        scope !== this.api.scope() ||
        id !== this.id()
      )
        return;
      this.original = fresh;
      this.record = {
        id: fresh.id,
        contactId: fresh.contactId,
        contactSource: fresh.contactSource,
        type: fresh.type as Draft['type'],
        subject: fresh.subject,
        details: fresh.details,
        at: this.localDate(fresh.at),
        followUp: fresh.followUp,
        status: fresh.status as Draft['status'],
        direction: fresh.direction as Draft['direction'],
        responseRequired: fresh.responseRequired,
        responseStatus: fresh.responseStatus as Draft['responseStatus'],
        attachment_ids: fresh.attachments.map((f) => f.id),
        attachments: fresh.attachments.map((f) => ({ ...f, content: '' })),
      };
      this.clean = JSON.stringify(this.record);
      this.editorScope = scope;
      this.editorClient = id;
      this.recordDialogOpen.set(true);
      this.recordRef = this.showDialog(
        this.recordPopup(),
        this.can('edit') ? 'Edit communication' : 'View communication',
        () => this.cancelRecord(),
      );
    } catch (error) {
      if (generation === this.editorGeneration) this.error.set(this.message(error));
    } finally {
      if (generation === this.editorGeneration) this.fetching.set(false);
    }
  }
  private showDialog(
    template: TemplateRef<unknown>,
    label: string,
    close: () => void,
  ): MatDialogRef<unknown> {
    const ref = this.dialog.open(template, {
      width: '680px',
      maxWidth: 'calc(100vw - 24px)',
      maxHeight: 'calc(100dvh - 24px)',
      panelClass: 'service-user-dialog',
      backdropClass: 'service-user-dialog-backdrop',
      ariaLabel: label,
      role: 'dialog',
      disableClose: true,
    });
    ref.backdropClick().subscribe(close);
    ref.keydownEvents().subscribe((e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    });
    return ref;
  }
  private discardRecord(): boolean {
    return (
      JSON.stringify(this.record) === this.clean ||
      window.confirm('Discard unsaved communication changes?')
    );
  }
  protected cancelRecord(): void {
    if (this.saving() || this.uploading() || !this.discardRecord()) return;
    this.editorGeneration++;
    this.recordRef?.close();
    this.recordRef = null;
    this.recordDialogOpen.set(false);
    this.resetRecord();
    this.fields.set({});
  }
  protected async save(): Promise<void> {
    if (this.saving() || this.uploading()) return;
    const scope = this.api.scope(),
      id = this.id(),
      draft = this.record,
      generation = this.editorGeneration;
    if (scope !== this.editorScope || id !== this.editorClient) {
      this.error.set('The workspace changed. Reopen the communication.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.fields.set({});
    try {
      const attachments = await Promise.all(
        draft.attachments.map((f) => this.api.checkFile(id, f.id)),
      );
      if (
        scope !== this.api.scope() ||
        id !== this.id() ||
        draft !== this.record ||
        generation !== this.editorGeneration
      )
        return;
      if (attachments.some((f) => f.state !== 'clean'))
        throw Error('Wait for attachment scanning, or remove rejected files before saving.');
      const { id: unused, attachments: files, ...values } = draft;
      const body: ProfessionalWrite = {
        ...values,
        at:
          this.original && draft.at === this.localDate(this.original.at)
            ? this.original.at
            : draft.at,
        responseStatus: draft.responseRequired ? draft.responseStatus || 'Awaiting response' : '',
        attachment_ids: attachments.map((f) => f.id),
      };
      const hash = JSON.stringify(body);
      if (hash !== this.intent) {
        this.intent = hash;
        this.intentKey = crypto.randomUUID();
      }
      await this.api.save(id, body, this.original, this.intentKey);
      if (this.destroyed || scope !== this.api.scope() || id !== this.id() || draft !== this.record)
        return;
      this.recordRef?.close();
      this.recordRef = null;
      this.recordDialogOpen.set(false);
      this.resetRecord();
      this.notice.set('Professional communication recorded.');
      await this.reload();
    } catch (error) {
      if (scope === this.api.scope() && draft === this.record) this.error.set(this.message(error));
    } finally {
      if (scope === this.api.scope() && id === this.id() && generation === this.editorGeneration)
        this.saving.set(false);
    }
  }
  protected async openContact(contact?: ProfessionalContactRead): Promise<void> {
    if (
      this.saving() ||
      this.fetching() ||
      this.uploading() ||
      !this.canContact(contact ? 'edit' : 'create') ||
      !this.discardContact()
    )
      return;
    this.fields.set({});
    this.error.set('');
    const generation = ++this.contactGeneration,
      scope = this.api.scope(),
      id = this.id();
    this.fetching.set(true);
    try {
      const fresh = contact ? await this.api.contact(id, contact.id) : null;
      if (
        this.destroyed ||
        generation !== this.contactGeneration ||
        scope !== this.api.scope() ||
        id !== this.id()
      )
        return;
      this.originalContact = fresh;
      this.contact = fresh
        ? {
            name: fresh.name,
            relationship: fresh.relationship,
            phone: fresh.phone,
            email: fresh.email,
            type: fresh.type as ProfessionalContactWrite['type'],
            nextOfKin: fresh.nextOfKin,
          }
        : this.blankContact();
      this.contactClean = JSON.stringify(this.contact);
      this.contactScope = scope;
      this.contactClient = id;
      this.addingContact.set(true);
      if (fresh) {
        this.contactDialogOpen.set(true);
        this.contactRef = this.showDialog(this.contactPopup(), 'Edit professional contact', () =>
          this.cancelContact(),
        );
      }
    } catch (error) {
      if (generation === this.contactGeneration) this.error.set(this.message(error));
    } finally {
      if (generation === this.contactGeneration) this.fetching.set(false);
    }
  }
  private discardContact(): boolean {
    return (
      !this.addingContact() ||
      JSON.stringify(this.contact) === this.contactClean ||
      window.confirm('Discard unsaved contact changes?')
    );
  }
  protected cancelContact() {
    if (this.saving() || !this.discardContact()) return;
    this.contactGeneration++;
    this.contactRef?.close();
    this.contactRef = null;
    this.contactDialogOpen.set(false);
    this.addingContact.set(false);
    this.fields.set({});
  }
  protected async saveContact(): Promise<void> {
    if (this.saving()) return;
    const scope = this.api.scope(),
      id = this.id(),
      draft = this.contact,
      generation = this.contactGeneration;
    if (scope !== this.contactScope || id !== this.contactClient) {
      this.error.set('The workspace changed. Reopen the contact.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.fields.set({});
    try {
      const hash = JSON.stringify(draft);
      if (hash !== this.contactIntent) {
        this.contactIntent = hash;
        this.contactKey = crypto.randomUUID();
      }
      await this.api.saveContact(id, { ...draft }, this.originalContact, this.contactKey);
      if (
        this.destroyed ||
        scope !== this.api.scope() ||
        id !== this.id() ||
        draft !== this.contact
      )
        return;
      this.contactRef?.close();
      this.contactRef = null;
      this.contactDialogOpen.set(false);
      this.addingContact.set(false);
      if (this.originalContact?.source === 'representative')
        await this.api.records.detail(id, true);
      if (this.destroyed || scope !== this.api.scope() || id !== this.id()) return;
      this.notice.set('Contact saved to the service user’s care record.');
      await this.reload();
    } catch (error) {
      if (scope === this.api.scope() && draft === this.contact) this.error.set(this.message(error));
    } finally {
      if (scope === this.api.scope() && id === this.id() && generation === this.contactGeneration)
        this.saving.set(false);
    }
  }
  protected readonly uploadEvidence = async (file: File): Promise<JournalAttachment> => {
    const id = this.id(),
      scope = this.api.scope(),
      draft = this.record;
    const intent = [draft.id, file.name, file.size, file.lastModified].join(':');
    if (!this.uploadKeys.has(intent)) this.uploadKeys.set(intent, crypto.randomUUID());
    const value = await this.api.upload(id, file, this.uploadKeys.get(intent)!);
    if (scope !== this.api.scope() || id !== this.id() || draft !== this.record)
      throw Error('The selected client changed. Reopen the attachment form.');
    return value;
  };
  protected readonly downloadEvidence = (file: JournalAttachment) =>
    this.api.download(this.id(), file);
  @HostListener('window:beforeunload', ['$event'])
  protected beforeUnload(event: BeforeUnloadEvent): void {
    if (
      this.saving() ||
      this.uploading() ||
      JSON.stringify(this.record) !== this.clean ||
      (this.addingContact() && JSON.stringify(this.contact) !== this.contactClean)
    ) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
  canLeave(): boolean {
    return !this.saving() && !this.uploading() && this.discardRecord() && this.discardContact();
  }
}
