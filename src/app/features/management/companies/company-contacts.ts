import { toSignal } from '@angular/core/rxjs-interop';
import { CompanyContactsApiService } from './company-contacts-api.service';
import { CompaniesApiService } from './companies-api.service';
import {
  ChangeDetectorRef,
  Component,
  HostListener,
  computed,
  inject,
  signal,
  DestroyRef,
  effect,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import {
  MatDialog,
  MatDialogModule,
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { companyModifiedAt } from './company-profile.models';
import { CvSelect } from '../../../shared/ui/select';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/ui/toast.service';
import { ManagementStore } from '../shared/management.store';
import {
  AddressKind,
  CompanyAddress,
  CompanyContacts,
  CompanyKeyContact,
  CONTACT_CATEGORIES,
  addressErrors,
  completeKeyContact,
  contactsCompletion,
  effectiveAddress,
  emptyCompanyContacts,
  primaryContactComplete,
  validContactEmail,
  validContactPhone,
} from './company-contacts.models';

@Component({
  selector: 'cv-company-contacts',
  host: { class: 'module-page companies-page company-profile-page company-contacts-page' },
  imports: [FormsModule, RouterLink, MatDialogModule, MatMenuModule],
  templateUrl: './company-contacts.html',
  providers: [CompanyContactsApiService],
})
export class CompanyContactsPage {
  protected readonly store = inject(ManagementStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly api = inject(CompanyContactsApiService);
  private readonly companiesApi = inject(CompaniesApiService);
  private readonly destroy = inject(DestroyRef);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private get id(): string {
    return this.params().get('id') ?? '';
  }
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly saving = signal(false);
  protected readonly busy = computed(() => this.loading() || this.saving());
  private loadGeneration = 0;
  protected readonly company = computed(() => this.store.companies().find((c) => c.id === this.id));
  protected draft = emptyCompanyContacts(this.company() ?? {});
  private baseline = JSON.stringify(this.draft);
  protected readonly submitted = signal(false);
  protected readonly saveError = signal('');
  protected readonly checked = signal<Partial<Record<AddressKind, boolean>>>({});
  protected readonly categories = CONTACT_CATEGORIES;
  protected readonly modifiedAt = companyModifiedAt;
  constructor() {
    effect(() => {
      const id = this.id;
      const allowed = this.auth.canAccessCompany(id);
      this.auth.profile()?.id;
      untracked(() => {
        if (allowed) void this.load(true);
        else {
          this.draft = emptyCompanyContacts({});
          this.baseline = JSON.stringify(this.draft);
          this.loading.set(false);
          this.loadError.set('This company is no longer available.');
        }
      });
    });
  }
  protected async load(changedContext = false): Promise<void> {
    if (
      !changedContext &&
      this.hasChanges() &&
      !window.confirm('Discard unsaved changes and reload saved contact information?')
    )
      return;
    const generation = ++this.loadGeneration;
    const id = this.id;
    this.loading.set(true);
    this.loadError.set('');
    this.saveError.set('');
    this.draft = emptyCompanyContacts({});
    this.baseline = JSON.stringify(this.draft);
    this.checked.set({});
    try {
      const saved = await this.api.load(id);
      if (generation !== this.loadGeneration || this.destroy.destroyed || id !== this.id) return;
      this.draft = saved;
      this.baseline = JSON.stringify(saved);
      this.submitted.set(false);
    } catch (error) {
      if (generation === this.loadGeneration && !this.destroy.destroyed)
        this.loadError.set(
          error instanceof Error ? error.message : 'Unable to load contact information.',
        );
    } finally {
      if (generation === this.loadGeneration && !this.destroy.destroyed) this.loading.set(false);
    }
  }
  protected readonly addressCards: { key: AddressKind; title: string; icon: string }[] = [
    { key: 'registered', title: 'Registered Address', icon: 'home' },
    { key: 'headOffice', title: 'Head Office Address', icon: 'apartment' },
    { key: 'billing', title: 'Billing Address', icon: 'credit_card' },
  ];
  protected readonly addressFields: {
    key: keyof CompanyAddress;
    label: string;
    required?: boolean;
    wide?: boolean;
  }[] = [
    { key: 'line1', label: 'Address Line 1', required: true, wide: true },
    { key: 'line2', label: 'Address Line 2', wide: true },
    { key: 'city', label: 'City', required: true },
    { key: 'county', label: 'County' },
    { key: 'postcode', label: 'Postcode', required: true },
    { key: 'country', label: 'Country', required: true },
  ];
  protected readonly primaryFields: {
    key: keyof CompanyContacts['primary'];
    label: string;
    icon: string;
    type: string;
    required?: boolean;
  }[] = [
    { key: 'mainPhone', label: 'Main Phone', icon: 'call', type: 'tel', required: true },
    { key: 'secondaryPhone', label: 'Secondary Phone', icon: 'call', type: 'tel' },
    { key: 'generalEmail', label: 'General Email', icon: 'mail', type: 'email', required: true },
    { key: 'billingEmail', label: 'Billing Email', icon: 'mail', type: 'email' },
    { key: 'website', label: 'Website', icon: 'language', type: 'url' },
    { key: 'emergencyContact', label: 'Emergency Contact', icon: 'person', type: 'text' },
    { key: 'outOfHoursNumber', label: 'Out-of-Hours Number', icon: 'call', type: 'tel' },
  ];
  protected address(kind: AddressKind): CompanyAddress {
    return effectiveAddress(this.draft, kind);
  }
  protected setAddress(kind: AddressKind, field: keyof CompanyAddress, value: string): void {
    if (kind === 'billing' && this.draft.billingSameAsRegistered) return;
    this.draft.addresses[kind][field] = value;
    this.checked.update((all) => ({
      ...all,
      [kind]: false,
      ...(kind === 'registered' ? { billing: false } : {}),
    }));
    this.saveError.set('');
  }
  protected addressError(kind: AddressKind, field: keyof CompanyAddress): string {
    return this.submitted() || this.checked()[kind]
      ? (addressErrors(this.address(kind), !!this.checked()[kind])[field] ?? '')
      : '';
  }
  protected addressComplete(kind: AddressKind): boolean {
    return !Object.keys(addressErrors(this.address(kind))).length;
  }
  protected isChecked(kind: AddressKind): boolean {
    return !!this.checked()[kind] && this.addressComplete(kind);
  }
  protected checkAddress(kind: AddressKind): void {
    this.checked.update((all) => ({ ...all, [kind]: true }));
  }
  protected clearAddress(kind: AddressKind): void {
    if (this.busy() || !window.confirm('Remove this address when you save changes?')) return;
    if (kind === 'billing') this.draft.billingSameAsRegistered = false;
    this.draft.addresses[kind] = {
      line1: '',
      line2: '',
      city: '',
      county: '',
      postcode: '',
      country: '',
    };
    this.checked.update((all) => ({ ...all, [kind]: false }));
    this.saveError.set('');
  }
  protected clearPrimary(): void {
    if (this.busy() || !window.confirm('Clear primary contact details when you save changes?'))
      return;
    for (const key of Object.keys(this.draft.primary) as (keyof CompanyContacts['primary'])[])
      this.draft.primary[key] = '';
    this.saveError.set('');
  }
  protected mapUrl(kind: AddressKind): string | null {
    const a = this.address(kind);
    return a.line1.trim() && a.postcode.trim()
      ? 'https://www.google.com/maps/search/?api=1&query=' +
          encodeURIComponent(
            [a.line1, a.line2, a.city, a.county, a.postcode, a.country].filter(Boolean).join(', '),
          )
      : null;
  }
  protected primaryError(key: keyof CompanyContacts['primary']): string {
    if (!this.submitted()) return '';
    const value = this.draft.primary[key].trim();
    if (key === 'emergencyContact') return value.length > 120 ? 'Use 120 characters or fewer.' : '';
    if (!value) return '';
    if (key.toLowerCase().includes('email'))
      return validContactEmail(value) ? '' : 'Enter a valid email address.';
    if (key === 'website') {
      try {
        const url = new URL(value);
        return ['https:', 'http:'].includes(url.protocol) && !!url.hostname
          ? ''
          : 'Use a full http or https address.';
      } catch {
        return 'Use a full http or https address.';
      }
    }
    return validContactPhone(value) ? '' : 'Enter a valid phone number with 7–15 digits.';
  }
  protected completion(): number {
    return contactsCompletion(this.draft);
  }
  protected addressesComplete(): boolean {
    return this.addressCards.every((card) => this.addressComplete(card.key));
  }
  protected primaryComplete(): boolean {
    return primaryContactComplete(this.draft);
  }
  protected keyCount(): number {
    return this.categories.filter((category) =>
      this.draft.keyContacts.some((c) => c.category === category.name && completeKeyContact(c)),
    ).length;
  }
  protected hasITContact(): boolean {
    return this.draft.keyContacts.some(
      (c) => c.category === 'IT/System Contact' && completeKeyContact(c),
    );
  }
  protected contactCards(): {
    category: string;
    color: string;
    icon: string;
    contact?: CompanyKeyContact;
  }[] {
    const cards = this.categories.map((category) => ({
      category: category.name,
      color: category.color,
      icon: category.icon,
      contact: this.draft.keyContacts.find((c) => c.category === category.name),
    }));
    const used = new Set(cards.map((card) => card.contact?.id));
    return [
      ...cards,
      ...this.draft.keyContacts
        .filter((c) => !used.has(c.id))
        .map((contact) => ({
          category: contact.category,
          color: '#008d9f',
          icon: 'person',
          contact,
        })),
    ];
  }
  protected openContact(contact?: CompanyKeyContact, category?: string): void {
    if (this.busy()) return;
    const id = this.id;
    this.dialog
      .open(CompanyContactDialog, {
        width: '480px',
        maxWidth: 'calc(100vw - 24px)',
        autoFocus: 'first-tabbable',
        data: contact
          ? structuredClone(contact)
          : {
              id: crypto.randomUUID(),
              category: category ?? CONTACT_CATEGORIES[0].name,
              name: '',
              role: category ?? '',
              email: '',
              phone: '',
              active: true,
            },
      })
      .afterClosed()
      .subscribe((result: CompanyKeyContact | undefined) => {
        if (!result || this.destroy.destroyed || id !== this.id || this.busy()) return;
        this.draft.keyContacts = [
          ...this.draft.keyContacts.filter((c) => c.id !== result.id),
          result,
        ];
        this.saveError.set('');
        this.changeDetector.markForCheck();
      });
  }
  protected removeContact(id: string): void {
    if (this.busy() || !window.confirm('Remove this contact when you save changes?')) return;
    this.draft.keyContacts = this.draft.keyContacts.filter((c) => c.id !== id);
  }
  protected hasChanges(): boolean {
    return this.baseline !== JSON.stringify(this.draft);
  }
  canLeave(): boolean {
    if (!this.auth.canAccessCompany(this.id)) return true;
    if (this.busy()) return false;
    return (
      !this.hasChanges() ||
      window.confirm('You have unsaved contact information. Leave without saving?')
    );
  }
  @HostListener('window:beforeunload', ['$event'])
  protected beforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasChanges() || this.saving()) event.preventDefault();
  }
  protected cancel(): void {
    if (
      this.busy() ||
      (this.hasChanges() && !window.confirm('Discard unsaved contact information?'))
    )
      return;
    this.draft = emptyCompanyContacts(this.company() ?? {});
    this.baseline = JSON.stringify(this.draft);
    this.router.navigate(['/manage/companies', this.id]);
  }
  protected async save(): Promise<void> {
    if (this.busy()) return;
    this.submitted.set(true);
    this.saveError.set('');
    if (
      this.addressCards.some(
        (card) => Object.keys(addressErrors(this.address(card.key), false)).length,
      ) ||
      this.primaryFields.some((field) => this.primaryError(field.key))
    ) {
      this.saveError.set('Check the highlighted address and contact fields before saving.');
      return;
    }
    const id = this.id;
    this.saving.set(true);
    try {
      const saved = await this.api.save(id, this.draft);
      this.draft = saved;
      this.baseline = JSON.stringify(saved);
      this.submitted.set(false);
      this.checked.set({});
      this.toast.success('Company contact information saved.');
      await this.companiesApi.load(true);
      await this.companiesApi.loadDetail(id, true);
    } catch (error) {
      this.saveError.set(
        error instanceof Error ? error.message : 'The contact changes could not be saved.',
      );
    } finally {
      this.saving.set(false);
    }
  }
}

@Component({
  selector: 'cv-company-contact-dialog',
  imports: [FormsModule, MatDialogModule, MatSelectModule, CvSelect],
  template: ` <div class="cc-contact-dialog">
    <h2 mat-dialog-title>{{ data.name ? 'Edit Contact' : 'Add New Contact' }}</h2>
    <form (ngSubmit)="save()" novalidate>
      <mat-dialog-content>
        <label
          >Contact Type<mat-select
            cvSelect
            [(ngModel)]="contact.category"
            name="category"
            aria-label="Contact type"
          >
            @for (category of categories; track category.name) {
              <mat-option [value]="category.name">{{ category.name }}</mat-option>
            }
            <mat-option value="Other">Other</mat-option></mat-select
          ></label
        >
        @for (field of fields; track field.key) {
          <label [for]="'contact-' + field.key"
            >{{ field.label }} <span aria-hidden="true">*</span></label
          >
          <input
            [id]="'contact-' + field.key"
            [name]="field.key"
            [type]="field.type"
            [(ngModel)]="contact[field.key]"
            required
            maxlength="150"
            [attr.aria-invalid]="submitted && !!error(field.key)"
            [attr.aria-describedby]="
              submitted && error(field.key) ? 'contact-error-' + field.key : null
            "
          />
          @if (submitted && error(field.key)) {
            <small class="cc-error" [id]="'contact-error-' + field.key">{{
              error(field.key)
            }}</small>
          }
        }
        <label class="cc-checkbox"
          ><input type="checkbox" [(ngModel)]="contact.active" name="active" />Active contact</label
        >
        <p>
          Contact details will be saved with the company when you select Save Changes. This does not
          invite a system user.
        </p>
      </mat-dialog-content>
      <mat-dialog-actions align="end"
        ><button type="button" class="cc-dialog-button" (click)="dialog.close()">Cancel</button
        ><button type="submit" class="cc-dialog-button cc-dialog-primary">
          Apply Contact
        </button></mat-dialog-actions
      >
    </form>
  </div>`,
})
export class CompanyContactDialog {
  protected readonly data = inject<CompanyKeyContact>(MAT_DIALOG_DATA);
  protected readonly dialog = inject(MatDialogRef<CompanyContactDialog>);
  protected contact = structuredClone(this.data);
  protected readonly categories = CONTACT_CATEGORIES;
  protected submitted = false;
  protected readonly fields: {
    key: 'name' | 'role' | 'email' | 'phone';
    label: string;
    type: string;
  }[] = [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'role', label: 'Role / Job Title', type: 'text' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Phone', type: 'tel' },
  ];
  protected error(key: 'name' | 'role' | 'email' | 'phone'): string {
    const value = this.contact[key].trim();
    if (!value) return 'This field is required.';
    if (key === 'email' && !validContactEmail(value)) return 'Enter a valid email address.';
    if (key === 'phone' && !validContactPhone(value))
      return 'Enter a valid phone number with 7–15 digits.';
    return '';
  }
  protected save(): void {
    this.submitted = true;
    if (this.fields.some((field) => this.error(field.key))) return;
    this.dialog.close({
      ...this.contact,
      ...Object.fromEntries(
        this.fields.map((field) => [field.key, this.contact[field.key].trim()]),
      ),
    });
  }
}
