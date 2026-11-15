import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyBranding, defaultCompanyBranding } from './company-branding.models';

export interface CompanyBrandingRecord {
  company_id: string;
  etag: string;
  version: number;
  defaults: Record<string, any>;
  draft: Record<string, any>;
  published: Record<string, any> | null;
  published_at: string | null;
  published_by: { name: string } | null;
}
export interface CompanyBrandAsset {
  id: string;
  company_id: string;
  kind: 'logo' | 'favicon';
  etag: string;
  state: 'uploading' | 'quarantined' | 'clean' | 'infected' | 'rejected';
  scanner_configured: boolean;
}
const THEME_FIELDS = {
  primaryColor: 'primary_colour',
  secondaryColor: 'secondary_colour',
  accentColor: 'accent_colour',
  fontFamily: 'font',
  subdomain: 'subdomain',
  showPlatformBranding: 'show_platform_branding',
  customWelcome: 'custom_welcome',
  welcomeMessage: 'welcome_message',
  useCustomSender: 'use_custom_sender',
  senderName: 'sender_name',
  senderEmail: 'sender_email',
  emailFooter: 'email_footer',
} as const;
const PORTAL_FIELDS = {
  language: 'language',
  timezone: 'timezone',
  supportEmail: 'support_email',
  privacyUrl: 'privacy_url',
  termsUrl: 'terms_url',
  microsoftSignIn: 'microsoft_signin_preference',
} as const;

@Injectable({ providedIn: 'root' })
export class CompanyBrandingApi {
  private readonly auth = inject(AuthService);
  private root(id: string) {
    return `/companies/${encodeURIComponent(id)}/branding`;
  }
  private context(id: string) {
    if (!this.auth.isAuthenticated() || !this.auth.canAccessCompany(id))
      throw Error('Company branding is unavailable to this account.');
    return `${this.auth.profile()?.id}:${this.auth.profile()?.company_id}`;
  }
  private check(id: string, scope: string) {
    if (scope !== this.context(id))
      throw Error('The company account changed. Reopen Branding before continuing.');
  }
  private accept(id: string, value: CompanyBrandingRecord, scope: string) {
    this.check(id, scope);
    if (value.company_id !== id || !value.etag || !value.draft || !value.defaults)
      throw Error('Branding records could not be read. Reload this page.');
    return value;
  }
  async load(id: string) {
    const scope = this.context(id);
    return this.accept(id, await this.auth.api<CompanyBrandingRecord>(this.root(id)), scope);
  }
  theme(
    record: CompanyBrandingRecord,
    company: { name: string; code: string },
    published = false,
  ): CompanyBranding {
    const result = defaultCompanyBranding(company.name, company.code);
    const data = { ...record.defaults, ...(published ? record.published : record.draft) };
    for (const [key, field] of Object.entries(THEME_FIELDS))
      if (data[field] !== undefined) (result as any)[key] = data[field];
    for (const [key, field] of Object.entries(PORTAL_FIELDS))
      if (data['portal']?.[field] !== undefined)
        (result.portal as any)[key] = data['portal'][field];
    for (const key of ['welcome', 'invitation', 'notification'] as const) {
      if (data[key + '_subject'] !== undefined)
        result.emailTemplates[key].subject = data[key + '_subject'];
      if (data[key + '_body'] !== undefined) result.emailTemplates[key].body = data[key + '_body'];
    }
    result.document = {
      headerStyle: data['document_header_style'] ?? result.document.headerStyle,
      showLogo: data['show_logo'] ?? true,
      showAddress: data['show_address'] ?? true,
      showTagline: data['show_tagline'] ?? true,
      footer: data['document_footer'] ?? '',
    };
    result.logoAssetId = data['logo_asset_id'] ?? null;
    result.faviconAssetId = data['favicon_asset_id'] ?? null;
    return result;
  }
  async save(id: string, theme: CompanyBranding, etag: string) {
    const scope = this.context(id),
      body: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(THEME_FIELDS)) body[field] = (theme as any)[key];
    body['portal'] = Object.fromEntries(
      Object.entries(PORTAL_FIELDS).map(([key, field]) => [field, (theme.portal as any)[key]]),
    );
    for (const key of ['welcome', 'invitation', 'notification'] as const) {
      body[key + '_subject'] = theme.emailTemplates[key].subject;
      body[key + '_body'] = theme.emailTemplates[key].body;
    }
    Object.assign(body, {
      document_header_style: theme.document.headerStyle,
      show_logo: theme.document.showLogo,
      show_address: theme.document.showAddress,
      show_tagline: theme.document.showTagline,
      document_footer: theme.document.footer,
      logo_asset_id: theme.logoAssetId ?? null,
      favicon_asset_id: theme.faviconAssetId ?? null,
    });
    return this.accept(
      id,
      await this.auth.api<CompanyBrandingRecord>(this.root(id), body, 'PATCH', {
        'If-Match': etag,
      }),
      scope,
    );
  }
  async publish(id: string, etag: string) {
    const scope = this.context(id);
    const result = await this.auth.api<{ company_id: string }>(
      this.root(id) + '/publish',
      {},
      'POST',
      { 'If-Match': etag, 'Idempotency-Key': crypto.randomUUID() },
    );
    this.check(id, scope);
    if (result.company_id !== id) throw Error('Branding publication scope mismatch.');
    return this.load(id);
  }
  async asset(id: string, asset: string) {
    const scope = this.context(id);
    const value = await this.auth.api<CompanyBrandAsset>(this.root(id) + `/assets/${asset}`);
    this.check(id, scope);
    if (value.company_id !== id || value.id !== asset)
      throw Error('Branding asset scope mismatch.');
    return value;
  }
  async content(id: string, asset: string) {
    const scope = this.context(id);
    const value = await this.auth.api<Blob>(
      this.root(id) + `/assets/${asset}/content`,
      undefined,
      undefined,
      undefined,
      'blob',
    );
    this.check(id, scope);
    return value;
  }
  async upload(id: string, file: File, kind: 'logo' | 'favicon') {
    const scope = this.context(id),
      bytes = await file.arrayBuffer();
    this.check(id, scope);
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (b) =>
      b.toString(16).padStart(2, '0'),
    ).join('');
    const asset = await this.auth.api<CompanyBrandAsset>(
      this.root(id) + '/assets',
      {
        kind,
        file_name: file.name,
        content_type: file.type || 'image/x-icon',
        size: file.size,
        sha256: digest,
      },
      'POST',
      { 'Idempotency-Key': crypto.randomUUID() },
    );
    this.check(id, scope);
    if (asset.company_id !== id) throw Error('Branding asset scope mismatch.');
    for (let start = 0; start < bytes.byteLength; start += 256 * 1024) {
      this.check(id, scope);
      await this.auth.api(
        this.root(id) + `/assets/${asset.id}/chunks/${start / (256 * 1024)}`,
        new Blob([bytes.slice(start, start + 256 * 1024)], { type: 'application/octet-stream' }),
        'PUT',
      );
    }
    this.check(id, scope);
    const result = await this.auth.api<CompanyBrandAsset>(
      this.root(id) + `/assets/${asset.id}/finalise`,
      {},
      'POST',
      { 'If-Match': asset.etag, 'Idempotency-Key': crypto.randomUUID() },
    );
    this.check(id, scope);
    return result;
  }
}
