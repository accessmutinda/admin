import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NgForm } from '@angular/forms';
import { API_BASE } from '../../../core/auth/auth-api';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { ManagementStore } from '../shared/management.store';
import {
  RecruitmentApi,
  RecruitmentApplication,
  RecruitmentSummary,
  PublicVacancy,
} from './recruitment-api.service';
import { ApplicationForm } from './application-form';
import { hireInput } from './recruitment-hire';
import { newStaff } from '../people/hr.models';
import { PersonDetail } from '../people/person-detail';
import { vi } from 'vitest';

const summary = (company_id: string): RecruitmentSummary => ({
  company_id,
  as_of: '2026-11-09T12:00:00Z',
  timezone: 'Europe/London',
  open_vacancies: 1,
  active_applicants: 1,
  offers_made: 0,
  stages: { Applied: 1 },
  total_applicants: 1,
});
const application = (company_id: string): RecruitmentApplication => ({
  id: 'application-1',
  company_id,
  version: 1,
  etag: '"v1"',
  name: 'Actual Applicant',
  email: 'actual@example.com',
  role: 'Care Worker',
  vacancy: 'Care Worker',
  vacancyId: 'vacancy-1',
  location: 'London',
  stage: 'Applied',
  start: '',
  staff_id: null,
});

describe('Recruitment API ownership and commands', () => {
  const company = signal('north'),
    allowed = signal(true),
    actor = signal({ id: 'operator' }),
    api = vi.fn();
  beforeEach(() => {
    company.set('north');
    allowed.set(true);
    actor.set({ id: 'operator' });
    api.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { profile: actor, api } },
        {
          provide: CompanyAccessService,
          useValue: {
            companyId: company,
            can: (_module: string, submodule: string) => submodule === 'recruitment' && allowed(),
          },
        },
      ],
    });
  });
  it('uses complete server pagination and summary sources rather than cached browser people', async () => {
    api.mockImplementation((path: string) =>
      Promise.resolve(
        path.includes('/summary')
          ? summary('north')
          : path.includes('/vacancies')
            ? { count: 0, next: null, results: [], meta: { company_id: 'north' } }
            : path.includes('page=2')
              ? {
                  count: 2,
                  next: null,
                  results: [{ ...application('north'), id: 'second' }],
                  meta: { company_id: 'north' },
                }
              : {
                  count: 2,
                  next: `${API_BASE}/companies/north/applications?page=2`,
                  results: [application('north')],
                  meta: { company_id: 'north' },
                },
      ),
    );
    const service = TestBed.inject(RecruitmentApi);
    TestBed.tick();
    await service.load('Alex', 'vacancy-1');
    expect(service.applications().length).toBe(2);
    expect(service.summary()?.open_vacancies).toBe(1);
    expect(api).toHaveBeenCalledWith(
      '/companies/north/applications?page_size=100&q=Alex&vacancy=vacancy-1',
    );
  });
  it('clears results when access or actor changes and ignores an older company response', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => (release = resolve));
    api.mockImplementation(async (path: string) => {
      await pending;
      return path.includes('/summary')
        ? summary('north')
        : {
            count: 1,
            next: null,
            results: path.includes('/applications') ? [application('north')] : [],
            meta: { company_id: 'north' },
          };
    });
    const service = TestBed.inject(RecruitmentApi);
    TestBed.tick();
    const loading = service.load();
    company.set('south');
    TestBed.tick();
    release();
    await loading;
    expect(service.applications()).toEqual([]);
    expect(service.summary()).toBeNull();
    service.record.set(application('south'));
    actor.set({ id: 'another-operator' });
    TestBed.tick();
    expect(service.record()).toBeNull();
    allowed.set(false);
    TestBed.tick();
    expect(service.vacancies()).toEqual([]);
  });
  it('rejects a response or next-page URL outside the company scope', async () => {
    api.mockImplementation((path: string) =>
      Promise.resolve(
        path.includes('/summary')
          ? summary('north')
          : {
              count: 1,
              next: 'https://other.example.com/private',
              results: [],
              meta: { company_id: 'north' },
            },
      ),
    );
    const service = TestBed.inject(RecruitmentApi);
    TestBed.tick();
    await service.load();
    expect(service.error()).toContain('page link is invalid');
    expect(service.summary()).toBeNull();
    api.mockImplementation((path: string) =>
      Promise.resolve(
        path.includes('/summary')
          ? summary('south')
          : { count: 0, next: null, results: [], meta: { company_id: 'north' } },
      ),
    );
    await service.load();
    expect(service.error()).toContain('do not match');
  });
  it('keeps the same idempotency key when a command response is lost', async () => {
    const service = TestBed.inject(RecruitmentApi);
    TestBed.tick();
    service.record.set(application('north'));
    api
      .mockRejectedValueOnce(new Error('Connection interrupted'))
      .mockResolvedValueOnce({ ...application('north'), version: 2, etag: '"v2"' });
    await expect(service.command('notes', { text: 'Review source' })).rejects.toThrow(
      'interrupted',
    );
    await service.command('notes', { text: 'Review source' });
    expect(api.mock.calls[0][3]['Idempotency-Key']).toBe(api.mock.calls[1][3]['Idempotency-Key']);
    expect(api.mock.calls[0][3]['If-Match']).toBe('"v1"');
    expect(service.record()?.version).toBe(2);
  });
  it('archives attachments through the versioned command and reuses its key after network failure', async () => {
    const service = TestBed.inject(RecruitmentApi);
    TestBed.tick();
    const file = { id: 'file-1', name: 'CV.pdf', type: 'application/pdf', size: 20, state: 'clean', version: 1, requirementId: null, etag: '\"v1\"' };
    api.mockRejectedValueOnce(new Error('Connection interrupted')).mockResolvedValueOnce({ id: file.id });
    await expect(service.removeFile(file)).rejects.toThrow('interrupted');
    await service.removeFile(file);
    expect(api.mock.calls[0][0]).toBe('/companies/north/recruitment/files/file-1/archive');
    expect(api.mock.calls[0][2]).toBe('POST');
    expect(api.mock.calls[0][3]['If-Match']).toBe('\"v1\"');
    expect(api.mock.calls[0][3]['Idempotency-Key']).toBe(api.mock.calls[1][3]['Idempotency-Key']);
  });
  it('does not apply an earlier actor command response after the actor changes', async () => {
    let release!: (value: RecruitmentApplication) => void;
    api.mockReturnValue(new Promise<RecruitmentApplication>(resolve => release = resolve));
    const service = TestBed.inject(RecruitmentApi);
    TestBed.tick();
    service.record.set(application('north'));
    const command = service.command('notes', { text: 'Private recruitment note' });
    actor.set({ id: 'another-operator' });
    TestBed.tick();
    release(application('north'));
    await expect(command).rejects.toThrow('access changed');
    expect(service.record()).toBeNull();
  });
  it('shows an explicit failure with no local fallback when the API fails', async () => {
    api.mockRejectedValue(new Error('Recruitment unavailable'));
    const service = TestBed.inject(RecruitmentApi);
    TestBed.tick();
    await service.load();
    expect(service.summary()).toBeNull();
    expect(service.applications()).toEqual([]);
    expect(service.error()).toContain('unavailable');
  });
});

