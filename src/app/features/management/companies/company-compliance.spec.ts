import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/ui/toast.service';
import { ManagementStore } from '../shared/management.store';
import { CompaniesApiService } from './companies-api.service';
import { CompanyComplianceApiService } from './company-compliance-api.service';
import { CompanyCompliancePage } from './company-compliance';
import { CompanyCompliance, emptyCompliance } from './company-compliance.models';

const stored: CompanyCompliance = {
  ...emptyCompliance(),
  cqcNumber: 'CQC123',
  taxNumber: 'TAX123',
  providerType: 'Saved Provider Type',
  registrationStatus: 'Registered',
  insuranceExpiry: '2030-01-01',
  regulatoryRegion: 'England',
  dataProtectionNumber: 'ICO123',
  safeguardingLead: 'Saved Lead',
  medicationLead: 'Medication Lead',
  reminders: true,
  documents: {
    insurance: {
      id: 'evidence-1',
      version: 1,
      name: 'saved-insurance.pdf',
      type: 'application/pdf',
      size: 20,
      content: '',
      owner: 'Saved Owner',
      expiry: '2030-01-01',
      uploadedAt: '2026-11-07T10:00:00Z',
      uploadedBy: 'Saved Uploader',
      scanState: 'not_available',
    },
  },
};
describe('Registration and compliance API page', () => {
  let service: {
    load: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    upload: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
  };
  beforeEach(() => {
    localStorage.clear();
    service = {
      load: vi.fn().mockResolvedValue(structuredClone(stored)),
      save: vi.fn(async (_id, value) => structuredClone(value)),
      upload: vi
        .fn()
        .mockResolvedValue({ ...stored.documents.insurance, name: 'new.pdf', id: 'new-evidence' }),
      remove: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue({ ...emptyCompliance(), documents: stored.documents }),
    };
    const params = convertToParamMap({ id: 'company-1' });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: params }, paramMap: of(params) },
        },
        {
          provide: AuthService,
          useValue: { profile: () => ({ id: 'admin' }), canAccessCompany: () => true },
        },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
        {
          provide: CompaniesApiService,
          useValue: {
            load: vi.fn().mockResolvedValue(undefined),
            loadDetail: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ManagementStore,
          useValue: {
            companies: () => [
              {
                id: 'company-1',
                name: 'Stored Care',
                code: 'STORED',
                registration: '12345678',
                sector: 'Care',
                modules: [],
                active: true,
              },
            ],
          },
        },
      ],
    });
    TestBed.overrideComponent(CompanyCompliancePage, {
      set: { providers: [{ provide: CompanyComplianceApiService, useValue: service }] },
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });
  afterEach(() => vi.restoreAllMocks());
  async function create() {
    const fixture = TestBed.createComponent(CompanyCompliancePage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }
  it('populates saved fields, an existing dropdown value, evidence owner and uploader', async () => {
    const fixture = await create();
    const root: HTMLElement = fixture.nativeElement;
    expect((root.querySelector('#rc-cqcNumber') as HTMLInputElement).value).toBe('CQC123');
    expect((root.querySelector('#rc-taxNumber') as HTMLInputElement).value).toBe('TAX123');
    expect(root.querySelector('#rc-providerType')?.textContent).toContain('Saved Provider Type');
    expect((root.querySelector('#rc-owner-insurance') as HTMLInputElement).value).toBe(
      'Saved Owner',
    );
    expect(root.textContent).toContain('Saved Uploader');
    expect(root.textContent).toContain('Not verified');
    expect(root.textContent).not.toContain('stored on this device');
  });
  it('keeps edits after a failed save and sends them to the backend on retry', async () => {
    const fixture = await create();
    const page = fixture.componentInstance as any;
    page.draft.safeguardingLead = 'Updated Lead';
    service.save.mockRejectedValueOnce(new Error('Record changed. Reload and retry.'));
    await page.save();
    fixture.detectChanges();
    expect(page.draft.safeguardingLead).toBe('Updated Lead');
    expect(fixture.nativeElement.textContent).toContain('Record changed.');
    await page.save();
    expect(service.save).toHaveBeenLastCalledWith(
      'company-1',
      expect.objectContaining({ safeguardingLead: 'Updated Lead' }),
    );
    expect(page.hasChanges()).toBe(false);
  });
  it('saves unfinished setup and allows individual fields to be cleared without claiming completion', async () => {
    const fixture = await create();
    const page = fixture.componentInstance as any;
    page.draft.cqcNumber = '';
    page.draft.medicationLead = '';
    await page.save();
    expect(service.save).toHaveBeenCalledWith(
      'company-1',
      expect.objectContaining({ cqcNumber: '', medicationLead: '' }),
    );
    expect(page.checks().find((check: { key: string }) => check.key === 'details').complete).toBe(
      false,
    );
  });

  it('uploads and removes through the API without making the form falsely dirty', async () => {
    const fixture = await create();
    const page = fixture.componentInstance as any;
    const input = {
      files: [new File(['%PDF-1.4'], 'new.pdf', { type: 'application/pdf' })],
      value: 'new.pdf',
    };
    await page.upload('insurance', { target: input });
    expect(service.upload).toHaveBeenCalled();
    expect(page.draft.documents.insurance.id).toBe('new-evidence');
    expect(page.hasChanges()).toBe(false);
    await page.remove('insurance');
    expect(service.remove).toHaveBeenCalledWith('company-1', 'insurance', expect.anything());
    expect(page.draft.documents.insurance).toBeUndefined();
    expect(page.hasChanges()).toBe(false);
  });
  it('does not discard an unsaved form when document deletion fails', async () => {
    const fixture = await create();
    const page = fixture.componentInstance as any;
    page.draft.safeguardingLead = 'Unsaved Lead';
    service.remove.mockRejectedValue(new Error('Deletion failed.'));
    await page.remove('insurance');
    expect(page.draft.documents.insurance.id).toBe('evidence-1');
    expect(page.draft.safeguardingLead).toBe('Unsaved Lead');
    expect(page.hasChanges()).toBe(true);
  });
  it('clears saved fields only after confirmation and retains saved document information', async () => {
    const fixture = await create();
    const page = fixture.componentInstance as any;
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    await page.clear();
    expect(service.clear).not.toHaveBeenCalled();
    await page.clear();
    expect(service.clear).toHaveBeenCalledWith('company-1');
    expect(page.draft.cqcNumber).toBe('');
    expect(page.draft.documents.insurance.id).toBe('evidence-1');
  });
  it('shows a retry state instead of an empty form after a read failure', async () => {
    service.load.mockRejectedValueOnce(new Error('Unable to read saved compliance.'));
    const fixture = await create();
    expect(fixture.nativeElement.textContent).toContain('Unable to read saved compliance.');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    await (fixture.componentInstance as any).load();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#rc-cqcNumber').value).toBe('CQC123');
  });
});
