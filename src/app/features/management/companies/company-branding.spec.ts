import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { ToastService } from '../../../shared/ui/toast.service';
import { ManagementStore } from '../shared/management.store';
import { CompanyBrandingPage } from './company-branding';
import { BrandingTab, CompanyBranding, defaultCompanyBranding } from './company-branding.models';

interface BrandingEditor {
  draft: CompanyBranding;
  setTab(tab: BrandingTab): void;
  preview: { set(value: string): void };
  hasChanges(): boolean;
  error(): string;
  assetError(): string;
  subdomainError(): string;
  invalidFields(): string[];
  save(publish?: boolean): void;
  reset(): void;
  discard(): void;
  upload(event: Event, kind: 'logo' | 'favicon'): Promise<void>;
}

describe('Company branding and portal customisation', () => {
  let store: ManagementStore;
  const toast = { success: vi.fn(), error: vi.fn() };
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [CompanyBrandingPage],
      providers: [
        provideRouter([]),
        { provide: ToastService, useValue: toast },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'lqcs' }) } },
        },
      ],
    });
    TestBed.inject(AuthService).signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    store = TestBed.inject(ManagementStore);
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  function create() {
    const fixture = TestBed.createComponent(CompanyBrandingPage);
    fixture.detectChanges();
    return { fixture, editor: fixture.componentInstance as unknown as BrandingEditor };
  }
  it('renders the reference panels and opens each settings section without losing changes', () => {
    const { fixture, editor } = create();
    const text = fixture.nativeElement.textContent;
    for (const label of [
      'Brand Assets',
      'Brand Colours',
      'Typography',
      'White-label Settings',
      'Email Branding',
      'Live Preview',
    ])
      expect(text).toContain(label);
    editor.draft.primaryColor = '#123456';
    for (const [tab, selector] of [
      ['emails', '#cb-email-subject'],
      ['documents', '#cb-doc-style'],
      ['portal', '#cb-language'],
      ['theme', '#primaryColor-hex'],
    ] as const) {
      editor.setTab(tab);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector(selector)).toBeTruthy();
      expect(editor.draft.primaryColor).toBe('#123456');
    }
  });
  it('updates preview colour variables without changing saved company or platform styles', async () => {
    const { fixture, editor } = create();
    const original = store.company()?.color;
    const primary = fixture.nativeElement.querySelector('#primaryColor-hex') as HTMLInputElement;
    const secondary = fixture.nativeElement.querySelector(
      '#secondaryColor-hex',
    ) as HTMLInputElement;
    primary.value = '#112233';
    primary.dispatchEvent(new Event('input', { bubbles: true }));
    secondary.value = '#445566';
    secondary.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    const stage = fixture.nativeElement.querySelector('.cb-preview-stage');
    expect(stage.style.getPropertyValue('--preview-primary')).toBe('#112233');
    expect(stage.style.getPropertyValue('--preview-secondary')).toBe('#445566');
    expect(fixture.nativeElement.style.getPropertyValue('--accent')).toBe('');
    expect(store.company()?.color).toBe(original);
  });
  it('saves theme drafts without replacing the approved snapshot or unrelated records', () => {
    const current = store.company()!;
    const approved = defaultCompanyBranding(current.name, current.code);
    store.saveCompany({
      ...current,
      publishedBranding: {
        theme: approved,
        publishedAt: '2026-10-01T09:00:00.000Z',
        publishedBy: 'Manager',
      },
    });
    const { editor } = create();
    editor.draft.primaryColor = '#123456';
    editor.draft.portal.supportEmail = 'support@example.co.uk';
    editor.save();
    expect(editor.error()).toBe('');
    expect(store.company()?.branding?.primaryColor).toBe('#123456');
    expect(store.company()?.color).toBe('#123456');
    expect(store.company()?.publishedBranding?.theme.primaryColor).toBe('#008afa');
    expect(store.company()?.modules).toEqual(current.modules);
    expect(store.company()?.name).toBe(current.name);
    expect(store.companies().find((c) => c.id === 'riverside')?.branding).toBeUndefined();
    expect(editor.hasChanges()).toBe(false);
    expect(
      JSON.parse(localStorage.getItem('cv_companies_v1')!)[0].branding.portal.supportEmail,
    ).toBe('support@example.co.uk');
  });
  it('publishes an independent local snapshot with the real actor and timestamp', () => {
    const { editor } = create();
    editor.draft.secondaryColor = '#336699';
    editor.save(true);
    expect(store.company()?.publishedBranding?.theme.secondaryColor).toBe('#336699');
    expect(store.company()?.publishedBranding?.publishedBy).toBe('Jane Doe');
    expect(Number.isFinite(Date.parse(store.company()?.publishedBranding?.publishedAt ?? ''))).toBe(
      true,
    );
    editor.draft.secondaryColor = '#abcdef';
    expect(store.company()?.publishedBranding?.theme.secondaryColor).toBe('#336699');
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('Live portal publishing is not connected'),
    );
  });
  it('rejects bad colours, reserved/duplicate domains, unsafe URLs and incomplete senders', () => {
    const { editor } = create();
    editor.draft.primaryColor = 'red';
    editor.draft.subdomain = 'admin';
    editor.draft.portal.privacyUrl = 'javascript:alert(1)';
    editor.draft.useCustomSender = true;
    editor.draft.senderEmail = 'invalid';
    editor.save();
    expect(store.company()?.branding).toBeUndefined();
    expect(editor.invalidFields().join(' ')).toContain('six-digit');
    expect(editor.subdomainError()).toContain('reserved');
    expect(editor.invalidFields().join(' ')).toContain('http or https');
    expect(editor.invalidFields().join(' ')).toContain('Custom sender');
    const other = store.companies().find((c) => c.id === 'riverside')!;
    store.saveCompany({
      ...other,
      branding: { ...defaultCompanyBranding(other.name, other.code), subdomain: 'taken' },
    });
    editor.draft.subdomain = 'taken';
    expect(editor.subdomainError()).toContain('Another company');
    expect(toast.success).not.toHaveBeenCalled();
  });
  it('renders email content as text and replaces only the supported placeholder values', () => {
    const { fixture, editor } = create();
    editor.setTab('emails');
    editor.draft.emailTemplates.welcome.body =
      '<script>bad()</script> Hello {{recipientName}} from {{companyName}}';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.cb-message').textContent).toContain(
      'Hello Alex from London Quality Care Services',
    );
    expect(fixture.nativeElement.querySelector('.cb-email-preview script')).toBeNull();
  });
  it('resets defaults in the draft and can discard them without saving', () => {
    const { editor } = create();
    const original = editor.draft.primaryColor;
    editor.reset();
    expect(editor.draft.primaryColor).toBe('#008afa');
    expect(store.company()?.color).toBe(original);
    editor.discard();
    expect(editor.draft.primaryColor).toBe(original);
    expect(editor.hasChanges()).toBe(false);
  });
  it('rejects unsupported uploads and accepts a decoded image without publishing it', async () => {
    const { editor } = create();
    const bad = {
      target: {
        files: [new File(['text'], 'logo.txt', { type: 'text/plain' })],
        value: 'logo.txt',
      },
    } as unknown as Event;
    await editor.upload(bad, 'logo');
    expect(editor.assetError()).toContain('Choose a PNG');
    vi.stubGlobal(
      'Image',
      class {
        onload?: () => void;
        set src(_value: string) {
          queueMicrotask(() => this.onload?.());
        }
      },
    );
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'logo.png', { type: 'image/png' });
    await editor.upload(
      { target: { files: [file], value: 'logo.png' } } as unknown as Event,
      'logo',
    );
    expect(editor.draft.logo).toMatch(/^data:image\/png;base64,/);
    expect(store.company()?.logo).toBe('');
    expect(store.company()?.publishedBranding).toBeUndefined();
  });
  it('retains the edited theme when persistence fails', () => {
    const { editor } = create();
    editor.draft.primaryColor = '#123456';
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage full');
    });
    editor.save(true);
    expect(editor.error()).toContain('could not be saved');
    expect(editor.draft.primaryColor).toBe('#123456');
    expect(editor.hasChanges()).toBe(true);
    expect(store.company()?.branding).toBeUndefined();
    expect(store.company()?.publishedBranding).toBeUndefined();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
