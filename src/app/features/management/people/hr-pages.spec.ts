import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { HrService } from './hr.service';
import { HrWorkspace } from './hr-workspace';
import { StaffCreate } from './staff-create';
import { StaffFields } from './staff-fields';
import type { StaffOnboarding } from './onboarding.generated';
import { PeopleApiService } from './people-api.service';
import { RecruitmentApi, RecruitmentApplication } from '../recruitment/recruitment-api.service';

const employee = {
  id: 'staff-1',
  company_id: 'north',
  employment_id: 'employment-1',
  version: 1,
  reference: 'N-001',
  name: 'Alex Worker',
  role_id: 'role-1',
  role: 'Care Worker',
  branch_id: 'branch-1',
  branch: 'North',
  status: 'Active',
  email: 'alex@example.test',
  phone: '+442079460141',
  driver: true,
  availability: 'Weekly slots',
};
function summary() {
  return {
    company_id: 'north',
    company: {
      id: 'north',
      name: 'North Care',
      code: 'N',
      sector: 'Care',
      head_office_address: '',
    },
    totals: { staff: 21, active: 20, onboarding: 1, inactive: 0, left: 0, branches: 1, drafts: 1 },
    unavailable: {},
    capabilities: { staff_profile: true, staff_edit: true, staff_create: true },
  };
}
function directory(path: string) {
  const query = new URL(path, 'https://local.invalid').searchParams;
  return {
    count: query.get('q') === 'missing' ? 0 : 21,
    next: null,
    previous: null,
    results: query.get('q') === 'missing' ? [] : [employee],
    meta: {
      company_id: 'north',
      page: Number(query.get('page') ?? 1),
      page_size: 10,
      filters: {},
      unavailable: {},
      branches: [{ id: 'branch-1', label: 'North' }],
      roles: [{ id: 'role-1', label: 'Care Worker' }],
    },
  };
}
async function renderedDirectory(url = '/manage/people/staff') {
  const request = vi.fn(async (path: string) =>
    path.includes('/hr/summary') ? summary() : directory(path),
  );
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'manage/people', component: HrWorkspace, data: { hrMode: 'overview' } },
        { path: 'manage/people/staff', component: HrWorkspace, data: { hrMode: 'directory' } },
      ]),
      { provide: AuthService, useValue: { profile: signal({ id: 'reviewer' }), api: request } },
      {
        provide: CompanyAccessService,
        useValue: { companyId: signal('north'), can: () => true, canPath: () => true },
      },
      {
        provide: HrService,
        useValue: { can: () => true, store: { company: () => null, initials: () => 'AW' } },
      },
    ],
  });
  const harness = await RouterTestingHarness.create(url);
  await vi.waitFor(() =>
    expect(request.mock.calls.some(([path]) => path.includes('/staff?'))).toBe(true),
  );
  await harness.fixture.whenStable();
  harness.detectChanges();
  return { harness, request, text: () => harness.routeNativeElement!.textContent! };
}

describe('People & HR server-backed rendered journeys', () => {
  it('renders workforce totals and navigation from the company response', async () => {
    const { text, request } = await renderedDirectory('/manage/people');
    expect(text()).toContain('North Care');
    expect(text()).toContain('Alex Worker');
    expect(text()).toContain('User Management');
    expect(request).toHaveBeenCalledWith('/companies/north/hr/summary');
  });
  it('sends search and status filters to the directory and renders empty results', async () => {
    const { harness, request, text } = await renderedDirectory(
      '/manage/people/staff?q=missing&status=Active',
    );
    expect(
      request.mock.calls.some(
        ([path]) => path.includes('q=missing') && path.includes('status=Active'),
      ),
    ).toBe(true);
    expect(text()).not.toContain('Alex Worker');
    expect(harness.routeNativeElement!.querySelectorAll('tbody tr').length).toBe(1);
  });
  it('keeps contact, driver and employment fields in the directory', async () => {
    const { harness, text } = await renderedDirectory();
    const headings = [...harness.routeNativeElement!.querySelectorAll('th')].map((element) =>
      element.textContent!.trim(),
    );
    for (const title of [
      'Staff Member',
      'Contact Details',
      'Driver',
      'Availability',
      'Employment Status',
    ])
      expect(headings).toContain(title);
    expect(headings).not.toContain('DBS Status');
    expect(text()).toContain('alex@example.test');
    expect(text()).toContain('Weekly slots');
  });
  it('uses server pagination and current company role and branch options', async () => {
    const { harness, request, text } = await renderedDirectory(
      '/manage/people/staff?page=2&branch=branch-1&role=role-1',
    );
    expect(
      request.mock.calls.some(
        ([path]) =>
          path.includes('page=2') &&
          path.includes('branch=branch-1') &&
          path.includes('role=role-1'),
      ),
    ).toBe(true);
    expect(text()).toContain('North');
    expect(text()).toContain('Care Worker');
    expect(harness.routeNativeElement!.querySelector('button[aria-label="Page 3"]')).not.toBeNull();
  });
  it('clears staff and exposes a retry when the server becomes unavailable', async () => {
    const { harness, request, text } = await renderedDirectory();
    request.mockRejectedValue(Error('Workforce unavailable'));
    await TestBed.inject(PeopleApiService).load('page=1');
    harness.detectChanges();
    expect(text()).toContain('Workforce unavailable');
    expect(text()).not.toContain('Alex Worker');
  });
});

