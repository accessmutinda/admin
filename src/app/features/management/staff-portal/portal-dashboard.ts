import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { StaffJournal } from '../journal/staff-journal';
import { addDays, completedVisit } from '../rota/rota.models';
import { PortalService } from './portal.service';
@Component({
  selector: 'cv-portal-dashboard',
  imports: [DatePipe, FormsModule, RouterLink, MatSelectModule, CvSelect, StaffJournal],
  templateUrl: './portal-dashboard.html',
  styleUrls: ['./portal-ui.css', './portal-forms.css', './portal-dashboard.css'],
})
export class PortalDashboard {
  protected readonly portal = inject(PortalService);
  protected readonly clientJournalEntries = computed(() =>
    this.portal.journal.entries().filter((e) => !!e.clientId && e.state === 'Sent'),
  );
  protected readonly manager = inject(ActivatedRoute).snapshot.data['portalView'] === 'oversight';
  protected readonly query = signal('');
  protected readonly scope = signal('All');
  protected readonly period = signal('This Week');
  protected readonly taskScope = signal('My Tasks');
  protected readonly inboxScope = signal('All');
  protected readonly inboxQuery = signal('');
  protected readonly awaiting = this.portal.awaitingResponses;
  protected readonly professionalAwaiting = this.portal.professionalAwaiting;
  protected readonly completedVisits = computed(() => this.visits().filter(completedVisit).length);
  protected readonly dueThisWeek = computed(
    () =>
      this.openTasks().filter(
        (t) => t.due >= this.portal.weekStart && t.due <= addDays(this.portal.weekStart, 6),
      ).length,
  );
  protected readonly resolvedThisWeek = computed(
    () =>
      this.portal
        .tasks()
        .filter(
          (t) =>
            t.status === 'Resolved' && (t.resolvedAt ?? '').slice(0, 10) >= this.portal.weekStart,
        ).length,
  );
  protected readonly overdueFollowUps = computed(
    () =>
      this.portal
        .communications()
        .filter((c) => c.status !== 'Resolved' && c.followUp && c.followUp < this.portal.today)
        .length,
  );
  protected readonly staffTasks = computed(() =>
    (this.taskScope() === 'My Tasks' ? this.myTasks() : this.portal.tasks())
      .filter(
        (t) =>
          (this.taskScope() !== 'Escalated' || t.status === 'Escalated') && t.status !== 'Resolved',
      )
      .sort((a, b) => a.due.localeCompare(b.due)),
  );
  protected isProfessional(email: string, clientId: string): boolean {
    return (this.portal.clients().find((c) => c.id === clientId)?.file?.contacts ?? []).some(
      (c) => c.email.toLowerCase() === email,
    );
  }
  protected readonly visibleInbox = computed(() =>
    this.inbox().filter(
      (e) =>
        (this.inboxScope() !== 'Unread' || !e.readBy.includes(this.portal.journal.email())) &&
        (this.inboxScope() !== 'From Professionals' ||
          this.isProfessional(e.authorEmail, e.clientId)) &&
        (this.inboxScope() !== 'Mentions' || e.cc.includes(this.portal.journal.email())) &&
        (!this.inboxQuery() ||
          [e.subject, e.author, e.body].some((v) =>
            v.toLowerCase().includes(this.inboxQuery().toLowerCase()),
          )),
    ),
  );
  protected readonly miniStats = computed(() => [
    {
      name: 'Open Client Journals',
      count: this.clientJournalEntries().filter(
        (e) => e.responseRequired && e.responseStatus !== 'Responded',
      ).length,
      icon: 'description',
      tone: 'blue',
    },
    {
      name: 'Staff Actions Awaiting Review',
      count: this.portal.tasks().filter((t) => t.status === 'Awaiting response').length,
      icon: 'groups',
      tone: 'purple',
    },
    {
      name: 'District Nurse Responses',
      count: this.portal.professionalAwaiting().filter((c) => c.type === 'District nurse note')
        .length,
      icon: 'medical_services',
      tone: 'green',
    },
    {
      name: 'GP Notes Received',
      count: this.portal
        .communications()
        .filter((c) => c.type === 'GP note' && c.direction === 'Received').length,
      icon: 'stethoscope',
      tone: 'blue',
    },
    {
      name: 'Social Worker Follow-ups',
      count: this.portal
        .communications()
        .filter((c) => c.type === 'Social worker email' && c.status !== 'Resolved').length,
      icon: 'groups',
      tone: 'purple',
    },
    {
      name: 'Resolved This Week',
      count: this.resolvedThisWeek(),
      icon: 'check_circle',
      tone: 'green',
    },
  ]);
  protected readonly drillClient = signal('');
  protected readonly drillStaff = signal('');
  protected readonly drillType = signal('All');
  protected readonly drillStatus = signal('All');
  protected readonly from = signal('');
  protected readonly to = signal('');
  protected readonly applied = signal(false);
  protected readonly compose = viewChild(StaffJournal);
  protected readonly myTasks = computed(() =>
    this.portal.tasks().filter((t) => t.owner === this.portal.journal.email()),
  );
  protected readonly tasks = computed(() => (this.manager ? this.portal.tasks() : this.myTasks()));
  protected readonly openTasks = computed(() =>
    this.tasks().filter((t) => t.status !== 'Resolved'),
  );
  protected readonly inbox = computed(() =>
    this.portal.journal
      .entries()
      .filter(
        (e) =>
          e.state === 'Sent' &&
          [...e.to, ...e.cc].includes(this.portal.journal.email()) &&
          !e.archivedBy.includes(this.portal.journal.email()) &&
          !(e.deletedBy ?? []).includes(this.portal.journal.email()),
      ),
  );
  protected readonly unread = computed(() =>
    this.portal.journal
      .entries()
      .filter(
        (e) =>
          e.state === 'Sent' &&
          e.authorEmail !== this.portal.journal.email() &&
          !e.readBy.includes(this.portal.journal.email()),
      ),
  );
  protected readonly teamVisits = computed(() =>
    ['CA', 'RM', 'CC'].includes(this.portal.journal.auth.currentUser()?.roleCode ?? ''),
  );
  protected readonly visits = computed(() => {
    const staff = this.portal.store
      .staff()
      .find((p) => p.email.toLowerCase() === this.portal.journal.email());
    return this.portal.care.rota
      .data()
      .visits.filter(
        (v) =>
          v.date === this.portal.today &&
          v.state !== 'Cancelled' &&
          (this.manager || this.teamVisits() || (!!staff && v.staffIds.includes(staff.id))),
      );
  });
  protected readonly overdue = computed(() =>
    this.openTasks().filter((t) => t.due < this.portal.today),
  );
  protected readonly queue = computed(() =>
    [
      ...this.tasks().map((t) => ({
        id: t.id,
        type: 'Staff action',
        subject: t.title,
        detail: t.notes ?? '',
        clientId: t.clientId,
        person: t.owner,
        due: t.due,
        status: t.status,
        high: t.priority === 'High',
        path: '/staff-portal/tasks',
        query: { task: t.id },
      })),
      ...this.portal.concerns().map((c) => ({
        id: c.id,
        type: 'Client concern',
        subject: c.title,
        detail: c.description,
        clientId: c.clientId,
        person: c.assignedTo,
        due: c.visitDate,
        status: c.status,
        high: c.priority === 'High',
        path: '/staff-portal/concerns/' + c.id,
        query: {},
      })),
      ...this.portal.communications().map((c) => ({
        id: c.id,
        type: c.type,
        subject: c.subject,
        detail: c.details,
        clientId: c.clientId,
        person:
          c.loggedByEmail ??
          this.portal
            .contacts()
            .find((p) => p.name === c.loggedBy)
            ?.email.toLowerCase() ??
          c.loggedBy,
        due: c.followUp || c.at.slice(0, 10),
        status: c.status,
        high: false,
        path: '/staff-portal/service-users/' + c.clientId + '/communications',
        query: { record: c.id },
      })),
    ]
      .filter((row) => {
        const q = this.query().toLowerCase();
        return (
          (!q ||
            [
              row.subject,
              row.type,
              this.portal.clientName(row.clientId),
              this.portal.person(row.person),
            ].some((v) => v.toLowerCase().includes(q))) &&
          (this.scope() !== 'Overdue' ||
            (row.due < this.portal.today && !['Resolved', 'Closed'].includes(row.status))) &&
          (this.scope() !== 'High priority' || row.high) &&
          (this.scope() !== 'Client concerns' || row.type === 'Client concern') &&
          (this.scope() !== 'Professional' ||
            !['Client concern', 'Staff action'].includes(row.type)) &&
          (!this.applied() ||
            ((!this.drillClient() || row.clientId === this.drillClient()) &&
              (!this.drillStaff() || row.person === this.drillStaff()) &&
              (this.drillType() === 'All' ||
                (this.drillType() === 'Concerns'
                  ? row.type === 'Client concern'
                  : this.drillType() === 'Tasks'
                    ? row.type === 'Staff action'
                    : !['Client concern', 'Staff action'].includes(row.type))) &&
              (this.drillStatus() === 'All' || row.status === this.drillStatus()) &&
              (!this.from() || row.due >= this.from()) &&
              (!this.to() || row.due <= this.to())))
        );
      })
      .sort((a, b) => Number(b.high) - Number(a.high) || a.due.localeCompare(b.due)),
  );
  protected readonly summary = computed(() => {
    const monthStart = this.portal.today.slice(0, 7) + '-01';
    const start =
      this.period() === 'This Week'
        ? this.portal.weekStart
        : this.period() === 'Last Week'
          ? addDays(this.portal.weekStart, -7)
          : this.period() === 'This Month'
            ? monthStart
            : addDays(monthStart, -1).slice(0, 7) + '-01';
    const end =
      this.period() === 'Last Week'
        ? this.portal.weekStart
        : this.period() === 'Last Month'
          ? monthStart
          : addDays(this.portal.today, 1);
    const inPeriod = (at: string | undefined) =>
      !!at && at.slice(0, 10) >= start && at.slice(0, 10) < end;
    const names = [
      'Journal',
      'Staff action',
      'District nurse note',
      'GP note',
      'Social worker email',
      'Resolved',
    ];
    return names.map((name, i) => ({
      name,
      count:
        name === 'Journal'
          ? this.portal.journal.entries().filter((e) => e.state === 'Sent' && inPeriod(e.createdAt))
              .length
          : name === 'Staff action'
            ? this.portal.tasks().filter((t) => inPeriod(t.createdAt)).length
            : name === 'Resolved'
              ? this.portal.tasks().filter((t) => t.status === 'Resolved' && inPeriod(t.resolvedAt))
                  .length +
                this.portal
                  .concerns()
                  .filter(
                    (c) =>
                      ['Resolved', 'Closed'].includes(c.status) &&
                      c.history?.some((h) => h.status === 'Resolved' && inPeriod(h.at)),
                  ).length
              : this.portal.communications().filter((c) => c.type === name && inPeriod(c.at))
                  .length,
      color: ['#3ca6ef', '#a06ef0', '#f6a551', '#35c89a', '#6874dc', '#29ad78'][i],
    }));
  });
  protected readonly maxCount = computed(() => Math.max(1, ...this.summary().map((s) => s.count)));
  protected readonly statuses = computed(() =>
    ['Open', 'Awaiting response', 'Overdue', 'In progress', 'Escalated', 'Resolved'].map(
      (name, i) => ({
        name,
        count:
          name === 'Overdue'
            ? this.openTasks().filter((t) => t.due < this.portal.today).length
            : this.tasks().filter(
                (t) => t.status === name && (name === 'Resolved' || t.due >= this.portal.today),
              ).length,
        color: ['#f8cc58', '#a56bea', '#ff496b', '#63aff0', '#ef8794', '#30b77e'][i],
      }),
    ),
  );
  protected readonly doughnut = computed(() => {
    let angle = 0;
    const total = this.tasks().length || 1;
    return (
      'conic-gradient(' +
      this.statuses()
        .map((s) => {
          const start = angle;
          angle += (s.count / total) * 360;
          return s.color + ' ' + start + 'deg ' + angle + 'deg';
        })
        .join(',') +
      ')'
    );
  });
  protected percent(count: number): number {
    return Math.round((count / Math.max(1, this.tasks().length)) * 100);
  }
  protected photo(email: string): string {
    return (
      this.portal.store.staff().find((p) => p.email.toLowerCase() === email)?.hr?.personal.photo ??
      ''
    );
  }
  canLeave(): boolean {
    return this.compose()?.canLeave() ?? true;
  }
  protected initials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('');
  }
}
