import { Component, inject, signal, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/ui/toast.service';
import { ManagementStore } from '../shared/management.store';
import { MODULE_CATALOG, SUBSCRIPTION_PLANS } from './company-modules.models';
import {
  CompanyCreateDraft,
  CREATE_STEPS,
  CREATE_SECTORS,
  CREATE_SIZES,
  CREATE_REGIONS,
  STEP_FIELDS,
  newCompanySetup,
  companySetupErrors,
  prepareCreatedCompany,
  safeWorkspaceSetup,
} from './company-create.models';

interface SavedCompanyDraft {
  version: 1;
  savedAt: string;
  step: number;
  draft: CompanyCreateDraft;
}
@Component({
  selector: 'cv-company-create',
  host: { class: 'companies-page company-create-page' },
  imports: [FormsModule, RouterLink, MatSelectModule, CvSelect],
  templateUrl: './company-create.html',
})
export class CompanyCreatePage {
  protected readonly store = inject(ManagementStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly duplicateId = this.route.snapshot.queryParamMap.get('duplicate');
  private readonly source = this.store.companies().find((c) => c.id === this.duplicateId);
  protected readonly duplicating = !!this.duplicateId;
  protected readonly invalidSource = this.duplicating && !this.source;
  protected draft = newCompanySetup(
    this.source,
    this.source
      ? (this.store.records()[this.source.id] ??
          (this.source.id === this.store.companyId() ? this.store.data() : undefined))
      : undefined,
  );
  protected readonly steps = CREATE_STEPS;
  protected readonly sectors = CREATE_SECTORS;
  protected readonly sizes = CREATE_SIZES;
  protected readonly regions = CREATE_REGIONS;
  protected readonly plans = SUBSCRIPTION_PLANS.slice(1);
  protected readonly modules = MODULE_CATALOG;
  protected readonly step = signal(0);
  protected readonly submitted = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly created = signal(false);
  protected readonly reviewed = signal(false);
  protected readonly savedDraft = signal<SavedCompanyDraft | null>(null);
  protected readonly draftSavedAt = signal('');
  private baseline = JSON.stringify(this.draft);
  private savedSnapshot: string | null = null;
  private readonly key = `cv_company_create_draft:${this.auth.currentUser()?.id ?? 'signed-out'}:${this.duplicateId ?? 'new'}`;
  protected readonly addressFields = [
    { key: 'line1', label: 'Address Line 1' },
    { key: 'line2', label: 'Address Line 2' },
    { key: 'city', label: 'City' },
    { key: 'county', label: 'County' },
    { key: 'postcode', label: 'Postcode' },
    { key: 'country', label: 'Country' },
  ] as const;
  constructor() {
    if (this.invalidSource) return;
    try {
      const saved = JSON.parse(
        localStorage.getItem(this.key) ?? 'null',
      ) as SavedCompanyDraft | null;
      if (
        saved?.version === 1 &&
        saved.draft?.company?.id &&
        Array.isArray(saved.draft.company.modules) &&
        saved.draft.company.contacts?.primary &&
        saved.draft.company.contacts.addresses?.headOffice &&
        saved.draft.company.compliance &&
        saved.draft.company.subscription &&
        saved.draft.company.branding &&
        saved.draft.setup &&
        !this.store.companies().some((c) => c.id === saved.draft.company.id)
      )
        this.savedDraft.set(saved);
    } catch {
      this.notice.set('A previous draft could not be read. You can start a new setup.');
    }
  }
  protected addressPreview(): string {
    const address = this.draft.company.contacts!.addresses.headOffice;
    return (
      [address.line1, address.line2, address.city, address.county, address.postcode]
        .filter(Boolean)
        .join(', ') || 'Not provided'
    );
  }
  protected errors(): Record<string, string> {
    return companySetupErrors(this.draft.company, this.store.companies());
  }
  protected fieldError(key: string): string {
    return this.submitted() ? (this.errors()[key] ?? '') : '';
  }
  protected stageErrors(index: number): { key: string; message: string }[] {
    const errors = this.errors();
    return Object.entries(errors)
      .filter(([key]) => index === 4 || STEP_FIELDS[index]?.includes(key))
      .map(([key, message]) => ({ key, message }));
  }
  protected stageComplete(index: number): boolean {
    return index === 4
      ? this.reviewed() && !Object.keys(this.errors()).length
      : !this.stageErrors(index).length;
  }
  protected completedCount(): number {
    return this.steps.filter((_, i) => this.stageComplete(i)).length;
  }
  protected percentage(): number {
    return this.completedCount() * 20;
  }
  protected changed(): void {
    this.reviewed.set(false);
    this.error.set('');
    this.draftSavedAt.set('');
  }
  protected hasChanges(): boolean {
    return JSON.stringify(this.draft) !== this.baseline;
  }
  private safelySaved(): boolean {
    return this.savedSnapshot === JSON.stringify(this.draft);
  }
  canLeave(): boolean {
    return (
      this.created() ||
      !this.hasChanges() ||
      this.safelySaved() ||
      window.confirm('Leave without saving this company setup?')
    );
  }
  @HostListener('window:beforeunload', ['$event'])
  protected beforeUnload(event: BeforeUnloadEvent): void {
    if (!this.created() && this.hasChanges() && !this.safelySaved()) event.preventDefault();
  }
  protected selectStep(index: number): void {
    if (index < 0 || index > 4) return;
    for (let i = 0; i < index; i++)
      if (this.stageErrors(i).length) {
        this.step.set(i);
        this.submitted.set(true);
        this.error.set('Complete the highlighted fields before continuing.');
        return;
      }
    this.step.set(index);
    this.submitted.set(false);
    this.error.set('');
  }
  protected next(): void {
    if (this.step() === 4) this.create();
    else this.selectStep(this.step() + 1);
  }
  protected previous(): void {
    this.step.update((value) => Math.max(0, value - 1));
    this.submitted.set(false);
    this.error.set('');
  }
  protected toggleModule(name: string): void {
    const modules = this.draft.company.modules;
    this.draft.company.modules = modules.includes(name)
      ? modules.filter((module) => module !== name)
      : [...modules, name];
    this.changed();
  }
  protected saveDraft(): void {
    if (this.invalidSource || this.created()) return;
    if (this.savedDraft() && !window.confirm('Replace the saved draft with these setup entries?'))
      return;
    try {
      const saved: SavedCompanyDraft = {
        version: 1,
        savedAt: new Date().toISOString(),
        step: this.step(),
        draft: structuredClone(this.draft),
      };
      localStorage.setItem(this.key, JSON.stringify(saved));
      this.savedSnapshot = JSON.stringify(this.draft);
      this.draftSavedAt.set(
        new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/London',
        }).format(new Date(saved.savedAt)),
      );
      this.error.set('');
      this.savedDraft.set(null);
      this.toast.success('Company setup draft saved on this device.');
    } catch {
      this.error.set(
        'Draft could not be saved on this device. Your entries are still here; free browser storage and try again.',
      );
    }
  }
  protected resumeDraft(): void {
    const saved = this.savedDraft();
    if (!saved) return;
    this.draft = structuredClone(saved.draft);
    this.savedSnapshot = JSON.stringify(this.draft);
    this.step.set(Math.min(4, Math.max(0, saved.step)));
    this.savedDraft.set(null);
    this.reviewed.set(false);
    this.submitted.set(false);
    this.error.set('');
  }
  protected discardDraft(): void {
    if (!window.confirm('Delete this saved company setup draft?')) return;
    try {
      localStorage.removeItem(this.key);
      this.savedDraft.set(null);
      this.savedSnapshot = null;
    } catch {
      this.error.set('The saved draft could not be removed. Try again.');
    }
  }
  protected cancel(): void {
    this.router.navigate(['/manage/companies']);
  }
  protected create(): void {
    if (this.invalidSource || this.created()) return;
    this.submitted.set(true);
    this.error.set('');
    const first = STEP_FIELDS.findIndex((_, index) => this.stageErrors(index).length);
    if (first >= 0) {
      this.step.set(first);
      this.error.set('Complete the highlighted fields before creating the company.');
      return;
    }
    if (!this.reviewed()) {
      this.step.set(4);
      this.error.set('Confirm that you have reviewed the company details.');
      return;
    }
    if (this.store.companies().some((c) => c.id === this.draft.company.id)) {
      this.error.set('This company was already created. Return to Companies to open it.');
      return;
    }
    const company = prepareCreatedCompany(this.draft.company);
    company.modifiedAt = new Date().toISOString();
    company.modifiedBy = this.auth.currentUser()?.name ?? 'Company administrator';
    if (!this.store.saveCompany(company, safeWorkspaceSetup(this.draft.setup))) {
      this.error.set(
        'Company could not be created. Your setup is still here; check storage and try again.',
      );
      return;
    }
    this.draft.company = company;
    this.created.set(true);
    this.baseline = JSON.stringify(this.draft);
    try {
      localStorage.removeItem(this.key);
      this.savedDraft.set(null);
    } catch {
      this.notice.set('Company created. The saved draft could not be removed from this device.');
    }
    this.toast.success('Company created.');
  }
}
