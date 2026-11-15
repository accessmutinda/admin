import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/ui/toast.service';
import { ManagementStore } from '../shared/management.store';
import { CompaniesApiService } from './companies-api.service';
import { CompanyBrandingApi } from './company-branding-api.service';
import { CompanyBrandingPage } from './company-branding';
import { defaultCompanyBranding } from './company-branding.models';

describe('Company branding server persistence', () => {
  const company = { id: 'company', name: 'North Care', code: 'NORTH', modules: [] };
  let record: any;
  let api: any;
  beforeEach(() => {
    record = { company_id: 'company', etag: '"v1"', defaults: {}, draft: {}, published: null };
    api = {
      load: vi.fn(async () => record),
      theme: vi.fn(() => defaultCompanyBranding(company.name, company.code)),
      save: vi.fn(async () => ({ ...record, etag: '"v2"' })),
      publish: vi.fn(async () => ({
        ...record,
        etag: '"v3"',
        published_at: '2026-11-01T10:00:00Z',
      })),
      upload: vi.fn(async () => ({ id: 'asset', kind: 'logo', state: 'quarantined' })),
      asset: vi.fn(async () => ({ id: 'asset', kind: 'logo', state: 'clean' })),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: company.id }) } },
        },
        { provide: ManagementStore, useValue: { companies: signal([company]) } },
        {
          provide: CompaniesApiService,
          useValue: {
            loading: () => false,
            loaded: () => true,
            error: () => '',
            refreshCompany: vi.fn().mockResolvedValue(undefined),
          },
        },
        { provide: AuthService, useValue: { currentUser: () => ({ initials: 'SA' }) } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: CompanyBrandingApi, useValue: api },
      ],
    });
  });
  async function open() {
    const fixture = TestBed.createComponent(CompanyBrandingPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, editor: fixture.componentInstance as any };
  }
  it('loads saved server settings and keeps changes across all four tabs', async () => {
    const { fixture, editor } = await open();
    expect(api.load).toHaveBeenCalledWith('company');
    editor.draft.primaryColor = '#123456';
    for (const tab of ['theme', 'emails', 'documents', 'portal']) {
      editor.setTab(tab);
      fixture.detectChanges();
      expect(editor.draft.primaryColor).toBe('#123456');
    }
    expect(fixture.nativeElement.textContent).toContain('Portal Settings');
  });
  it('saves with the current version and publishes the version returned by save', async () => {
    const { editor } = await open();
    editor.draft.primaryColor = '#123456';
    await editor.save(true);
    expect(api.save).toHaveBeenCalledWith(
      'company',
      expect.objectContaining({ primaryColor: '#123456' }),
      '"v1"',
    );
    expect(api.publish).toHaveBeenCalledWith('company', '"v2"');
    expect(editor.record().etag).toBe('"v3"');
    expect(editor.hasChanges()).toBe(false);
  });
  it('retains edits and displays server conflicts without reporting a successful save', async () => {
    const { editor } = await open();
    api.save.mockRejectedValueOnce(new Error('This record changed. Reload before saving.'));
    editor.draft.primaryColor = '#123456';
    await editor.save();
    expect(editor.error()).toContain('record changed');
    expect(editor.hasChanges()).toBe(true);
    expect(api.publish).not.toHaveBeenCalled();
  });
  it('blocks malformed colours, unsafe links, reserved subdomains and invalid senders', async () => {
    const { editor } = await open();
    Object.assign(editor.draft, {
      primaryColor: 'red',
      subdomain: 'admin',
      useCustomSender: true,
      senderEmail: 'invalid',
    });
    editor.draft.portal.privacyUrl = 'javascript:alert(1)';
    await editor.save();
    expect(editor.invalidFields().join(' ')).toContain('six-digit');
    expect(editor.invalidFields().join(' ')).toContain('http or https');
    expect(editor.invalidFields().join(' ')).toContain('Custom sender');
    expect(editor.subdomainError()).toContain('reserved');
    expect(api.save).not.toHaveBeenCalled();
  });
  it('blocks saving quarantined files and allows only a clean checked asset', async () => {
    const { editor } = await open();
    editor.pendingAssets.set([{ id: 'asset', kind: 'logo', state: 'quarantined' }]);
    await editor.save();
    expect(api.save).not.toHaveBeenCalled();
    await editor.refreshAssets();
    expect(editor.draft.logoAssetId).toBe('asset');
    expect(editor.pendingAssets()).toEqual([]);
  });
  it('rejects unsafe assets and can remove an existing asset', async () => {
    const { editor } = await open();
    api.asset.mockResolvedValue({ id: 'asset', kind: 'logo', state: 'infected' });
    editor.pendingAssets.set([{ id: 'asset', kind: 'logo', state: 'quarantined' }]);
    await editor.refreshAssets();
    expect(editor.assetError()).toContain('security check');
    editor.draft.logoAssetId = 'old';
    editor.removeAsset('logo');
    expect(editor.draft.logoAssetId).toBeNull();
    await editor.upload(
      { target: { files: [new File(['bad'], 'bad.txt', { type: 'text/plain' })], value: '' } },
      'logo',
    );
    expect(api.upload).not.toHaveBeenCalled();
  });
  it('discards changes to the last server snapshot and safely renders email text', async () => {
    const { fixture, editor } = await open();
    editor.draft.primaryColor = '#112233';
    editor.discard();
    expect(editor.hasChanges()).toBe(false);
    editor.setTab('emails');
    editor.draft.emailTemplates.welcome.body = '<script>bad()</script> Hello {{recipientName}}';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.cb-email-preview script')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Hello Alex');
  });
});
