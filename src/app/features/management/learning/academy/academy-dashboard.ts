import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../../shared/ui/select';
import { AcademyService } from './academy.service';
import { AcademyAdminNav } from './academy-shared';
import { AcademyDate } from './academy-date';
import { londonDate, addDays } from '../../rota/rota.models';
@Component({
  host: { class: 'module-page academy-page' },
  selector: 'cv-academy-dashboard',
  imports: [RouterLink, FormsModule, MatSelectModule, CvSelect, AcademyAdminNav, AcademyDate],
  templateUrl: './academy-dashboard.html',
  styleUrls: ['./academy.css', './academy-dashboard.css'],
})
export class AcademyDashboard {
  protected readonly academy = inject(AcademyService);
  protected readonly period = signal(30);
  protected readonly from = computed(() => addDays(londonDate(), 1 - this.period()));
  protected inPeriod(at: string) {
    return !!at && at.slice(0, 10) >= this.from() && at.slice(0, 10) <= londonDate();
  }
  protected readonly assignments = computed(() =>
    this.academy
      .assignments()
      .filter((a) => !a.archived && this.academy.can('evidence', a.personId)),
  );
  protected readonly attempts = computed(() =>
    this.academy
      .state()
      .attempts.filter(
        (a) =>
          this.academy.can('evidence', a.personId) &&
          a.submittedAt &&
          !a.invalidatedAt &&
          !a.groupId &&
          this.inPeriod(a.submittedAt),
      ),
  );
  protected readonly completions = computed(() =>
    (this.academy.state().completions ?? []).filter(
      (c) => this.academy.can('evidence', c.personId) && this.inPeriod(c.createdAt),
    ),
  );
  protected readonly stats = computed(() => {
    const attempts = this.attempts();
    const completions = this.completions();
    const filed = completions.filter((c) =>
      c.acknowledgements.some((a) => a.stage === 'TRAINING_RECORD_PENDING'),
    );
    const matrix = completions.filter((c) =>
      c.acknowledgements.some((a) => a.stage === 'COMPLIANCE_PENDING'),
    );
    const rota = completions.filter((c) =>
      c.acknowledgements.some((a) => a.stage === 'COMPLETE_SYNCED'),
    );
    const lastMatrix = matrix
      .flatMap((c) => c.acknowledgements.filter((a) => a.stage === 'COMPLIANCE_PENDING'))
      .sort((a, b) => b.at.localeCompare(a.at))[0]?.at;
    return [
      {
        label: 'Assigned Courses',
        value: this.assignments().length,
        icon: 'school',
        path: 'manage',
        tone: 'blue',
        caption: 'Current active assignments',
        positive: true,
      },
      {
        label: 'In-Progress Learners',
        value: new Set(
          this.assignments()
            .filter((a) => !a.completedAt && a.completedLessonIds.length)
            .map((a) => a.personId),
        ).size,
        icon: 'groups',
        path: 'manage',
        tone: 'cyan',
        caption: 'Learners with started courses',
        positive: true,
      },
      {
        label: 'Pass Rate',
        value: attempts.length
          ? Math.round(
              (attempts.filter((a) => a.passed && !a.groupId).length / attempts.length) * 100,
            ) + '%'
          : '—',
        icon: 'check_circle',
        path: 'results',
        tone: 'green',
        caption: attempts.length + ' submitted final assessments',
        positive: true,
      },
      {
        label: 'Overdue Refreshers',
        value: this.assignments().filter(
          (a) => a.type === 'Refresher' && ['Overdue', 'Expired'].includes(this.academy.status(a)),
        ).length,
        icon: 'warning',
        path: 'manage',
        tone: 'orange',
        caption: 'Require renewal attention',
        positive: false,
      },
      {
        label: 'Certificates Auto-Filed',
        value: filed.length,
        icon: 'workspace_premium',
        path: 'certificates',
        tone: 'purple',
        caption: completions.length
          ? Math.round((filed.length / completions.length) * 100) + '% to HR staff records'
          : 'No completions in this period',
        positive: true,
      },
      {
        label: 'Training Matrix Sync',
        value: completions.length
          ? Math.round((matrix.length / completions.length) * 100) + '%'
          : '—',
        icon: 'layers',
        path: 'reports',
        tone: 'blue',
        caption: lastMatrix ? 'Last sync:' : 'Awaiting completion evidence',
        positive: matrix.length > 0,
        at: lastMatrix,
      },
      {
        label: 'Rota Eligibility Updated',
        value: new Set(rota.map((c) => c.personId)).size,
        icon: 'event_available',
        path: 'certificates',
        tone: 'green',
        caption: 'Training inputs refreshed',
        positive: true,
      },
    ];
  });
  protected readonly workflow = [
    { icon: 'groups', label: 'Assign Course', tone: 'blue' },
    { icon: 'smart_display', label: 'Watch Video', tone: 'blue' },
    { icon: 'assignment_turned_in', label: 'Complete Quiz', tone: 'purple' },
    { icon: 'check_circle', label: 'Auto Mark', tone: 'green' },
    { icon: 'workspace_premium', label: 'Generate Internal Certificate', tone: 'purple' },
    { icon: 'folder_open', label: 'Save to Staff HR File', tone: 'blue' },
    { icon: 'database', label: 'Update Training Record', tone: 'blue' },
    { icon: 'verified_user', label: 'Recalculate Compliance', tone: 'green' },
    { icon: 'event_available', label: 'Update Rota Eligibility', tone: 'purple' },
  ];
  protected activity() {
    return this.academy
      .state()
      .courses.filter((c) => c.status === 'Published')
      .map((course) => {
        const assignments = this.assignments().filter((a) => a.courseId === course.id);
        const attempts = this.attempts().filter((a) => a.courseId === course.id);
        return {
          course,
          assigned: assignments.length,
          progress: assignments.filter((a) => !a.completedAt && a.completedLessonIds.length).length,
          passed: assignments.filter((a) => a.completedAt).length,
          rate: attempts.length
            ? Math.round(
                (attempts.filter((a) => a.passed && !a.groupId).length / attempts.length) * 100,
              ) + '%'
            : '—',
        };
      })
      .slice(0, 5);
  }
  protected renewals() {
    const certificates = this.academy
      .state()
      .certificates.filter(
        (c) =>
          this.academy.can('evidence', c.personId) &&
          !c.revokedAt &&
          c.expires &&
          c.expires <= addDays(londonDate(), 30),
      );
    return [...new Set(certificates.map((c) => c.courseId))]
      .map((courseId) => {
        const rows = certificates
          .filter((c) => c.courseId === courseId)
          .sort((a, b) => a.expires.localeCompare(b.expires));
        return {
          courseId,
          title: rows[0].courseTitle,
          learners: new Set(rows.map((c) => c.personId)).size,
          expires: rows[0].expires,
          overdue: rows[0].expires < londonDate(),
        };
      })
      .sort((a, b) => a.expires.localeCompare(b.expires))
      .slice(0, 5);
  }
  protected recent() {
    return [...this.attempts()]
      .filter((a) => a.passed && !a.groupId)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      .slice(0, 5);
  }
  protected name(id: string) {
    return this.academy.store.staff().find((p) => p.id === id)?.name ?? 'Unavailable staff record';
  }
  protected readiness() {
    const staff = this.academy.store
      .staff()
      .filter(
        (p) =>
          this.academy.can('evidence', p.id) && !['Inactive', 'Left'].includes(p.hr?.status ?? ''),
      );
    const records = staff
      .map((p) => {
        const knowledge = this.academy.knowledgeCompliance(p.id);
        const mandatory = this.assignments().filter(
          (a) => a.personId === p.id && this.academy.assignedCourse(a)?.mandatory,
        );
        const statuses = mandatory.map((a) => this.academy.status(a));
        return {
          knowledge,
          overdue: statuses.some((s) => ['Overdue', 'Expired', 'Evidence review'].includes(s)),
          soon: statuses.some((s) => ['Due soon', 'Expiring soon'].includes(s)),
        };
      })
      .filter((r) => r.knowledge.required > 0);
    const total = records.length;
    const overdue = records.filter((r) => r.overdue).length;
    const soon = records.filter((r) => !r.overdue && r.soon).length;
    const compliant = records.filter((r) => !r.overdue && !r.soon && r.knowledge.compliant).length;
    return {
      total,
      compliant,
      soon,
      overdue,
      outstanding: total - compliant - soon - overdue,
      percent: total ? Math.round((compliant / total) * 100) : null,
    };
  }
  protected percent(count: number) {
    const total = this.readiness().total;
    return total ? Math.round((count / total) * 100) + '%' : '—';
  }
  protected timestamp(at?: string) {
    if (!at) return 'Not recorded';
    const date = new Date(at);
    const day = londonDate(date);
    const today = londonDate();
    const prefix =
      day === today
        ? 'Today'
        : day === addDays(today, -1)
          ? 'Yesterday'
          : new Intl.DateTimeFormat('en-GB', {
              timeZone: 'Europe/London',
              day: 'numeric',
              month: 'short',
            }).format(date);
    return (
      prefix +
      ' ' +
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', timeStyle: 'short' }).format(
        date,
      )
    );
  }
  protected integrationRows() {
    const jobs =
      this.academy.state().completions?.filter((j) => this.academy.can('evidence', j.personId)) ??
      [];
    return [
      { name: 'HR Staff Records (Certificates)', stage: 'TRAINING_RECORD_PENDING' },
      { name: 'Training Matrix', stage: 'COMPLIANCE_PENDING' },
      { name: 'Rota / Workforce System', stage: 'COMPLETE_SYNCED' },
    ].map((service) => {
      const acknowledgements = jobs
        .flatMap((j) => j.acknowledgements.filter((a) => a.stage === service.stage))
        .sort((a, b) => b.at.localeCompare(a.at));
      const pending = jobs.filter(
        (j) => !j.acknowledgements.some((a) => a.stage === service.stage),
      );
      const failed = pending.some((j) => j.status === 'SYNC_EXCEPTION');
      return {
        name: service.name,
        at: acknowledgements[0]?.at,
        status: failed
          ? 'Attention'
          : pending.length
            ? 'Pending'
            : jobs.length
              ? 'Healthy'
              : 'Ready',
        healthy: !failed && !pending.length,
        detail: pending.length + ' awaiting acknowledgement',
      };
    });
  }
  protected serviceCards() {
    const rows = this.integrationRows();
    return [
      {
        title: 'Certificates Auto-Filed to HR Staff Records',
        description: 'Internal certificates are stored in each staff file.',
        icon: 'folder_open',
        tone: 'blue',
        row: rows[0],
      },
      {
        title: 'Training Matrix Sync',
        description: 'Training completions update the shared training matrix.',
        icon: 'layers',
        tone: 'blue',
        row: rows[1],
      },
      {
        title: 'Rota Eligibility Updates',
        description: 'Training inputs refresh; practical restrictions still apply.',
        icon: 'event_available',
        tone: 'purple',
        row: rows[2],
      },
    ];
  }
}