describe('Public application and hire transport', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('requires consent and submits only public application source fields', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ManagementStore,
          useValue: { vacancyClosed: () => false, vacancyScheduled: () => false },
        },
      ],
    });
    const fixture = TestBed.createComponent(ApplicationForm);
    fixture.componentRef.setInput('vacancy', {
      id: 'vacancy-1',
      company_id: 'north',
      version: 3,
      etag: '"v3"',
      description: '',
      goLiveDate: '',
      closingDate: '',
      status: 'Accepting applications',
      timezone: 'Europe/London',
      company: { id: 'north', name: 'North Care', code: 'NORTH' },
      consent_version: 'recruitment-privacy-v1',
      title: 'Care Worker',
      location: 'London',
      type: 'Full time',
      salary: '',
      published: true,
      fields: [],
      documents: [],
    } as PublicVacancy);
    fixture.componentRef.setInput('company', { id: 'north', name: 'North Care', code: 'NORTH' });
    const form = fixture.componentInstance as unknown as {
      details: { name: string; email: string; phone: string; location: string };
      consent: boolean;
      submit(form: NgForm): Promise<void>;
      sent: () => boolean;
    };
    form.details = {
      name: 'Public Applicant',
      email: 'public@example.com',
      phone: '',
      location: 'London',
    };
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'received', reference: 'receipt-1' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetch);
    await form.submit({ invalid: false } as NgForm);
    expect(fetch).not.toHaveBeenCalled();
    form.consent = true;
    await form.submit({ invalid: false } as NgForm);
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.consent).toBe(true);
    expect(body.vacancy_version).toBe(3);
    expect(body.stage).toBeUndefined();
    expect(body.staff_id).toBeUndefined();
    expect(form.sent()).toBe(true);
    expect(fetch.mock.calls[0][1].credentials).toBe('omit');
  });
  it('excludes browser photo blobs, audit actors and derived readiness from the hire intake', () => {
    const person = newStaff();
    person.hr!.personal.photo = 'blob:browser-preview';
    person.hr!.audit = [{ id: 'forged', actor: 'somebody', at: '2026-11-09', action: 'verified' }];
    const body = hireInput(person);
    const text = JSON.stringify(body);
    expect(text).not.toContain('blob:browser-preview');
    expect(text).not.toContain('somebody');
    expect(text).not.toContain('readiness');
    expect(body.status).toBe('Onboarding');
  });
});