async function setupWizard(source = true, restore = false, vacancyLocation = ' North ') {
  const row: RecruitmentApplication = {
    id: 'application-1',
    company_id: 'north',
    version: 2,
    etag: '"v2"',
    name: 'Alex Applicant',
    email: 'alex@example.test',
    role: 'Care Worker',
    vacancy: 'Care Worker',
    vacancyId: 'vacancy-1',
    working_pattern: 'Full time',
    contract_type: 'Fixed term',
    location: 'Oxford',
    vacancy_location: vacancyLocation,
    stage: 'Offer',
    start: '',
    staff_id: null,
    documents: [
      {
        id: 'file-1',
        name: 'evidence.pdf',
        type: 'application/pdf',
        size: 24,
        state: 'clean',
        documentType: '',
        version: 1,
        etag: '"v1"',
        requirementId: null,
      },
    ],
    offers: [
      {
        id: 'offer-1',
        version: 1,
        etag: '"v1"',
        terms: 'Permanent role',
        start_date: '2026-11-14',
        decision: 'Accepted',
        reason: 'Confirmed',
        decision_at: null,
      },
    ],
  };
  const draft = signal<any>(null),
    record = signal<RecruitmentApplication | null>(null);
  const saveDraft = vi.fn(async (_id, facts, step) => {
    draft.set({ facts: structuredClone(facts), step, etag: '"v1"' });
    return draft();
  });
  if (restore)
    draft.set({
      facts: {
        first_name: 'Resumed',
        surname: 'Applicant',
        email: 'resumed@example.test',
        reference: 'DRAFT-1',
        branch_name: 'North',
        branch_id: 'alternate-branch',
        job_title: 'Care Worker',
        start_date: '2026-11-14',
        employment_type: 'Permanent',
        facts: { employment: { hours: '35' } },
        file_ids: [],
      },
      step: 2,
      etag: '"v3"',
    });
  const api = {
    companyId: signal('north'),
    scope: signal('reviewer:north'),
    record,
    vacancies: signal([]),
    detail: vi.fn(async () => {
      record.set(row);
    }),
    load: vi.fn(),
    hireBranches: vi.fn().mockResolvedValue([
      { id: 'hiring-branch', name: 'North', code: 'NORTH' },
      { id: 'alternate-branch', name: 'West', code: 'WEST' },
      { id: 'personal-city-branch', name: 'Oxford', code: 'OX' },
    ]),
    draft: vi.fn(async () => ({ draft: draft() })),
    saveDraft,
    message: (error: Error) => error.message,
    command: vi.fn(async () => ({ staff_id: 'staff-1' })),
    access: { can: () => true },
    setDocumentType: vi.fn(async (file, type) => ({
      ...file,
      documentType: type,
      version: 2,
      etag: '"v2"',
    })),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'manage/people/staff/new', component: StaffCreate },
        { path: 'manage/people/onboarding', component: HrWorkspace },
      ]),
      { provide: RecruitmentApi, useValue: api },
      { provide: HrService, useValue: { can: () => true, canPay: () => false } },
      { provide: AuthService, useValue: { profile: signal({ id: 'reviewer' }), api: vi.fn() } },
      {
        provide: CompanyAccessService,
        useValue: { companyId: signal('north'), context: () => ({}), can: () => true },
      },
    ],
  });
  const harness = await RouterTestingHarness.create(
    '/manage/people/staff/new' + (source ? '?source=application-1' : ''),
  );
  await harness.fixture.whenStable();
  harness.detectChanges();
  const component = harness.routeDebugElement!.componentInstance as StaffCreate;
  return { harness, component, api, text: () => harness.routeNativeElement!.textContent! };
}
describe('Accepted-offer staff setup', () => {
  it('shows a saved photograph after its download and clears its reference when removed', async () => {
    const { component, harness } = await setupWizard();
    const fields = harness.routeDebugElement!.query(By.directive(StaffFields))
      .componentInstance as StaffFields;
    fields.staffId = 'staff-1';
    component['p'].hr!.personal.photoFileId = 'photo-1';
    component['p'].hr!.personal.photo = '';
    const saved = structuredClone(component['p']);
    saved.hr!.personal.photo = 'blob:saved-photo';
    fields['staffApi'].value.set({
      company_id: 'north',
      version: 1,
      etag: '"v1"',
      person: saved,
      local_date: '2026-11-14',
      courses: [],
      capabilities: { edit: true, approve: true, personal: true },
      readiness: {
        ready: false,
        missing: [],
        completed: 0,
        total: 0,
        next_task: null,
        next_section: 'personal',
        tasks: [],
      },
    } as StaffOnboarding);
    expect(fields['photograph']()).toBe('blob:saved-photo');
    fields['removePhoto']();
    expect(component['p'].hr!.personal.photoFileId).toBe('');
    expect(fields['photograph']()).toBe('');
  });
  it('requires an accepted recruitment source rather than opening an unbound creation form', async () => {
    const { text, api } = await setupWizard(false);
    expect(text()).toContain('Open an accepted recruitment offer');
    expect(api.command).not.toHaveBeenCalled();
  });
  it('keeps the current step when required personal information is missing', async () => {
    const { component, harness, text } = await setupWizard();
    component['p'].hr!.personal.firstName = '';
    component['select'](1);
    harness.detectChanges();
    expect(component['step']()).toBe(0);
    expect(text()).toContain('Enter first name and surname.');
  });
  it('saves a partial setup through the application API with its version', async () => {
    const { component, api } = await setupWizard();
    component['select'](1);
    await component['saveDraft']();
    expect(api.saveDraft).toHaveBeenCalledWith(
      'application-1',
      expect.objectContaining({
        first_name: 'Alex',
        branch_name: 'North',
        branch_id: 'hiring-branch',
      }),
      1,
      '"v0"',
    );
    expect(component['notice']()).toContain('Draft');
  });
  it('restores the server draft step and normalises numeric employment values', async () => {
    const { component } = await setupWizard(true, true);
    expect(component['step']()).toBe(2);
    expect(component['p'].hr!.personal.firstName).toBe('Resumed');
    expect(component['p'].hr!.employment.hours).toBe(35);
    expect(component['p'].hr!.employment.workingPattern).toBe('Full time');
    expect(component['p'].hr!.employment.contractType).toBe('Permanent');
    expect(component['p'].location).toBe('West');
    expect(component['applicantLocation']).toBe('Oxford');
  });
  it('prefills the advertised pattern and the contract type as separate selections', async () => {
    const { component, harness } = await setupWizard();
    component['select'](1);
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const root = harness.routeNativeElement!;
    expect(root.querySelector('[aria-label="Working pattern"]')?.textContent).toContain('Full time');
    expect(root.querySelector('[aria-label="Contract type"]')?.textContent).toContain('Fixed term');
    expect(root.querySelector('[aria-label="Base branch"]')?.textContent).toContain('North');
    expect(root.textContent).toContain('Applicant location Oxford');
  });
  it('requires a recruiter selection when the vacancy location does not match a branch', async () => {
    const { component, api, harness, text } = await setupWizard(true, false, 'Oxfordshire outreach');
    component['select'](1);
    harness.detectChanges();
    expect(component['p'].location).toBe('');
    expect(text()).toContain('Select the branch where the employee will be based.');
    await component['create']();
    expect(api.command).not.toHaveBeenCalled();
    component['selectBranch']('alternate-branch');
    await component['saveDraft']();
    expect(api.saveDraft).toHaveBeenCalledWith(
      'application-1',
      expect.objectContaining({ branch_id: 'alternate-branch', branch_name: 'West' }),
      1,
      '"v0"',
    );
  });
  it('leaves induction decisions until after hiring', async () => {
    const { component, harness, text } = await setupWizard();
    component['p'].hr!.employment.type = 'Permanent';
    component['select'](3);
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const boxes = [
      ...harness.routeNativeElement!.querySelectorAll<HTMLInputElement>(
        '.hr-training-editor .hr-panel:last-child input[type=checkbox]',
      ),
    ];
    expect(boxes.length).toBeGreaterThan(0);
    expect(boxes.every((box) => box.disabled && !box.checked)).toBe(true);
    expect(text()).toContain('after creating the staff record');
  });
  it('clears a setup if company access changes while it is open', async () => {
    const { component, api, harness, text } = await setupWizard();
    api.scope.set('reviewer:south');
    TestBed.tick();
    harness.detectChanges();
    expect(text()).toContain('workspace or recruitment access changed');
    expect(component['p'].email).toBe('');
  });
  it('persists document classifications through the application before saving a setup draft', async () => {
    const { component, api, harness } = await setupWizard();
    const fields = harness.routeDebugElement!.query(By.directive(StaffFields))
      .componentInstance as StaffFields;
    const document = component['p'].documents![0];
    await fields['changeDocumentType'](document, 'CV / Resume');
    expect(api.setDocumentType).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'file-1', etag: '"v1"' }),
      'CV / Resume',
    );
    expect(document.category).toBe('CV / Resume');
    expect(document.version).toBe(2);
    expect(component['busy']()).toBe(false);
  });
  it('retains the saved document type when its update fails', async () => {
    const { component, api, harness } = await setupWizard();
    const fields = harness.routeDebugElement!.query(By.directive(StaffFields))
      .componentInstance as StaffFields;
    const document = component['p'].documents![0],
      category = document.category;
    api.setDocumentType.mockRejectedValue(Error('Connection lost'));
    await fields['changeDocumentType'](document, 'Passport');
    expect(document.category).toBe(category);
    expect(fields['error']()).toBe('Connection lost');
  });
  it('keeps the wizard on its current step during an upload', async () => {
    const { component } = await setupWizard();
    component['busy'].set(true);
    component['select'](1);
    expect(component['step']()).toBe(0);
  });
});
