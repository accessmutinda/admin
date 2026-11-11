import {
  Component,
  ChangeDetectorRef,
  DestroyRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { A11yModule } from '@angular/cdk/a11y';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { ModuleDesign } from '../shared/module-design';
import { CareHeader } from './care-header';
import { CareEventsApi, EventKind } from './care-events-api.service';
import { CareEventRead, CareEventWrite } from './care-events.generated';
import { isPersonalCareIncident } from './care-plan-personal-care.models';
import { londonDate } from '../rota/rota.models';

@Component({
  selector: 'cv-care-events',
  imports: [
    FormsModule,
    CareHeader,
    RouterLink,
    A11yModule,
    MatSelectModule,
    CvSelect,
    ModuleDesign,
  ],
  providers: [CareEventsApi],
  host: { class: 'module-page operations-page events-page' },
  templateUrl: './care-events.html',
  styleUrls: [
    './service-user-spacing.css',
    './care-shared.css',
    './care-controls.css',
    './visit-notes.css',
    '../clients/service-user-dialogs.css',
    './care-events.css',
  ],
})
export class CareEvents {
  protected readonly api = inject(CareEventsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly query = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  private readonly data = toSignal(this.route.data, { initialValue: this.route.snapshot.data });
  protected readonly id = computed(() => this.params().get('id') || '');
  protected readonly page = computed(() =>
    this.data()['careEventSection'] === 'feedback' ? 'feedback' : 'incidents',
  );
  protected readonly collection = signal<EventKind>('incidents');
  protected readonly label = computed(() =>
    this.collection() === 'complaints'
      ? 'complaint'
      : this.collection() === 'feedback'
        ? 'feedback'
        : 'incident',
  );
  protected readonly client = computed(() =>
    this.api.can('read') && this.api.records.selected()?.id === this.id()
      ? this.api.records.selected()
      : null,
  );
  protected readonly personalContext = computed(
    () => this.query().get('related') === 'personal-care',
  );
  protected readonly search = signal('');
  protected readonly status = signal('');
  protected readonly level = signal('');
  protected readonly feedbackType = signal('');
  protected readonly feedbackTypes = ['Feedback', 'Review', 'Compliment', 'Suggestion', 'Concern'];
  protected readonly pageNumber = signal(1);
  protected readonly printRows = signal<CareEventRead[] | null>(null);
  protected readonly entries = computed(() => {
    const rows = (this.printRows() ?? (this.api.can('read') ? this.api.entries() : [])).filter(
      (row) => row.kind === this.collection(),
    );
    return this.personalContext() ? rows.filter(isPersonalCareIncident) : rows;
  });
  protected readonly filtered = computed(() => {
    const search = this.search().trim().toLowerCase();
    return this.entries().filter(
      (e) =>
        (!search || (e.name + ' ' + e.detail).toLowerCase().includes(search)) &&
        (!this.status() || e.status === this.status()) &&
        (!this.level() || e.level === this.level()) &&
        (!this.feedbackType() || e.feedbackType === this.feedbackType()),
    );
  });
  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.filtered().length / 8)));
  protected readonly currentPage = computed(() => Math.min(this.pageNumber(), this.pageCount()));
  protected readonly rows = computed(() =>
    this.printRows()
      ? this.filtered()
      : this.filtered().slice((this.currentPage() - 1) * 8, this.currentPage() * 8),
  );
  protected readonly metrics = computed(() => {
    if (this.page() === 'feedback') {
      const rows = this.entries(),
        ratings = rows
          .filter((r) => r.feedbackType === 'Review' && r.rating != null)
          .map((r) => r.rating!);
      return [
        { label: 'Feedback received', value: rows.length, icon: 'forum', tone: 'blue' },
        {
          label: 'Open feedback',
          value: rows.filter((r) => r.status === 'Active').length,
          icon: 'pending_actions',
          tone: 'purple',
        },
        {
          label: 'Compliments',
          value: rows.filter((r) => r.feedbackType === 'Compliment').length,
          icon: 'favorite',
          tone: 'green',
        },
        {
          label: 'Average review rating',
          value: ratings.length
            ? (ratings.reduce((sum, v) => sum + v, 0) / ratings.length).toFixed(1) + ' / 5'
            : '—',
          icon: 'star',
          tone: 'orange',
        },
      ];
    }
    return [
      { label: 'Total records', value: this.entries().length, icon: 'description', tone: 'blue' },
      {
        label: 'Active',
        value: this.entries().filter((e) => e.status === 'Active').length,
        icon: 'pending_actions',
        tone: 'purple',
      },
      {
        label: 'High risk · active',
        value: this.entries().filter((e) => e.status === 'Active' && e.level === 'High').length,
        icon: 'priority_high',
        tone: 'orange',
      },
      {
        label: 'Completed',
        value: this.entries().filter((e) => e.status === 'Completed').length,
        icon: 'task_alt',
        tone: 'green',
      },
    ];
  });
  protected readonly mode = signal<'' | 'edit' | 'view' | 'history' | 'remove'>('');
  protected readonly selected = signal<CareEventRead | null>(null);
  protected readonly history = signal<CareEventRead[]>([]);
  protected readonly busy = signal(false);
  protected readonly printing = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly fieldErrors = signal<Record<string, string[]>>({});
  protected draft = this.blank();
  protected reason = '';
  private baseline = '';
  private request = 0;
  private routeRequest = '';
  private destroyed = false;
  private owner: { id: string; scope: string; kind: EventKind } | null = null;
  private blank() {
    return {
      name: '',
      detail: '',
      date: londonDate(),
      level: 'Low' as CareEventWrite['level'],
      status: 'Active' as CareEventWrite['status'],
      feedbackType: 'Feedback' as NonNullable<CareEventWrite['feedbackType']>,
      rating: null as number | null,
      receivedFrom: '',
    };
  }
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.request++;
      this.reset();
    });
    effect(() => {
      const id = this.id(),
        scope = this.api.scope(),
        page = this.page();
      untracked(() => {
        this.request++;
        this.reset();
        this.routeRequest = '';
        this.error.set('');
        this.notice.set('');
        this.printRows.set(null);
        this.printing.set(false);
        this.collection.set(page === 'feedback' ? 'feedback' : 'incidents');
        this.clearFilters();
        if (id && this.api.can('read')) void this.api.records.detail(id);
      });
    });
    effect(() => {
      const id = this.id(),
        scope = this.api.scope(),
        kind = this.collection();
      untracked(() => {
        if (id && this.api.can('read')) void this.api.load(id, kind);
      });
    });
    effect(() => {
      if (this.api.denied())
        untracked(() => {
          this.request++;
          this.reset();
          this.printRows.set(null);
          this.notice.set('');
        });
    });
    effect(() => {
      const query = this.query(),
        id = this.id(),
        scope = this.api.scope(),
        client = this.client(),
        loading = this.api.loading();
      if (!client || loading) return;
      const create = query.get('create'),
        entry = query.get('entry');
      if (!create && !entry) {
        this.routeRequest = '';
        return;
      }
      const key = scope + id + ':' + create + ':' + entry;
      if (this.routeRequest === key) return;
      this.routeRequest = key;
      untracked(() => {
        if (entry) void this.openId(entry);
        else if (
          (this.page() === 'incidents' && ['incident', 'complaint'].includes(create || '')) ||
          (this.page() === 'feedback' && create === 'compliment')
        ) {
          const kind: EventKind =
            create === 'complaint'
              ? 'complaints'
              : create === 'compliment'
                ? 'feedback'
                : 'incidents';
          this.collection.set(kind);
          void this.open();
        }
      });
    });
  }
  protected clearFilters() {
    this.search.set('');
    this.status.set('');
    this.level.set('');
    this.feedbackType.set('');
    this.pageNumber.set(1);
  }
  protected choose(kind: EventKind) {
    if (this.canLeave()) {
      this.request++;
      this.reset();
      this.collection.set(kind);
      this.clearFilters();
      this.error.set('');
      this.notice.set('');
    }
  }
  private reset() {
    this.mode.set('');
    this.selected.set(null);
    this.history.set([]);
    this.owner = null;
    this.draft = this.blank();
    this.reason = '';
    this.baseline = '';
    this.busy.set(false);
    this.fieldErrors.set({});
  }
  private draftState() {
    return JSON.stringify([this.draft, this.reason]);
  }
  canLeave() {
    return (
      !this.busy() &&
      !this.printing() &&
      (!['edit', 'remove'].includes(this.mode()) ||
        this.draftState() === this.baseline ||
        window.confirm('Discard unsaved record changes?'))
    );
  }
  protected close() {
    if (this.canLeave()) {
      this.request++;
      this.reset();
      this.error.set('');
    }
  }
  protected async openId(id: string) {
    await this.open({ id } as CareEventRead, 'view');
  }
  protected async open(
    entry?: CareEventRead,
    mode: 'edit' | 'view' | 'history' | 'remove' = 'edit',
  ) {
    const action =
      mode === 'edit' ? (entry ? 'edit' : 'create') : mode === 'remove' ? 'archive' : 'read';
    if (!this.api.can(action) || !this.canLeave()) return;
    const token = ++this.request,
      scope = this.api.scope(),
      id = this.id();
    this.error.set('');
    try {
      const row = entry ? await this.api.detail(id, entry.id) : null;
      const revisions = row && mode === 'history' ? await this.api.history(id, row.id) : [];
      if (
        this.destroyed ||
        token !== this.request ||
        scope !== this.api.scope() ||
        id !== this.id()
      )
        return;
      if (row && (this.page() === 'feedback') !== (row.kind === 'feedback'))
        throw Error('Open this record from its matching Service User category.');
      this.selected.set(row);
      this.history.set(revisions);
      this.owner = { id, scope, kind: row?.kind ?? this.collection() };
      this.draft = row
        ? {
            name: row.name,
            detail: row.detail,
            date: row.date,
            level: row.level,
            status: row.status,
            feedbackType: row.feedbackType ?? '',
            rating: row.rating ?? null,
            receivedFrom: row.receivedFrom ?? '',
          }
        : { ...this.blank(), date: this.api.today() || londonDate() };
      if (!row && this.page() === 'feedback' && this.query().get('create') === 'compliment')
        this.draft.feedbackType = 'Compliment';
      this.reason = '';
      this.fieldErrors.set({});
      this.baseline = this.draftState();
      this.mode.set(mode);
    } catch (e) {
      if (token === this.request && scope === this.api.scope())
        this.error.set(e instanceof Error ? e.message : 'The record could not be opened.');
    }
  }
  protected async save() {
    const owner = this.owner,
      row = this.selected();
    if (!owner || owner.id !== this.id() || owner.scope !== this.api.scope() || this.busy()) return;
    const removing = this.mode() === 'remove';
    if (!removing && (!this.draft.name.trim() || !this.draft.detail.trim() || !this.draft.date)) {
      this.fieldErrors.set(
        Object.fromEntries(
          ['name', 'detail', 'date']
            .filter((k) => !String(this.draft[k as keyof typeof this.draft]).trim())
            .map((k) => [k, ['This field is required.']]),
        ),
      );
      this.error.set('Enter a title, date and details.');
      return;
    }
    if ((removing || row) && !this.reason.trim()) {
      this.fieldErrors.set({ reason: ['Enter the reason for this change.'] });
      this.error.set('Enter a reason for this change.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.fieldErrors.set({});
    try {
      if (removing && row) await this.api.remove(owner.id, row, this.reason);
      else
        await this.api.save(
          owner.id,
          {
            name: this.draft.name,
            detail: this.draft.detail,
            date: this.draft.date,
            level: this.draft.level,
            status: this.draft.status,
            ...(owner.kind === 'feedback'
              ? {
                  feedbackType: this.draft.feedbackType,
                  rating: this.draft.rating,
                  receivedFrom: this.draft.receivedFrom,
                }
              : {}),
            kind: owner.kind,
            reason: row ? this.reason : 'Record service user details and follow-up',
          },
          row,
        );
      if (this.destroyed || owner !== this.owner || owner.scope !== this.api.scope()) return;
      this.reset();
      this.notice.set(
        removing ? 'Record removed from the active register. History retained.' : 'Record saved.',
      );
      await this.api.load(owner.id, this.collection());
    } catch (e) {
      if (owner === this.owner && owner.scope === this.api.scope()) {
        this.fieldErrors.set((e as { fieldErrors?: Record<string, string[]> }).fieldErrors ?? {});
        this.error.set(e instanceof Error ? e.message : 'The record could not be saved.');
      }
    } finally {
      if (owner === this.owner) this.busy.set(false);
    }
  }
  protected async print() {
    if (!this.api.can('export') || this.busy() || this.api.loading() || this.printing()) return;
    const scope = this.api.scope(),
      id = this.id();
    this.printing.set(true);
    this.error.set('');
    try {
      const rows = await this.api.load(id, this.collection(), true);
      if (this.api.error()) throw Error(this.api.error());
      if (
        this.destroyed ||
        scope !== this.api.scope() ||
        id !== this.id() ||
        !this.api.can('export')
      )
        return;
      this.printRows.set(rows);
      this.cdr.detectChanges();
      window.print();
    } catch (e) {
      if (scope === this.api.scope())
        this.error.set(e instanceof Error ? e.message : 'Printing is unavailable.');
    } finally {
      if (scope === this.api.scope()) {
        this.printRows.set(null);
        this.printing.set(false);
      }
    }
  }
  protected metricNote(label: string): string {
    if (this.page() === 'feedback' && label === 'Average review rating') {
      if (this.api.loading()) return 'Loading review ratings…';
      if (this.api.error()) return 'Review ratings unavailable';
      const count = this.entries().filter(
        (r) => r.feedbackType === 'Review' && r.rating != null,
      ).length;
      return 'Based on ' + count + ' rated review' + (count === 1 ? '' : 's');
    }
    return this.page() === 'feedback' ? 'All feedback · all dates' : 'Current category · all dates';
  }
  protected chooseFeedbackType(value: NonNullable<CareEventWrite['feedbackType']>) {
    this.draft.feedbackType = value;
    if (value !== 'Review') this.draft.rating = null;
  }
  protected ratingText(value: number | null | undefined): string {
    return value == null ? 'Not rated' : value + ' / 5';
  }
  protected calendarDate(value: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'UTC',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value + 'T12:00:00Z'));
  }
  protected dateTime(value: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }
  @HostListener('document:keydown.escape') escape() {
    if (this.mode()) this.close();
  }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent) {
    if (
      this.busy() ||
      this.printing() ||
      (['edit', 'remove'].includes(this.mode()) && this.draftState() !== this.baseline)
    ) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