async function openApplicantProfile(row: RecruitmentApplication) {
  const request = vi.fn().mockResolvedValue(row);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'manage/people/:id', component: PersonDetail }]),
      { provide: AuthService, useValue: { profile: () => ({ id: 'operator' }), api: request } },
      {
        provide: CompanyAccessService,
        useValue: {
          companyId: signal('north'),
          can: (_module: string, submodule: string) => submodule === 'recruitment',
        },
      },
      {
        provide: ManagementStore,
        useValue: { company: () => ({ name: 'North' }), initials: () => 'AA' },
      },
    ],
  });
  const harness = await RouterTestingHarness.create('/manage/people/application-1');
  await harness.fixture.whenStable();
  harness.detectChanges();
  return { root: harness.routeNativeElement!, request };
}

describe('Recruitment applicant profile', () => {
  it.each([
    { source: 'recruiter', label: 'Added by a recruiter' },
    { source: 'public', label: 'Received through vacancy page' },
    { source: 'unknown', label: 'Application recorded' },
  ] as const)(
    'shows the $source source and stored time when opening application responses',
    async ({ source, label }) => {
      const submitted = '2026-11-10T09:41:33Z';
      const { root, request } = await openApplicantProfile({
        ...application('north'),
        application: { source, submitted, phone: '', answers: [] },
      });
      expect(request).toHaveBeenCalledWith('/companies/north/applications/application-1');
      const responses = root.querySelector('.application-responses')!;
      const time = responses.querySelector('time')!;
      expect(time.getAttribute('datetime')).toBe(submitted);
      expect(time.textContent?.trim()).toBeTruthy();
      expect(time.closest('div')?.querySelector('dt')?.textContent?.trim()).toBe(label);
    },
  );

  it.each([
    ['Aderwich Test Branch', 'Aderwich Test Branch'],
    [null, 'Not recorded'],
  ])('shows the assigned branch and retains the applicant location separately', async (branch, expected) => {
    const row: RecruitmentApplication = {
      ...application('north'),
      stage: 'Hired',
      staff_id: 'staff-1',
      location: 'Oxford',
      vacancy_location: 'London',
      employment_branch: branch,
    };
    const { root, request } = await openApplicantProfile(row);
    expect(root.textContent).toContain('Staff file');
    expect(request).toHaveBeenCalledWith('/companies/north/applications/application-1');
    const valueFor = (label: string) =>
      [...root.querySelectorAll('dt')]
        .find((term) => term.textContent === label)
        ?.nextElementSibling?.textContent?.trim();
    expect(valueFor('Base branch')).toBe(expected);
    expect(valueFor('Applicant location')).toBe('Oxford');
    const hero = root.querySelector('.profile-role-line')?.textContent;
    expect(hero).not.toContain('Oxford');
    if (branch) expect(hero).toContain(branch);
  });
});
