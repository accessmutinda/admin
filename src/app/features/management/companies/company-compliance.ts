import {
  Component,
  computed,
  inject,
  signal,
  HostListener,
  ChangeDetectorRef,
  DestroyRef,
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
})
export class CompanyCompliancePage {
  protected readonly store = inject(ManagementStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly detector = inject(ChangeDetectorRef);
  private readonly destroy = inject(DestroyRef);
  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly company = computed(() => this.store.companies().find((c) => c.id === this.id));
  protected draft = emptyCompliance(this.company());
  private baseline = JSON.stringify(this.draft);
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
      ? (complianceErrors(this.draft, this.company()?.registration ?? '')[key] ?? '')
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
    return (
      (!this.uploading() && !this.hasChanges()) ||
      window.confirm('Discard unsaved registration and compliance changes?')
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
  protected async upload(key: ComplianceDocumentKey, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.uploading()) return;
    const error = complianceFileError(file);
    this.fileErrors.update((errors) => ({ ...errors, [key]: error }));
    if (error) return;
    this.uploading.set(key);
    try {
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          typeof reader.result === 'string' ? resolve(reader.result) : reject();
        reader.onerror = () => reject();
        reader.readAsDataURL(file);
      });
      if (this.destroy.destroyed) return;
      const previous = this.draft.documents[key];
      this.draft.documents[key] = {
        name: file.name,
        type:
          file.type ||
          (file.name.toLowerCase().endsWith('.pdf')
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
        size: file.size,
        content,
        uploadedAt: new Date().toISOString(),
        uploadedBy: this.auth.currentUser()?.name ?? 'Company administrator',
        owner: previous?.owner ?? '',
        expiry: previous?.expiry ?? '',
      };
      this.error.set('');
    } catch {
      if (!this.destroy.destroyed)
        this.fileErrors.update((errors) => ({
          ...errors,
          [key]: 'File could not be read. Please try again.',
        }));
    } finally {
      if (!this.destroy.destroyed) {
        this.uploading.set(null);
        this.detector.detectChanges();
      }
    }
  }
  protected remove(key: ComplianceDocumentKey): void {
    if (!window.confirm('Remove this document? The change is applied when you save.')) return;
    delete this.draft.documents[key];
    this.fileErrors.update((errors) => ({ ...errors, [key]: '' }));
  }
  protected download(key: ComplianceDocumentKey): void {
    const file = this.draft.documents[key];
    if (!file) return;
    try {
      const payload = file.content.split(',')[1];
      const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: file.type }));
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      this.fileErrors.update((errors) => ({
        ...errors,
        [key]: 'This stored file could not be downloaded. Replace it and save again.',
      }));
    }
  }
  protected cancel(): void {
    if (
      this.uploading() ||
      (this.hasChanges() && !window.confirm('Discard unsaved registration and compliance changes?'))
    )
      return;
    this.draft = emptyCompliance(this.company());
    this.baseline = JSON.stringify(this.draft);
    this.router.navigate(['/manage/companies']);
  }
  protected save(): void {
    this.submitted.set(true);
    this.error.set('');
    if (this.uploading()) {
      this.error.set('Wait for the document to finish loading.');
      return;
    }
    const company = this.company();
    if (!company) return;
    if (Object.keys(complianceErrors(this.draft, company.registration)).length) {
      this.error.set('Check the highlighted registration and document fields.');
      return;
    }
    const compliance = structuredClone(this.draft);
    for (const field of this.fields) compliance[field.key] = compliance[field.key].trim();
    for (const document of Object.values(compliance.documents))
      document.owner = document.owner.trim();
    if (
      !this.store.saveCompany({
        ...company,
        compliance,
        modifiedAt: new Date().toISOString(),
        modifiedBy: this.auth.currentUser()?.name ?? 'Company administrator',
      })
    ) {
      this.error.set(
        'Changes could not be saved on this device. Your edits and files are still here; free browser storage and try again.',
      );
      return;
    }
    this.draft = structuredClone(compliance);
    this.baseline = JSON.stringify(this.draft);
    this.submitted.set(false);
    this.toast.success('Registration and compliance information saved.');
  }
}
