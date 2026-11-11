import { CompanyAccessService } from '../../../core/access/company-access.service';
import {
  Component,
  computed,
  effect,
  inject,
  signal,
  DestroyRef,
  NgZone,
  HostListener,
  untracked,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSelectModule, MAT_SELECT_CONFIG } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { familyMedicationStatus, upcomingFamilyVisit } from './family-portal.models';
import { A11yModule } from '@angular/cdk/a11y';
import { BreakpointObserver } from '@angular/cdk/layout';
import { AuthService } from '../../../core/auth/auth.service';
import { FamilySharingApi } from './family-sharing-api.service';
import { age, csv, ukStamp, FAMILY_UPDATE_CATEGORIES } from './care.models';
import { londonDate, addDays } from '../rota/rota.models';

@Component({
  selector: 'cv-family-portal',
  imports: [DatePipe, FormsModule, RouterLink, A11yModule, MatSelectModule, CvSelect],
  providers: [
    FamilySharingApi,
    { provide: MAT_SELECT_CONFIG, useValue: { overlayPanelClass: 'cv-select-overlay' } },
  ],
  templateUrl: './family-portal.html',
  styleUrls: [
    './family-shell.css',
    './family-portal.css',
    './family-pages.css',
    './family-records.css',
    './family-sharing.css',
  ],
  host: { '(document:keydown.escape)': 'menuOpen.set(false)' },
})
export class FamilyPortal {
  protected readonly api = inject(FamilySharingApi);
  protected readonly sending = signal(false);
  private destroyed = false;
  private refreshingMessages = false;
  protected readonly companyAccess = inject(CompanyAccessService);
  protected readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly query = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly mobile = toSignal(inject(BreakpointObserver).observe('(max-width: 1023px)'));
  protected readonly menuOpen = signal(false);
  protected readonly age = age;
  protected readonly ukStamp = ukStamp;
  private readonly drafts = new Map<string, string>();
  protected readonly now = signal(Date.now());
  protected get today(): string {
    return londonDate(new Date(this.now()));
  }
  protected readonly updateCategories = FAMILY_UPDATE_CATEGORIES;
  protected noteCategory = 'All updates';
  protected notePeriod = 'all';
  protected carer = '';
  protected readonly draftStored = signal(true);
  private readonly draftKey = computed(() => {
    const selected = this.selected();
    return !this.preview() && this.record()?.access.scopes.includes('Messages') && selected
      ? 'cv_family_draft:' +
          JSON.stringify([
            this.auth.currentUser()?.id,
            this.api.records.companyId(),
            selected.clientId,
            selected.accessId,
          ])
      : null;
  });
  protected readonly links = [
    { path: 'overview', label: 'Overview', icon: 'home', scope: '' },
    { path: 'visits', label: 'Visit schedule', icon: 'calendar_month', scope: 'Visits' },
    { path: 'care-plan', label: 'Care plan', icon: 'assignment', scope: 'Care plan' },
    { path: 'notes', label: 'Daily notes', icon: 'description', scope: 'Notes' },
    { path: 'medication', label: 'Medication', icon: 'pill', scope: 'Medication' },
    { path: 'documents', label: 'Documents', icon: 'folder', scope: 'Documents' },
    { path: 'messages', label: 'Messages', icon: 'forum', scope: 'Messages' },
    { path: 'photos', label: 'Photos & wellbeing', icon: 'image', scope: 'Photos' },
    { path: 'invoices', label: 'Invoices', icon: 'receipt_long', scope: 'Invoices' },
    { path: 'permissions', label: 'Access & permissions', icon: 'verified_user', scope: '' },
  ];
  protected readonly page = computed(() => this.params().get('page') ?? 'overview');
  protected readonly heading = computed(
    () => this.links.find((l) => l.path === this.page())?.label ?? 'Help & support',
  );
  protected readonly choices = this.api.choices;
  protected readonly selected = computed(() => {
    const clientId = this.params().get('clientId');
    return clientId
      ? { clientId, accessId: this.params().get('accessId') ?? '' }
      : this.choices()[0];
  });
  protected readonly preview = computed(
    () =>
      this.query().get('preview') === '1' ||
      (!this.params().get('clientId') &&
        this.api.records.allowed() &&
        this.api.records.access.can('care', 'family', 'read')),
  );
  protected readonly fullPreview = computed(() => false);
  protected readonly record = this.api.shared;
  protected readonly allowed = computed(() => {
    const scope = this.links.find((l) => l.path === this.page())?.scope;
    return !scope || this.scopeAllowed(scope);
  });
  protected readonly latestUpdate = computed(
    () =>
      [...(this.record()?.updates ?? [])].sort((a, b) =>
        (b.date + b.at).localeCompare(a.date + a.at),
      )[0],
  );
  protected readonly wellbeingUpdate = computed(
    () =>
      [...(this.record()?.updates ?? [])]
        .filter((u) => u.category === 'Wellbeing')
        .sort((a, b) => (b.date + b.at).localeCompare(a.date + a.at))[0],
  );
  protected readonly nextVisit = computed(
    () =>
      this.record()
        ?.visits?.filter((v) => upcomingFamilyVisit(v, this.now()))
        .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0],
  );
  protected search = '';
  protected visitPeriod = 'all';
  protected medicationTab = 'regular';
  protected message = '';
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly visits = computed(() => this.record()?.visits ?? []);
  protected filteredVisits() {
    return this.visits()
      .filter(
        (v) =>
          (this.visitPeriod === 'all' ||
            (this.visitPeriod === 'upcoming' ? upcomingFamilyVisit(v, this.now()) : v.completed)) &&
          `${v.callName} ${v.date} ${v.carers.join(' ')}`
            .toLowerCase()
            .includes(this.search.toLowerCase()) &&
          (!this.carer || v.carers.includes(this.carer)),
      )
      .sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
  }
  protected scopeAllowed(scope: string): boolean {
    return (
      !!this.record()?.access.scopes.some((s) => s === scope) &&
      (scope !== 'Photos' || !!this.record()?.photoConsent)
    );
  }
  protected permissionLabel(scope: string): string {
    if (!this.scopeAllowed(scope)) return 'Restricted';
    if (scope === 'Messages') return this.preview() ? 'Preview only' : 'Enabled';
    return 'Read only';
  }
  protected permissionDetail(scope: string): string {
    if (
      scope === 'Photos' &&
      this.record()?.access.scopes.includes('Photos') &&
      !this.record()?.photoConsent
    )
      return 'Photography consent is not enabled.';
    if (!this.scopeAllowed(scope)) return 'This information has not been shared with your account.';
    if (scope === 'Messages' && this.preview()) return 'Read-only preview; sending is disabled.';
    return this.fullPreview()
      ? 'Administrator preview of existing workspace records.'
      : 'Approved information shared by the care team.';
  }
  protected planDetail(key: string): string {
    const details = this.record()?.plan?.details;
    return details && key in details ? String(details[key as keyof typeof details] ?? '') : '';
  }
  protected medicationStatus(m: { start: string; end: string; discontinuedAt: string }): string {
    return familyMedicationStatus(m, this.today);
  }
  protected readonly currentMedication = computed(
    () => this.record()?.medication?.filter((m) => this.medicationStatus(m) === 'Current') ?? [],
  );
  protected readonly carers = computed(() =>
    [...new Set(this.visits().flatMap((v) => v.carers))].sort(),
  );
  protected filteredUpdates() {
    const from =
      this.notePeriod === 'all' ? '' : addDays(this.today, this.notePeriod === 'week' ? -6 : -29);
    return (this.record()?.updates ?? [])
      .filter(
        (u) =>
          (this.noteCategory === 'All updates' || u.category === this.noteCategory) &&
          (!from || (u.date >= from && u.date <= this.today)) &&
          `${u.text} ${u.by} ${u.category}`.toLowerCase().includes(this.search.toLowerCase()),
      )
      .sort((a, b) => (b.date + b.at).localeCompare(a.date + a.at));
  }
  protected filteredVisitNotes() {
    const from =
      this.notePeriod === 'all' ? '' : addDays(this.today, this.notePeriod === 'week' ? -6 : -29);
    return (this.record()?.visitNotes ?? [])
      .filter(
        (note) =>
          ['All updates', 'Visit notes'].includes(this.noteCategory) &&
          (!from || (note.date >= from && note.date <= this.today)) &&
          `${note.body} ${note.carer} ${note.visitType}`
            .toLowerCase()
            .includes(this.search.toLowerCase()),
      )
      .sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
  }
  protected legacyNoteVisible(): boolean {
    const note = this.record()?.notes;
    return (
      !!note &&
      this.notePeriod === 'all' &&
      ['All updates', 'General'].includes(this.noteCategory) &&
      note.toLowerCase().includes(this.search.toLowerCase())
    );
  }
  protected readonly administrations = computed(() =>
    (this.record()?.administrations ?? [])
      .filter((a) => a.date >= addDays(this.today, -6) && a.date <= this.today)
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)),
  );
  protected updateDraft(text: string): void {
    this.message = text;
    const key = this.draftKey();
    if (key) this.drafts.set(key, text);
    this.draftStored.set(!text);
  }
  @HostListener('window:beforeunload', ['$event'])
  protected beforeUnload(event: BeforeUnloadEvent): void {
    if (this.sending() || (this.message && !this.draftStored())) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
  protected medications() {
    return (this.record()?.medication ?? []).filter(
      (m) =>
        m.controlled === (this.medicationTab === 'controlled') &&
        `${m.name} ${m.strength}`.toLowerCase().includes(this.search.toLowerCase()),
    );
  }
  protected countMedication(controlled: boolean) {
    return this.record()?.medication?.filter((m) => m.controlled === controlled).length ?? 0;
  }
  protected href(page: string): string[] {
    const s = this.selected();
    return s ? ['/family', s.clientId, s.accessId, page] : ['/family-portal', page];
  }
  protected queryParams() {
    return this.preview() ? { preview: '1' } : {};
  }
  protected select(value: string): void {
    const choice = this.choices().find((c) => c.accessId === value);
    if (choice)
      void this.router.navigate(['/family', choice.clientId, choice.accessId, this.page()], {
        queryParams: choice.preview ? { preview: '1' } : {},
      });
    this.search = '';
  }
  protected async send(): Promise<void> {
    if (this.preview() || this.sending()) return;
    const selected = this.selected(),
      scope = this.api.scope();
    if (!selected) return;
    this.sending.set(true);
    this.error.set('');
    try {
      await this.api.send(selected.clientId, selected.accessId, this.message);
      if (
        this.destroyed ||
        scope !== this.api.scope() ||
        this.selected()?.accessId !== selected.accessId
      )
        return;
      this.updateDraft('');
      this.notice.set('Message sent inside CareVerity.');
      await this.api.loadShared(selected.clientId, selected.accessId, this.page(), false);
    } catch (e) {
      if (scope === this.api.scope() && !this.destroyed)
        this.error.set(e instanceof Error ? e.message : 'Message could not be sent.');
    } finally {
      if (!this.destroyed) this.sending.set(false);
    }
  }
  protected async downloadDocument(id: string): Promise<void> {
    const selected = this.selected(),
      scope = this.api.scope(),
      item = this.record()?.documents?.find((d) => d.id === id);
    if (!selected || !item) return;
    this.error.set('');
    try {
      const blob = await this.api.content(selected.clientId, selected.accessId, id, this.preview());
      if (
        this.destroyed ||
        scope !== this.api.scope() ||
        this.selected()?.accessId !== selected.accessId
      )
        return;
      const url = URL.createObjectURL(blob),
        anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = item.name;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      if (!this.destroyed && scope === this.api.scope())
        this.error.set(e instanceof Error ? e.message : 'The document is unavailable.');
    }
  }
  protected async exportVisits(): Promise<void> {
    const selected = this.selected(),
      scope = this.api.scope();
    if (!selected || !this.record()?.visits) return;
    try {
      const fresh = await this.api.exportVisits(
        selected.clientId,
        selected.accessId,
        this.preview(),
      );
      if (
        this.destroyed ||
        scope !== this.api.scope() ||
        this.selected()?.accessId !== selected.accessId
      )
        return;
      const previous = this.api.shared();
      if (previous) this.api.shared.set({ ...previous, visits: fresh });
      const content = csv([
        [
          'Date',
          'Visit',
          'Start',
          'End',
          'Carer',
          'Check-in (UK)',
          'Check-out (UK)',
          'Duration (minutes)',
          'Planned location',
          'Status',
        ],
        ...this.filteredVisits().map((v) => [
          v.date,
          v.callName,
          v.start,
          v.end,
          v.carers.join(', '),
          v.attendance.map((a) => (a.start ? ukStamp(a.start) : '')).join('; '),
          v.attendance.map((a) => (a.end ? ukStamp(a.end) : '')).join('; '),
          v.attendance.map((a) => a.duration ?? '').join('; '),
          v.location || 'Not recorded',
          v.completed ? 'Completed' : 'Scheduled / awaiting completion',
        ]),
      ]);
      const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'family-visits.csv';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      if (!this.destroyed && scope === this.api.scope())
        this.error.set(e instanceof Error ? e.message : 'Visits could not be exported.');
    }
  }
  constructor() {
    const timer = inject(NgZone).runOutsideAngular(() =>
      setInterval(() => {
        this.now.set(Date.now());
        const selected = this.selected();
        if (
          document.visibilityState === 'visible' &&
          this.page() === 'messages' &&
          selected &&
          !this.message &&
          !this.sending() &&
          !this.api.loading() &&
          !this.refreshingMessages
        ) {
          this.refreshingMessages = true;
          void this.api
            .refreshMessages(selected.clientId, selected.accessId, this.preview())
            .finally(() => {
              this.refreshingMessages = false;
            });
        }
      }, 30000),
    );
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      this.destroyed = true;
    });
    effect(() => {
      const scope = this.api.scope(),
        preview = this.preview();
      untracked(() => {
        void this.api.loadChoices(preview).catch((e) => {
          if (scope === this.api.scope())
            this.error.set(e instanceof Error ? e.message : 'Family access is unavailable.');
        });
      });
    });
    effect(() => {
      const selected = this.selected(),
        scope = this.api.scope(),
        page = this.page(),
        preview = this.preview();
      untracked(() => {
        if (selected) void this.api.loadShared(selected.clientId, selected.accessId, page, preview);
      });
    });
    let previousContext = '';
    effect(() => {
      const params = this.params();
      const key = this.draftKey();
      const context = JSON.stringify([
        params.get('clientId'),
        params.get('accessId'),
        this.page(),
        key,
      ]);
      if (context === previousContext) return;
      previousContext = context;
      this.search = '';
      this.carer = '';
      this.message = key ? (this.drafts.get(key) ?? '') : '';
      this.draftStored.set(!this.message);
      this.error.set('');
      this.notice.set('');
    });
  }
  protected signOut(): void {
    this.auth.signOut();
    void this.router.navigateByUrl('/auth/sign-in');
  }
}
