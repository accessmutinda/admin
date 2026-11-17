import {
  CompanyBrandingApi,
  CompanyBrandingRecord,
  CompanyBrandAsset,
} from './company-branding-api.service';
import { CompanyUnavailable } from '../shared/company-unavailable';
import { Skeleton } from '../../../shared/ui/skeleton';
import { CompanyLoading } from './company-loading';
import { CompaniesApiService } from './companies-api.service';
import {
  Component,
  HostListener,
  DestroyRef,
  computed,
  effect,
  untracked,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { A11yModule } from '@angular/cdk/a11y';
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
  host: {
    class: 'module-page companies-page company-profile-page company-branding-page',
    '[attr.inert]': 'saving() || uploading() ? "" : null',
  },
  imports: [
    CompanyUnavailable,
    Skeleton,
    CompanyLoading,
    FormsModule,
    RouterLink,
    A11yModule,
    MatSelectModule,
    CvSelect,
  ],
  templateUrl: './company-branding.html',
})
export class CompanyBrandingPage {
  protected readonly store = inject(ManagementStore);
  protected readonly dataApi = inject(CompaniesApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly brandingApi = inject(CompanyBrandingApi);
  protected readonly record = signal<CompanyBrandingRecord | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly pendingAssets = signal<CompanyBrandAsset[]>([]);
  protected readonly scannerUnavailable = computed(() =>
    this.pendingAssets().some((asset) => !asset.scanner_configured),
  );
  private readonly urls = new Set<string>();
  private alive = true;
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
  protected readonly confirmingDiscard = signal(false);
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
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.alive = false;
      const keep = this.dataApi.brandLogo(this.id);
      for (const url of this.urls) if (url !== keep) URL.revokeObjectURL(url);
    });
    let hydrated = '';
    effect(() => {
      const company = this.company();
      if (!company || hydrated === company.id) return;
      hydrated = company.id;
      untracked(() => {
        void this.loadBranding();
      });
    });
  }
  protected async loadBranding() {
    if (!this.company()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      await this.accept(await this.brandingApi.load(this.id));
    } catch (error) {
      this.error.set((error as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
  private async accept(record: CompanyBrandingRecord) {
    if (!this.alive || !this.company()) return;
    const draft = this.brandingApi.theme(record, this.company()!);
    for (const kind of ['logo', 'favicon'] as const) {
      const asset = draft[kind === 'logo' ? 'logoAssetId' : 'faviconAssetId'];
      if (asset) {
        const blob = await this.brandingApi.content(this.id, asset);
        if (!this.alive) return;
        const url = URL.createObjectURL(blob);
        this.urls.add(url);
        draft[kind] = url;
      }
    }
    this.record.set(record);
    this.draft = draft;
    this.baseline = JSON.stringify(draft);
    this.pendingAssets.set([]);
    this.publishLogo();
  }
  protected removeAsset(kind: 'logo' | 'favicon') {
    this.draft[kind] = '';
    this.draft[kind === 'logo' ? 'logoAssetId' : 'faviconAssetId'] = null;
    this.pendingAssets.update((rows) => rows.filter((asset) => asset.kind !== kind));
    if (kind === 'logo') this.publishLogo();
  }
  protected async refreshAssets() {
    this.uploading.set(true);
    this.assetError.set('');
    try {
      for (const pending of this.pendingAssets()) {
        const asset = await this.brandingApi.asset(this.id, pending.id);
        if (asset.state === 'clean') {
          this.draft[asset.kind === 'logo' ? 'logoAssetId' : 'faviconAssetId'] = asset.id;
          this.pendingAssets.update((rows) => rows.filter((row) => row.id !== asset.id));
        } else if (asset.state === 'infected' || asset.state === 'rejected') {
          const saved = JSON.parse(this.baseline) as CompanyBranding;
          this.draft[asset.kind] = saved[asset.kind];
          const key = asset.kind === 'logo' ? 'logoAssetId' : 'faviconAssetId';
          this.draft[key] = saved[key];
          this.pendingAssets.update((rows) => rows.filter((row) => row.id !== asset.id));
          this.assetError.set(
            'This file did not pass its security check. Choose a different image.',
          );
        }
      }
    } catch (error) {
      this.assetError.set((error as Error).message);
    } finally {
      this.publishLogo();
      this.uploading.set(false);
    }
  }
  protected setTab(key: BrandingTab): void {
    this.tab.set(key);
    this.preview.set(key === 'emails' ? 'email' : key === 'documents' ? 'document' : 'login');
  }
  protected hasChanges(): boolean {
    return this.baseline !== JSON.stringify(this.draft);
  }
  canLeave(): boolean {
    if (this.saving() || this.uploading()) return false;
    return (
      !this.hasChanges() ||
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
      const asset = await this.brandingApi.upload(this.id, file, kind);
      const url = URL.createObjectURL(file);
      this.urls.add(url);
      this.draft[kind] = url;
      if (kind === 'logo') this.publishLogo();
      if (asset.state === 'clean')
        this.draft[kind === 'logo' ? 'logoAssetId' : 'faviconAssetId'] = asset.id;
      else this.pendingAssets.update((rows) => [...rows.filter((row) => row.kind !== kind), asset]);
    } catch (error) {
      this.assetError.set((error as Error).message);
    } finally {
      this.uploading.set(false);
      input.value = '';
    }
  }
  protected reset(): void {
    this.draft = defaultCompanyBranding(this.company()?.name ?? '', this.company()?.code ?? '');
    this.pendingAssets.set([]);
    this.error.set('');
    this.assetError.set('');
    this.submitted.set(false);
    this.publishLogo();
  }
  protected discard(): void {
    this.draft = JSON.parse(this.baseline) as CompanyBranding;
    this.pendingAssets.set([]);
    this.baseline = JSON.stringify(this.draft);
    this.error.set('');
    this.assetError.set('');
    this.submitted.set(false);
    this.confirmingDiscard.set(false);
    this.publishLogo();
  }
  private publishLogo(): void {
    this.dataApi.rememberBrandLogo(this.id, this.draft.logo);
  }
  protected publishBlockReason(): string {
    if (this.uploading()) return 'Publishing is paused while an image is uploading.';
    if (this.saving()) return 'Publishing is paused while branding is being saved.';
    if (this.loading()) return 'Publishing is unavailable while branding settings are loading.';
    if (!this.record())
      return 'Publishing is unavailable because the branding record could not be loaded. Use Retry branding and try again.';
    if (this.pendingAssets().length)
      return this.scannerUnavailable()
        ? 'Publishing is unavailable until uploaded images pass a security check. Image scanning is not configured. Contact your platform administrator.'
        : 'Publishing is unavailable until uploaded images pass their security check. Refresh image checks after they are approved.';
    return '';
  }
  protected async save(publish = false): Promise<void> {
    if (this.uploading() || this.saving() || this.pendingAssets().length || !this.record()) return;
    this.submitted.set(true);
    this.error.set('');
    if (this.invalidFields().length || !this.company()) return;
    this.saving.set(true);
    try {
      let record = await this.brandingApi.save(this.id, this.draft, this.record()!.etag);
      this.record.set(record);
      if (publish) record = await this.brandingApi.publish(this.id, record.etag);
      await this.accept(record);
      await this.dataApi.refreshCompany(this.id);
      this.submitted.set(false);
      this.toast.success(
        publish
          ? 'Branding version published. Live domain and email delivery require configured services.'
          : 'Theme saved. Published branding is unchanged.',
      );
    } catch (error) {
      const fields = (error as { fieldErrors?: Record<string, string[]> }).fieldErrors;
      this.error.set(
        fields && Object.keys(fields).length
          ? Object.entries(fields)
              .map(([field, messages]) => `${field}: ${messages.join(' ')}`)
              .join(' ')
          : (error as Error).message,
      );
    } finally {
      this.saving.set(false);
    }
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
