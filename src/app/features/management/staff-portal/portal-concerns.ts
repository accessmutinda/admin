import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { PortalService } from './portal.service';
import { CONCERN_STATUSES, PortalConcern } from './portal.models';
import { PortalEvidence } from './portal-evidence';
@Component({
  selector: 'cv-portal-concerns',
  imports: [DatePipe, FormsModule, RouterLink, MatSelectModule, CvSelect, PortalEvidence],
  templateUrl: './portal-concerns.html',
  styleUrls: ['./portal-ui.css', './portal-forms.css', './portal-concerns.css'],
})
export class PortalConcerns {
  protected readonly portal = inject(PortalService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly id = this.route.snapshot.paramMap.get('concernId') ?? '';
  protected readonly current = computed(() => this.portal.concerns().find((c) => c.id === this.id));
  protected readonly tab = signal('Investigation workflow');
  protected readonly query = signal('');
  protected readonly status = signal('All');
  protected readonly editing = signal(!!this.id);
  protected readonly uploading = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly statuses = CONCERN_STATUSES;
  protected draft = this.current() ? structuredClone(this.current()!) : this.portal.newConcern();
  private clean = JSON.stringify(this.draft);
  protected comment = '';
  protected readonly concerns = computed(() =>
    this.portal
      .concerns()
      .filter(
        (c) =>
          (this.status() === 'All' || c.status === this.status()) &&
          (!this.query() ||
            [c.title, c.reference, c.description].some((v) =>
              v.toLowerCase().includes(this.query().toLowerCase()),
            )) &&
          (!this.route.snapshot.queryParamMap.get('staff') ||
            c.staffEmail === this.route.snapshot.queryParamMap.get('staff')),
      ),
  );
  protected readonly investigated = computed(
    () => this.portal.concerns().filter((c) => c.status === 'Under investigation').length,
  );
  protected readonly resolved = computed(
    () => this.portal.concerns().filter((c) => ['Resolved', 'Closed'].includes(c.status)).length,
  );
  protected get completed(): number {
    return this.draft.checklist.filter((c) => c.done).length;
  }
  protected get progress(): number {
    return Math.round((this.completed / Math.max(1, this.draft.checklist.length)) * 100);
  }
  protected get stage(): number {
    return this.statuses.indexOf(this.draft.status);
  }
  protected readonly audit = computed(() =>
    this.portal.events().filter((e) => e.entityId === this.id),
  );
  protected create(): void {
    if (!this.canLeave()) return;
    this.draft = this.portal.newConcern();
    this.clean = JSON.stringify(this.draft);
    this.editing.set(true);
    this.error.set('');
  }
  protected save(): void {
    if (this.uploading()) return;
    const error = this.portal.saveConcern(this.draft);
    this.error.set(error ?? '');
    if (!error) {
      this.clean = JSON.stringify(this.draft);
      if (!this.id) {
        this.editing.set(false);
        void this.router.navigate(['/staff-portal/concerns', this.draft.id]);
      } else {
        this.draft = structuredClone(this.current()!);
        this.clean = JSON.stringify(this.draft);
        this.notice.set('Investigation updates saved.');
      }
    }
  }
  protected addNote(): void {
    const error = this.portal.addNote(this.id, this.comment);
    this.error.set(error ?? '');
    if (!error) {
      this.comment = '';
      this.draft.notes = structuredClone(this.current()?.notes ?? []);
      const clean = JSON.parse(this.clean);
      clean.notes = this.draft.notes;
      this.clean = JSON.stringify(clean);
      this.notice.set('Investigation note added.');
    }
  }
  protected cancel(): void {
    if (this.canLeave()) this.editing.set(false);
  }
  canLeave(): boolean {
    return (
      (!this.uploading() &&
        (!this.editing() || JSON.stringify(this.draft) === this.clean) &&
        !this.comment.trim()) ||
      window.confirm('Discard unsaved investigation changes?')
    );
  }
}
