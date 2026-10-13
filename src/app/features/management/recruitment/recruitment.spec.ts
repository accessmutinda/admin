import { TestBed } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
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
    TestBed.configureTestingModule({
      imports: [Recruitment, ApplicationForm, FormsModule],
      providers: [provideRouter([])],
    });
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

  it('preserves applicant details and profile links while combining table filters', async () => {
    const person = store.data().people[0];
    store.update((data) => ({
      ...data,
      vacancies: [
        { ...vacancy(), id: 'job-one' },
        { ...vacancy(), id: 'job-two', title: 'Senior Carer' },
      ],
      people: [
        {
          ...person,
          id: 'candidate-one',
          name: 'Candidate One',
          stage: 'Applied',
          vacancyId: 'job-one',
        },
        {
          ...person,
          id: 'candidate-two',
          name: 'Candidate Two',
          stage: 'Interview',
          vacancyId: 'job-one',
        },
        {
          ...person,
          id: 'hired-person',
          name: 'Hired Person',
          stage: 'Hired',
          vacancyId: 'job-two',
        },
      ],
    }));
    const before = JSON.stringify(store.data());
    const fixture = TestBed.createComponent(Recruitment);
    fixture.detectChanges();
    await fixture.whenStable();
    const rows = () => fixture.nativeElement.querySelectorAll('.recruitment-table tbody tr');
    expect(rows()).toHaveLength(3);
    expect(rows()[0].querySelectorAll('td')).toHaveLength(7);
    expect(rows()[0].textContent).toContain(person.email);
    expect(rows()[0].textContent).toContain(person.role);
    expect(rows()[0].querySelector('.table-actions a').getAttribute('href')).toBe(
      '/manage/people/candidate-one',
    );
    const stage = fixture.debugElement.query(
      By.css('mat-select[aria-label="Filter recruitment stage"]'),
    );
    const job = fixture.debugElement.query(By.css('mat-select[aria-label="Filter vacancy"]'));
    stage.triggerEventHandler('ngModelChange', 'Applied');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(rows()).toHaveLength(1);
    expect(rows()[0].textContent).toContain('Candidate One');
    job.triggerEventHandler('ngModelChange', 'job-two');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(rows()[0].textContent).toContain('No applicants match this view');
    stage.triggerEventHandler('ngModelChange', 'All stages');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(rows()).toHaveLength(1);
    expect(rows()[0].textContent).toContain('Hired Person');
    expect(rows()[0].textContent).toContain('View staff');
    const search: HTMLInputElement = fixture.nativeElement.querySelector(
      'input[aria-label="Search applicants"]',
    );
    search.value = 'No matching applicant';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(rows()[0].textContent).toContain('No applicants match this view');
    expect(JSON.stringify(store.data())).toBe(before);
  });

  it('opens the selected vacancy when adding an applicant and validates before saving', async () => {
    store.update((data) => ({
      ...data,
      vacancies: [vacancy(), { ...vacancy(), id: 'second-job', title: 'Senior Carer' }],
    }));
    const fixture = TestBed.createComponent(Recruitment);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.debugElement
      .query(By.css('mat-select[aria-label="Filter vacancy"]'))
      .triggerEventHandler('ngModelChange', 'second-job');
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.recruitment-add-applicant').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    const submit: HTMLButtonElement = dialog.querySelector('button[type="submit"]');
    expect(submit.disabled).toBe(true);
    expect(
      fixture.debugElement.query(By.css('mat-select[aria-label="Applicant vacancy"]'))
        .componentInstance.value,
    ).toBe('second-job');
    const fill = async (name: string, value: string) => {
      const input = dialog.querySelector(`input[name="${name}"]`);
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    await fill('name', 'New Applicant');
    await fill('location', 'London');
    await fill('email', 'invalid');
    expect(submit.disabled).toBe(true);
    await fill('email', 'applicant@example.com');
    expect(submit.disabled).toBe(false);
    submit.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(
      store.data().people.find((person) => person.email === 'applicant@example.com'),
    ).toMatchObject({ name: 'New Applicant', vacancyId: 'second-job', stage: 'Applied' });
  });

  it('opens Edit form from vacancy actions without changing the saved vacancy on discard', async () => {
    store.update((data) => ({ ...data, vacancies: [vacancy()] }));
    const before = JSON.stringify(store.data().vacancies);
    const fixture = TestBed.createComponent(Recruitment);
    fixture.detectChanges();
    await fixture.whenStable();
    const tab = Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('.segmented button'),
    ).find((button) => button.textContent?.trim() === 'Vacancies')!;
    tab.click();
    fixture.detectChanges();
    const row = fixture.nativeElement.querySelector('.vacancies-table tbody tr');
    expect(row.querySelectorAll('td')).toHaveLength(9);
    expect(row.querySelector('.table-status').textContent).toContain('Accepting applications');
    row.querySelector('button[aria-label="Edit form for Care Worker"]').click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.vacancy-editor')).not.toBeNull();
    const editor = fixture.componentInstance as unknown as Editor;
    editor.vacancy.title = 'Unsaved title';
    const discard = Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('.editor-actions button'),
    ).find((button) => button.textContent?.trim() === 'Discard')!;
    discard.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.vacancies-table')).not.toBeNull();
    expect(JSON.stringify(store.data().vacancies)).toBe(before);
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
