import { TestBed } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { ManagementStore, Vacancy } from '../shared/management.store';
import { ApplicationForm } from './application-form';
import { Recruitment } from './recruitment';
import { vacancyClosed, vacancyScheduled } from './vacancy-deadline';

interface Editor {
  vacancy: Vacancy;
  openVacancy(existing?: Vacancy): void;
  addVacancy(): void;
}
interface Application {
  details: { name: string; email: string; phone: string; location: string };
  answers: Record<string, string>;
  submit(form: NgForm): void;
  sent(): boolean;
  error(): string;
}

describe('Vacancy applications', () => {
  let store: ManagementStore;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [Recruitment, ApplicationForm, FormsModule] });
    TestBed.inject(AuthService).signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    store = TestBed.inject(ManagementStore);
  });
  const vacancy = (): Vacancy => ({
    id: 'test-job',
    title: 'Care Worker',
    location: 'London',
    type: 'Part time',
    salary: '',
    published: true,
    fields: [{ id: 'experience', label: 'Experience', type: 'textarea', required: true }],
    documents: [],
  });

  it('publishes configured fields and isolates unsaved editor changes', () => {
    const fixture = TestBed.createComponent(Recruitment);
    const editor = fixture.componentInstance as unknown as Editor;
    editor.openVacancy();
    editor.vacancy = vacancy();
    editor.addVacancy();
    expect(store.publicVacancy('lqcs', 'test-job')?.fields?.[0].required).toBe(true);
    const saved = store.data().vacancies.find((v) => v.id === 'test-job')!;
    editor.openVacancy(saved);
    editor.vacancy.fields![0].label = 'Changed question';
    expect(store.publicVacancy('lqcs', 'test-job')?.fields?.[0].label).toBe('Experience');
  });

  it('blocks incomplete forms and stores answers in Applied for the linked company', () => {
    store.saveVacancy(vacancy());
    TestBed.inject(WorkspaceService).switchWorkspace('riverside');
    const fixture = TestBed.createComponent(ApplicationForm);
    fixture.componentRef.setInput('vacancy', vacancy());
    fixture.componentRef.setInput(
      'company',
      store.companies().find((c) => c.id === 'lqcs'),
    );
    const form = fixture.componentInstance as unknown as Application;
    form.details = {
      name: 'New Applicant',
      email: 'new@example.com',
      phone: '01234567',
      location: 'London',
    };
    const valid = { invalid: false } as NgForm;
    form.submit(valid);
    expect(form.sent()).toBe(false);
    form.answers['experience'] = 'Two years in care';
    form.submit(valid);
    expect(form.sent()).toBe(true);
    expect(store.data().people.some((p) => p.name === 'New Applicant')).toBe(false);
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    const applicant = store.applicants().find((p) => p.name === 'New Applicant')!;
    expect(applicant.stage).toBe('Applied');
    expect(applicant.vacancyId).toBe('test-job');
    expect(applicant.application?.answers[0].value).toBe('Two years in care');
    expect(applicant.checks.every((check) => !check)).toBe(true);
    const retry = TestBed.createComponent(ApplicationForm);
    retry.componentRef.setInput('vacancy', vacancy());
    retry.componentRef.setInput('company', store.company());
    const duplicate = retry.componentInstance as unknown as Application;
    duplicate.details = form.details;
    duplicate.answers = form.answers;
    duplicate.submit(valid);
    expect(duplicate.sent()).toBe(false);
    expect(duplicate.error()).toContain('already been received');
  });

  it('requires configured uploads, preserves document labels and rejects paused vacancies', () => {
    const job = {
      ...vacancy(),
      fields: [],
      documents: [{ id: 'cv', label: 'CV', required: true }],
    };
    store.saveVacancy(job);
    const person = {
      ...store.data().people[0],
      id: 'uploaded-person',
      email: 'uploaded@example.com',
      stage: 'Applied',
      vacancyId: job.id,
      documents: [],
    };
    expect(store.submitApplication('lqcs', job.id, person)).toContain('requirements have changed');
    const uploaded = {
      ...person,
      documents: [
        {
          id: 'file',
          name: 'cv.pdf',
          type: 'application/pdf',
          content: 'data:application/pdf;base64,AA==',
          requirement: 'CV',
          requirementId: 'cv',
        },
      ],
    };
    expect(store.submitApplication('lqcs', job.id, uploaded)).toBeNull();
    expect(store.applicants().find((p) => p.id === person.id)?.documents?.[0].requirement).toBe(
      'CV',
    );
    store.saveVacancy({ ...job, published: false });
    expect(store.publicVacancy('lqcs', job.id)).toBeUndefined();
    expect(
      store.submitApplication('lqcs', job.id, { ...uploaded, email: 'other@example.com' }),
    ).toContain('no longer');
  });

  it('keeps failed saves retryable and never reports a successful submission', () => {
    store.saveVacancy({ ...vacancy(), fields: [] });
    const before = store.data().people.length;
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota exceeded');
    });
    const person = {
      ...store.data().people[0],
      id: 'failed',
      email: 'failure@example.com',
      vacancyId: 'test-job',
    };
    expect(store.submitApplication('lqcs', 'test-job', person)).toContain('could not be saved');
    expect(store.data().people.length).toBe(before);
    expect(store.saveVacancy({ ...vacancy(), title: 'Unsaved change' })).toBe(false);
    expect(store.publicVacancy('lqcs', 'test-job')?.title).toBe('Care Worker');
    setItem.mockRestore();
    expect(store.submitApplication('lqcs', 'test-job', person)).toBeNull();
    expect(store.storageAvailable()).toBe(true);
  });

  it('refreshes recruitment when another tab submits an application', () => {
    store.saveVacancy({ ...vacancy(), fields: [] });
    const records = JSON.parse(localStorage.getItem('cv_management_v1')!);
    records.lqcs.people.push({ ...records.lqcs.people[0], id: 'other-tab', stage: 'Applied' });
    localStorage.setItem('cv_management_v1', JSON.stringify(records));
    window.dispatchEvent(new StorageEvent('storage', { key: 'cv_management_v1' }));
    expect(store.applicants().some((p) => p.id === 'other-tab')).toBe(true);
  });
  it('allows numeric zero as a required answer and keeps the employer available without signing in', () => {
    const job = {
      ...vacancy(),
      fields: [
        { id: 'years', label: 'Years of experience', type: 'number' as const, required: true },
      ],
    };
    TestBed.inject(WorkspaceService).switchWorkspace('riverside');
    store.saveVacancy(job);
    localStorage.removeItem('cv_session');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [ApplicationForm] });
    store = TestBed.inject(ManagementStore);
    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
    const employer = store.companies().find((c) => c.id === 'riverside');
    expect(employer?.name).toBe('Riverside Care Home');
    const fixture = TestBed.createComponent(ApplicationForm);
    fixture.componentRef.setInput('vacancy', store.publicVacancy('riverside', job.id));
    fixture.componentRef.setInput('company', employer);
    fixture.detectChanges();
    const form = fixture.componentInstance as unknown as Application;
    form.details = { name: 'Applicant', email: 'zero@example.com', phone: '', location: 'London' };
    form.answers = { years: 0 } as unknown as Record<string, string>;
    form.submit({ invalid: false } as NgForm);
    expect(form.sent()).toBe(true);
    expect(store.records()['riverside'].people.at(-1)?.application?.answers[0].value).toBe('0');
  });
  it('keeps the closing day inclusive in UK time and supports no deadline', () => {
    const job = { ...vacancy(), closingDate: '2026-10-07' };
    expect(vacancyClosed(job, new Date('2026-10-07T22:59:59.999Z'))).toBe(false);
    expect(vacancyClosed(job, new Date('2026-10-07T23:00:00Z'))).toBe(true);
    expect(vacancyClosed(vacancy(), new Date('2099-01-01T00:00:00Z'))).toBe(false);
  });

  it('rejects invalid closing dates before saving and preserves a valid deadline', () => {
    const editor = TestBed.createComponent(Recruitment).componentInstance as unknown as Editor;
    editor.openVacancy();
    editor.vacancy = { ...vacancy(), closingDate: '2026-02-30' };
    editor.addVacancy();
    expect(store.publicVacancy('lqcs', 'test-job')).toBeUndefined();
    editor.vacancy.closingDate = '2099-10-07';
    editor.addVacancy();
    expect(store.publicVacancy('lqcs', 'test-job')?.closingDate).toBe('2099-10-07');
  });

  it('rejects a submission after the deadline even if the form was opened earlier', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date('2026-10-07T22:59:59Z'));
      const job = { ...vacancy(), fields: [], closingDate: '2026-10-07' };
      store.saveVacancy(job);
      const person = {
        ...store.data().people[0],
        id: 'deadline-applicant',
        email: 'deadline@example.com',
        vacancyId: job.id,
      };
      const before = store.data().people.length;
      expect(store.submitApplication('lqcs', job.id, person)).toBeNull();
      vi.setSystemTime(new Date('2026-10-07T23:00:00Z'));
      expect(
        store.submitApplication('lqcs', job.id, {
          ...person,
          id: 'late',
          email: 'late@example.com',
        }),
      ).toContain('deadline has passed');
      expect(store.data().people.length).toBe(before + 1);
      expect(store.publicVacancy('lqcs', job.id)?.closingDate).toBe(job.closingDate);
    } finally {
      vi.useRealTimers();
    }
  });
  it('opens on the go-live day at midnight UK time and defaults to immediate opening', () => {
    const job = { ...vacancy(), goLiveDate: '2026-10-08' };
    expect(vacancyScheduled(job, new Date('2026-10-07T22:59:59.999Z'))).toBe(true);
    expect(vacancyScheduled(job, new Date('2026-10-07T23:00:00Z'))).toBe(false);
    expect(vacancyScheduled(vacancy(), new Date('2026-10-07T22:59:59Z'))).toBe(false);
  });

  it('validates the go-live date and prevents closing before opening while allowing a one-day vacancy', () => {
    const editor = TestBed.createComponent(Recruitment).componentInstance as unknown as Editor;
    editor.openVacancy();
    editor.vacancy = { ...vacancy(), goLiveDate: '2026-02-30' };
    editor.addVacancy();
    expect(store.publicVacancy('lqcs', 'test-job')).toBeUndefined();
    editor.vacancy = { ...vacancy(), goLiveDate: '2099-10-08', closingDate: '2099-10-07' };
    editor.addVacancy();
    expect(store.publicVacancy('lqcs', 'test-job')).toBeUndefined();
    editor.vacancy.closingDate = '2099-10-08';
    editor.addVacancy();
    expect(store.publicVacancy('lqcs', 'test-job')?.goLiveDate).toBe('2099-10-08');
  });

  it('rejects early applications and automatically updates a scheduled vacancy when it opens', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    try {
      vi.setSystemTime(new Date('2026-10-07T22:59:00Z'));
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      TestBed.inject(AuthService).signInWithMicrosoft();
      TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
      store = TestBed.inject(ManagementStore);
      const job = { ...vacancy(), fields: [], goLiveDate: '2026-10-08', closingDate: '2026-10-08' };
      store.saveVacancy(job);
      const person = {
        ...store.data().people[0],
        id: 'scheduled-applicant',
        email: 'scheduled@example.com',
        vacancyId: job.id,
      };
      const before = store.data().people.length;
      expect(store.vacancyStatus(job)).toBe('Scheduled');
      expect(store.openVacancies()).toHaveLength(0);
      expect(store.submitApplication('lqcs', job.id, person)).toContain('not opened yet');
      expect(store.data().people.length).toBe(before);
      vi.advanceTimersByTime(60_000);
      expect(store.vacancyStatus(job)).toBe('Accepting applications');
      expect(store.openVacancies()).toHaveLength(1);
      expect(store.submitApplication('lqcs', job.id, person)).toBeNull();
      store.saveVacancy({ ...job, published: false });
      expect(store.openVacancies()).toHaveLength(0);
      expect(
        store.submitApplication('lqcs', job.id, { ...person, email: 'paused@example.com' }),
      ).toContain('no longer');
    } finally {
      TestBed.resetTestingModule();
      vi.useRealTimers();
    }
  });
  it.each([
    {
      date: '2026-01-15',
      opens: '2026-01-15T00:00:00Z',
      closes: '2026-01-16T00:00:00Z',
      season: 'GMT',
    },
    {
      date: '2026-07-15',
      opens: '2026-07-14T23:00:00Z',
      closes: '2026-07-15T23:00:00Z',
      season: 'BST',
    },
    {
      date: '2026-03-29',
      opens: '2026-03-29T00:00:00Z',
      closes: '2026-03-29T23:00:00Z',
      season: 'the spring clock change',
    },
    {
      date: '2026-10-25',
      opens: '2026-10-24T23:00:00Z',
      closes: '2026-10-26T00:00:00Z',
      season: 'the autumn clock change',
    },
  ])('uses local UK midnight during $season', ({ date, opens, closes }) => {
    const job = { ...vacancy(), goLiveDate: date, closingDate: date };
    expect(vacancyScheduled(job, new Date(Date.parse(opens) - 1))).toBe(true);
    expect(vacancyScheduled(job, new Date(opens))).toBe(false);
    expect(vacancyClosed(job, new Date(Date.parse(closes) - 1))).toBe(false);
    expect(vacancyClosed(job, new Date(closes))).toBe(true);
  });
});
