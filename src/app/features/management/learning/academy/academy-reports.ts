import { Component, inject, signal } from '@angular/core';
import { AcademyDate } from './academy-date';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../../shared/ui/select';
import { csv, validDate } from '../../care/care.models';
import { londonDate, addDays } from '../../rota/rota.models';
import { AcademyAssignment } from './academy.models';
import { AcademyService } from './academy.service';
import { AcademyAdminNav, AcademyMessage } from './academy-shared';
@Component({
  selector: 'cv-academy-reports',
  imports: [
    AcademyDate,
    FormsModule,
    RouterLink,
    MatSelectModule,
    CvSelect,
    AcademyAdminNav,
    AcademyMessage,
  ],
  templateUrl: './academy-reports.html',
  styleUrls: ['./academy-forms.css', './academy.css', './academy-workflows.css'],
})
export class AcademyReports {
  protected readonly academy = inject(AcademyService);
  protected from = addDays(londonDate(), -29);
  protected to = londonDate();
  protected branch = 'All';
  protected role = 'All';
  protected heatmapPage = 1;
  protected auditPage = 1;
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected people() {
    return this.academy.store
      .staff()
      .filter(
        (p) =>
          (this.branch === 'All' || p.location === this.branch) &&
          (this.role === 'All' || p.role === this.role),
      );
  }
  protected branches() {
    return [...new Set(this.academy.store.staff().map((p) => p.location))].sort();
  }
  protected roles() {
    return [...new Set(this.academy.store.staff().map((p) => p.role))].sort();
  }
  protected assignments() {
    const ids = this.people().map((p) => p.id);
    return this.academy.assignments().filter((a) => !a.archived && ids.includes(a.personId));
  }
  protected mandatory() {
    return this.assignments().filter(
      (a) => this.academy.state().courses.find((c) => c.id === a.courseId)?.mandatory,
    );
  }
  protected current(a: AcademyAssignment) {
    return !!a.completedAt && !['Expired'].includes(this.academy.status(a));
  }
  protected percent(assignments: AcademyAssignment[]) {
    return assignments.length
      ? Math.round((assignments.filter((a) => this.current(a)).length / assignments.length) * 100)
      : null;
  }
  protected period(value: string) {
    const date = value.slice(0, 10);
    return date >= this.from && date <= this.to;
  }
  protected attempts() {
    const ids = this.people().map((p) => p.id);
    return this.academy
      .state()
      .attempts.filter(
        (a) => a.submittedAt && ids.includes(a.personId) && this.period(a.submittedAt),
      );
  }
  protected certificates() {
    const ids = this.people().map((p) => p.id);
    return this.academy
      .state()
      .certificates.filter((c) => ids.includes(c.personId) && this.period(c.issuedAt));
  }
  protected stats() {
    const assignments = this.mandatory();
    const attempts = this.attempts();
    return [
      {
        label: 'Mandatory completion',
        value: this.percent(assignments) === null ? '—' : this.percent(assignments) + '%',
        caption: 'Current assigned requirements',
        icon: 'verified_user',
      },
      {
        label: 'Overdue / expired',
        value: this.assignments().filter((a) =>
          ['Overdue', 'Expired'].includes(this.academy.status(a)),
        ).length,
        caption: 'Current assignments',
        icon: 'error',
      },
      {
        label: 'Average score',
        value: attempts.length
          ? Math.round(attempts.reduce((sum, a) => sum + (a.score ?? 0), 0) / attempts.length) + '%'
          : '—',
        caption: 'Submitted in selected period',
        icon: 'star',
      },
      {
        label: 'Expiring soon',
        value: this.academy
          .state()
          .certificates.filter(
            (c) =>
              this.people().some((p) => p.id === c.personId) &&
              c.expires >= londonDate() &&
              c.expires <= addDays(londonDate(), 30),
          ).length,
        caption: 'Next 30 days',
        icon: 'schedule',
      },
      {
        label: 'Certificates issued',
        value: this.certificates().length,
        caption: 'Selected reporting period',
        icon: 'workspace_premium',
      },
    ];
  }
  protected breakdown(key: 'location' | 'role') {
    return [...new Set(this.people().map((p) => p[key]))].map((name) => {
      const ids = this.people()
        .filter((p) => p[key] === name)
        .map((p) => p.id);
      const assignments = this.mandatory().filter((a) => ids.includes(a.personId));
      return { name, percent: this.percent(assignments), assigned: assignments.length };
    });
  }
  protected months() {
    return Array.from({ length: 6 }, (_, i) => {
      const date = new Date(londonDate() + 'T12:00:00Z');
      date.setUTCDate(1);
      date.setUTCMonth(date.getUTCMonth() - 5 + i);
      const month = date.toISOString().slice(0, 7);
      const ids = this.people().map((p) => p.id);
      const attempts = this.academy
        .state()
        .attempts.filter((a) => a.submittedAt.startsWith(month) && ids.includes(a.personId));
      return {
        month: date.toLocaleDateString('en-GB', {
          month: 'short',
          year: '2-digit',
          timeZone: 'UTC',
        }),
        count: attempts.length,
        percent: attempts.length
          ? Math.round((attempts.filter((a) => a.passed).length / attempts.length) * 100)
          : null,
      };
    });
  }
  protected courses() {
    return this.academy.state().courses.filter((c) => c.mandatory);
  }
  protected heatmapCourses() {
    return this.courses().slice((this.heatmapPage - 1) * 8, this.heatmapPage * 8);
  }
  protected heatmapPages() {
    return Math.max(1, Math.ceil(this.courses().length / 8));
  }
  protected cell(courseId: string, branch: string) {
    const ids = this.people()
      .filter((p) => p.location === branch)
      .map((p) => p.id);
    return this.percent(
      this.mandatory().filter((a) => a.courseId === courseId && ids.includes(a.personId)),
    );
  }
  protected risk() {
    return this.people()
      .map((p) => ({
        person: p,
        overdue: this.assignments().filter(
          (a) => a.personId === p.id && ['Overdue', 'Expired'].includes(this.academy.status(a)),
        ).length,
      }))
      .filter((r) => r.overdue > 0)
      .sort((a, b) => b.overdue - a.overdue)
      .slice(0, 8);
  }
  protected events() {
    return this.academy
      .state()
      .events.filter(
        (e) => this.period(e.at) && (!e.personId || this.people().some((p) => p.id === e.personId)),
      );
  }
  protected eventRows() {
    this.auditPage = Math.min(this.auditPage, this.auditPages());
    return this.events().slice((this.auditPage - 1) * 8, this.auditPage * 8);
  }
  protected auditPages() {
    return Math.max(1, Math.ceil(this.events().length / 8));
  }
  protected export(kind: string) {
    if (!validDate(this.from) || !validDate(this.to) || this.from > this.to) {
      this.error.set('Choose a valid reporting period.');
      return;
    }
    const error = this.academy.recordReport(kind, this.academy.store.companyId());
    this.error.set(error ?? '');
    if (error) return;
    let content: string;
    let extension = 'csv';
    if (kind === 'evidence-pack') {
      extension = 'json';
      content = JSON.stringify(
        {
          company: this.academy.store.company()?.name,
          preparedAt: new Date().toISOString(),
          period: { from: this.from, to: this.to },
          scope:
            'Current assignments, with assessment and certificate activity in the selected period. Internal learning records; not proof of external accreditation.',
          assignments: this.assignments(),
          attempts: this.attempts().map(({ questions, answers, ...attempt }) => attempt),
          certificates: this.certificates(),
          audit: this.events(),
        },
        null,
        2,
      );
    } else if (kind === 'certificates')
      content = csv([
        ['Certificate', 'Staff', 'Course', 'Issued', 'Expires', 'Score', 'CPD hours', 'Sample'],
        ...this.certificates().map((c) => [
          c.id,
          c.learner,
          c.courseTitle,
          c.issuedAt,
          c.expires,
          c.score,
          c.cpdHours,
          c.sample,
        ]),
      ]);
    else if (kind === 'matrix')
      content = csv([
        ['Staff', 'Role', 'Branch', ...this.courses().map((c) => c.title)],
        ...this.people().map((p) => [
          p.name,
          p.role,
          p.location,
          ...this.courses().map((c) => {
            const a = this.assignments().find((a) => a.personId === p.id && a.courseId === c.id);
            return a ? this.academy.status(a) : 'Unassigned';
          }),
        ]),
      ]);
    else
      content = csv([
        ['Staff', 'Role', 'Branch', 'Course', 'Mandatory', 'Due', 'Status', 'Completed'],
        ...this.assignments().map((a) => {
          const p = this.people().find((p) => p.id === a.personId)!;
          const c = this.academy.state().courses.find((c) => c.id === a.courseId);
          return [
            p.name,
            p.role,
            p.location,
            c?.title,
            c?.mandatory,
            a.due,
            this.academy.status(a),
            a.completedAt,
          ];
        }),
      ]);
    this.academy.store.download(
      'training-' + kind + '.' + extension,
      content,
      extension === 'json' ? 'application/json' : 'text/csv;charset=utf-8',
    );
    this.notice.set('Report prepared from saved workspace records.');
  }
}
