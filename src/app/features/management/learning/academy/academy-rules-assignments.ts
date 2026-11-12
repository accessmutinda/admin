import { Component, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { A11yModule } from '@angular/cdk/a11y';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../../shared/ui/select';
import { addDays, londonDate } from '../../rota/rota.models';
import { Person } from '../../shared/management.store';
import { AcademyService } from './academy.service';
import { AcademyCourseSteps } from './academy-course-steps';
import {
  hasUnusedVideos,
  AcademyAssignment,
  AcademyAssignmentMethod,
  AcademyAssignmentPlan,
  AcademyCourse,
  AcademyNotificationChannel,
} from './academy.models';
import { AcademyAdminNav, AcademyMessage } from './academy-shared';
import { AcademyDate } from './academy-date';
@Component({
  host: {
    class: 'module-page academy-page',
    '[attr.inert]': 'academy.api.saving() ? "" : null',
    '[attr.aria-busy]': 'academy.api.saving()',
  },
  selector: 'cv-academy-rules-assignments',
  imports: [
    AcademyCourseSteps,
    FormsModule,
    RouterLink,
    A11yModule,
    MatSelectModule,
    CvSelect,
    AcademyAdminNav,
    AcademyMessage,
    AcademyDate,
  ],
  templateUrl: './academy-rules-assignments.html',
  styleUrls: ['./academy-forms.css', './academy.css', './academy-rules-assignments.css'],
})
export class AcademyRulesAssignments {
  protected readonly academy = inject(AcademyService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workspace = this.academy.store.companyId();
  protected readonly staffContext = this.route.snapshot.queryParamMap.get('person');
  protected course: AcademyCourse | undefined;
  protected plan!: AcademyAssignmentPlan;
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly reviewOpen = signal(false);
  protected readonly saving = signal(false);
  private readonly reviewIds = signal<string[]>([]);
  protected reviewPeople() {
    return this.academy.store.staff().filter((p) => this.reviewIds().includes(p.id));
  }
  protected page = 1;
  protected sort: 'name' | 'role' | 'due' | 'status' | 'type' = 'name';
  protected descending = false;
  private original = '';
  private expected = '';
  private lastTimer = 30;
  private reviewedBank = '';
  protected approvedQuestions() {
    return this.academy
      .state()
      .questions.filter((q) => q.courseId === this.course?.id && q.status === 'Published');
  }
  private bankFingerprint() {
    return JSON.stringify(
      this.approvedQuestions()
        .map((q) => [q.id, q.version, q.updatedAt])
        .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    );
  }
  private validPassMark() {
    if (
      !Number.isInteger(this.course?.passMark) ||
      (this.course?.passMark ?? 0) < 1 ||
      (this.course?.passMark ?? 0) > 100
    ) {
      this.error.set('Enter a valid pass mark from 1 to 100.');
      return false;
    }
    return true;
  }
  protected readonly methods: { value: AcademyAssignmentMethod; label: string; icon: string }[] = [
    { value: 'By Role', label: 'By Role', icon: 'supervisor_account' },
    { value: 'By Team', label: 'By Team', icon: 'groups' },
    { value: 'Individual Worker', label: 'Individual Worker', icon: 'person' },
    { value: 'From HR Staff Profile', label: 'From HR Staff Profile', icon: 'badge' },
  ];
  protected supervisorId = '';
  protected readonly channels: AcademyNotificationChannel[] = ['Email', 'App', 'In-platform'];
  protected readonly requiredRules = [
    {
      title: 'Auto-marking',
      detail: 'Automatically mark and score the assessment',
      icon: 'desktop_windows',
      tone: 'blue',
    },
    {
      title: 'Certificate generation on pass',
      detail: 'Generate an internal course completion certificate',
      icon: 'workspace_premium',
      tone: 'purple',
    },
    {
      title: 'Store certificate in staff HR file',
      detail: 'File it in the specific worker’s HR record',
      icon: 'folder_open',
      tone: 'blue',
    },
    {
      title: 'Update training matrix',
      detail: 'Update training history and course currency',
      icon: 'grid_view',
      tone: 'cyan',
    },
    {
      title: 'Recalculate compliance',
      detail: 'Refresh role-specific knowledge training status',
      icon: 'verified_user',
      tone: 'green',
    },
    {
      title: 'Update rota eligibility',
      detail: 'Refresh training inputs; practical sign-off stays separate',
      icon: 'event_available',
      tone: 'blue',
    },
  ];
  protected readonly postPass = [
    {
      title: 'Pass assessment',
      detail: 'Meet the pass mark and all applicable critical rules',
      icon: 'check_circle',
      tone: 'green',
    },
    {
      title: 'Generate internal certificate',
      detail: 'Create the internal course completion certificate',
      icon: 'workspace_premium',
      tone: 'purple',
    },
    {
      title: 'Save to HR staff file',
      detail: 'File the certificate in the specific worker’s HR record',
      icon: 'folder_open',
      tone: 'blue',
    },
    {
      title: 'Update training record',
      detail: 'Update training history, matrix and refresher dates',
      icon: 'monitoring',
      tone: 'cyan',
    },
    {
      title: 'Recalculate compliance',
      detail: 'Refresh mandatory knowledge training status',
      icon: 'verified_user',
      tone: 'green',
    },
    {
      title: 'Update rota eligibility',
      detail: 'Refresh training inputs and retain practical restrictions',
      icon: 'event_available',
      tone: 'green',
    },
  ];
  constructor() {
    this.loadCourse(
      this.route.snapshot.paramMap.get('courseId') ??
        this.route.snapshot.queryParamMap.get('course') ??
        this.courses()[0]?.id ??
        '',
    );
  }
  protected courses() {
    return this.academy.editableCourses().filter((c) => c.status !== 'Archived');
  }
  private snapshot() {
    return JSON.stringify({ course: this.course, plan: this.plan });
  }
  private loadCourse(id: string) {
    this.course = structuredClone(this.academy.course(id));
    this.expected = this.course?.updatedAt ?? '';
    if (this.course) {
      this.course.passMark ??= this.academy.state().settings.passMark;
      this.course.policy = this.academy.policyFor(this.course);
      this.lastTimer = this.course.policy.timeLimitMinutes || 30;
    }
    this.plan = structuredClone(
      this.course?.assignmentPlan ?? {
        method: 'By Role',
        roles: [],
        team: 'All',
        personIds: [],
        priority: 'High',
        due: addDays(londonDate(), 14),
        refresher: false,
        channels: ['Email', 'App', 'In-platform'],
        recurrenceMonths: 0,
        message: '',
      },
    );
    if (this.staffContext) {
      this.plan.method = 'From HR Staff Profile';
      this.plan.personIds = [this.staffContext];
    }
    if (this.route.snapshot.queryParamMap.get('action') === 'refresher') this.plan.refresher = true;
    this.page = 1;
    this.original = this.snapshot();
    this.error.set('');
    this.notice.set('');
  }
  protected changeCourse(id: string) {
    if (this.canLeave()) {
      if (hasUnusedVideos(this.academy.course(id))) {
        void this.router.navigate(['/manage/learning/structure', id]);
        return;
      }
      this.loadCourse(id);
    }
  }
  protected setMethod(method: AcademyAssignmentMethod) {
    if (this.staffContext && method !== 'From HR Staff Profile') return;
    this.plan.method = method;
    if (method === 'From HR Staff Profile')
      this.plan.personIds = this.staffContext
        ? [this.staffContext]
        : this.plan.personIds.slice(0, 1);
  }
  protected activeStaff() {
    return this.academy.store
      .staff()
      .filter(
        (p) =>
          !['Inactive', 'Left'].includes(p.hr?.status ?? '') &&
          !['Inactive', 'Left', 'Leaver', 'Terminated'].includes(p.stage),
      );
  }
  protected roles() {
    return [...new Set(this.activeStaff().map((p) => p.role))].sort();
  }
  protected teams() {
    return [...new Set(this.activeStaff().map((p) => this.team(p)))].sort();
  }
  private team(person: Person) {
    return person.hr?.employment.department || 'Unassigned';
  }
  protected eligibleStaff() {
    return this.activeStaff().filter(
      (p) => !this.course?.targetRoles?.length || this.course.targetRoles.includes(p.role),
    );
  }
  protected recipients() {
    return this.course ? this.academy.assignmentTargets(this.course, this.plan) : [];
  }
  protected contextPerson() {
    return this.academy.store.staff().find((p) => p.id === this.staffContext);
  }
  protected timed() {
    return !!this.course?.policy?.timeLimitMinutes;
  }
  protected setTimed(value: boolean) {
    if (!this.course?.policy) return;
    if (!value) this.lastTimer = this.course.policy.timeLimitMinutes || this.lastTimer;
    this.course.policy.timeLimitMinutes = value ? this.lastTimer : 0;
  }
  protected timerOptions() {
    return [
      ...new Set([
        10,
        15,
        20,
        30,
        45,
        60,
        90,
        120,
        180,
        240,
        this.course?.policy?.timeLimitMinutes ?? 30,
      ]),
    ]
      .filter((v) => v > 0)
      .sort((a, b) => a - b);
  }
  protected waitOptions() {
    return [
      ...new Set([0, 1, 6, 12, 24, 48, 72, 168, this.course?.policy?.retakeWaitHours ?? 24]),
    ].sort((a, b) => a - b);
  }
  protected criticalCount() {
    return this.academy
      .state()
      .questions.filter(
        (q) => q.courseId === this.course?.id && q.status === 'Published' && q.critical,
      ).length;
  }
  protected notificationSummary() {
    const messages: string[] = [];
    if (this.plan.channels.some((channel) => channel !== 'Email'))
      messages.push(
        this.academy.state().settings.portalNotifications
          ? 'App/platform requests are recorded locally.'
          : 'App/platform notifications are disabled in Academy settings.',
      );
    if (this.plan.channels.includes('Email')) messages.push('Email delivery is not configured.');
    return messages.join(' ') || 'No notifications requested.';
  }
  protected hasChannel(channel: AcademyNotificationChannel) {
    return this.plan.channels.includes(channel);
  }
  protected toggleChannel(channel: AcademyNotificationChannel) {
    this.plan.channels = this.hasChannel(channel)
      ? this.plan.channels.filter((c) => c !== channel)
      : [...this.plan.channels, channel];
  }
  protected assignments() {
    return this.academy.assignments().filter((a) => a.courseId === this.course?.id && !a.archived);
  }
  protected person(id: string) {
    return this.academy.store.staff().find((p) => p.id === id);
  }
  protected assignmentFor(id: string) {
    return this.assignments().find((a) => a.personId === id);
  }
  protected status(assignment: AcademyAssignment) {
    const status = this.academy.status(assignment);
    return status === 'Not started' ? 'Assigned' : status;
  }
  protected source(assignment: AcademyAssignment) {
    return assignment.source && this.methods.some((m) => m.value === assignment.source)
      ? assignment.source
      : assignment.source?.includes('HR staff profile')
        ? 'From HR Staff Profile'
        : 'Existing record';
  }
  protected sourceIcon(assignment: AcademyAssignment) {
    return this.methods.find((m) => m.value === this.source(assignment))?.icon ?? 'person';
  }
  protected initials(name: string) {
    return name
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
  protected sortBy(key: typeof this.sort) {
    this.descending = key === this.sort ? !this.descending : false;
    this.sort = key;
    this.page = 1;
  }
  protected rows() {
    const rows = [...this.assignments()].sort((a, b) => {
      const x =
        this.sort === 'name'
          ? (this.person(a.personId)?.name ?? '')
          : this.sort === 'role'
            ? (this.person(a.personId)?.role ?? '')
            : this.sort === 'status'
              ? this.status(a)
              : this.sort === 'type'
                ? (a.type ?? 'Initial')
                : a.due;
      const y =
        this.sort === 'name'
          ? (this.person(b.personId)?.name ?? '')
          : this.sort === 'role'
            ? (this.person(b.personId)?.role ?? '')
            : this.sort === 'status'
              ? this.status(b)
              : this.sort === 'type'
                ? (b.type ?? 'Initial')
                : b.due;
      return x.localeCompare(y) * (this.descending ? -1 : 1);
    });
    this.page = Math.min(this.page, Math.max(1, Math.ceil(rows.length / 8)));
    return rows.slice((this.page - 1) * 8, this.page * 8);
  }
  protected pages() {
    return Math.max(1, Math.ceil(this.assignments().length / 8));
  }
  protected async save() {
    if (!this.course || !this.validPassMark()) return;
    const candidate = {
      ...this.course,
      assignmentPlan: structuredClone(this.plan),
      status: 'Draft' as const,
    };
    const error = await this.academy.persistCourse(candidate, this.workspace, this.expected);
    this.error.set(error ?? '');
    this.notice.set('');
    if (!error) {
      this.loadCourse(this.course.id);
      this.notice.set(
        'Rules and assignment setup saved as a draft. Use Assign Training to review recipients and apply the approved version.',
      );
    }
  }
  protected async back() {
    await this.save();
    if (!this.error() && this.course)
      void this.router.navigate(['/manage/learning/questions'], {
        queryParams: { course: this.course.id },
      });
  }
  protected async reviewPublishing() {
    await this.save();
    if (!this.error() && this.course)
      void this.router.navigate(['/manage/learning/publish', this.course.id], {
        queryParams: this.staffContext ? { person: this.staffContext } : {},
      });
  }
  protected needsPublication() {
    const published = this.academy
      .state()
      .courses.find((c) => c.id === this.course?.id && c.status === 'Published');
    return (
      !published ||
      this.academy.state().courseDrafts.some((c) => c.id === this.course?.id) ||
      (published.assessmentQuestions !== undefined &&
        JSON.stringify(
          [...published.assessmentQuestions].sort((a, b) => a.id.localeCompare(b.id)),
        ) !==
          JSON.stringify([...this.approvedQuestions()].sort((a, b) => a.id.localeCompare(b.id)))) ||
      JSON.stringify(this.course?.policy) !== JSON.stringify(this.academy.policyFor(published)) ||
      this.course?.passMark !== (published.passMark ?? this.academy.state().settings.passMark) ||
      ['owner', 'issuer', 'approver', 'rights', 'effectiveDate'].some(
        (key) =>
          this.course?.[key as keyof AcademyCourse] !== published[key as keyof AcademyCourse],
      )
    );
  }
  protected openReview(refresher?: boolean) {
    if (refresher !== undefined) this.plan.refresher = refresher;
    this.error.set('');
    this.notice.set('');
    const staff = this.recipients();
    if (
      !this.course ||
      !staff.length ||
      (['Individual Worker', 'From HR Staff Profile'].includes(this.plan.method) &&
        this.plan.personIds.some((id) => !staff.some((p) => p.id === id))) ||
      (this.plan.method === 'From HR Staff Profile' && this.plan.personIds.length !== 1)
    ) {
      this.error.set(
        'Select eligible current staff for this course. HR profile assignments must keep the exact worker selected.',
      );
      return;
    }
    this.reviewedBank = this.bankFingerprint();
    this.reviewIds.set(staff.map((p) => p.id));
    this.reviewOpen.set(true);
  }
  protected confirmAssign() {
    if (!this.course || !this.reviewOpen() || this.saving()) return;
    if (!this.validPassMark()) return;
    if (this.reviewedBank !== this.bankFingerprint()) {
      this.error.set(
        'The approved question bank changed. Close this review and check the course again.',
      );
      return;
    }
    if (
      JSON.stringify([...this.reviewIds()].sort()) !==
      JSON.stringify(
        this.recipients()
          .map((p) => p.id)
          .sort(),
      )
    ) {
      this.error.set(
        'The eligible staff selection changed. Close this review and check the recipients again.',
      );
      return;
    }
    this.saving.set(true);
    const candidate = { ...this.course, assignmentPlan: structuredClone(this.plan) };
    const ids = this.recipients().map((p) => p.id);
    const error = this.needsPublication()
      ? this.academy.saveRulesAndAssign(candidate, ids, this.expected, this.workspace)
      : this.academy.assign(
          ids,
          [this.course.id],
          this.plan.due,
          this.plan.recurrenceMonths,
          this.plan.message,
          this.plan.channels.length > 0,
          this.plan.refresher,
          this.workspace,
          {
            supervisorId: this.supervisorId,
            source: this.plan.method,
            priority: this.plan.priority,
            notificationChannels: this.plan.channels,
            expectedCourseUpdatedAt: this.expected,
          },
        );
    this.error.set(error ?? '');
    if (!error) {
      this.course = structuredClone(this.academy.course(this.course.id)!);
      this.course.policy = this.academy.policyFor(this.course);
      this.course.passMark ??= this.academy.state().settings.passMark;
      this.expected = this.course.updatedAt;
      this.original = this.snapshot();
      this.reviewOpen.set(false);
      this.notice.set(
        `${ids.length} staff training record(s) saved. ${this.notificationSummary()}`,
      );
    }
    this.saving.set(false);
  }
  protected canEdit() {
    return (
      this.workspace === this.academy.store.companyId() &&
      this.academy.api.available() &&
      !this.academy.api.error()
    );
  }
  canLeave() {
    if (!this.canEdit()) return true;
    if (this.academy.api.saving()) return false;
    return (
      this.snapshot() === this.original ||
      window.confirm('Discard unsaved assessment rules and assignment setup?')
    );
  }
  @HostListener('window:keydown.escape') protected escape() {
    if (!this.saving()) this.reviewOpen.set(false);
  }
  @HostListener('window:beforeunload', ['$event']) protected unload(event: BeforeUnloadEvent) {
    if (this.snapshot() !== this.original) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
