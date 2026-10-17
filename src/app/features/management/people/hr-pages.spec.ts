import { By } from '@angular/platform-browser';
import { MatSelect } from '@angular/material/select';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { ManagementStore } from '../shared/management.store';
import { HrWorkspace } from './hr-workspace';
import { HrOnboarding } from './hr-onboarding';
import { HrCompliance } from './hr-compliance';
import { StaffCreate } from './staff-create';
import { StaffProfile } from './staff-profile';
import { HrTeam } from './hr-team';
import { emptyRota } from '../rota/rota.models';
import { COURSES } from '../shared/management.store';
import { STAFF_TABS, newStaff, staffRecord, today } from './hr.models';

describe('People & HR rendered journeys', () => {
  let harness: RouterTestingHarness;
  let store: ManagementStore;
  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'manage/people', component: HrWorkspace, data: { hrMode: 'overview' } },
          { path: 'manage/people/staff', component: HrWorkspace, data: { hrMode: 'directory' } },
          {
            path: 'manage/people/onboarding',
            component: HrOnboarding,
          },
          {
            path: 'manage/people/compliance',
            component: HrCompliance,
          },
          { path: 'manage/people/staff/new', component: StaffCreate },
          ...STAFF_TABS.map((t) => ({
            path: 'manage/people/staff/:id/' + t.key,
            component: StaffProfile,
            data: { staffSection: t.key },
          })),
          { path: 'manage/leave', component: HrTeam, data: { section: 'leave' } },
          { path: 'manage/reviews', component: HrTeam, data: { section: 'reviews' } },
        ]),
      ],
    });
    TestBed.inject(AuthService).signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    store = TestBed.inject(ManagementStore);
    harness = await RouterTestingHarness.create();
  });
  function text() {
    return harness.routeNativeElement!.textContent!;
  }
  async function fill(label: string, value: string) {
    const wrapper = [...harness.routeNativeElement!.querySelectorAll('label')].find((l) =>
      l.textContent?.trim().startsWith(label),
    )!;
    const select = wrapper.querySelector('mat-select');
    if (select) {
      const debug = harness
        .routeDebugElement!.queryAll(By.directive(MatSelect))
        .find((d) => d.nativeElement === select)!;
      debug.triggerEventHandler('ngModelChange', value);
    } else {
      const element = wrapper.querySelector('input')!;
      element.value = value;
      element.dispatchEvent(new Event('input'));
    }
    harness.detectChanges();
    await harness.fixture.whenStable();
  }
  async function click(name: string) {
    const b = [...harness.routeNativeElement!.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === name,
    )!;
    b.click();
    harness.detectChanges();
    await harness.fixture.whenStable();
  }
  it('renders the landing and directory and applies URL filters without altering records', async () => {
    await harness.navigateByUrl('/manage/people');
    expect(text()).toContain('Manage your workforce');
    expect(text()).toContain('Your team');
    const count = store.staff().length;
    await harness.navigateByUrl('/manage/people/staff?q=James');
    expect(text()).toContain('James Carter');
    expect(text()).not.toContain('Maria Lopez');
    expect(store.staff()).toHaveLength(count);
    await harness.navigateByUrl('/manage/people/staff?q=NoSuchName');
    expect(text()).toContain('No staff match');
  });
  it('keeps the directory focused on employee records instead of compliance and review queues', async () => {
    await harness.navigateByUrl('/manage/people/staff');
    const page = harness.routeNativeElement!;
    const headings = [...page.querySelectorAll('.hr-staff-table thead th')].map((h) =>
      h.textContent?.trim(),
    );
    for (const name of [
      'Staff Member',
      'Contact Details',
      'Driver',
      'Availability',
      'Employment Status',
    ])
      expect(headings).toContain(name);
    expect(headings).not.toContain('DBS Status');
    expect(headings).not.toContain('Training');
    expect(headings).not.toContain('Supervision Due');
    expect(page.querySelectorAll('.hr-stats .hr-stat')).toHaveLength(3);
    expect(page.querySelector('.hr-register-toolbar')).not.toBeNull();
  });
  it('opens staff row actions with the same menu journey as the company directory', async () => {
    await harness.navigateByUrl('/manage/people/staff?q=James');
    const button = harness.routeNativeElement!.querySelector<HTMLButtonElement>(
      'button[aria-label="Actions for James Carter"]',
    )!;
    button.click();
    harness.detectChanges();
    await harness.fixture.whenStable();
    const menu = document.querySelector('.mat-mdc-menu-panel')!;
    expect(menu.textContent).toContain('View Staff Profile');
    expect(menu.querySelector('a[href^="/manage/people/staff/james/employment"]')).not.toBeNull();
    expect(
      menu.querySelector('a[href*="/manage/people/staff/james/personal"]')?.getAttribute('href'),
    ).toContain('edit=true');
  });
  it('keeps numbered directory pagination and selected-row feedback in sync', async () => {
    store.update((data) => ({
      ...data,
      people: [
        ...data.people,
        ...Array.from({ length: 22 }, (_, index) => ({
          ...structuredClone(data.people.find((p) => p.id === 'james')!),
          id: 'additional-' + index,
          name: 'Additional staff ' + String(index).padStart(2, '0'),
        })),
      ],
    }));
    await harness.navigateByUrl('/manage/people/staff');
    const checkbox = harness.routeNativeElement!.querySelector<HTMLInputElement>(
      'tbody input[type="checkbox"]',
    )!;
    checkbox.click();
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('tbody tr.hr-selected')).not.toBeNull();
    expect(text()).toContain('Clear selection');
    harness
      .routeNativeElement!.querySelector<HTMLButtonElement>('button[aria-label="Page 2"]')!
      .click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(text()).toContain('Showing 11 to 20');
    expect(
      harness
        .routeNativeElement!.querySelector('button[aria-label="Page 2"]')!
        .getAttribute('aria-current'),
    ).toBe('page');
  });
  it('shows saved weekly-slot availability in the directory instead of dormant custom hours', async () => {
    store.update((data) => {
      const updated = structuredClone(data);
      const person = updated.people.find((p) => p.id === 'james')!;
      person.hr = staffRecord(person);
      person.hr.availabilityMode = 'Weekly slots';
      person.hr.weeklySlots = [
        {
          title: 'Morning',
          start: '06:00',
          end: '12:00',
          days: Array(7).fill('Preferred'),
        },
      ];
      return updated;
    });
    await harness.navigateByUrl('/manage/people/staff?q=James');
    const row = harness.routeNativeElement!.querySelector('.hr-staff-table tbody tr')!;
    expect(row.textContent).toContain('Preferred');
  });
  it('groups the personal wizard into photo, basic, contact and emergency panels', async () => {
    await harness.navigateByUrl('/manage/people/staff/new');
    const page = harness.routeNativeElement!;
    for (const label of [
      'Profile Photo',
      'Basic Information',
      'Address & Contact Details',
      'Emergency Contact',
      'Next of Kin',
      'Languages & Communication',
      'Driving & Vehicle Details',
    ])
      expect(text()).toContain(label);
    expect(page.querySelectorAll('.hr-steps li')).toHaveLength(6);
    expect(page.querySelector('aside[aria-label="Step guidance"]')).not.toBeNull();
  });
  it('opens direct edit links and keeps staff identity on document and training pages', async () => {
    await harness.navigateByUrl('/manage/people/staff/james/personal?edit=true');
    expect(text()).toContain('Save Changes');
    expect(text()).toContain('Basic Information');
    await harness.navigateByUrl('/manage/people/staff/james/documents');
    expect(harness.routeNativeElement!.querySelector('.hr-documents-layout')).not.toBeNull();
    expect(text()).toContain('Upload New Document');
    expect(text()).toContain('Document Categories');
    await harness.navigateByUrl('/manage/people/staff/james/training');
    expect(harness.routeNativeElement!.querySelector('.hr-course-strip')).not.toBeNull();
    expect(text()).toContain('Reassessment Due');
  });
  it('keeps ready staff with a pending DBS renewal in the compliance queue', async () => {
    const original = store.staff()[0];
    const h = staffRecord(original);
    h.status = 'Active';
    h.induction.forEach((t) => (t.complete = true));
    h.checks.forEach((c) => (c.status = 'Not required'));
    const expiry = new Date(today() + 'T12:00:00Z');
    expiry.setUTCDate(expiry.getUTCDate() + 10);
    const dbs = h.checks.find((c) => c.title === 'DBS check')!;
    dbs.status = 'Verified';
    dbs.expiry = expiry.toISOString().slice(0, 10);
    h.training = COURSES.filter((c) => c.category === 'Mandatory').map((c) => ({
      courseId: c.id,
      completed: '2026-01-01',
      expiry: '',
      assessor: '',
      competency: 'Not assessed',
      certificateId: '',
    }));
    store.update((d) => ({ ...d, people: [{ ...original, start: '2026-01-01', hr: h }] }));
    await harness.navigateByUrl(
      '/manage/people/compliance?check=Renewal%20required&checkType=DBS%20check',
    );
    expect(text()).toContain(original.name);
    expect(text()).toContain('DBS check renewal');
  });
  it('validates step progression and saves/resumes a partial creation draft', async () => {
    await harness.navigateByUrl('/manage/people/staff/new');
    await click('Continue →');
    expect(text()).toContain('Enter first name');
    await fill('First name', 'Test');
    await fill('Surname', 'Employee');
    await fill('Email address', 'test@example.org');
    await click('Continue →');
    expect(text()).toContain('Employment Details');
    await click('Save as Draft');
    expect(text()).toContain('Draft saved');
    const draft = store.data().staffDrafts![0];
    expect(draft.step).toBe(1);
    expect(store.staff().some((p) => p.email === 'test@example.org')).toBe(false);
    await harness.navigateByUrl('/manage/people/onboarding?lane=drafts');
    expect(text()).toContain('Test Employee');
    await harness.navigateByUrl('/manage/people/staff/new?draft=' + draft.id);
    expect(text()).toContain('Employment Details');
  });
  it('creates a staff record through all six steps and opens the saved profile', async () => {
    const count = store.staff().length;
    await harness.navigateByUrl('/manage/people/staff/new');
    await fill('First name', 'Created');
    await fill('Surname', 'Person');
    await fill('Email address', 'created@example.org');
    await click('Continue →');
    await fill('Role / Job title', 'Care Worker');
    await fill('Base branch', 'London');
    await fill('Employment type', 'Permanent');
    await fill('Start date', '2026-10-17');
    await click('Continue →');
    expect(text()).toContain('Weekly Availability');
    await click('Continue →');
    expect(text()).toContain('Training Assignments');
    await click('Continue →');
    expect(text()).toContain('Upload Documents');
    await click('Continue →');
    expect(text()).toContain('Review & Create');
    await click('Create Staff Member');
    expect(text()).toContain('Staff Profile');
    expect(text()).toContain('Created Person');
    expect(store.staff()).toHaveLength(count + 1);
    const created = store.staff().find((p) => p.email === 'created@example.org')!;
    expect(created.hr!.status).toBe('Onboarding');
    expect(created.hr!.audit).toHaveLength(1);
  });
  it('renders every profile section as a direct destination and fails safely across companies', async () => {
    const p = newStaff();
    p.name = 'Rendered Employee';
    p.hr!.personal.firstName = 'Rendered';
    p.hr!.personal.surname = 'Employee';
    store.update((d) => ({ ...d, people: [...d.people, p] }));
    for (const t of STAFF_TABS) {
      await harness.navigateByUrl(`/manage/people/staff/${p.id}/${t.key}`);
      expect(text()).toContain('Rendered Employee');
      expect(text()).not.toContain('Staff record unavailable');
    }
    TestBed.inject(WorkspaceService).switchWorkspace('riverside');
    harness.detectChanges();
    expect(text()).toContain('Staff record unavailable');
  });
  it('requires an annual-appraisal rating and preserves the assessor evidence and audit event', async () => {
    const profile = await harness.navigateByUrl('/manage/people/staff/james/reviews', StaffProfile);
    const editor = profile as unknown as {
      review: { type: string; date: string; assessor: string; discussion: string; outcome: string };
      scheduleReview(): void;
      completeReview(id: string, discussion: string, outcome: string, rating: string): void;
      error(): string;
    };
    editor.review = {
      type: 'Annual appraisal',
      date: '2026-10-17',
      assessor: 'Registered Manager',
      discussion: '',
      outcome: '',
    };
    editor.scheduleReview();
    const review = store
      .data()
      .reviews.find((r) => r.type === 'Annual appraisal' && r.personId === 'james')!;
    editor.completeReview(
      review.id,
      'Evidence from recorded observations',
      'Development plan agreed',
      '6',
    );
    expect(editor.error()).toContain('1 to 5');
    expect(store.data().reviews.find((r) => r.id === review.id)!.status).toBe('Scheduled');
    editor.completeReview(
      review.id,
      'Evidence from recorded observations',
      'Development plan agreed',
      '4.2',
    );
    expect(store.data().reviews.find((r) => r.id === review.id)!.score).toBe(4.2);
    expect(
      store
        .data()
        .people.find((p) => p.id === 'james')!
        .hr!.audit.at(-1)!.action,
    ).toBe('Review completed');
  });
  it('calculates punctuality against the UK scheduled instant during summer time', async () => {
    const rota = emptyRota();
    rota.visits = [
      {
        id: 'visit',
        callId: 'call',
        clientId: 'client',
        clientName: 'Example client',
        address: '',
        callName: 'Morning visit',
        date: '2026-07-01',
        start: '09:00',
        end: '10:00',
        carers: 1,
        skills: [],
        tasks: '',
        staffIds: ['james'],
        allocation: 'Regular',
        state: 'Published',
        priority: 'Standard',
        attendance: [
          { personId: 'james', start: '2026-07-01T08:02:00Z', end: '2026-07-01T09:00:00Z' },
        ],
        exception: '',
      },
    ];
    store.update((d) => ({ ...d, rota }));
    const profile = await harness.navigateByUrl(
      '/manage/people/staff/james/performance',
      StaffProfile,
    );
    const editor = profile as unknown as {
      period: string;
      punctuality(): string;
      completedVisits(): number;
    };
    editor.period = '2026-07';
    expect(editor.punctuality()).toBe('0%');
    expect(editor.completedVisits()).toBe(1);
    editor.period = '2026-06';
    expect(editor.punctuality()).toBe('Not recorded');
  });
  it('links team queues to the exact employee record', async () => {
    await harness.navigateByUrl('/manage/reviews');
    expect(text()).toContain('Supervision & Appraisals');
    await harness.navigateByUrl('/manage/leave');
    expect(text()).toContain('Availability & Leave');
    expect(text()).toContain('Request leave for a team member');
  });
});

describe('People & HR application routes', () => {
  beforeEach(() => localStorage.clear());
  it('redirects legacy staff links and bookmarks to the correct new sections', async () => {
    const { routes } = await import('../../../app.routes');
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    TestBed.inject(AuthService).signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/manage/staff');
    expect(harness.routeNativeElement!.textContent).toContain('Staff Directory');
    await harness.navigateByUrl('/manage/people/james?tab=Documents');
    expect(harness.routeNativeElement!.textContent).toContain('Document Records');
    const { Router } = await import('@angular/router');
    expect(TestBed.inject(Router).url).toBe('/manage/people/staff/james/documents');
  });
});
