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
});
