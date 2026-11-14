import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { ManagementStore } from '../shared/management.store';
import { ToastService } from '../../../shared/ui/toast.service';
import {
  RecruitmentApi,
  RecruitmentApplication,
  RecruitmentVacancy,
  Upload,
} from '../recruitment/recruitment-api.service';
import { PersonDetail } from './person-detail';

describe('Interview applicant documents', () => {
  const company = signal('north');
  const editable = signal(true);
  let applicant: RecruitmentApplication;
  let request: ReturnType<typeof vi.fn>;
  const file = (id = 'file-1', name = 'supporting-document.pdf'): Upload => ({
    id,
    name,
    type: 'application/pdf',
    size: 24,
    state: 'clean',
    version: 1,
    etag: '"v1"',
    requirementId: null,
    documentType: '',
  });
  beforeEach(() => {
    company.set('north');
    editable.set(true);
    applicant = {
      id: 'applicant-1',
      company_id: 'north',
      version: 2,
      etag: '"v2"',
      name: 'Interview Applicant',
      email: 'applicant@example.com',
      role: 'Care Worker',
      vacancy: 'Care Worker',
      vacancyId: 'vacancy-1',
      location: 'North',
      stage: 'Interview',
      start: '',
      staff_id: null,
      documents: [file()],
    };
    request = vi.fn(async (_path, body, method) => {
      if (method === 'PATCH') {
        const current = applicant.documents!.find((document) => _path.endsWith(document.id))!;
        current.documentType = body.document_type;
        current.version++;
        current.etag = `"v${current.version}"`;
        return structuredClone(current);
      }
      return structuredClone(applicant);
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'applicants/:id', component: PersonDetail }]),
        { provide: AuthService, useValue: { profile: () => ({ id: 'recruiter' }), api: request } },
        {
          provide: CompanyAccessService,
          useValue: {
            companyId: company,
            can: (_module: string, area: string, action: string) =>
              area === 'recruitment' && (action === 'read' || editable()),
          },
        },
        {
          provide: ManagementStore,
          useValue: { initials: () => 'IA', company: () => ({ name: 'North Care' }) },
        },
        { provide: ToastService, useValue: { success: vi.fn() } },
      ],
    });
  });
  async function open() {
    const harness = await RouterTestingHarness.create('/applicants/applicant-1?tab=Documents');
    await harness.fixture.whenStable();
    harness.detectChanges();
    await harness.fixture.whenStable();
    return harness;
  }
  it('shows the type dropdown in interview documents and saves the selected type', async () => {
    const harness = await open();
    const root = harness.routeNativeElement!;
    expect(root.textContent).toContain('Applicant Documents');
    expect(
      root.querySelector('[aria-label="Document template unavailable: Employment contract"]'),
    ).toBeNull();
    const select = root.querySelector(
      'select[aria-label="Document type for supporting-document.pdf"]',
    ) as HTMLSelectElement;
    expect(select.value).toBe('Other Records');
    select.value = 'Employment contract';
    select.dispatchEvent(new Event('change'));
    await harness.fixture.whenStable();
    harness.detectChanges();
    await harness.fixture.whenStable();
    const patch = request.mock.calls.find((call) => call[2] === 'PATCH')!;
    expect(patch[0]).toBe('/companies/north/recruitment/files/file-1');
    expect(patch[1]).toEqual({ document_type: 'Employment contract' });
    expect(patch[3]).toEqual({ 'If-Match': '"v1"' });
    expect(applicant.documents![0].documentType).toBe('Employment contract');
    expect(
      (
        harness.routeNativeElement!.querySelector(
          'select[aria-label="Document type for supporting-document.pdf"]',
        ) as HTMLSelectElement
      ).value,
    ).toBe('Employment contract');
  });
  it('uploads a generic supporting file and allows a custom type afterward', async () => {
    const harness = await open();
    const service = TestBed.inject(RecruitmentApi);
    vi.spyOn(service, 'load').mockResolvedValue(undefined);
    service.vacancies.set([
      { id: 'vacancy-1', company_id: 'north', version: 1 } as RecruitmentVacancy,
    ]);
    const upload = vi.spyOn(service, 'upload').mockImplementationOnce(async () => {
      const document = file('file-2', 'interview-record.pdf');
      applicant.documents!.push(document);
      return document;
    });
    const input = harness.routeNativeElement!.querySelector(
      '[aria-label="Upload supporting document"]',
    ) as HTMLInputElement;
    const document = new File(['contents'], 'interview-record.pdf', { type: 'application/pdf' });
    Object.defineProperty(input, 'files', { value: [document] });
    input.dispatchEvent(new Event('change'));
    await harness.fixture.whenStable();
    harness.detectChanges();
    await harness.fixture.whenStable();
    expect(upload).toHaveBeenCalled();
    const select = harness.routeNativeElement!.querySelector(
      'select[aria-label="Document type for interview-record.pdf"]',
    ) as HTMLSelectElement;
    select.value = '__custom__';
    select.dispatchEvent(new Event('change'));
    harness.detectChanges();
    await harness.fixture.whenStable();
    const name = harness.routeNativeElement!.querySelector(
      'input[aria-label="Document type for interview-record.pdf name"]',
    ) as HTMLInputElement;
    name.value = 'Panel scoring sheet';
    name.dispatchEvent(new Event('input'));
    harness.detectChanges();
    [...harness.routeNativeElement!.querySelectorAll('button')]
      .find((button) => button.textContent?.trim() === 'Save type')!
      .click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(applicant.documents![1].documentType).toBe('Panel scoring sheet');
  });
  it('preserves the previous type after a failed save', async () => {
    const harness = await open();
    request.mockRejectedValueOnce(new Error('The document changed. Reload and retry.'));
    const select = harness.routeNativeElement!.querySelector(
      'select[aria-label="Document type for supporting-document.pdf"]',
    ) as HTMLSelectElement;
    select.value = 'Passport';
    select.dispatchEvent(new Event('change'));
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain(
      'The document changed. Reload and retry.',
    );
    expect(applicant.documents![0].documentType).toBe('');
    expect(select.value).toBe('Other Records');
  });
  it('shows saved types without editing controls for read-only recruiters', async () => {
    editable.set(false);
    applicant.documents![0].documentType = 'Interview assessment';
    const harness = await open();
    expect(harness.routeNativeElement!.textContent).toContain('Interview assessment');
    expect(harness.routeNativeElement!.querySelector('cv-staff-document-type')).toBeNull();
  });
});
