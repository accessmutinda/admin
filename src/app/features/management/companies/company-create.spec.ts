import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { Company, ManagementStore, WorkspaceData } from '../shared/management.store';
import { Companies } from './companies';
import { CompanyDirectory } from './company-directory';
import { CompanyCreatePage } from './company-create';
import {
  CompanyCreateDraft,
  newCompanySetup,
  companySetupErrors,
  prepareCreatedCompany,
} from './company-create.models';
import { defaultCompanyBranding } from './company-branding.models';
import { emptyCompanyContacts } from './company-contacts.models';
import { emptyCompliance } from './company-compliance.models';
import { initialSubscription } from './company-modules.models';

@Component({ template: '' })
class EmptyPage {}
interface Editor {
  draft: CompanyCreateDraft;
  step: { set(value: number): void; (): number };
  submitted(): boolean;
  reviewed: { set(value: boolean): void; (): boolean };
  created(): boolean;
  error(): string;
  invalidSource: boolean;
  savedDraft(): unknown;
  stageComplete(index: number): boolean;
  next(): void;
  selectStep(index: number): void;
  toggleModule(module: string): void;
  changed(): void;
  create(): void;
  saveDraft(): void;
  resumeDraft(): void;
  discardDraft(): void;
  canLeave(): boolean;
}
describe('Create company and duplicate setup', () => {
  let store: ManagementStore;
  let workspaces: WorkspaceService;
  let harness: RouterTestingHarness;
  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'manage/companies/new',
            component: CompanyCreatePage,
            canDeactivate: [(component: CompanyCreatePage) => component.canLeave()],
          },
          { path: 'manage/companies/directory', component: CompanyDirectory },
          { path: 'manage/companies/:id', component: EmptyPage },
          { path: 'manage/companies', component: Companies },
        ]),
      ],
    });
    TestBed.inject(AuthService).signInWithMicrosoft();
    workspaces = TestBed.inject(WorkspaceService);
    workspaces.switchWorkspace('lqcs');
    store = TestBed.inject(ManagementStore);
    harness = await RouterTestingHarness.create();
  });
  afterEach(() => vi.restoreAllMocks());
  async function open(query = ''): Promise<Editor> {
    return (await harness.navigateByUrl(
      '/manage/companies/new' + query,
      CompanyCreatePage,
    )) as unknown as Editor;
  }
  function fill(editor: Editor) {
    Object.assign(editor.draft.company, {
      name: 'New Care Company',
      code: 'NEW-001',
      registration: '87654321',
      region: 'England',
    });
    editor.draft.company.subscription!.plan = 'Professional';
    Object.assign(editor.draft.company.contacts!.primary, {
      generalEmail: 'office@newcare.example',
      mainPhone: '+44 20 7946 0123',
      website: 'https://newcare.example',
    });
  }
  function sourceWithPrivateData(): Company {
    const source = structuredClone(store.company()!);
    const marker = 'PrivateSourceMarker';
    Object.assign(source, {
      name: marker,
      code: 'PRIVATE',
      tradingName: marker,
      registration: marker,
      description: marker,
      headOfficeName: marker,
      headOfficeAddress: marker,
      postcode: marker,
      country: marker,
      region: marker,
      logo: marker,
      tagline: marker,
      modifiedBy: marker,
      modifiedAt: '2026-01-01',
      establishedDate: '2000-01-01',
      registeredPlaces: 25,
      primaryLanguage: marker,
      color: '#123456',
      accent: '#abcdef',
    });
    source.contacts = emptyCompanyContacts({});
    for (const address of Object.values(source.contacts.addresses))
      for (const key of Object.keys(address) as (keyof typeof address)[]) address[key] = marker;
    for (const key of Object.keys(
      source.contacts.primary,
    ) as (keyof typeof source.contacts.primary)[])
      source.contacts.primary[key] = marker;
    source.contacts.keyContacts = [
      {
        id: marker,
        category: marker,
        name: marker,
        role: marker,
        email: marker,
        phone: marker,
        active: true,
      },
    ];
    source.compliance = emptyCompliance();
    source.compliance.cqcNumber = marker;
    source.compliance.taxNumber = marker;
    source.compliance.safeguardingLead = marker;
    source.compliance.documents.insurance = {
      name: marker,
      type: 'application/pdf',
      content: marker,
      size: 1,
      uploadedAt: marker,
      uploadedBy: marker,
      owner: marker,
      expiry: '2099-01-01',
    };
    source.branding = defaultCompanyBranding(marker, marker);
    Object.assign(source.branding, {
      logo: marker,
      favicon: marker,
      subdomain: marker,
      senderName: marker,
      senderEmail: marker,
      welcomeMessage: marker,
      emailFooter: marker,
      primaryColor: '#123456',
      accentColor: '#abcdef',
      fontFamily: 'Inter',
    });
    source.branding.document.footer = marker;
    source.branding.document.headerStyle = 'compact';
    source.branding.portal.supportEmail = marker;
    source.branding.portal.privacyUrl = marker;
    source.branding.portal.termsUrl = marker;
    for (const template of Object.values(source.branding.emailTemplates)) {
      template.subject = marker;
      template.body = marker;
    }
    source.publishedBranding = { theme: source.branding, publishedAt: marker, publishedBy: marker };
    source.subscription = initialSubscription();
    Object.assign(source.subscription, {
      plan: 'Professional',
      cycle: 'Annual',
      userLimit: 75,
      storageLimitGb: 100,
      support: marker,
      notes: marker,
      renewalDate: '2099-01-01',
      addons: { [marker]: { status: 'Requested', requestedAt: marker } },
      invoices: [
        {
          id: marker,
          reference: marker,
          date: '2026-01-01',
          dueDate: '2026-02-01',
          amount: 1,
          status: 'Paid',
          notes: marker,
        },
      ],
    });
    store.saveCompany(source);
    return source;
  }
  it('opens creation and duplicate from Companies and preserves all five stages', async () => {
    await harness.navigateByUrl('/manage/companies', Companies);
    expect(
      harness.routeNativeElement!.querySelector('a[href="/manage/companies/new"]'),
    ).not.toBeNull();
    const duplicate = harness.routeNativeElement!.querySelector(
      'a[href="/manage/companies/new?duplicate=lqcs"]',
    ) as HTMLAnchorElement;
    expect(duplicate).not.toBeNull();
    duplicate.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toContain('duplicate=lqcs');
    expect(harness.routeNativeElement!.querySelectorAll('.cn-steps li')).toHaveLength(5);
    expect(harness.routeNativeElement!.querySelector('#cn-name')!.getAttribute('value') ?? '').toBe(
      '',
    );
    expect(harness.routeNativeElement!.textContent).toContain(
      'Reuse setup, start with a clean company',
    );
    expect(harness.routeNativeElement!.querySelector('input[disabled]')).not.toBeNull();
  });
  it('blocks later stages and creation until required fields are valid and review confirmed', async () => {
    const editor = await open();
    editor.selectStep(4);
    expect(editor.step()).toBe(0);
    expect(editor.error()).toContain('highlighted');
    editor.draft.company.name = 'New Company';
    editor.draft.company.code = 'lq';
    editor.draft.company.subscription!.plan = 'Professional';
    expect(companySetupErrors(editor.draft.company, store.companies())['code']).toBeTruthy();
    editor.draft.company.code = ' LQ ';
    expect(companySetupErrors(editor.draft.company, store.companies())['code']).toBeTruthy();
    fill(editor);
    editor.selectStep(4);
    expect(editor.step()).toBe(4);
    editor.create();
    expect(editor.error()).toContain('reviewed');
    editor.reviewed.set(true);
    editor.draft.company.contacts!.primary.generalEmail = 'invalid';
    editor.create();
    expect(editor.step()).toBe(2);
    expect(editor.created()).toBe(false);
  });
  it('removes all source identity and free-text content while keeping allowed configuration', async () => {
    const source = sourceWithPrivateData();
    const data = structuredClone(store.data());
    data.permissions = {
      'Care Worker:Finance': [true, false, false, false, false],
      'PrivateSourceMarker:Finance': [true, true, true, true, true],
    };
    data.workflows['Care plans'] = ['Create', 'PrivateSourceMarker', 'Manager review'];
    data.workflows['PrivateSourceMarker'] = ['PrivateSourceMarker'];
    data.workflowPreferences = {
      'Care plans': { notify: false, escalation: 5 },
      PrivateSourceMarker: { notify: true, escalation: 1 },
    };
    const result = newCompanySetup(source, data);
    expect(JSON.stringify(result)).not.toContain('PrivateSourceMarker');
    expect(result.company.id).not.toBe(source.id);
    expect(result.company.name).toBe('');
    expect(result.company.code).toBe('');
    expect(result.company.registration).toBe('');
    expect(result.company.active).toBe(false);
    expect(result.company.modules).toEqual(source.modules);
    expect(result.company.color).toBe('#123456');
    expect(result.company.branding!.fontFamily).toBe('Inter');
    expect(result.company.branding!.document.headerStyle).toBe('compact');
    expect(result.company.subscription!.plan).toBe('Professional');
    expect(result.company.subscription!.userLimit).toBe(75);
    expect(result.company.subscription!.cycle).toBe('Annual');
    expect(result.company.subscription!.invoices).toEqual([]);
    expect(result.company.subscription!.addons).toEqual({});
    expect(result.company.subscription!.status).toBe('Not recorded');
    expect(result.company.contacts!.keyContacts).toEqual([]);
    expect(result.company.compliance!.documents).toEqual({});
    expect(result.company.publishedBranding).toBeUndefined();
    expect(result.setup.permissions['Care Worker:Finance']).toEqual([
      true,
      false,
      false,
      false,
      false,
    ]);
    expect(result.setup.workflows['Care plans']).toEqual(['Create', 'Manager review']);
    result.company.modules.pop();
    expect(source.modules.length).toBe(6);
  });
  it('creates a new empty workspace from a duplicate without changing source data', async () => {
    const source = sourceWithPrivateData();
    store.saveWorkspace((data) => ({
      ...data,
      permissions: { 'Care Worker:Finance': [true, false, false, false, false] },
      locations: [{ id: 'private-location' }] as WorkspaceData['locations'],
      apiKeys: [{ id: 'private-key', name: 'PrivateSourceMarker', created: '2026-01-01' }],
    }));
    const sourceCompany = structuredClone(store.company()!);
    const sourceData = structuredClone(store.data());
    const editor = await open('?duplicate=' + source.id);
    fill(editor);
    editor.reviewed.set(true);
    editor.create();
    expect(editor.created()).toBe(true);
    expect(store.companyId()).toBe('lqcs');
    const target = store.companies().find((c) => c.id === editor.draft.company.id)!;
    expect(JSON.stringify(target)).not.toContain('PrivateSourceMarker');
    expect(target.branding!.senderName).toBe('New Care Company');
    expect(target.branding!.subdomain).toBe('new-001');
    expect(target.modifiedBy).toBe(TestBed.inject(AuthService).currentUser()!.name);
    expect(store.records()[target.id].permissions['Care Worker:Finance']).toEqual([
      true,
      false,
      false,
      false,
      false,
    ]);
    workspaces.switchWorkspace(target.id);
    for (const key of [
      'people',
      'vacancies',
      'members',
      'leaves',
      'reviews',
      'cpd',
      'locations',
    ] as const)
      expect(store.data()[key]).toEqual([]);
    expect(store.data().apiKeys).toBeUndefined();
    expect(store.data().quality).toBeUndefined();
    expect(store.data().payroll).toBeUndefined();
    expect(store.data().rota).toBeUndefined();
    expect(store.companies().find((c) => c.id === source.id)).toEqual(sourceCompany);
    expect(store.records()[source.id]).toEqual(sourceData);
  });
  it('keeps a saved draft separate from company records, resumes it and cleans it after success', async () => {
    let editor = await open();
    fill(editor);
    const id = editor.draft.company.id;
    editor.step.set(2);
    editor.saveDraft();
    expect(store.companies().some((c) => c.id === id)).toBe(false);
    expect(editor.canLeave()).toBe(true);
    await harness.navigateByUrl('/manage/companies', Companies);
    editor = await open();
    expect(editor.savedDraft()).toBeTruthy();
    expect(editor.draft.company.name).toBe('');
    editor.resumeDraft();
    expect(editor.draft.company.id).toBe(id);
    expect(editor.step()).toBe(2);
    expect(editor.draft.company.name).toBe('New Care Company');
    editor.reviewed.set(true);
    editor.create();
    expect(editor.created()).toBe(true);
    expect(
      Object.keys(localStorage).filter((key) => key.startsWith('cv_company_create_draft:')),
    ).toEqual([]);
  });
  it('retains entries on storage failures and rolls back the new workspace when company persistence fails', async () => {
    const editor = await open();
    fill(editor);
    editor.reviewed.set(true);
    const originalRecords = localStorage.getItem('cv_management_v1');
    const original = Storage.prototype.setItem;
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === 'cv_companies_v1') throw new DOMException('Full', 'QuotaExceededError');
      return original.call(this, key, value);
    });
    editor.create();
    expect(editor.created()).toBe(false);
    expect(editor.error()).toContain('still here');
    expect(editor.draft.company.name).toBe('New Care Company');
    expect(store.companies().some((c) => c.id === editor.draft.company.id)).toBe(false);
    expect(store.records()[editor.draft.company.id]).toBeUndefined();
    expect(localStorage.getItem('cv_management_v1')).toBe(originalRecords);
    write.mockRestore();
    editor.create();
    expect(editor.created()).toBe(true);
    const count = store.companies().length;
    editor.create();
    expect(store.companies()).toHaveLength(count);
  });
  it('validates optional address only when entered and keeps new contact fields in the contact record', async () => {
    const editor = await open();
    fill(editor);
    expect(companySetupErrors(editor.draft.company, store.companies())).toEqual({});
    const office = editor.draft.company.contacts!.addresses.headOffice;
    office.line1 = '12 New Lane';
    expect(
      companySetupErrors(editor.draft.company, store.companies())['address.city'],
    ).toBeTruthy();
    Object.assign(office, { city: 'London', county: 'London', postcode: 'SW1A 1AA' });
    editor.reviewed.set(true);
    editor.create();
    expect(editor.created()).toBe(true);
    expect(editor.draft.company.postcode).toBe('SW1A 1AA');
    expect(editor.draft.company.headOfficeAddress).toBe('12 New Lane, London, London');
    expect(editor.draft.company.contacts!.primary.generalEmail).toBe('office@newcare.example');
    expect(editor.draft.company.contacts!.addresses.registered.line1).toBe('');
  });
  it('guards unsaved changes and refuses unknown duplicate sources', async () => {
    let editor = await open();
    expect(editor.canLeave()).toBe(true);
    fill(editor);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(editor.canLeave()).toBe(false);
    confirm.mockReturnValue(true);
    await harness.navigateByUrl('/manage/companies', Companies);
    editor = await open('?duplicate=missing');
    expect(editor.invalidSource).toBe(true);
    const count = store.companies().length;
    editor.create();
    expect(store.companies()).toHaveLength(count);
    expect(harness.routeNativeElement!.textContent).toContain('Setup source not found');
  });
  it('rejects duplicate codes at save time and never reuses one in a new company', async () => {
    const editor = await open();
    fill(editor);
    store.saveCompany({ ...prepareCreatedCompany(editor.draft.company), id: 'other-created' });
    editor.reviewed.set(true);
    editor.create();
    expect(editor.created()).toBe(false);
    expect(editor.step()).toBe(0);
    expect(editor.error()).toContain('highlighted');
  });
  it('reports draft failures and preserves a saved draft unless deletion is confirmed', async () => {
    const editor = await open();
    fill(editor);
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });
    editor.saveDraft();
    expect(editor.error()).toContain('Draft could not be saved');
    expect(editor.draft.company.name).toBe('New Care Company');
    write.mockRestore();
    editor.saveDraft();
    await harness.navigateByUrl('/manage/companies', Companies);
    const reopened = await open();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    reopened.discardDraft();
    expect(reopened.savedDraft()).toBeTruthy();
    confirm.mockReturnValue(true);
    reopened.discardDraft();
    expect(reopened.savedDraft()).toBeNull();
  });
});
