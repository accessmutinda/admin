import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { provideLocationMocks } from '@angular/common/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { CareDocumentsApi } from './care-documents-api.service';
import { CarePlanApi } from './care-plan-api.service';
import { CARE_PLAN_PROVIDERS } from './care-plan.providers';
import { CarePlan } from './care-plan';
import { seedCarePlan } from './care-plan.models';
import { emptyClientFile } from '../clients/client-file.models';

describe('Care-plan screen with connected services', () => {
  const client: any = {
    id: 'patient',
    name: 'Recorded person',
    reference: 'SU-1',
    address: 'Recorded address',
    postcode: 'AB1 2CD',
    funding: 'Private',
    priority: 'Standard',
    active: true,
    file: emptyClientFile(),
  };
  let request: ReturnType<typeof vi.fn>, documents: any, allowDocuments: boolean;
  function workspace(revision = 1): any {
    const record = seedCarePlan(client);
    record.revision = revision;
    record.versions[0].id = 'version';
    record.versions[0].status = 'Draft';
    record.versions[0].author = 'Recorded author';
    record.versions[0].reviewReport = {
      mode: 'Recorded',
      generatedAt: '',
      sources: [],
      findings: [],
    };
    return {
      company_id: 'north',
      id: 'patient',
      etag: `"v${revision}"`,
      source_token: 'source-' + revision,
      record,
      source: {
        overview: { record: { id: 'patient', company_id: 'north', version: revision } },
        contacts: [],
      },
      calls: [],
      unavailable: [],
      as_of: '2026-11-13T00:00:00Z',
    };
  }
  beforeEach(() => {
    allowDocuments = false;
    request = vi.fn(async () => workspace());
    documents = {
      load: vi.fn(async () => {}),
      documents: signal([]),
      error: signal(''),
      content: vi.fn(),
    };
    const params = convertToParamMap({ view: 'care-plan', stage: 'versions' });
    TestBed.configureTestingModule({
      providers: [
        ...CARE_PLAN_PROVIDERS,
        provideRouter([]),
        provideLocationMocks(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ id: 'patient' }), queryParamMap: params },
            queryParamMap: of(params),
          },
        },
        {
          provide: AuthService,
          useValue: {
            api: request,
            currentUser: () => ({
              name: 'Recorded manager',
              email: 'manager@example.test',
              roleCode: 'CA',
            }),
          },
        },
        {
          provide: ServiceUsersApi,
          useValue: {
            scope: signal('north:actor:1'),
            companyId: signal('north'),
            allowed: () => true,
            access: { can: (_m: string, s: string) => s !== 'documents' || allowDocuments },
            projectOverview: () => structuredClone(client),
          },
        },
        { provide: CareDocumentsApi, useValue: documents },
      ],
    });
  });
  async function screen() {
    const fixture = TestBed.createComponent(CarePlan);
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect((fixture.componentInstance as any).plan).toBeTruthy();
    });
    return fixture;
  }
  it('keeps the saved revision after submission is rejected and permits correcting the draft', async () => {
    const fixture = await screen(),
      component = fixture.componentInstance as any;
    request.mockImplementation(async (_path: string, _body: any, method: string) => {
      if (method === 'PATCH') return workspace(2);
      throw Object.assign(new Error('Confirm the service-user information.'), { status: 409 });
    });
    await component.save('submit');
    fixture.detectChanges();
    expect(component.error()).toContain('Confirm the service-user information');
    expect(component.record.revision).toBe(2);
    request.mockResolvedValueOnce(workspace(3));
    await component.save('save');
    fixture.detectChanges();
    const call = request.mock.calls.at(-1) as any[];
    expect(call[3]['If-Match']).toBe('"v2"');
    expect(component.error()).toBe('');
    expect(component.record.revision).toBe(3);
  });
  it('loads attached photographs before the screen clones the reopened version', async () => {
    allowDocuments = true;
    const value = workspace();
    value.record.versions[0].details.aboutPhotoId = 'photo';
    value.record.versions[0].body = [
      {
        id: 'observation',
        photoId: 'photo',
        photo: '',
        view: 'Front',
        date: '2026-11-12',
        status: 'Open',
        history: [],
        location: 'Arm',
        type: 'Bruise',
        description: 'Recorded observation',
        action: 'Agreed follow-up',
      },
    ];
    request.mockResolvedValue(value);
    documents.documents.set([{ id: 'photo' }]);
    documents.content.mockResolvedValue(new Blob(['image'], { type: 'image/png' }));
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:reopened-photo');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const fixture = await screen(),
      component = fixture.componentInstance as any;
    expect(component.plan.details.aboutPhoto).toBe('blob:reopened-photo');
    expect(component.plan.body[0].photo).toBe('blob:reopened-photo');
    expect(TestBed.inject(CarePlanApi).loading()).toBe(false);
    fixture.destroy();
    create.mockRestore();
    revoke.mockRestore();
  });
  it('shows real approval confirmation controls for a submitted plan', async () => {
    const value = workspace();
    value.record.versions[0].status = 'In review';
    delete value.record.versions[0].demoScope;
    request.mockResolvedValue(value);
    const fixture = await screen();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Approval confirmation');
    expect(root.textContent).toContain('I reviewed all required care areas and confirm approval.');
    const input = root.querySelector<HTMLInputElement>('input[autocomplete="off"]')!;
    input.value = 'Recorded manager';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect((fixture.componentInstance as any).signatureName).toBe('Recorded manager');
    const api = TestBed.inject(CarePlanApi);
    vi.spyOn(api, 'download').mockResolvedValue();
    (fixture.componentInstance as any).signatureConfirmed = true;
    const approved = workspace(2);
    approved.record.versions[0].status = 'Approved';
    request.mockResolvedValue(approved);
    await (fixture.componentInstance as any).save('approve');
    const call = request.mock.calls.find((args: any[]) => args[0].endsWith('/approve')) as any[];
    expect(call[1].signature_name).toBe('Recorded manager');
    expect(call[1].signature_confirmed).toBe(true);
  });
  it('shows recorded checks and an unavailable task-evidence source honestly', async () => {
    const fixture = await screen();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const tab = [...fixture.nativeElement.querySelectorAll('button')].find((button: any) =>
      button.textContent.includes('Quality Review'),
    ) as HTMLButtonElement;
    tab.click();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Care-plan readiness and recorded review');
    expect(text).toContain('Task-linked visit evidence is unavailable');
    expect(text).not.toContain('Browse the fictional evidence records');
  });
  it('renders every remaining care area and highlights missing required inputs without saving', async () => {
    const fixture = await screen(),
      component = fixture.componentInstance as any;
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    for (let index = 3; index < 17; index++) {
      component.goSection(index);
      component.section.fields = {};
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.care-area-editor textarea')).toHaveLength(9);
      request.mockClear();
      component.markComplete();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('textarea[aria-invalid="true"]')).toHaveLength(
        7,
      );
      expect(component.error()).toContain('Current situation');
      expect(request).not.toHaveBeenCalled();
    }
  });
  it('invalidates review completion when editing a care area and removes stale formatting', async () => {
    const fixture = await screen(),
      component = fixture.componentInstance as any;
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.goSection(3);
    component.section.complete = true;
    component.section.fields['_richHtml_situation'] = '<b>Old wording</b>';
    component.section.fields['_richText_situation'] = 'Old wording';
    component.updateSectionField('situation', 'New reviewed wording');
    expect(component.section.complete).toBe(false);
    expect(component.section.fields['situation']).toBe('New reviewed wording');
    expect(component.section.fields['_richHtml_situation']).toBeUndefined();
  });
  it('keeps approved care areas read only and presents the full review requirements', async () => {
    const value = workspace();
    value.record.versions[0].status = 'Approved';
    request.mockResolvedValue(value);
    const fixture = await screen(),
      component = fixture.componentInstance as any;
    expect(fixture.nativeElement.textContent).toContain('All required care areas');
    expect(fixture.nativeElement.textContent).not.toContain('14 deferred care areas');
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.goSection(16);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(
      [...fixture.nativeElement.querySelectorAll('.care-area-editor textarea')].every(
        (field: any) => field.disabled,
      ),
    ).toBe(true);
    expect(fixture.nativeElement.querySelector('.care-area-editor button.primary').disabled).toBe(
      true,
    );
  });

  it('clears an earlier upload error after a valid consented photograph and blocks edits while uploading', async () => {
    const fixture = await screen(),
      component = fixture.componentInstance as any;
    const api = TestBed.inject(CarePlanApi);
    component.photoConsent = true;
    component.error.set('Choose another file');
    vi.spyOn(api, 'uploadPhoto').mockResolvedValue({ photo: 'blob:valid-photo', photoId: 'photo' });
    await component.attachPhoto({
      target: { files: [new File(['image'], 'photo.png', { type: 'image/png' })] },
    });
    expect(component.error()).toBe('');
    expect(component.observation.photoId).toBe('photo');
    api.uploading.set(true);
    expect(component.editable()).toBe(false);
    api.uploading.set(false);
    expect(component.editable()).toBe(true);
  });

  it('requires an explanation before marking a care area as not required', async () => {
    const fixture = await screen(),
      component = fixture.componentInstance as any;
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.goSection(14);
    component.section.required = false;
    component.section.review = '';
    component.section.fields['changes'] = '';
    request.mockClear();
    component.markComplete();
    expect(component.error()).toContain('why this care area is not required');
    expect(request).not.toHaveBeenCalled();
    component.section.fields['changes'] =
      'Discussed with the service user; this area is outside current support needs.';
    request.mockResolvedValue(workspace(2));
    await component.markComplete();
    expect(request.mock.calls.some((call: any[]) => call[2] === 'PATCH')).toBe(true);
  });
  it('retains an unreviewed area when its review save is rejected', async () => {
    const fixture = await screen(),
      component = fixture.componentInstance as any;
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.goSection(3);
    for (const [key] of component.fields) component.section.fields[key] = 'Agreed support';
    component.section.review = '2027-02-15';
    request.mockRejectedValue(new Error('The record changed. Reload before saving.'));
    await component.markComplete();
    expect(component.section.complete).toBe(false);
    expect(component.error()).toContain('The record changed');
  });
  it('allows disclosure controls only for an approver with an editable draft', async () => {
    const fixture = await screen(),
      component = fixture.componentInstance as any;
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const approval = signal(false);
    vi.spyOn(TestBed.inject(CarePlanApi), 'canApprove').mockImplementation(() => approval());
    component.goSection(3);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.care-area-sharing').disabled).toBe(true);
    approval.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.care-area-sharing').disabled).toBe(false);
  });
});
