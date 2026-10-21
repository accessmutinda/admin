import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { JournalTask } from '../journal/journal.models';
import { PortalService } from './portal.service';
import { PortalEvidence } from './portal-evidence';
@Component({
  selector: 'cv-portal-tasks',
  imports: [DatePipe, FormsModule, RouterLink, MatSelectModule, CvSelect, PortalEvidence],
  templateUrl: './portal-tasks.html',
  styleUrls: ['./portal-ui.css', './portal-forms.css', './portal-profile.css'],
})
export class PortalTasks {
  protected readonly portal = inject(PortalService);
  private readonly route = inject(ActivatedRoute);
  protected readonly clientMode =
    !!this.route.snapshot.queryParamMap.get('client') &&
    !this.route.snapshot.queryParamMap.get('new') &&
    !this.route.snapshot.queryParamMap.get('task');
  protected readonly staff = signal(
    this.route.snapshot.queryParamMap.get('staff') ?? this.portal.journal.email(),
  );
  protected readonly person = computed(() =>
    this.portal.contacts().find((p) => p.email.toLowerCase() === this.staff()),
  );
  protected readonly record = computed(() =>
    this.portal.store.staff().find((p) => p.email.toLowerCase() === this.staff()),
  );
  protected readonly profileTab = signal('Tasks & actions');
  protected readonly filter = signal('All');
  protected readonly search = signal('');
  protected readonly editing = signal(false);
  protected readonly uploading = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected task = this.portal.newTask();
  private clean = JSON.stringify(this.task);
  protected readonly ownTasks = computed(() =>
    this.portal
      .tasks()
      .filter(
        (t) =>
          (this.clientMode || t.owner === this.staff()) &&
          (!this.route.snapshot.queryParamMap.get('client') ||
            t.clientId === this.route.snapshot.queryParamMap.get('client')),
      ),
  );
  protected readonly tasks = computed(() =>
    this.ownTasks()
      .filter(
        (t) =>
          (this.filter() === 'All' || t.status === this.filter()) &&
          (!this.search() ||
            [t.title, t.notes ?? '', this.portal.clientName(t.clientId)].some((v) =>
              v.toLowerCase().includes(this.search().toLowerCase()),
            )),
      )
      .sort((a, b) => a.due.localeCompare(b.due)),
  );
  protected readonly unresolved = computed(() =>
    this.portal
      .concerns()
      .filter((c) => c.staffEmail === this.staff() && !['Resolved', 'Closed'].includes(c.status)),
  );
  protected readonly pending = computed(() =>
    this.ownTasks().filter((t) => t.status !== 'Resolved'),
  );
  protected get escalatedCount(): number {
    return this.ownTasks().filter((t) => t.status === 'Escalated').length;
  }
  protected readonly resolved = computed(() =>
    this.ownTasks().filter((t) => t.status === 'Resolved'),
  );
  constructor() {
    const id = this.route.snapshot.queryParamMap.get('task');
    const task = this.portal.tasks().find((t) => t.id === id);
    if (task) {
      this.staff.set(task.owner);
      this.edit(task);
    } else if (this.route.snapshot.queryParamMap.get('new')) this.edit();
  }
  protected changeStaff(email: string): void {
    if (!this.canLeave()) return;
    this.staff.set(email);
    this.editing.set(false);
  }
  protected edit(task?: JournalTask): void {
    if (!this.canLeave()) return;
    this.task = task
      ? structuredClone(task)
      : this.portal.newTask(this.route.snapshot.queryParamMap.get('client') ?? '', this.staff());
    this.clean = JSON.stringify(this.task);
    this.editing.set(true);
    this.error.set('');
  }
  protected save(resolve = false): void {
    if (this.uploading()) return;
    const next = { ...this.task, status: resolve ? ('Resolved' as const) : this.task.status };
    const error = this.portal.saveTask(next);
    this.error.set(error ?? '');
    if (!error) {
      this.staff.set(next.owner);
      this.editing.set(false);
      this.notice.set(resolve ? 'Task marked as resolved.' : 'Task updates saved.');
    }
  }
  protected cancel(): void {
    if (this.canLeave()) this.editing.set(false);
  }
  canLeave(): boolean {
    return (
      (!this.uploading() && (!this.editing() || JSON.stringify(this.task) === this.clean)) ||
      window.confirm('Discard unsaved task changes?')
    );
  }
  protected initials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('');
  }
}
