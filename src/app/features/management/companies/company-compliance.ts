import { toSignal } from '@angular/core/rxjs-interop';
import { CompanyComplianceApiService } from './company-compliance-api.service';
import { CompaniesApiService } from './companies-api.service';
import {
  Component,
  computed,
  inject,
  signal,
  HostListener,
  DestroyRef,
  effect,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/ui/toast.service';
import { ManagementStore } from '../shared/management.store';
import { companyModifiedAt } from './company-profile.models';
import {
  COMPLIANCE_DOCUMENTS,
  ComplianceDocumentKey,
  CompanyCompliance,
  emptyCompliance,
  PROVIDER_TYPES,
  REGISTRATION_STATUSES,
  INSPECTION_TYPES,
  complianceErrors,
  complianceChecks,
  complianceFileError,
  daysUntil,
} from './company-compliance.models';

@Component({
  selector: 'cv-company-compliance',
  host: { class: 'module-page companies-page company-profile-page company-compliance-page' },
  imports: [FormsModule, RouterLink, MatSelectModule, CvSelect],
  templateUrl: './company-compliance.html',
  providers: [CompanyComplianceApiService],
})
export class CompanyCompliancePage {
  protected readonly store = inject(ManagementStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly api = inject(CompanyComplianceApiService);
  private readonly companiesApi = inject(CompaniesApiService);
  private readonly destroy = inject(DestroyRef);
  private readonly routeParams = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private get id(): string {
    return this.routeParams().get('id') ?? '';
  }
  protected readonly company = computed(() => this.store.companies().find((c) => c.id === this.id));
  protected draft = emptyCompliance(this.company());
  private baseline = JSON.stringify(this.draft);
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly saving = signal(false);
  protected readonly busy = computed(() => this.loading() || this.saving() || !!this.uploading());
  private loadGeneration = 0;
  constructor() {
    effect(() => {
      const id = this.id;
      const allowed = this.auth.canAccessCompany(id);
      this.auth.profile()?.id;
      untracked(() => {
        if (allowed) void this.load(true);
        else {
          this.draft = emptyCompliance();
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
      !window.confirm('Discard unsaved changes and reload saved compliance information?')
    )
      return;
    const generation = ++this.loadGeneration;
    const id = this.id;
    this.loading.set(true);
    this.loadError.set('');
    this.error.set('');
    this.draft = emptyCompliance();
    this.baseline = JSON.stringify(this.draft);
    try {
      const saved = await this.api.load(id);
      if (generation !== this.loadGeneration || this.destroy.destroyed || id !== this.id) return;
      this.draft = saved;
      this.baseline = JSON.stringify(saved);
      this.submitted.set(false);
    } catch (error) {
      if (generation === this.loadGeneration && !this.destroy.destroyed)
        this.loadError.set(
          error instanceof Error ? error.message : 'Unable to load compliance information.',
        );
    } finally {
      if (generation === this.loadGeneration && !this.destroy.destroyed) this.loading.set(false);
    }
  }
  protected options(field: (typeof this.fields)[number]): string[] {
    const value = this.draft[field.key];
    return value && field.options && !field.options.includes(value)
      ? [value, ...field.options]
      : (field.options ?? []);
  }
  private async refreshSummary(id: string): Promise<void> {
    await this.companiesApi.load(true);
    await this.companiesApi.loadDetail(id, true);
  }
  protected readonly modifiedAt = companyModifiedAt;
  protected readonly documentTypes = COMPLIANCE_DOCUMENTS;
  protected readonly error = signal('');
  protected readonly submitted = signal(false);
  protected readonly uploading = signal<ComplianceDocumentKey | null>(null);
  protected readonly fileErrors = signal<Partial<Record<ComplianceDocumentKey, string>>>({});
  protected readonly review = signal(false);
  protected readonly fields: {
    key: Exclude<keyof CompanyCompliance, 'documents' | 'reminders'>;
    label: string;
    required?: boolean;
    options?: string[];
    type?: string;
  }[] = [
    { key: 'cqcNumber', label: 'CQC Registration Number', required: true },
    { key: 'taxNumber', label: 'VAT / Tax Number' },
    {
      key: 'providerType',
      label: 'Registered Provider Type',
      required: true,
      options: PROVIDER_TYPES,
    },
    {
      key: 'registrationStatus',
      label: 'Registration Status',
      required: true,
      options: REGISTRATION_STATUSES,
    },
    { key: 'inspectionType', label: 'Inspection Type', options: INSPECTION_TYPES },
    { key: 'insuranceExpiry', label: 'Insurance Expiry Date', required: true, type: 'date' },
    { key: 'regulatoryRegion', label: 'Regulatory Region', required: true },
    { key: 'dataProtectionNumber', label: 'Data Protection Registration', required: true },
    { key: 'safeguardingLead', label: 'Safeguarding Lead', required: true },
    { key: 'medicationLead', label: 'Medication Governance Lead', required: true },
  ];
  protected fieldError(key: string): string {
    return this.submitted()
      ? (complianceErrors(this.draft, this.company()?.registration ?? '', false)[key] ?? '')
      : '';
  }
  protected checks() {
    return complianceChecks(this.draft, this.company()?.registration ?? '');
  }
  protected checkState(key: string, complete: boolean): string {
    if (complete) return 'Complete';
    const started =
      key === 'details'
        ? this.fields.some((field) => !!this.draft[field.key].trim())
        : key === 'insurance'
          ? !!this.draft.insuranceExpiry || !!this.draft.documents.insurance
          : key === 'documents'
            ? Object.keys(this.draft.documents).length > 0
            : key === 'owners'
              ? !!this.draft.safeguardingLead.trim() ||
                !!this.draft.medicationLead.trim() ||
                Object.values(this.draft.documents).some((file) => !!file.owner.trim())
              : false;
    return started ? 'In Progress' : 'Pending';
  }
  protected completion(): number {
    return Math.round(
      (this.checks().filter((c) => c.complete).length / this.checks().length) * 100,
    );
  }
  protected alerts(): { title: string; detail: string; target: string; urgent: boolean }[] {
    const alerts: { title: string; detail: string; target: string; urgent: boolean }[] = [];
    if (this.draft.insuranceExpiry) {
      const days = daysUntil(this.draft.insuranceExpiry);
      if (days !== null && days <= 90)
        alerts.push({
          title: days < 0 ? 'Insurance expiry has passed' : 'Insurance renewal approaching',
          detail: days < 0 ? `Expired ${Math.abs(days)} days ago` : `Expires in ${days} days`,
          target: 'rc-insuranceExpiry',
          urgent: days < 0,
        });
    }
    for (const { key, name } of COMPLIANCE_DOCUMENTS) {
      const document = this.draft.documents[key];
      if (!document)
        alerts.push({
          title: `${name} missing`,
          detail: 'Upload supporting evidence',
          target: `rc-document-${key}`,
          urgent: false,
        });
      else {
        const days = daysUntil(document.expiry);
        if (days !== null && days <= 90)
          alerts.push({
            title: `${name} ${days < 0 ? 'expired' : 'expiring soon'}`,
            detail: days < 0 ? `Expired ${Math.abs(days)} days ago` : `Expires in ${days} days`,
            target: `rc-document-${key}`,
            urgent: days < 0,
          });
      }
    }
    return alerts;
  }
  protected hasChanges(): boolean {
    return JSON.stringify(this.draft) !== this.baseline;
  }
  canLeave(): boolean {
    if (!this.auth.canAccessCompany(this.id)) return true;
    if (this.busy()) return false;
    return (
      !this.hasChanges() || window.confirm('Discard unsaved registration and compliance changes?')
    );
  }
  @HostListener('window:beforeunload', ['$event'])
  protected beforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasChanges() || this.uploading()) event.preventDefault();
  }
  protected focus(target: string): void {
    const element = document.getElementById(target);
    element?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    element?.focus();
  }
  private documentSaved(
    key: ComplianceDocumentKey,
    file?: CompanyCompliance['documents'][ComplianceDocumentKey],
  ): void {
    const saved = JSON.parse(this.baseline) as CompanyCompliance;
    if (file) {
      this.draft.documents[key] = file;
      saved.documents[key] = structuredClone(file);
    } else {
      delete this.draft.documents[key];
      delete saved.documents[key];
    }
    this.baseline = JSON.stringify(saved);
  }
  protected async upload(key: ComplianceDocumentKey, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.busy()) return;
    const error = complianceFileError(file);
    this.fileErrors.update((errors) => ({ ...errors, [key]: error }));
    if (error) return;
    const id = this.id;
    this.uploading.set(key);
    try {
      const saved = await this.api.upload(id, key, file, this.draft);
      if (this.destroy.destroyed || id !== this.id) return;
      this.documentSaved(key, saved);
      this.error.set('');
      this.toast.success('Document saved to the server.');
    } catch (error) {
      if (!this.destroy.destroyed)
        this.fileErrors.update((errors) => ({
          ...errors,
          [key]: error instanceof Error ? error.message : 'The document could not be saved.',
        }));
    } finally {
      if (!this.destroy.destroyed) this.uploading.set(null);
    }
  }
  protected async remove(key: ComplianceDocumentKey): Promise<void> {
    if (
      this.busy() ||
      !window.confirm('Delete this saved document? Its audit history will be retained.')
    )
      return;
    this.saving.set(true);
    try {
      await this.api.remove(this.id, key, this.draft);
      this.documentSaved(key);
      this.fileErrors.update((errors) => ({ ...errors, [key]: '' }));
      this.toast.success('Document deleted.');
    } catch (error) {
      this.fileErrors.update((errors) => ({
        ...errors,
        [key]: error instanceof Error ? error.message : 'The document could not be deleted.',
      }));
    } finally {
      this.saving.set(false);
    }
  }
  protected async download(key: ComplianceDocumentKey): Promise<void> {
    if (this.busy()) return;
    const file = this.draft.documents[key];
    if (!file) return;
    this.saving.set(true);
    try {
      const blob = await this.api.download(this.id, key, this.draft);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      this.fileErrors.update((errors) => ({
        ...errors,
        [key]: error instanceof Error ? error.message : 'The document could not be downloaded.',
      }));
    } finally {
      this.saving.set(false);
    }
  }
  protected cancel(): void {
    if (
      this.busy() ||
      (this.hasChanges() && !window.confirm('Discard unsaved registration and compliance changes?'))
    )
      return;
    this.draft = emptyCompliance(this.company());
    this.baseline = JSON.stringify(this.draft);
    this.router.navigate(['/manage/companies']);
  }
  protected async save(): Promise<void> {
    if (this.busy()) return;
    this.submitted.set(true);
    this.error.set('');
    const company = this.company();
    if (!company) return;
    if (Object.keys(complianceErrors(this.draft, company.registration, false)).length) {
      this.error.set('Check the highlighted registration and document fields.');
      return;
    }
    const id = this.id;
    this.saving.set(true);
    try {
      const saved = await this.api.save(id, this.draft);
      this.draft = saved;
      this.baseline = JSON.stringify(saved);
      this.submitted.set(false);
      this.toast.success('Registration and compliance information saved.');
      await this.refreshSummary(id);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'The changes could not be saved.');
    } finally {
      this.saving.set(false);
    }
  }
  protected async clear(): Promise<void> {
    if (
      this.busy() ||
      !window.confirm(
        'Clear all saved compliance details? Company identity and documents will be kept.',
      )
    )
      return;
    const id = this.id;
    this.saving.set(true);
    this.error.set('');
    try {
      const saved = await this.api.clear(id);
      this.draft = saved;
      this.baseline = JSON.stringify(saved);
      this.submitted.set(false);
      this.toast.success('Compliance details cleared.');
      await this.refreshSummary(id);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'The details could not be cleared.');
    } finally {
      this.saving.set(false);
    }
  }
}
