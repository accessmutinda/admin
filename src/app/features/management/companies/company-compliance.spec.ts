import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { ManagementStore } from '../shared/management.store';
import { CompanyCompliancePage } from './company-compliance';
import { Companies } from './companies';
import {
  CompanyCompliance,
  ComplianceDocumentKey,
  COMPLIANCE_DOCUMENTS,
  complianceChecks,
  complianceComplete,
  complianceFileError,
  daysUntil,
  emptyCompliance,
  validDate,
} from './company-compliance.models';

type Editor = {
  draft: CompanyCompliance;
  save(): void;
  hasChanges(): boolean;
  canLeave(): boolean;
  cancel(): void;
  error(): string;
  completion(): number;
  alerts(): { title: string }[];
  upload(key: ComplianceDocumentKey, event: Event): Promise<void>;
  remove(key: ComplianceDocumentKey): void;
  fileErrors(): Partial<Record<ComplianceDocumentKey, string>>;
};
describe('Company registration and compliance', () => {
  let store: ManagementStore;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [CompanyCompliancePage, Companies],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'lqcs' }) } },
        },
      ],
    });
    TestBed.inject(AuthService).signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    store = TestBed.inject(ManagementStore);
  });
  afterEach(() => vi.restoreAllMocks());
  function create() {
    const fixture = TestBed.createComponent(CompanyCompliancePage);
    fixture.detectChanges();
    return { fixture, editor: fixture.componentInstance as unknown as Editor };
  }
  function fill(editor: Editor) {
    Object.assign(editor.draft, {
      cqcNumber: '1-987654321',
      providerType: 'Independent Provider',
      registrationStatus: 'Registered',
      insuranceExpiry: '2099-12-31',
      regulatoryRegion: 'London',
      dataProtectionNumber: 'ZB123456',
      safeguardingLead: 'Recorded lead',
      medicationLead: 'Medication lead',
    });
  }
  function documents(editor: Editor) {
    for (const { key } of COMPLIANCE_DOCUMENTS)
      editor.draft.documents[key] = {
        name: `${key}.pdf`,
        type: 'application/pdf',
        size: 4,
        content: 'data:application/pdf;base64,dGVzdA==',
        uploadedAt: '2026-10-16T10:00:00Z',
        uploadedBy: 'Uploader',
        owner: 'Document owner',
        expiry: '',
      };
    editor.draft.reminders = true;
  }
  it('renders the shared banner, separate sections and one combined Companies card without tabs', () => {
    const { fixture, editor } = create();
    expect(fixture.nativeElement.querySelector('.co-summary').textContent).toContain(
      store.company()!.name,
    );
    expect(fixture.nativeElement.textContent).toContain('Registration Details');
    expect(fixture.nativeElement.textContent).toContain('Compliance Mapping');
    expect(fixture.nativeElement.querySelector('[role=tab]')).toBeNull();
    expect(fixture.nativeElement.querySelector('#rc-company-number').textContent).toContain(
      store.company()!.registration,
    );
    expect(editor.draft.cqcNumber).toBe('');
    expect(editor.alerts()).toHaveLength(4);
    const overview = TestBed.createComponent(Companies);
    overview.detectChanges();
    const links = [...overview.nativeElement.querySelectorAll('.co-check-card')] as HTMLElement[];
    const matching = links.filter((link) =>
      link.textContent?.includes('Registration & Compliance'),
    );
    expect(matching).toHaveLength(1);
    expect(matching[0].getAttribute('href')).toBe('/manage/companies/lqcs/compliance');
    expect(overview.nativeElement.textContent).not.toContain('Compliance Mapping');
  });
  it('validates required fields and preserves company number and unrelated data on save', () => {
    const { editor } = create();
    editor.save();
    expect(editor.error()).toContain('highlighted');
    expect(store.company()!.compliance).toBeUndefined();
    const old = structuredClone(store.company()!);
    fill(editor);
    editor.draft.taxNumber = '  GB123  ';
    editor.save();
    expect(editor.error()).toBe('');
    expect(editor.hasChanges()).toBe(false);
    expect(store.company()!.registration).toBe(old.registration);
    expect(store.company()!.modules).toEqual(old.modules);
    expect(store.company()!.compliance!.taxNumber).toBe('GB123');
    expect(store.company()!.modifiedBy).toBe(TestBed.inject(AuthService).currentUser()!.name);
    expect(store.company()!.modifiedAt).toBeTruthy();
    expect(store.companies().find((c) => c.id === 'riverside')!.compliance).toBeUndefined();
    expect(JSON.parse(localStorage.getItem('cv_companies_v1')!)[0].compliance.cqcNumber).toBe(
      '1-987654321',
    );
    expect(complianceComplete(store.company())).toBe(false);
  });
  it('retains draft and attachments after storage failure and supports retry', () => {
    const { editor } = create();
    fill(editor);
    documents(editor);
    const save = vi.spyOn(store, 'saveCompany').mockReturnValue(false);
    editor.save();
    expect(editor.error()).toContain('still here');
    expect(editor.hasChanges()).toBe(true);
    expect(editor.draft.documents.insurance!.content).toContain('base64');
    save.mockRestore();
    editor.save();
    expect(editor.hasChanges()).toBe(false);
    expect(complianceComplete(store.company())).toBe(true);
  });
  it('uploads real file bytes, preserves mapping on replace, rejects unsupported or oversized files', async () => {
    const { editor } = create();
    const event = (file: File) =>
      ({ target: { files: [file], value: 'file' } }) as unknown as Event;
    await editor.upload(
      'insurance',
      event(new File(['%PDF-1.4'], 'insurance.pdf', { type: 'application/pdf' })),
    );
    expect(editor.draft.documents.insurance!.content).toContain('data:application/pdf;base64,');
    expect(editor.draft.documents.insurance!.size).toBe(8);
    expect(editor.draft.documents.insurance!.uploadedBy).toBe(
      TestBed.inject(AuthService).currentUser()!.name,
    );
    editor.draft.documents.insurance!.owner = 'Owner';
    await editor.upload(
      'insurance',
      event(new File(['replacement'], 'new.pdf', { type: 'application/pdf' })),
    );
    expect(editor.draft.documents.insurance!.owner).toBe('Owner');
    await editor.upload('insurance', event(new File(['html'], 'bad.html', { type: 'text/html' })));
    expect(editor.fileErrors().insurance).toContain('PDF or DOCX');
    expect(editor.draft.documents.insurance!.name).toBe('new.pdf');
    expect(
      complianceFileError({
        name: 'large.pdf',
        type: 'application/pdf',
        size: 10 * 1024 * 1024 + 1,
      }),
    ).toContain('10MB');
  });
  it('requires confirmation before leaving or removing and does not save removed files until Save', () => {
    const { editor } = create();
    fill(editor);
    documents(editor);
    editor.save();
    expect(editor.canLeave()).toBe(true);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    editor.remove('insurance');
    expect(editor.draft.documents.insurance).toBeDefined();
    confirm.mockReturnValue(true);
    editor.remove('insurance');
    expect(editor.hasChanges()).toBe(true);
    expect(store.company()!.compliance!.documents.insurance).toBeDefined();
    confirm.mockReturnValue(false);
    expect(editor.canLeave()).toBe(false);
    editor.save();
    expect(store.company()!.compliance!.documents.insurance).toBeUndefined();
  });
  it('calculates current completeness and expiry alerts rather than marking uploads verified', () => {
    const { editor } = create();
    fill(editor);
    documents(editor);
    expect(editor.completion()).toBe(100);
    editor.draft.insuranceExpiry = '2020-01-01';
    expect(editor.alerts().some((a) => a.title === 'Insurance expiry has passed')).toBe(true);
    expect(editor.completion()).toBe(80);
    editor.draft.documents.registration!.expiry = '2020-01-01';
    expect(editor.completion()).toBe(60);
    editor.draft.documents.continuity!.owner = '';
    expect(editor.completion()).toBe(40);
    editor.draft.reminders = false;
    expect(editor.completion()).toBe(20);
  });
  it('uses date-only boundaries, validates dates and leaves empty records independent', () => {
    expect(daysUntil('2026-10-16', '2026-10-16')).toBe(0);
    expect(daysUntil('2026-10-15', '2026-10-16')).toBe(-1);
    expect(validDate('2026-02-30')).toBe(false);
    expect(daysUntil('')).toBeNull();
    const first = emptyCompliance();
    first.documents.insurance = {
      name: 'x',
      type: 'application/pdf',
      size: 1,
      content: '',
      uploadedAt: '',
      uploadedBy: '',
      owner: '',
      expiry: '',
    };
    expect(emptyCompliance().documents).toEqual({});
    expect(complianceChecks(emptyCompliance(), '').every((c) => !c.complete)).toBe(true);
  });
});
