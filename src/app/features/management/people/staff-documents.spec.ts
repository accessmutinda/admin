import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { StaffProfile } from './staff-profile';
import { HrService } from './hr.service';
import { PayrollService } from '../payroll/payroll.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { newStaff } from './hr.models';
import type { OnboardingPerson } from './onboarding-staff-api.service';
import type { StaffOnboarding } from './onboarding.generated';

describe('Staff document classification', () => {
  const company = signal('north');
  let state: StaffOnboarding & { person: OnboardingPerson };
  let request: ReturnType<typeof vi.fn>;
  let editable: boolean;
  beforeEach(() => {
    editable = true;
    company.set('north');
    const person = newStaff();
    Object.assign(person, {
      id: 'staff-1',
      name: 'Alex Starter',
      stage: 'Hired',
      documents: [
        {
          id: 'file-1',
          name: 'signed-contract.pdf',
          type: 'application/pdf',
          content: '',
          category: 'Other Records',
          expiry: '',
          status: 'Pending review',
        },
        {
          id: 'certificate-1',
          sourceCertificateId: 'academy-1',
          name: 'Academy certificate',
          type: 'application/pdf',
          content: '',
          category: 'Professional & Training',
        },
      ],
    });
    state = {
      company_id: 'north',
      version: 1,
      etag: '"v1"',
      person: person as OnboardingPerson,
      readiness: {
        ready: false,
        missing: [],
        completed: 0,
        total: 1,
        next_task: null,
        next_section: 'documents',
        tasks: [],
      },
      courses: [],
      local_date: '2026-11-10',
      capabilities: { edit: true, approve: true, personal: true },
    };
    request = vi.fn(async (_path, body, method) => {
      if (method === 'PATCH') {
        const updates = body.documents as { id: string; category: string }[];
        const person = structuredClone(state.person);
        person.documents = person.documents!.map((doc) => ({
          ...doc,
          category: updates.find((update) => update.id === doc.id)?.category ?? doc.category,
        }));
        state = { ...state, person, version: state.version + 1, etag: `"v${state.version + 1}"` };
      }
      return structuredClone(state);
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'manage/people/staff/:id/documents',
            component: StaffProfile,
            data: { staffSection: 'documents' },
          },
        ]),
        {
          provide: AuthService,
          useValue: {
            profile: () => ({ id: 'user-1' }),
            currentUser: () => ({ name: 'Reviewer' }),
            api: request,
          },
        },
        {
          provide: CompanyAccessService,
          useValue: {
            companyId: company,
            context: () => ({ revision: 1 }),
            can: (_module: string, _area: string, action: string) => action !== 'edit' || editable,
            canPath: () => true,
          },
        },
        { provide: PayrollService, useValue: { can: () => false } },
        {
          provide: HrService,
          useValue: {
            can: () => true,
            canPay: () => false,
            store: { companyId: company, company: () => ({ name: 'North' }) },
          },
        },
      ],
    });
  });
  async function open() {
    const harness = await RouterTestingHarness.create('/manage/people/staff/staff-1/documents');
    await harness.fixture.whenStable();
    harness.detectChanges();
    return harness;
  }
  it('saves the selected type to the server and preserves it after reloading the profile', async () => {
    const harness = await open();
    const select: HTMLSelectElement = harness.routeNativeElement!.querySelector(
      'select[aria-label="Document type for signed-contract.pdf"]',
    )!;
    expect(select.value).toBe('Other Records');
    select.value = 'Employment contract';
    select.dispatchEvent(new Event('change'));
    await harness.fixture.whenStable();
    harness.detectChanges();
    const save = request.mock.calls.find((call) => call[2] === 'PATCH')!;
    expect(save[0]).toBe('/companies/north/staff/staff-1/workforce-compliance/documents');
    expect(save[1]).toEqual({
      documents: [{ id: 'file-1', category: 'Employment contract', expiry: null }],
    });
    expect((save[3] as Record<string, string>)['If-Match']).toBe('"v1"');
    expect(harness.routeNativeElement!.textContent).toContain('Document type saved.');
    expect(state.person.documents![0].category).toBe('Employment contract');
    await (harness.routeDebugElement!.componentInstance as StaffProfile)['staffApi'].load(
      'staff-1',
      true,
    );
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(
      (harness.routeDebugElement!.componentInstance as StaffProfile)['staffApi'].person()!
        .documents![0].category,
    ).toBe('Employment contract');
    expect(
      (
        harness.routeNativeElement!.querySelector(
          'select[aria-label="Document type for signed-contract.pdf"]',
        ) as HTMLSelectElement
      ).value,
    ).toBe('Employment contract');
    expect(
      harness.routeNativeElement!.querySelector(
        'select[aria-label="Document type for Academy certificate"]',
      ),
    ).toBeNull();
  });
  it('keeps the previous type visible if the server rejects a change', async () => {
    const harness = await open();
    request.mockRejectedValueOnce(new Error('This record changed. Reload and retry.'));
    const select: HTMLSelectElement = harness.routeNativeElement!.querySelector(
      'select[aria-label="Document type for signed-contract.pdf"]',
    )!;
    select.value = 'Passport';
    select.dispatchEvent(new Event('change'));
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain(
      'This record changed. Reload and retry.',
    );
    expect(state.person.documents![0].category).toBe('Other Records');
    expect(select.value).toBe('Other Records');
  });
  it('saves custom document types and includes them in the type filter', async () => {
    const harness = await open();
    const select: HTMLSelectElement = harness.routeNativeElement!.querySelector(
      'select[aria-label="Document type for signed-contract.pdf"]',
    )!;
    select.value = '__custom__';
    select.dispatchEvent(new Event('change'));
    harness.detectChanges();
    await harness.fixture.whenStable();
    const input: HTMLInputElement = harness.routeNativeElement!.querySelector(
      'input[aria-label="Document type for signed-contract.pdf name"]',
    )!;
    input.value = 'Signed consent form';
    input.dispatchEvent(new Event('input'));
    harness.detectChanges();
    const button = [...harness.routeNativeElement!.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Save type',
    )!;
    button.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(state.person.documents![0].category).toBe('Signed consent form');
    expect(harness.routeNativeElement!.textContent).toContain('Signed consent form');
  });
  it('does not offer document type changes to read-only users', async () => {
    editable = false;
    const harness = await open();
    expect(harness.routeNativeElement!.querySelector('cv-staff-document-type')).toBeNull();
  });
  it('uploads a generic document before asking for its type', async () => {
    const harness = await open();
    const api = (harness.routeDebugElement!.componentInstance as StaffProfile)['staffApi'];
    const upload = vi.spyOn(api, 'upload').mockImplementationOnce(async (file, category) => {
      const document = {
        id: 'new-file',
        name: file.name,
        category,
        type: 'application/pdf',
        content: '',
      };
      state.person.documents!.push(document);
      api.value.set(structuredClone(state));
      return document;
    });
    const input = harness.routeNativeElement!.querySelector(
      '#staff-document-input',
    ) as HTMLInputElement;
    const file = new File(['document contents'], 'additional-record.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));
    await harness.fixture.whenStable();
    harness.detectChanges();
    await harness.fixture.whenStable();
    expect(upload).toHaveBeenCalledWith(file, 'Other Records');
    expect(
      harness.routeNativeElement!.querySelector(
        'select[aria-label="Document type for additional-record.pdf"]',
      ),
    ).not.toBeNull();
    expect(harness.routeNativeElement!.textContent).toContain('Choose its document type');
  });
});
