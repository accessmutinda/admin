import { CompanyLoading } from './company-loading';
import { toSignal } from '@angular/core/rxjs-interop';
import { CompaniesApiService } from './companies-api.service';
import {
  COMPLIANCE_DOCUMENTS,
  complianceComplete,
  daysUntil,
  documentVerified,
} from './company-compliance.models';
import { CompanyComplianceApiService } from './company-compliance-api.service';
import type { CompanyCompliance } from './company-compliance.models';
import { locationsComplete } from '../locations/locations.models';
import { contactInformationComplete } from './company-contacts.models';
import {
  Component,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { LanguageField } from './language-field';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/ui/toast.service';
import { SetupAreaKey } from './companies-api.models';
import { Company, ManagementStore } from '../shared/management.store';
import {
  companyModifiedAt,
  companyProfileUpdate,
  generalInformationComplete,
  wholePlaces,
} from './company-profile.models';

function savedDocumentsComplete(value: CompanyCompliance | null): boolean {
  if (!value) return false;
  return COMPLIANCE_DOCUMENTS.every(({ key }) => {
    const file = value.documents[key];
    return !!file && documentVerified(file) && (!file.expiry || (daysUntil(file.expiry) ?? -1) >= 0);
  });
}

function savedAreaComplete(company: Company | undefined, key: SetupAreaKey): boolean | null {
  const area = company?.setupProgress?.[key];
  if (!area || area.complete == null) return null;
  return area.complete === true;
}

interface ProfileField {
  key: keyof Company;
  label: string;
  hint: string;
  type?: 'textarea' | 'date' | 'number' | 'select' | 'toggle' | 'language';
  required?: boolean;
  max?: number;
  options?: string[];
  wide?: boolean;
}

@Component({
  selector: 'cv-company-profile',
  host: { class: 'module-page companies-page company-profile-page' },
  imports: [CompanyLoading, FormsModule, RouterLink, MatSelectModule, CvSelect, LanguageField],
  providers: [CompanyComplianceApiService],
  templateUrl: './company-profile.html',
})
export class CompanyProfile {
  protected readonly store = inject(ManagementStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly api = inject(CompaniesApiService);
  private readonly complianceApi = inject(CompanyComplianceApiService);
  private documentLoad = 0;
  private readonly documentsChecked = signal(false);
  protected readonly savedCompliance = signal<CompanyCompliance | null>(null);
  private readonly routeParams = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  private get id(): string {
    return this.routeParams().get('id') ?? '';
  }
  protected readonly profileError = computed(
    () => this.api.detailError(this.id) || this.api.error(),
  );
  protected readonly profilePending = computed(
    () => (this.api.loading() && !this.api.loaded()) || this.api.detailLoading(this.id),
  );
  protected readonly company = computed(() => this.store.companies().find((c) => c.id === this.id));
  protected readonly canManageStatus = computed(() => this.auth.isSuperAdmin());
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
      hint: 'Search the world’s living languages, or add a name that is not listed.',
      type: 'language',
      required: true,
      max: 80,
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
    const counted = this.sections().filter(
      (section) => section.title !== 'Documents & Policies' || this.documentsChecked(),
    );
    if (!counted.length) return 0;
    return Math.round(
      (counted.filter((section) => section.complete).length / counted.length) * 100,
    );
  });
  protected logo(company: { id: string; logo?: string }): string {
    return this.api.brandLogo?.(company.id) || company.logo || '';
  }
  protected readonly sections = computed(() => {
    const c = this.company();
    return [
      {
        title: 'General Information',
        complete: savedAreaComplete(c, 'general') ?? generalInformationComplete(c),
        fragment: 'general-information',
      },
      {
        title: 'Registration & Compliance',
        complete: savedAreaComplete(c, 'registration') ?? complianceComplete(c),
        link: ['/manage/companies', this.id, 'compliance'],
      },
      {
        title: 'Contact Information',
        complete: savedAreaComplete(c, 'contacts') ?? contactInformationComplete(c),
        link: ['/manage/companies', this.id, 'contacts'],
      },
      {
        title: 'Branches & Locations',
        complete:
          savedAreaComplete(c, 'locations') ??
          locationsComplete(
            c?.id === this.store.companyId()
              ? this.store.data().locations
              : this.store.records()[c?.id ?? '']?.locations,
          ),
        link: c?.id === this.store.companyId() ? ['/manage/locations'] : undefined,
      },
      {
        title: 'Services & Care Types',
        complete: savedAreaComplete(c, 'modules') ?? (!!c?.sector && !!c.modules.length),
        link: ['/manage/companies', this.id, 'modules'],
      },
      {
        title: 'Documents & Policies',
        complete: savedDocumentsComplete(this.savedCompliance()),
        link: ['/manage/companies', this.id, 'compliance'],
        fragment: 'rc-mapping',
      },
      {
        title: 'Roles & Permissions',
        complete: savedAreaComplete(c, 'access') === true,
        link: ['/manage/companies/access'],
      },
    ];
  });
  constructor() {
    effect(() => {
      const requested = this.queryParams().get('edit') === 'true';
      untracked(() => {
        if (requested && this.company() && !this.profilePending() && !this.editing()) this.edit();
      });
    });
    let previousId = '';
    effect(() => {
      const id = this.company()?.id;
      if (id) void this.api.ensureBrandLogo?.(id);
    });
    effect(() => {
      const id = this.routeParams().get('id') ?? '';
      if (!id) return;
      untracked(() => void this.readDocuments(id));
    });
    effect(() => {
      const company = this.company();
      if (!company || this.profilePending() || previousId === this.id) return;
      previousId = this.id;
      untracked(() => {
        this.draft = this.newDraft();
        this.editing.set(this.route.snapshot.queryParamMap.get('edit') === 'true');
        this.submitted.set(false);
        this.saveError.set('');
        this.draftAvailable.set(this.readDraft() !== null);
      });
    });
  }
  protected async retryProfile(): Promise<void> {
    if (this.api.error()) await this.api.load();
    await this.api.loadDetail(this.id);
    if (!this.api.detailError(this.id)) this.draft = this.newDraft();
    await this.readDocuments(this.id);
  }
  private async readDocuments(id: string): Promise<void> {
    const generation = ++this.documentLoad;
    this.documentsChecked.set(false);
    this.savedCompliance.set(null);
    try {
      const value = await this.complianceApi.load(id);
      if (generation !== this.documentLoad) return;
      this.savedCompliance.set(value);
    } catch {
      if (generation !== this.documentLoad) return;
      this.savedCompliance.set(null);
    }
    this.documentsChecked.set(true);
  }
  private newDraft(): Company {
    const c = this.company();
    return structuredClone({ ...c, active: c?.active ?? !!c?.modules.length } as Company);
  }
  protected managedByContacts(field: ProfileField): boolean {
    return (
      (!!this.company()?.contacts || !!this.api.details()[this.id]) &&
      (field.key === 'headOfficeAddress' || field.key === 'postcode')
    );
  }
  protected setField(key: keyof Company, value: string | number | boolean | null): void {
    if (key === 'active' && !this.canManageStatus()) return;
    this.draft = {
      ...this.draft,
      [key]: key === 'registeredPlaces' ? this.placesValue(value) : value,
    };
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
    if (
      field.type === 'number' &&
      value != null &&
      String(value).trim() !== '' &&
      wholePlaces(value) == null
    )
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
    if (this.queryParams().get('edit') === 'true') {
      void this.router.navigate(['/manage/companies', this.id], {
        queryParams: { edit: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }
  protected hasChanges(): boolean {
    if (this.profilePending()) return false;
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
  protected async save(): Promise<void> {
    this.submitted.set(true);
    this.saveError.set('');
    if (this.fields.some((f) => this.error(f))) return;
    const current = this.company();
    if (!current) return;
    const next = { ...current };
    for (const field of this.fields) {
      if (this.managedByContacts(field) || (field.key === 'active' && !this.canManageStatus()))
        continue;
      Object.assign(next, {
        [field.key]:
          field.type === 'number'
            ? wholePlaces(this.draft[field.key])
            : typeof this.draft[field.key] === 'string'
              ? String(this.draft[field.key]).trim()
              : this.draft[field.key],
      });
    }
    next.modifiedAt = new Date().toISOString();
    next.modifiedBy = this.auth.currentUser()?.name ?? 'Company administrator';
    const currentActive = current.lifecycle === 'active';
    try {
      await this.api.updateDetail(this.id, companyProfileUpdate(next));
      if ((next.active ?? false) !== currentActive) {
        await this.api.changeLifecycle(this.id, next.active ? 'active' : 'suspended');
        await this.api.loadDetail(this.id, true);
      }
    } catch (error) {
      this.saveError.set(
        error instanceof Error
          ? error.message
          : 'The company profile could not be saved. Please retry.',
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
  private placesValue(value: string | number | boolean | null): number | string | null {
    if (value == null || String(value).trim() === '') return null;
    return wholePlaces(value) ?? String(value);
  }
  protected modifiedAt(): string {
    return companyModifiedAt(this.company()?.modifiedAt);
  }
}
