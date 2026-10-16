import { contactInformationComplete } from './company-contacts.models';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/ui/toast.service';
import { Company, ManagementStore } from '../shared/management.store';
import {
  companyCompletion,
  companyModifiedAt,
  generalInformationComplete,
} from './company-profile.models';

interface ProfileField {
  key: keyof Company;
  label: string;
  hint: string;
  type?: 'textarea' | 'date' | 'number' | 'select' | 'toggle';
  required?: boolean;
  max?: number;
  options?: string[];
  wide?: boolean;
}

@Component({
  selector: 'cv-company-profile',
  host: { class: 'companies-page company-profile-page' },
  imports: [FormsModule, RouterLink, MatSelectModule, CvSelect],
  templateUrl: './company-profile.html',
})
export class CompanyProfile {
  protected readonly store = inject(ManagementStore);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly company = computed(() => this.store.companies().find((c) => c.id === this.id));
  protected readonly editing = signal(this.route.snapshot.queryParamMap.get('edit') === 'true');
  protected readonly submitted = signal(false);
  protected readonly saveError = signal('');
  protected readonly draftAvailable = signal(this.readDraft() !== null);
  protected readonly draftSaved = signal(false);
  protected draft = this.newDraft();
  protected readonly today = (() => {
    const date = new Date();
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
  })();
  protected readonly fields: ProfileField[] = [
    {
      key: 'name',
      label: 'Company Name',
      hint: 'The legal name of the company as registered.',
      required: true,
      max: 100,
    },
    {
      key: 'tradingName',
      label: 'Trading Name',
      hint: 'If different from the registered company name.',
      max: 100,
    },
    {
      key: 'code',
      label: 'Company Code',
      hint: 'Unique internal code for this company.',
      required: true,
      max: 20,
    },
    {
      key: 'sector',
      label: 'Service Type',
      hint: 'Primary type of care service provided.',
      type: 'select',
      required: true,
      options: [
        'Domiciliary care',
        'Residential care',
        'Residential Care Home',
        'Supported living',
        'Dementia care',
        'Community care',
      ],
    },
    {
      key: 'description',
      label: 'Description / About Company',
      hint: 'Introduce the company, its services and approach to care.',
      type: 'textarea',
      required: true,
      max: 1000,
      wide: true,
    },
    {
      key: 'registration',
      label: 'Registration Number',
      hint: 'Company or care-provider registration number.',
      required: true,
      max: 60,
    },
    {
      key: 'establishedDate',
      label: 'Established Date',
      hint: 'Date the company was established.',
      type: 'date',
      required: true,
    },
    {
      key: 'headOfficeName',
      label: 'Head Office Name',
      hint: 'Name of the main/head office location.',
      required: true,
      max: 150,
    },
    {
      key: 'registeredPlaces',
      label: 'Number of Registered Places',
      hint: 'Total registered care places across all locations. Enter 0 if not applicable.',
      type: 'number',
      required: true,
    },
    {
      key: 'primaryLanguage',
      label: 'Primary Language',
      hint: 'Primary language used for care delivery and communication.',
      type: 'select',
      required: true,
      options: ['English', 'Welsh', 'Scottish Gaelic', 'Irish', 'British Sign Language', 'Other'],
    },
    {
      key: 'active',
      label: 'Status',
      hint: 'Whether this company is active on the platform.',
      type: 'toggle',
    },
    {
      key: 'headOfficeAddress',
      label: 'Head Office Address',
      hint: 'Address of the main office.',
      max: 250,
    },
    { key: 'postcode', label: 'Postcode', hint: 'Postcode for the main office.', max: 10 },
    {
      key: 'size',
      label: 'Company Size',
      hint: 'Number of staff in the company.',
      type: 'select',
      options: ['1–10 staff', '11–50 staff', '51–200 staff', '201+ staff'],
    },
  ];
  protected readonly completion = computed(() => {
    const company = this.company();
    return company ? companyCompletion(company) : 0;
  });
  protected readonly sections = computed(() => {
    const c = this.company();
    return [
      {
        title: 'General Information',
        complete: generalInformationComplete(c),
        fragment: 'general-information',
      },
      {
        title: 'Registration Details',
        complete: !!c?.registration,
        fragment: 'profile-registration',
      },
      {
        title: 'Contact Information',
        complete: contactInformationComplete(c),
        link: ['/manage/companies', this.id, 'contacts'],
      },
      { title: 'Branches & Locations', complete: false, fragment: 'profile-headOfficeName' },
      {
        title: 'Services & Care Types',
        complete: !!c?.sector && !!c.modules.length,
        link: ['/manage/companies', this.id, 'settings'],
        section: 'Modules',
      },
      { title: 'Compliance Information', complete: false, link: ['/manage/compliance'] },
      { title: 'Documents & Policies', complete: false },
    ];
  });
  private newDraft(): Company {
    const c = this.company();
    return structuredClone({ ...c, active: c?.active ?? !!c?.modules.length } as Company);
  }
  protected managedByContacts(field: ProfileField): boolean {
    return (
      !!this.company()?.contacts && (field.key === 'headOfficeAddress' || field.key === 'postcode')
    );
  }
  protected setField(key: keyof Company, value: string | number | boolean | null): void {
    this.draft = { ...this.draft, [key]: value };
    this.draftSaved.set(false);
    this.saveError.set('');
  }
  protected value(field: ProfileField): string {
    const c = this.company();
    if (!c) return 'Not recorded';
    if (field.key === 'active') return (c.active ?? !!c.modules.length) ? 'Active' : 'Inactive';
    const value = c[field.key];
    if (field.type === 'date' && typeof value === 'string' && value)
      return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(
        new Date(value + 'T12:00:00'),
      );
    return value === undefined || value === null || value === '' ? 'Not recorded' : String(value);
  }
  protected options(field: ProfileField): string[] {
    const value = this.draft[field.key];
    return typeof value === 'string' && value && !field.options?.includes(value)
      ? [value, ...(field.options ?? [])]
      : (field.options ?? []);
  }
  protected error(field: ProfileField): string {
    if (!this.submitted()) return '';
    const value = this.draft[field.key];
    if (field.required && (value === null || value === undefined || String(value).trim() === ''))
      return `Enter ${field.label.toLowerCase()}.`;
    if (field.max && String(value ?? '').length > field.max)
      return `Use ${field.max} characters or fewer.`;
    if (
      field.key === 'code' &&
      this.store
        .companies()
        .some(
          (c) => c.id !== this.id && c.code.toLowerCase() === String(value).trim().toLowerCase(),
        )
    )
      return 'This company code is already in use.';
    if (field.type === 'number' && value != null && (!Number.isInteger(value) || Number(value) < 0))
      return 'Enter a whole number of 0 or more.';
    if (
      field.type === 'date' &&
      value &&
      (String(value) > this.today ||
        !/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ||
        !Number.isFinite(Date.parse(String(value))))
    )
      return 'Enter a valid date that is not in the future.';
    return '';
  }
  protected edit(): void {
    this.draft = this.newDraft();
    this.editing.set(true);
    this.submitted.set(false);
    this.saveError.set('');
  }
  protected cancel(): void {
    this.draft = this.newDraft();
    this.editing.set(false);
    this.submitted.set(false);
    this.saveError.set('');
    this.draftSaved.set(false);
  }
  protected hasChanges(): boolean {
    return this.editing() && JSON.stringify(this.draft) !== JSON.stringify(this.newDraft());
  }
  canLeave(): boolean {
    return (
      !this.hasChanges() ||
      this.draftSaved() ||
      window.confirm('You have unsaved company details. Leave without saving them?')
    );
  }
  @HostListener('window:beforeunload', ['$event'])
  protected beforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasChanges() && !this.draftSaved()) event.preventDefault();
  }
  protected save(): void {
    this.submitted.set(true);
    this.saveError.set('');
    if (this.fields.some((f) => this.error(f))) return;
    const current = this.company();
    if (!current) return;
    const next = { ...current };
    for (const field of this.fields) {
      if (this.managedByContacts(field)) continue;
      Object.assign(next, {
        [field.key]:
          typeof this.draft[field.key] === 'string'
            ? String(this.draft[field.key]).trim()
            : this.draft[field.key],
      });
    }
    next.modifiedAt = new Date().toISOString();
    next.modifiedBy = this.auth.currentUser()?.name ?? 'Company administrator';
    if (!this.store.saveCompany(next)) {
      this.saveError.set(
        'Changes could not be saved on this device. Free some browser storage and try again. Your edits are still here.',
      );
      return;
    }
    try {
      localStorage.removeItem(this.draftKey());
    } catch {
      /* Saved profile remains available. */
    }
    this.draftAvailable.set(false);
    this.cancel();
    this.toast.success('Company profile saved.');
  }
  private draftKey(): string {
    return 'cv_company_profile_draft:' + this.id;
  }
  private readDraft(): Company | null {
    try {
      const saved = JSON.parse(localStorage.getItem(this.draftKey()) ?? 'null');
      return saved?.id === this.id ? (saved as Company) : null;
    } catch {
      return null;
    }
  }
  protected saveDraft(): void {
    try {
      localStorage.setItem(this.draftKey(), JSON.stringify(this.draft));
      this.draftAvailable.set(true);
      this.draftSaved.set(true);
      this.toast.success('Draft saved on this device. The company profile has not changed.');
    } catch {
      this.saveError.set('The draft could not be saved. Free some browser storage and try again.');
    }
  }
  protected resumeDraft(): void {
    const saved = this.readDraft();
    if (!saved) return;
    this.draft = { ...this.newDraft(), ...saved };
    this.editing.set(true);
    this.submitted.set(false);
    this.draftSaved.set(true);
  }
  protected modifiedAt(): string {
    return companyModifiedAt(this.company()?.modifiedAt);
  }
}
