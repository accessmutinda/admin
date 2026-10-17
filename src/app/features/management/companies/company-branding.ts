import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/ui/toast.service';
import { ManagementStore } from '../shared/management.store';
import { companyModifiedAt } from './company-profile.models';
import { validContactEmail } from './company-contacts.models';
import {
  BRANDING_FONTS,
  BrandingPreview,
  BrandingTab,
  CompanyBranding,
  EmailTemplateKey,
  defaultCompanyBranding,
  initialCompanyBranding,
  validBrandColor,
  validBrandUrl,
} from './company-branding.models';

@Component({
  selector: 'cv-company-branding',
  host: { class: 'module-page companies-page company-profile-page company-branding-page' },
  imports: [FormsModule, RouterLink, MatSelectModule, CvSelect],
  templateUrl: './company-branding.html',
})
export class CompanyBrandingPage {
  protected readonly store = inject(ManagementStore);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  protected readonly company = computed(() => this.store.companies().find((c) => c.id === this.id));
  protected draft = this.company()
    ? initialCompanyBranding(this.company()!)
    : defaultCompanyBranding('', '');
  private baseline = JSON.stringify(this.draft);
  protected readonly tab = signal<BrandingTab>('theme');
  protected readonly preview = signal<BrandingPreview>('login');
  protected readonly emailTemplate = signal<EmailTemplateKey>('welcome');
  protected readonly submitted = signal(false);
  protected readonly error = signal('');
  protected readonly assetError = signal('');
  protected readonly uploading = signal(false);
  protected readonly modifiedAt = companyModifiedAt;
  protected readonly previewInitials = computed(() => this.auth.currentUser()?.initials ?? 'CV');
  protected readonly fonts = BRANDING_FONTS;
  protected readonly tabs: { key: BrandingTab; label: string }[] = [
    { key: 'theme', label: 'Branding & Theme' },
    { key: 'emails', label: 'Email Templates' },
    { key: 'documents', label: 'Document Templates' },
    { key: 'portal', label: 'Portal Settings' },
  ];
  protected readonly previews: { key: BrandingPreview; label: string }[] = [
    { key: 'login', label: 'Portal Login' },
    { key: 'header', label: 'Portal Header' },
    { key: 'email', label: 'Email Example' },
    { key: 'document', label: 'Document Header' },
  ];
  protected readonly colorFields: {
    key: 'primaryColor' | 'secondaryColor' | 'accentColor';
    label: string;
    hint: string;
  }[] = [
    {
      key: 'primaryColor',
      label: 'Primary Colour',
      hint: 'Headers, buttons and primary elements.',
    },
    {
      key: 'secondaryColor',
      label: 'Secondary Colour',
      hint: 'Supporting elements and highlights.',
    },
    { key: 'accentColor', label: 'Accent Colour', hint: 'Calls to action and accent elements.' },
  ];
  protected readonly assetFields: {
    key: 'logo' | 'favicon';
    label: string;
    hint: string;
    accept: string;
  }[] = [
    {
      key: 'logo',
      label: 'Company Logo',
      hint: 'Recommended: 400 × 200px. PNG, JPG, WebP or SVG, up to 2 MB.',
      accept: 'image/png,image/jpeg,image/webp,image/svg+xml',
    },
    {
      key: 'favicon',
      label: 'Favicon',
      hint: 'Recommended: 32 × 32px. PNG or ICO, up to 1 MB.',
      accept: 'image/png,image/x-icon,image/vnd.microsoft.icon,.ico',
    },
  ];
  protected setTab(key: BrandingTab): void {
    this.tab.set(key);
    this.preview.set(key === 'emails' ? 'email' : key === 'documents' ? 'document' : 'login');
  }
  protected hasChanges(): boolean {
    return this.baseline !== JSON.stringify(this.draft);
  }
  canLeave(): boolean {
    return (
      (!this.hasChanges() && !this.uploading()) ||
      window.confirm('You have unsaved branding changes. Leave without saving?')
    );
  }
  @HostListener('window:beforeunload', ['$event'])
  protected beforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasChanges() || this.uploading()) event.preventDefault();
  }
  protected color(key: 'primaryColor' | 'secondaryColor' | 'accentColor'): string {
    return validBrandColor(this.draft[key]) ? this.draft[key] : '#008afa';
  }
  protected colorInvalid(key: 'primaryColor' | 'secondaryColor' | 'accentColor'): boolean {
    return !validBrandColor(this.draft[key]);
  }
  protected previewFont(): string {
    return (
      (this.fonts.includes(this.draft.fontFamily) ? this.draft.fontFamily : 'Lato') +
      ', var(--font-sans)'
    );
  }
  protected subdomainError(): string {
    const value = this.draft.subdomain.trim();
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value))
      return 'Use 1–63 lowercase letters, numbers or hyphens; start and end with a letter or number.';
    if (['www', 'admin', 'api', 'app', 'mail', 'support'].includes(value))
      return 'This subdomain is reserved.';
    if (
      this.store
        .companies()
        .some(
          (c) =>
            c.id !== this.id &&
            (c.branding?.subdomain === value || c.publishedBranding?.theme.subdomain === value),
        )
    )
      return 'Another company on this device uses this subdomain.';
    return '';
  }
  protected invalidFields(): string[] {
    const errors: string[] = [];
    for (const field of this.colorFields)
      if (this.colorInvalid(field.key)) errors.push(field.label + ': use a six-digit hex colour.');
    if (!this.fonts.includes(this.draft.fontFamily)) errors.push('Choose a supported font family.');
    if (this.subdomainError()) errors.push('Portal subdomain: ' + this.subdomainError());
    if (
      this.draft.customWelcome &&
      (!this.draft.welcomeMessage.trim() || this.draft.welcomeMessage.length > 200)
    )
      errors.push('Welcome message must contain 1–200 characters.');
    if (
      this.draft.useCustomSender &&
      (!this.draft.senderName.trim() || !validContactEmail(this.draft.senderEmail))
    )
      errors.push('Custom sender needs a name and a valid email address.');
    for (const template of Object.values(this.draft.emailTemplates))
      if (
        !template.subject.trim() ||
        template.subject.length > 120 ||
        !template.body.trim() ||
        template.body.length > 2000
      )
        errors.push(
          'Each email template needs a subject (up to 120 characters) and message (up to 2000 characters).',
        );
    if (this.draft.portal.supportEmail && !validContactEmail(this.draft.portal.supportEmail))
      errors.push('Enter a valid support email in Portal Settings.');
    if (!validBrandUrl(this.draft.portal.privacyUrl) || !validBrandUrl(this.draft.portal.termsUrl))
      errors.push('Privacy and terms links must use http or https.');
    if (!['standard', 'compact'].includes(this.draft.document.headerStyle))
      errors.push('Choose a document header style.');
    if (this.draft.document.footer.length > 200 || this.draft.emailFooter.length > 200)
      errors.push('Keep document and email footers within 200 characters.');
    return errors;
  }
  protected async upload(event: Event, kind: 'logo' | 'favicon'): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.assetError.set('');
    const allowed =
      kind === 'logo'
        ? ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
        : ['image/png', 'image/x-icon', 'image/vnd.microsoft.icon'];
    if (
      (!allowed.includes(file.type) &&
        !(kind === 'favicon' && !file.type && /\.ico$/i.test(file.name))) ||
      file.size > (kind === 'logo' ? 2 : 1) * 1024 * 1024
    ) {
      this.assetError.set(
        kind === 'logo'
          ? 'Choose a PNG, JPG, WebP or SVG logo up to 2 MB.'
          : 'Choose a PNG or ICO favicon up to 1 MB.',
      );
      input.value = '';
      return;
    }
    this.uploading.set(true);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = data;
      });
      this.draft[kind] = data;
    } catch {
      this.assetError.set('This image could not be read. Choose a valid image file.');
    } finally {
      this.uploading.set(false);
      input.value = '';
    }
  }
  protected reset(): void {
    this.draft = defaultCompanyBranding(this.company()?.name ?? '', this.company()?.code ?? '');
    this.error.set('');
    this.assetError.set('');
    this.submitted.set(false);
  }
  protected discard(): void {
    if (this.company()) this.draft = initialCompanyBranding(this.company()!);
    this.baseline = JSON.stringify(this.draft);
    this.error.set('');
    this.assetError.set('');
    this.submitted.set(false);
  }
  protected save(publish = false): void {
    if (this.uploading()) return;
    this.submitted.set(true);
    this.error.set('');
    if (this.invalidFields().length) return;
    const company = this.company();
    if (!company) return;
    const theme = structuredClone(this.draft);
    theme.subdomain = theme.subdomain.trim();
    theme.senderName = theme.senderName.trim();
    theme.senderEmail = theme.senderEmail.trim();
    const now = new Date().toISOString();
    const actor = this.auth.currentUser()?.name ?? 'Company administrator';
    if (
      !this.store.saveCompany({
        ...company,
        logo: theme.logo,
        color: theme.primaryColor,
        accent: theme.accentColor,
        branding: theme,
        modifiedAt: now,
        modifiedBy: actor,
        ...(publish
          ? {
              publishedBranding: {
                theme: structuredClone(theme),
                publishedAt: now,
                publishedBy: actor,
              },
            }
          : {}),
      })
    ) {
      this.error.set(
        'Branding could not be saved on this device. Your changes are still here; free some browser storage and try again.',
      );
      return;
    }
    this.draft = theme;
    this.baseline = JSON.stringify(theme);
    this.submitted.set(false);
    this.toast.success(
      publish
        ? 'Approved branding saved on this device. Live portal publishing is not connected.'
        : 'Theme saved. The published branding has not changed.',
    );
  }
  protected templateText(value: string): string {
    return value
      .replaceAll('{{companyName}}', this.company()?.name ?? 'Your company')
      .replaceAll('{{recipientName}}', 'Alex');
  }
  protected address(): string {
    return (
      [this.company()?.headOfficeAddress, this.company()?.postcode].filter(Boolean).join(', ') ||
      'Company address not recorded'
    );
  }
}
