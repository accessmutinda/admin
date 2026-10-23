import {
  Component,
  computed,
  effect,
  inject,
  signal,
  DestroyRef,
  NgZone,
  HostListener,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSelectModule, MAT_SELECT_CONFIG } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { FamilyDrafts } from './family-drafts.service';
import { familyMedicationStatus, upcomingFamilyVisit } from './family-portal.models';
import { A11yModule } from '@angular/cdk/a11y';
import { BreakpointObserver } from '@angular/cdk/layout';
import { AuthService } from '../../../core/auth/auth.service';
import { CareService } from './care.service';
import { age, csv, ukStamp, FAMILY_UPDATE_CATEGORIES } from './care.models';
import { londonDate, addDays } from '../rota/rota.models';

@Component({
  selector: 'cv-family-portal',
  imports: [DatePipe, FormsModule, RouterLink, A11yModule, MatSelectModule, CvSelect],
  providers: [{ provide: MAT_SELECT_CONFIG, useValue: { overlayPanelClass: 'cv-select-overlay' } }],
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
  protected readonly care = inject(CareService);
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
  private readonly drafts = inject(FamilyDrafts);
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
            this.care.store.companyId(),
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
  protected readonly choices = computed(() =>
    this.care.clients().flatMap((c) => {
      const administrator = this.care.rota.can('manage')
        ? [
            {
              clientId: c.id,
              accessId: this.care.familyPreviewAccessId(c.id),
              name: c.name,
              contact: 'Full administrator access',
              preview: true,
            },
          ]
        : [];
      return [
        ...administrator,
        ...(c.file?.familyAccess ?? []).flatMap((a) => {
          const preview = this.care.rota.can('manage');
          return this.care.familyRecord(c.id, a.id, preview)
            ? [{ clientId: c.id, accessId: a.id, name: c.name, contact: a.name, preview }]
            : [];
        }),
      ];
    }),
  );
  protected readonly selected = computed(() => {
    const clientId = this.params().get('clientId');
    return clientId
      ? { clientId, accessId: this.params().get('accessId') ?? '' }
      : this.choices()[0];
  });
  protected readonly preview = computed(
    () =>
      this.care.rota.can('manage') &&
      (this.query().get('preview') === '1' || !this.params().get('clientId')),
  );
  protected readonly fullPreview = computed(() => {
    const selected = this.selected();
    return (
      this.preview() &&
      !!selected &&
      selected.accessId === this.care.familyPreviewAccessId(selected.clientId)
    );
  });
  protected readonly record = computed(() => {
    const s = this.selected();
    return s ? this.care.familyRecord(s.clientId, s.accessId, this.preview()) : null;
  });
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
    if (key) this.draftStored.set(this.drafts.save(key, text));
  }
  @HostListener('window:beforeunload', ['$event'])
  protected beforeUnload(event: BeforeUnloadEvent): void {
    if (this.message && !this.draftStored()) {
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
  protected send(): void {
    if (this.preview()) return;
    const s = this.selected();
    if (!s) return;
    const error = this.care.message(
      s.clientId,
      this.care.store.companyId(),
      s.accessId,
      this.message,
      true,
    );
    this.error.set(error ?? '');
    if (!error) {
      this.updateDraft('');
      this.notice.set('Message saved on this device. External delivery is not configured.');
    }
  }
  protected downloadDocument(id: string): void {
    const document = this.record()?.documents?.find((d) => d.id === id);
    if (
      !document ||
      !/^data:(application\/pdf|application\/vnd.openxmlformats-officedocument.wordprocessingml.document);base64,/.test(
        document.data,
      )
    )
      return;
    const anchor = window.document.createElement('a');
    anchor.href = document.data;
    anchor.download = document.name;
    anchor.click();
  }
  protected exportVisits(): void {
    if (!this.record()?.visits) return;
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
  }
  constructor() {
    const timer = inject(NgZone).runOutsideAngular(() =>
      setInterval(() => this.now.set(Date.now()), 30000),
    );
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
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
      this.message = key ? this.drafts.read(key) : '';
      this.draftStored.set(key ? this.drafts.save(key, this.message) : true);
      this.error.set('');
      this.notice.set('');
    });
  }
  protected signOut(): void {
    this.auth.signOut();
    void this.router.navigateByUrl('/auth/sign-in');
  }
}
