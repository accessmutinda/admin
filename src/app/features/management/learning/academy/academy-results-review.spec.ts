import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AcademyResultsReview } from './academy-results-review';
import { AcademyService } from './academy.service';
import { AcademyAttempt, AcademyAssignment } from './academy.models';

const policy = { maxAttempts: 3, retakeWaitHours: 24, timeLimitMinutes: 30, showFeedback: true };
const attempt: AcademyAttempt = {
  id: 'result-one',
  assignmentId: 'assignment',
  personId: 'worker',
  courseId: 'course',
  courseTitle: 'Safeguarding',
  courseVersion: 4,
  questions: [],
  answers: {},
  flags: [],
  startedAt: '2026-11-11T08:00:00Z',
  deadline: '2026-11-11T08:30:00Z',
  submittedAt: '2026-11-11T08:10:00Z',
  passMark: 80,
  showFeedback: true,
  score: 0,
  passed: false,
  policy,
  scorerVersion: 'weighted-exact-v1',
};
const assignment: AcademyAssignment = {
  id: 'assignment',
  personId: 'worker',
  courseId: 'course',
  due: '2027-12-01',
  assignedAt: '2026-11-01T00:00:00Z',
  assignedBy: 'Training lead',
  recurrenceMonths: 0,
  completedLessonIds: [],
  notes: {},
  positions: {},
  completedAt: '',
  archived: false,
  policySnapshot: policy,
};

describe('Results and retake review screen', () => {
  const allowed = signal(true),
    saving = signal(false),
    error = signal('');
  let schedule: ReturnType<typeof vi.fn>, notify: ReturnType<typeof vi.fn>;
  let availability: { remaining: number; reason: string; readyAt: string; runningId: string };
  beforeEach(() => {
    allowed.set(true);
    saving.set(false);
    error.set('');
    availability = { remaining: 2, reason: '', readyAt: '', runningId: '' };
    schedule = vi.fn(async () => null);
    notify = vi.fn(async () => null);
    const params = convertToParamMap({ attemptId: 'result-one' });
    TestBed.configureTestingModule({
      imports: [AcademyResultsReview],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(params), snapshot: { paramMap: params } },
        },
        {
          provide: AcademyService,
          useValue: {
            canViewEvidence: () => true,
            canManage: () => true,
            can: () => true,
            attempt: () => attempt,
            assignments: () => [assignment],
            assessmentAvailability: () => availability,
            store: { companyId: () => 'company' },
            resultsApi: {
              people: () => [{ id: 'worker', name: 'Jane Worker' }],
              canEdit: allowed,
              error,
              saving,
            },
            state: () => ({
              attempts: [attempt],
              certificates: [],
              completions: [],
              retakePlans: [],
              settings: { ...policy, portalNotifications: true },
            }),
            scheduleRetake: schedule,
            notifyRetake: notify,
          },
        },
      ],
    });
  });
  async function render() {
    const fixture = TestBed.createComponent(AcademyResultsReview);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }
  function button(text: string) {
    return [...document.querySelectorAll('button')].find((b) => b.textContent?.includes(text))!;
  }
  async function openSchedule(fixture: Awaited<ReturnType<typeof render>>) {
    button('Manage').click();
    fixture.detectChanges();
    await fixture.whenStable();
    const action = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Schedule this learner'),
    )!;
    action.click();
    fixture.detectChanges();
    await fixture.whenStable();
    return document.querySelector<HTMLInputElement>('input[type="datetime-local"]')!;
  }
  it('renders the server result and does not claim certificate or HR acknowledgements', async () => {
    const fixture = await render();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Jane Worker');
    expect(text).toContain('Safeguarding');
    expect(text).toContain('Not passed');
    expect(text).toContain('Pass required');
    expect(text).not.toContain('Completed automatically in');
  });
  it('awaits a scheduled retake before closing the dialog and reporting success', async () => {
    let finish!: (error: string | null) => void;
    schedule.mockImplementationOnce(() => new Promise((done) => (finish = done)));
    const fixture = await render();
    const date = await openSchedule(fixture);
    expect(date).toBeTruthy();
    date.value = '2027-12-01T12:00';
    date.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    const submit = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Save Retake Schedule'),
    )!;
    submit.click();
    fixture.detectChanges();
    expect(schedule).toHaveBeenCalledWith('result-one', '2027-12-01T12:00:00.000Z', 'company');
    expect(document.querySelector('[role="dialog"]')).toBeTruthy();
    finish(null);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'Retake scheduled and a notification request queued.',
    );
  });
  it('shows an unavailable state after backend denial instead of retained result details', async () => {
    const fixture = await render();
    error.set('Result access revoked');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Result access revoked');
    expect(fixture.nativeElement.textContent).not.toContain('Jane Worker');
  });
  it('disables scheduling when the attempt limit is exhausted', async () => {
    availability.remaining = 0;
    const fixture = await render();
    button('Manage').click();
    fixture.detectChanges();
    await fixture.whenStable();
    const action = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Schedule this learner'),
    )!;
    expect(action.disabled).toBe(true);
  });
});
