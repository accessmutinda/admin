import { Component, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { A11yModule } from '@angular/cdk/a11y';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../../shared/ui/select';
import { Person } from '../../shared/management.store';
import { londonDate, addDays } from '../../rota/rota.models';
import { AcademyAdminNav, AcademyMessage } from './academy-shared';
import { AcademyService } from './academy.service';
@Component({
  selector: 'cv-academy-manage',
  imports: [
    FormsModule,
    RouterLink,
    A11yModule,
    MatSelectModule,
    CvSelect,
    AcademyAdminNav,
    AcademyMessage,
  ],
  templateUrl: './academy-manage.html',
  styleUrls: ['./academy-forms.css', './academy.css', './academy-workflows.css'],
})
export class AcademyManage {
  protected readonly academy = inject(AcademyService);
  private workspace = this.academy.store.companyId();
  protected search = '';
  protected branch = 'All';
  protected role = 'All';
  protected group = 'All';
  protected type = 'All';
  protected status = 'All';
  protected recurrence = 'All';
  protected page = 1;
  protected selected = new Set<string>();
  protected courseIds = new Set<string>();
  protected courseSearch = '';
  protected due = addDays(londonDate(), 14);
  protected recurrenceMonths = 0;
  protected message = '';
  protected notify = true;
  protected renew = false;
  protected readonly drawer = signal('');
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected assignments(personId: string) {
    return this.academy.assignments().filter((a) => a.personId === personId && !a.archived);
  }
  protected personStatus(personId: string) {
    const a = this.assignments(personId);
    if (!a.length) return 'No assignments';
    const statuses = a.map((v) => this.academy.status(v));
    return (
      ['Overdue', 'Expired', 'Due soon', 'Expiring soon', 'In progress', 'Not started'].find((s) =>
        statuses.includes(s),
      ) ?? 'Completed'
    );
  }
  protected readonly branches = () =>
    [...new Set(this.academy.store.staff().map((p) => p.location))].sort();
  protected readonly roles = () =>
    [...new Set(this.academy.store.staff().map((p) => p.role))].sort();
  protected readonly groups = () =>
    [
      ...new Set(
        this.academy.store.staff().map((p) => p.hr?.employment.department || 'Unassigned'),
      ),
    ].sort();
  protected filtered() {
    return this.academy.store
      .staff()
      .filter(
        (p) =>
          `${p.name} ${p.email} ${p.role}`
            .toLowerCase()
            .includes(this.search.trim().toLowerCase()) &&
          (this.branch === 'All' || p.location === this.branch) &&
          (this.role === 'All' || p.role === this.role) &&
          (this.group === 'All' || (p.hr?.employment.department || 'Unassigned') === this.group) &&
          (this.status === 'All' || this.personStatus(p.id) === this.status) &&
          (this.type === 'All' ||
            this.assignments(p.id).some(
              (a) => this.academy.course(a.courseId)?.mandatory === (this.type === 'Mandatory'),
            )) &&
          (this.recurrence === 'All' ||
            this.assignments(p.id).some(
              (a) => a.recurrenceMonths > 0 === (this.recurrence === 'Recurring'),
            )),
      );
  }
  protected rows() {
    const list = this.filtered();
    this.page = Math.min(this.page, Math.max(1, Math.ceil(list.length / 8)));
    return list.slice((this.page - 1) * 8, this.page * 8);
  }
  protected pages() {
    return Math.max(1, Math.ceil(this.filtered().length / 8));
  }
  protected toggle(id: string) {
    this.selected.has(id) ? this.selected.delete(id) : this.selected.add(id);
  }
  protected selectPage(checked: boolean) {
    this.rows().forEach((p) => (checked ? this.selected.add(p.id) : this.selected.delete(p.id)));
  }
  protected allSelected() {
    return this.rows().length > 0 && this.rows().every((p) => this.selected.has(p.id));
  }
  protected selectedStaff(): Person[] {
    return this.academy.store.staff().filter((p) => this.selected.has(p.id));
  }
  protected stats() {
    const staff = this.academy.store.staff();
    return [
      {
        label: 'Overdue / expired',
        value: staff.filter((p) => ['Overdue', 'Expired'].includes(this.personStatus(p.id))).length,
        icon: 'error',
      },
      {
        label: 'Due / expiring soon',
        value: staff.filter((p) => ['Due soon', 'Expiring soon'].includes(this.personStatus(p.id)))
          .length,
        icon: 'schedule',
      },
      {
        label: 'Completed staff',
        value: staff.filter((p) => this.personStatus(p.id) === 'Completed').length,
        icon: 'check_circle',
      },
      { label: 'Total staff', value: staff.length, icon: 'groups' },
    ];
  }
  protected nextDue(id: string) {
    return (
      this.assignments(id)
        .filter((a) => !a.completedAt && a.due)
        .map((a) => a.due)
        .sort()[0] ?? ''
    );
  }
  protected clear() {
    this.search = '';
    this.branch = this.role = this.group = this.type = this.status = this.recurrence = 'All';
    this.page = 1;
  }
  protected open(mode: string) {
    if (!this.selectedStaff().length) {
      this.error.set('Select at least one current staff member.');
      return;
    }
    this.workspace = this.academy.store.companyId();
    this.error.set('');
    this.drawer.set(mode);
    if (mode === 'mandatory')
      this.courseIds = new Set(
        this.academy
          .state()
          .courses.filter((c) => c.status === 'Published' && c.mandatory)
          .map((c) => c.id),
      );
  }
  protected courses() {
    return this.academy
      .state()
      .courses.filter(
        (c) =>
          c.status === 'Published' &&
          c.title.toLowerCase().includes(this.courseSearch.toLowerCase()),
      );
  }
  protected toggleCourse(id: string) {
    this.courseIds.has(id) ? this.courseIds.delete(id) : this.courseIds.add(id);
  }
  protected submit() {
    const ids = this.selectedStaff().map((p) => p.id);
    const error =
      this.drawer() === 'extend'
        ? this.academy.bulk(ids, 'extend', this.due, this.workspace)
        : this.academy.assign(
            ids,
            [...this.courseIds],
            this.due,
            this.recurrenceMonths,
            this.message,
            this.notify,
            this.renew,
            this.workspace,
          );
    this.error.set(error ?? '');
    if (!error) {
      this.drawer.set('');
      this.selected.clear();
      this.notice.set(
        'Training records saved. Requested notifications are device-local portal records.',
      );
    }
  }
  protected remind() {
    const error = this.academy.bulk(
      this.selectedStaff().map((p) => p.id),
      'remind',
      '',
      this.academy.store.companyId(),
    );
    this.error.set(error ?? '');
    if (!error)
      this.notice.set(
        'Portal reminders recorded for selected unfinished assignments. No external email was sent.',
      );
  }
  protected close() {
    if (this.canLeave()) this.drawer.set('');
  }
  canLeave(): boolean {
    return !this.drawer() || window.confirm('Discard the unsaved training assignment?');
  }
  @HostListener('window:beforeunload', ['$event']) protected unload(event: BeforeUnloadEvent) {
    if (this.drawer()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
