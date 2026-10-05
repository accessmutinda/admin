import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Company, MODULES, ManagementStore } from '../shared/management.store';
import { ToastService } from '../../../shared/ui/toast.service';
@Component({
  selector: 'cv-company-editor',
  imports: [MatSelectModule, CvSelect, FormsModule, RouterLink],
  templateUrl: './company-editor.html',
})
export class CompanyEditor {
  protected readonly store = inject(ManagementStore);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  protected readonly isNew = this.route.snapshot.paramMap.get('id') === null;
  protected readonly existing = this.store
    .companies()
    .find((c) => c.id === this.route.snapshot.paramMap.get('id'));
  protected readonly notFound = !this.isNew && !this.existing;
  protected readonly steps = ['Company details', 'Branding', 'Modules', 'Review', 'Complete'];
  protected readonly modules = MODULES;
  protected readonly stepIcons = ['domain', 'palette', 'widgets', 'fact_check', 'celebration'];
  protected readonly stepDescriptions = [
    'Meet your company',
    'Make it yours',
    'Equip your team',
    'One final look',
    'Ready to go',
  ];
  protected readonly palettes = [
    { name: 'Coastal', primary: '#087f76', accent: '#3b82f6' },
    { name: 'Indigo', primary: '#0f2d4a', accent: '#7c3aed' },
    { name: 'Forest', primary: '#047857', accent: '#f59e0b' },
  ];
  protected readonly moduleDetails: Record<
    string,
    { icon: string; tone: string; description: string }
  > = {
    'Care delivery': {
      icon: 'favorite',
      tone: 'teal',
      description: 'Care plans, visits and person-centred records',
    },
    'People & HR': {
      icon: 'groups',
      tone: 'blue',
      description: 'Recruitment, onboarding and staff records',
    },
    'Training academy': {
      icon: 'school',
      tone: 'purple',
      description: 'Courses, certificates and development',
    },
    'Quality & compliance': {
      icon: 'verified_user',
      tone: 'green',
      description: 'Checks, audits and evidence in one place',
    },
    Finance: {
      icon: 'account_balance_wallet',
      tone: 'amber',
      description: 'Invoices, payroll and financial oversight',
    },
    'Reports & insights': {
      icon: 'monitoring',
      tone: 'blue',
      description: 'Understand performance and make informed decisions',
    },
  };
  protected readonly step = signal(0);
  protected readonly submitted = signal(false);
  protected readonly preview = signal(false);
  protected company: Company = this.existing
    ? structuredClone(this.existing)
    : {
        id: crypto.randomUUID(),
        name: '',
        code: '',
        sector: 'Domiciliary care',
        size: '11–50 staff',
        registration: '',
        postcode: '',
        color: '#087f76',
        accent: '#3b82f6',
        tagline: 'Quality care. Brighter everyday lives.',
        logo: '',
        modules: ['Care delivery', 'People & HR', 'Training academy'],
      };
  protected next(): void {
    this.submitted.set(true);
    if (this.step() === 0 && (!this.company.name.trim() || !this.company.code.trim())) return;
    if (this.step() === 2 && !this.company.modules.length) return;
    this.submitted.set(false);
    if (this.step() === 3) {
      this.store.saveCompany(this.company);
      this.toast.success(this.isNew ? 'Company created.' : 'Company profile saved.');
    }
    this.step.update((v) => v + 1);
  }
  protected hasChanges(): boolean {
    return (
      JSON.stringify(this.company) !==
      JSON.stringify(this.store.companies().find((c) => c.id === this.company.id))
    );
  }
  protected saveChanges(): void {
    this.submitted.set(true);
    if (!this.company.name.trim() || !this.company.code.trim()) {
      this.step.set(0);
      return;
    }
    if (!this.company.modules.length) {
      this.step.set(2);
      return;
    }
    this.store.saveCompany(this.company);
    this.submitted.set(false);
    this.toast.success('Company settings saved.');
  }
  protected discardChanges(): void {
    const saved = this.store.companies().find((c) => c.id === this.company.id);
    if (saved) this.company = structuredClone(saved);
    this.submitted.set(false);
  }
  protected usePalette(primary: string, accent: string): void {
    this.company.color = primary;
    this.company.accent = accent;
  }
  protected toggleModule(module: string): void {
    this.company.modules = this.company.modules.includes(module)
      ? this.company.modules.filter((m) => m !== module)
      : [...this.company.modules, module];
  }
  protected async upload(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
      this.toast.error('Choose a PNG, JPG or WebP image under 1 MB.');
      return;
    }
    this.company.logo = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }
  protected downloadPreview(): void {
    this.store.download(
      'branding-preview.txt',
      `${this.company.name}\n${this.company.tagline}\n\nDOCUMENT BRANDING PREVIEW\nPrimary: ${this.company.color}\nAccent: ${this.company.accent}\n\nCare plan\nThis document is a branding sample. No service-user record is included.`,
    );
  }
}
