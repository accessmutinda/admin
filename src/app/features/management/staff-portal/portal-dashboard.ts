import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { StaffJournal } from '../journal/staff-journal';
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
  protected readonly period = signal(7);
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
          !e.archivedBy.includes(this.portal.journal.email()),
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
          (this.manager || (!!staff && v.staffIds.includes(staff.id))),
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
    const since = Date.now() - this.period() * 86400000;
    const recent = this.portal.timeline().filter((e) => Date.parse(e.at) >= since);
    return ['Journal', 'Staff action', 'Concern', 'GP note', 'District nurse note', 'Resolved'].map(
      (name, i) => ({
        name,
        count: recent.filter((e) =>
          name === 'Resolved' ? e.status === 'Resolved' : e.category === name,
        ).length,
        color: ['#3ca6ef', '#a06ef0', '#f6a551', '#35c89a', '#6874dc', '#29ad78'][i],
      }),
    );
  });
  protected readonly maxCount = computed(() => Math.max(1, ...this.summary().map((s) => s.count)));
  protected readonly statuses = computed(() =>
    ['Open', 'In progress', 'Awaiting response', 'Escalated', 'Resolved'].map((name, i) => ({
      name,
      count: this.tasks().filter((t) => t.status === name).length,
      color: ['#f8cc58', '#63aff0', '#a56bea', '#ef8794', '#30b77e'][i],
    })),
  );
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
