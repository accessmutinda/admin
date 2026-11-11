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
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { A11yModule } from '@angular/cdk/a11y';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { ModuleDesign } from '../shared/module-design';
import { CareHeader } from './care-header';
import { CareContactsApi } from './care-contacts-api.service';
import type {
  ProfessionalContactRead,
  ProfessionalContactWrite,
} from '../staff-portal/professional.generated';

@Component({
  selector: 'cv-care-contacts',
  imports: [FormsModule, A11yModule, MatSelectModule, CvSelect, ModuleDesign, CareHeader],
  providers: [CareContactsApi],
  host: { class: 'module-page operations-page' },
  templateUrl: './care-contacts.html',
  styleUrls: [
    './service-user-spacing.css',
    './care-shared.css',
    './care-controls.css',
    './visit-notes.css',
    '../clients/service-user-dialogs.css',
  ],
})
export class CareContacts {
  protected readonly api = inject(CareContactsApi);
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
  protected readonly editing = signal(false);
  protected readonly busy = signal(false);
  protected readonly printing = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly fieldErrors = signal<Record<string, string[]>>({});
  protected readonly printRows = signal<ProfessionalContactRead[] | null>(null);
  protected readonly contacts = computed(
    () => this.printRows()?.filter((row) => row.source === 'contact') ?? this.api.contacts(),
  );
  protected readonly representative = computed(() => {
    const rows = this.printRows();
    return rows === null
      ? this.api.representative()
      : rows.find((row) => row.source === 'representative');
  });
  protected readonly types = ['Family', 'Emergency', 'GP', 'Pharmacy', 'Professional'];
  protected contact = this.blank();
  private original: ProfessionalContactRead | null = null;
  private owner: { id: string; scope: string } | null = null;
  private baseline = '';
  private request = 0;
  private destroyed = false;
  private blank(): ProfessionalContactWrite {
    return { name: '', relationship: '', phone: '', email: '', type: 'Family', nextOfKin: false };
  }
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.request++;
      this.reset();
    });
    effect(() => {
      const id = this.id(),
        scope = this.api.scope();
      untracked(() => {
        this.request++;
        this.reset();
        this.error.set('');
        this.notice.set('');
        this.printRows.set(null);
        this.printing.set(false);
        if (id && this.api.can('read')) {
          void this.api.records.detail(id);
          void this.api.load(id);
        }
      });
    });
    effect(() => {
      if (this.api.denied())
        untracked(() => {
          this.request++;
          this.reset();
          this.printRows.set(null);
          this.notice.set('');
        });
    });
  }
  private reset() {
    this.editing.set(false);
    this.contact = this.blank();
    this.original = null;
    this.owner = null;
    this.baseline = '';
    this.busy.set(false);
    this.fieldErrors.set({});
  }
  canLeave() {
    return (
      !this.busy() &&
      !this.printing() &&
      (!this.editing() ||
        JSON.stringify(this.contact) === this.baseline ||
        window.confirm('Discard unsaved contact changes?'))
    );
  }
  protected close() {
    if (this.canLeave()) {
      this.request++;
      this.reset();
      this.error.set('');
    }
  }
  protected async open(row?: ProfessionalContactRead) {
    if (!this.api.can(row ? 'edit' : 'create') || !this.canLeave()) return;
    const id = this.id(),
      scope = this.api.scope(),
      token = ++this.request;
    this.error.set('');
    try {
      const fresh = row ? await this.api.detail(id, row.id) : null;
      if (
        this.destroyed ||
        scope !== this.api.scope() ||
        id !== this.id() ||
        token !== this.request
      )
        return;
      this.original = fresh;
      this.owner = { id, scope };
      this.contact = fresh
        ? {
            name: fresh.name,
            relationship: fresh.relationship,
            phone: fresh.phone,
            email: fresh.email,
            type: fresh.type as ProfessionalContactWrite['type'],
            nextOfKin: fresh.nextOfKin,
          }
        : this.blank();
      this.fieldErrors.set({});
      this.baseline = JSON.stringify(this.contact);
      this.editing.set(true);
    } catch (e) {
      if (token === this.request && scope === this.api.scope())
        this.error.set(e instanceof Error ? e.message : 'Contact information could not be loaded.');
    }
  }
  protected async save() {
    const owner = this.owner;
    if (!owner || owner.id !== this.id() || owner.scope !== this.api.scope() || this.busy()) return;
    if (!this.contact.name.trim()) {
      this.fieldErrors.set({ name: ['Enter a contact name.'] });
      this.error.set('Enter a contact name.');
      return;
    }
    if (!this.contact.phone.trim() && !this.contact.email.trim()) {
      this.fieldErrors.set({
        phone: ['Enter a phone number or email address.'],
        email: ['Enter a phone number or email address.'],
      });
      this.error.set('Enter a phone number or email address.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.fieldErrors.set({});
    try {
      await this.api.save(owner.id, { ...this.contact }, this.original);
      if (this.destroyed || owner !== this.owner || owner.scope !== this.api.scope()) return;
      this.reset();
      this.notice.set('Contact saved.');
      await this.api.load(owner.id);
    } catch (e) {
      if (owner === this.owner && owner.scope === this.api.scope()) {
        this.fieldErrors.set((e as { fieldErrors?: Record<string, string[]> }).fieldErrors ?? {});
        this.error.set(e instanceof Error ? e.message : 'The contact could not be saved.');
      }
    } finally {
      if (owner === this.owner) this.busy.set(false);
    }
  }
  protected async print() {
    if (!this.api.can('export') || this.busy() || this.printing() || this.api.loading()) return;
    const scope = this.api.scope(),
      id = this.id();
    this.printing.set(true);
    this.error.set('');
    try {
      const rows = await this.api.load(id, true);
      if (this.api.error()) throw Error(this.api.error());
      if (
        this.destroyed ||
        scope !== this.api.scope() ||
        id !== this.id() ||
        !this.api.can('export')
      )
        return;
      this.printRows.set(rows);
      this.cdr.detectChanges();
      window.print();
    } catch (e) {
      if (scope === this.api.scope())
        this.error.set(e instanceof Error ? e.message : 'Contacts could not be printed.');
    } finally {
      if (scope === this.api.scope()) {
        this.printRows.set(null);
        this.printing.set(false);
      }
    }
  }
  @HostListener('document:keydown.escape') escape() {
    if (this.editing()) this.close();
  }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent) {
    if (
      this.busy() ||
      this.printing() ||
      (this.editing() && JSON.stringify(this.contact) !== this.baseline)
    ) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
