import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import type { ParamMap } from '@angular/router';
import { AcademyComplianceReview } from './academy-compliance-review';
import { AcademyService } from './academy.service';
import { certificateRecord } from './academy-certificate-test-data';
import { CertificateRecord } from './academy-certificates-api.service';

describe('Persisted staff certificates and compliance review', () => {
  const rows = signal<CertificateRecord[]>([]),
    saving = signal(false),
    allowed = signal(true),
    apiError = signal('');
  let revoke: ReturnType<typeof vi.fn>,
    download: ReturnType<typeof vi.fn>,
    pdf: ReturnType<typeof vi.fn>;
  let routeParams: BehaviorSubject<ParamMap>;
  let createUrl: ReturnType<typeof vi.fn>;
  let originalUrl: PropertyDescriptor | undefined;
  afterEach(() => {
    if (originalUrl) Object.defineProperty(URL, 'createObjectURL', originalUrl);
    else delete (URL as unknown as Record<string, unknown>)['createObjectURL'];
  });
  beforeEach(() => {
    const row = certificateRecord();
    row.currentTraining = row.training;
    rows.set([row]);
    saving.set(false);
    allowed.set(true);
    apiError.set('');
    revoke = vi.fn(async () => null);
    download = vi.fn(async () => undefined);
    pdf = vi.fn();
    createUrl = vi.fn(() => 'blob:test-preview');
    originalUrl = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createUrl });
    const params = convertToParamMap({ certificateId: 'certificate' });
    routeParams = new BehaviorSubject(params);
    TestBed.configureTestingModule({
      imports: [AcademyComplianceReview],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: routeParams, snapshot: { paramMap: params } },
        },
        {
          provide: AcademyService,
          useValue: {
            certificatesApi: {
              records: rows,
              saving,
              canRevoke: allowed,
              canExport: allowed,
              error: apiError,
              download,
              pdf,
            },
            store: { companyId: () => 'company' },
            state: () => ({
              certificates: rows().map((r) => r.certificate),
              refresherSchedules: [],
              events: [],
              courses: [],
            }),
            canReadCertificate: () => true,
            attempt: () => undefined,
            canManage: () => true,
            practicalReadiness: () => 'Separate practical sign-off required',
            knowledgeCompliance: () => ({ compliant: true }),
            revokeCertificate: revoke,
          },
        },
      ],
    });
  });
  it('renders the authoritative certificate, source HR filing and current training', () => {
    const fixture = TestBed.createComponent(AcademyComplianceReview);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Jane Worker');
    expect(text).toContain('Safeguarding');
    expect(text).toContain('certificate.pdf');
    expect(text).toContain('Valid & Active');
    expect(text).toContain('Rota integration is not configured.');
  });
  it('does not invent rota completion or practical readiness', () => {
    const fixture = TestBed.createComponent(AcademyComplianceReview);
    fixture.detectChanges();
    expect((fixture.componentInstance as any).completed()).toBe(false);
    expect((fixture.componentInstance as any).courseCurrent()).toBe(true);
    expect((fixture.componentInstance as any).canViewRota()).toBe(false);
    expect(
      (fixture.componentInstance as any)
        .steps()
        .find((s: any) => s.label === 'Rota Training Inputs Updated').done,
    ).toBe(false);
  });
  it('awaits revocation before announcing success', async () => {
    let resolve!: (value: string | null) => void;
    revoke.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const fixture = TestBed.createComponent(AcademyComplianceReview);
    fixture.detectChanges();
    const page = fixture.componentInstance as any;
    page.reason = 'Incorrect evidence';
    page.revokeOpen.set(true);
    const pending = page.revoke();
    expect(page.notice()).toBe('');
    expect(page.revokeOpen()).toBe(true);
    resolve(null);
    await pending;
    expect(page.revokeOpen()).toBe(false);
    expect(page.notice()).toContain('Evidence revoked');
  });
  it('downloads through the authorised server endpoint', async () => {
    const fixture = TestBed.createComponent(AcademyComplianceReview);
    fixture.detectChanges();
    await (fixture.componentInstance as any).download();
    expect(download).toHaveBeenCalledWith('certificate');
  });
  it('shows unavailable data after access is denied', () => {
    rows.set([]);
    apiError.set('Certificate access denied');
    const fixture = TestBed.createComponent(AcademyComplianceReview);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Certificate access denied');
    expect(fixture.nativeElement.textContent).not.toContain('Jane Worker');
  });
  it('discards a slow PDF preview after selecting another certificate', async () => {
    let resolve!: (value: Blob) => void;
    pdf.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const fixture = TestBed.createComponent(AcademyComplianceReview);
    fixture.detectChanges();
    const page = fixture.componentInstance as any;
    const pending = page.previewFiled();
    rows.set([certificateRecord('other')]);
    routeParams.next(convertToParamMap({ certificateId: 'other' }));
    fixture.detectChanges();
    resolve(new Blob(['%PDF-']));
    await pending;
    expect(createUrl).not.toHaveBeenCalled();
    expect(page.pdfPreview()).toBeNull();
    expect(page.error()).toBe('');
  });
  it('does not create a PDF preview after the view is destroyed', async () => {
    let resolve!: (value: Blob) => void;
    pdf.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const fixture = TestBed.createComponent(AcademyComplianceReview);
    fixture.detectChanges();
    const page = fixture.componentInstance as any;
    const pending = page.previewFiled();
    fixture.destroy();
    resolve(new Blob(['%PDF-']));
    await pending;
    expect(createUrl).not.toHaveBeenCalled();
    expect(page.pdfPreview()).toBeNull();
    expect(page.error()).toBe('');
  });
});
