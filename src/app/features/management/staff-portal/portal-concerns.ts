import { CompanyDatePipe } from '../../../shared/pipes/company-date.pipe';
import { Component, computed, inject, signal, effect, untracked, DestroyRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { StaffConcernsApi, ConnectedConcern } from './staff-concerns-api.service';
import { CONCERN_STATUSES, PortalConcern } from './portal.models';
import { JournalAttachment } from '../journal/journal.models';
import { PortalEvidence } from './portal-evidence';
@Component({
  selector: 'cv-portal-concerns',
  imports: [CompanyDatePipe, DatePipe, FormsModule, RouterLink, MatSelectModule, CvSelect, PortalEvidence],
  templateUrl: './portal-concerns.html',
  styleUrls: ['./portal-ui.css', './portal-forms.css', './portal-concerns.css'],
})
export class PortalConcerns {
  protected readonly portal = inject(StaffConcernsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  protected get id(): string {
    return this.params().get('concernId') ?? '';
  }
  protected readonly current = computed(() => this.portal.concerns().find((c) => c.id === this.id));
  private readonly visibleId = computed(() => this.current()?.id ?? '');
  protected readonly tab = signal('Investigation workflow');
  protected readonly query = signal('');
  protected readonly status = signal('All');
  protected readonly editing = signal(!!this.id);
  protected readonly detailLoading = signal(!!this.id);
  protected readonly uploading = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly statuses = CONCERN_STATUSES;
  protected draft: ConnectedConcern = this.current()
    ? structuredClone(this.current()!)
    : this.portal.newConcern();
  private clean = JSON.stringify(this.draft);
  protected comment = '';
  protected commentFiles: JournalAttachment[] = [];
  protected readonly commentFilter = signal('All');
  protected readonly comments = computed(() => {
    const c = this.current();
    if (!c) return [];
    const updates = (c.history ?? []).map((h, i) => ({
      id: 'stage-' + i,
      author: h.actor,
      text: 'Status changed to ' + h.status,
      at: h.at,
      kind: 'Update' as const,
      attachments: [] as JournalAttachment[],
    }));
    return [...c.notes, ...updates]
      .filter(
        (n) =>
          this.commentFilter() === 'All' ||
          (n.kind ?? 'Note') === (this.commentFilter() === 'Notes' ? 'Note' : 'Update'),
      )
      .sort((a, b) => b.at.localeCompare(a.at));
  });
  protected stageRecord(status: string) {
    return this.current()
      ?.history?.filter((h) => h.status === status)
      .at(-1);
  }
  protected stageComplete(status: string): boolean {
    return !!this.stageRecord(status);
  }
  protected stageText(status: string): string {
    return status === 'Escalated' && !this.stageRecord(status) ? 'Not escalated' : 'Pending';
  }
  protected readonly reviewCount = computed(
    () => this.portal.openConcerns().filter((c) => c.assignedTo === this.portal.email()).length,
  );

  protected readonly concerns = computed(() =>
    this.portal
      .concerns()
      .filter(
        (c) =>
          (this.status() === 'All' || c.status === this.status()) &&
          (!this.query() ||
            [c.title, c.reference, c.description].some((v) =>
              v.toLowerCase().includes(this.query().toLowerCase()),
            )),
      ),
  );
  protected readonly investigated = computed(
    () => this.portal.concerns().filter((c) => c.status === 'Under investigation').length,
  );
  protected readonly resolved = computed(
    () =>
      this.portal.concerns().filter((c) => {
        if (!['Resolved', 'Closed'].includes(c.status)) return false;
        const at = c.history?.filter((h) => h.status === 'Resolved').at(-1)?.at;
        if (!at) return false;
        const parts = new Intl.DateTimeFormat('en-CA', {
          timeZone: this.portal.context()?.timezone ?? 'UTC',
          year: 'numeric',
          month: '2-digit',
        }).formatToParts(new Date(at));
        return (
          parts.find((p) => p.type === 'year')?.value +
            '-' +
            parts.find((p) => p.type === 'month')?.value ===
          this.portal.today.slice(0, 7)
        );
      }).length,
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
  protected readonly uploadEvidence = (file: File) => this.portal.upload(file);
  protected readonly downloadEvidence = (file: JournalAttachment) => this.portal.download(file);
  private generation = 0;
  constructor() {
    this.portal.start();
    inject(DestroyRef).onDestroy(() => {
      this.generation++;
      this.portal.stop();
    });
    effect(() => {
      const ready = this.portal.staffReady() && this.portal.ready();
      const id = this.id;
      this.visibleId();
      this.params();
      untracked(() => {
        const generation = ++this.generation;
        this.detailLoading.set(ready && !!id);
        this.editing.set(false);
        this.comment = '';
        this.commentFiles = [];
        this.error.set('');
        this.notice.set('');
        this.draft = this.portal.newConcern();
        this.clean = JSON.stringify(this.draft);
        if (ready && id) void this.open(id, generation);
      });
    });
  }
  private async open(id: string, generation: number) {
    try {
      const row = await this.portal.detail(id);
      if (generation !== this.generation || id !== this.id) return;
      this.draft = structuredClone(row);
      this.clean = JSON.stringify(this.draft);
      this.editing.set(true);
      await this.portal.loadAudit(id);
    } catch (error) {
      if (generation === this.generation)
        this.error.set(error instanceof Error ? error.message : 'This concern is unavailable.');
    } finally {
      if (generation === this.generation) this.detailLoading.set(false);
    }
  }
  protected canManage() {
    return !!this.current()?.can_edit;
  }
  protected canEdit() {
    return this.id
      ? this.canManage() && this.current()?.status !== 'Closed'
      : !!this.portal.capabilities()['can_create'];
  }
  protected canNote() {
    return !!this.current()?.can_note;
  }
  protected async save(): Promise<void> {
    if (this.detailLoading() || this.uploading() || this.portal.busy()) return;
    const generation = this.generation,
      draft = this.draft;
    const error = await this.portal.saveConcern(draft);
    if (generation !== this.generation || draft !== this.draft) return;
    this.error.set(error ?? '');
    if (!error) {
      this.clean = JSON.stringify(this.draft);
      if (!this.id) {
        this.editing.set(false);
        void this.router.navigate(['/staff-portal/concerns', this.draft.id]);
      } else this.notice.set('Investigation updates saved.');
    }
  }
  protected async addNote(): Promise<void> {
    if (this.detailLoading() || this.uploading() || this.portal.busy()) return;
    const generation = this.generation;
    const error = await this.portal.addNote(
      this.id,
      this.comment,
      this.commentFiles,
      this.draft.etag,
    );
    if (generation !== this.generation) return;
    this.error.set(error ?? '');
    if (!error) {
      this.comment = '';
      this.commentFiles = [];
      const row = this.current()!;
      const changed = {
        notes: structuredClone(row.notes),
        history: structuredClone(row.history),
        etag: row.etag,
        version: row.version,
      };
      Object.assign(this.draft, changed);
      this.clean = JSON.stringify({ ...JSON.parse(this.clean), ...changed });
      this.notice.set('Investigation note added.');
    }
  }
  protected cancel(): void {
    if (this.canLeave()) this.editing.set(false);
  }
  canLeave(): boolean {
    if (this.uploading() || this.portal.busy()) return false;
    return (
      (!this.uploading() &&
        (!this.editing() || JSON.stringify(this.draft) === this.clean) &&
        !this.comment.trim() &&
        !this.commentFiles.length) ||
      window.confirm('Discard unsaved investigation changes?')
    );
  }
}
