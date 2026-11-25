import { CompanyAccessService } from '../../../core/access/company-access.service';
import { AuthService } from '../../../core/auth/auth.service';
import { visibleWorkspaceTabCount } from './workspace-tab-overflow';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  LOCALE_ID,
  output,
  signal,
  untracked,
  viewChild,
  ElementRef,
  afterNextRender,
  DestroyRef,
  HostListener,
  ChangeDetectorRef,
} from '@angular/core';
import { formatDate, NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RotaClient } from '../rota/rota.models';
import { RotaService } from '../rota/rota.service';
import { age } from './care.models';
import { emptyClientFile } from '../clients/client-file.models';
import { CareContactsApi } from './care-contacts-api.service';
@Component({
  selector: 'cv-care-header',
  imports: [NgTemplateOutlet, RouterLink],
  templateUrl: './care-header.html',
  styleUrls: [
    './service-user-spacing.css',
    './care-shared.css',
    './care-controls.css',
    '../clients/client-profile-overview.css',
    '../clients/client-profile-responsive.css',
    './care-profile-header.css',
    './mar-profile-header.css',
    './workspace-tab-overflow.css',
  ],
})
export class CareHeader {
  protected readonly embeddedInCarePlan =
    inject(ActivatedRoute).snapshot.data?.['carePlanWorkspace'] === true;
  private readonly auth = inject(AuthService);
  private readonly locale = inject(LOCALE_ID);
  private readonly marContacts = inject(CareContactsApi, { optional: true });
  readonly client = input.required<RotaClient>();
  private readonly clientId = computed(() => this.client().id);
  private readonly marHeaderAvailable = computed(() => Boolean(this.client().overview?.mar_header));
  readonly active = input('overview');
  readonly breadcrumb = input(true);
  readonly local = input(false);
  readonly disabled = input(false);
  readonly edit = output<void>();
  readonly photo = output<void>();
  readonly printRequested = output<void>();
  readonly printBusy = input(false);
  readonly printManaged = input(false);
  readonly sectionChange = output<string>();
  protected readonly service = inject(RotaService);
  private readonly router = inject(Router);
  protected readonly age = (dob: string) => age(dob, this.client().overview?.local_date);
  protected readonly file = computed(() => this.client().file ?? emptyClientFile());
  protected readonly marUserRows = computed(() => {
    const client = this.client();
    const details = this.file().details;
    const dob = details['dob'];
    const years = this.age(dob);
    return [
      { label: 'Full Name', value: client.name, identity: true },
      {
        label: 'Date of Birth',
        value:
          years === null
            ? 'Not recorded'
            : `${formatDate(dob, 'dd MMM yyyy', this.locale)} (Age ${years})`,
      },
      { label: 'NHS Number', value: details['nhs'] || 'Not recorded' },
      { label: 'Service User ID', value: client.reference || 'Not recorded' },
      {
        label: 'Address',
        value: [client.address, client.postcode].filter(Boolean).join(', ') || 'Not recorded',
      },
      { label: 'Gender', value: details['gender'] || 'Not recorded' },
      { label: 'Living Arrangement', value: details['living'] || 'Not recorded' },
      { label: 'Care Priority', value: client.priority || 'Not recorded' },
      { label: 'Funding', value: client.funding || 'Not recorded' },
    ];
  });
  protected readonly calls = computed(() =>
    this.client().overview
      ? []
      : this.service.data().calls.filter((c) => c.clientId === this.client().id && c.active),
  );
  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((n) => n[0])
      .join('');
  }
  protected editProfile(): void {
    if (!this.canEdit() || this.disabled()) return;
    if (this.local()) this.edit.emit();
    else
      void this.router.navigate(['/manage/clients', this.client().id], {
        queryParams: { edit: 'profile' },
      });
  }
  protected editPhoto(): void {
    if (!this.canEdit() || this.disabled()) return;
    if (this.local()) this.photo.emit();
    else this.editProfile();
  }
  protected canEdit(): boolean {
    return this.access.can('care', 'records', 'edit');
  }
  protected canExport(): boolean {
    return (
      this.access.can('care', 'records', 'export') &&
      (!['journal', 'visit-notes'].includes(this.active()) ||
        this.access.can('care', 'recording', 'export')) &&
      (this.active() !== 'medication' || this.access.can('care', 'medication', 'export')) &&
      (this.active() !== 'communications' || this.access.can('care', 'communications', 'export')) &&
      (this.active() !== 'risks' || this.access.can('care', 'risks', 'export')) &&
      (this.active() !== 'documents' || this.access.can('care', 'documents', 'export')) &&
      (this.active() !== 'family' || this.access.can('care', 'family', 'export')) &&
      (!['incidents', 'feedback'].includes(this.active()) ||
        this.access.can('care', 'incidents', 'export')) &&
      (this.active() !== 'visits' || this.access.can('care', 'rostering', 'export'))
    );
  }
  protected printProfile(): void {
    if (!this.canExport() || this.printBusy()) return;
    if (this.local() || this.printManaged()) this.printRequested.emit();
    else window.print();
  }
  protected select(section: string): void {
    if (this.disabled()) return;
    if (section === 'plan' && !this.access.can('care', 'planning')) return;
    if (section === 'plan') {
      void this.router.navigate(['/manage/care-plans', this.client().id]);
      return;
    }
    if (this.local()) this.sectionChange.emit(section);
    else
      void this.router.navigate(['/manage/clients', this.client().id], {
        queryParams: section === 'plan' ? { section: 'plan' } : {},
      });
  }
  protected readonly access = inject(CompanyAccessService);
  private readonly allTabs = [
    { label: 'Client Journal', path: 'journal' },
    { label: 'Professional Communications', path: 'communications' },
    { label: 'Medication & MAR', path: 'medication' },
    { label: 'Risk Assessments', path: 'risks' },
    { label: 'Visits & Allocation', path: 'visits' },
    { label: 'Visit Notes', path: 'visit-notes' },
    { label: 'Documents', path: 'documents' },
    { label: 'Incidents & Complaints', path: 'incidents' },
    { label: 'Reviews & Feedback', path: 'feedback' },
    { label: 'Contacts', path: 'contacts' },
    { label: 'Family Portal', path: 'family' },
    { label: 'Audit Trail', path: 'audit' },
  ];
  protected readonly tabs = computed(() =>
    this.allTabs.filter((tab) =>
      this.access.canPath(`/manage/clients/${this.client().id}/${tab.path}`),
    ),
  );
  protected readonly visibleTabCount = signal(this.allTabs.length);
  protected readonly overflowTabs = computed(() => this.tabs().slice(this.visibleTabCount()));
  protected readonly overflowSelected = computed(() =>
    this.overflowTabs().some((tab) => tab.path === this.active()),
  );
  protected readonly overflowOpen = signal(false);
  private readonly workspaceNav = viewChild<ElementRef<HTMLElement>>('workspaceNav');
  private readonly tabSizer = viewChild<ElementRef<HTMLElement>>('tabSizer');
  private readonly moreButton = viewChild<ElementRef<HTMLButtonElement>>('moreButton');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly changes = inject(ChangeDetectorRef);
  constructor() {
    const destroyRef = inject(DestroyRef);
    effect(() => {
      const contacts = this.marContacts;
      if (!contacts || this.embeddedInCarePlan) return;
      const id = this.clientId();
      contacts.scope();
      if (this.marHeaderAvailable() || this.active() === 'contacts') return;
      untracked(() => {
        if (contacts.can('read')) void contacts.load(id);
      });
    });
    afterNextRender(() => {
      const nav = this.workspaceNav()?.nativeElement;
      if (!nav) return;
      let frame: number | undefined;
      let destroyed = false;
      const schedule = () => {
        if (!destroyed && frame === undefined)
          frame = requestAnimationFrame(() => {
            frame = undefined;
            this.updateOverflow();
          });
      };
      const observer =
        typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule);
      observer?.observe(nav);
      this.tabSizer()
        ?.nativeElement.querySelectorAll<HTMLElement>('.workspace-tab')
        .forEach((item) => observer?.observe(item));
      window.addEventListener('resize', schedule);
      document.fonts?.ready.then(schedule);
      this.updateOverflow();
      destroyRef.onDestroy(() => {
        destroyed = true;
        observer?.disconnect();
        window.removeEventListener('resize', schedule);
        if (frame !== undefined) cancelAnimationFrame(frame);
      });
    });
  }
  protected updateOverflow() {
    const nav = this.workspaceNav()?.nativeElement;
    const sizer = this.tabSizer()?.nativeElement;
    if (!nav || !sizer) return;
    const width = nav.clientWidth;
    const items = Array.from(sizer.querySelectorAll<HTMLElement>('[data-measure-tab]'));
    const moreWidth =
      sizer.querySelector<HTMLElement>('[data-measure-more]')?.getBoundingClientRect().width || 0;
    if (!width || !moreWidth || !items.length) return;
    const count =
      visibleWorkspaceTabCount(
        width,
        items.map((item) => item.getBoundingClientRect().width),
        moreWidth,
      ) - 1;
    if (count !== this.visibleTabCount()) {
      const hadFocus = this.workspaceNav()
        ?.nativeElement.querySelector('.workspace-overflow-menu')
        ?.contains(document.activeElement);
      this.visibleTabCount.set(count);
      this.overflowOpen.set(false);
      if (hadFocus) {
        this.changes.detectChanges();
        (
          this.moreButton()?.nativeElement ||
          nav.querySelector<HTMLElement>('.workspace-tab.selected')
        )?.focus();
      }
    }
  }
  protected toggleOverflow() {
    if (this.overflowOpen()) {
      this.overflowOpen.set(false);
      return;
    }
    this.openOverflow();
  }
  protected openOverflow(event?: Event) {
    event?.preventDefault();
    this.overflowOpen.set(true);
    this.changes.detectChanges();
    this.workspaceNav()
      ?.nativeElement.querySelector<HTMLElement>('.workspace-overflow-menu a')
      ?.focus();
  }
  protected overflowKey(event: KeyboardEvent) {
    const links = Array.from(
      this.workspaceNav()?.nativeElement.querySelectorAll<HTMLAnchorElement>(
        '.workspace-overflow-menu a',
      ) || [],
    );
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    let next: number;
    if (event.key === 'ArrowDown') next = (index + 1) % links.length;
    else if (event.key === 'ArrowUp') next = (index + links.length - 1) % links.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = links.length - 1;
    else return;
    event.preventDefault();
    links[next]?.focus();
  }
  @HostListener('document:click', ['$event'])
  protected dismissOverflow(event: MouseEvent) {
    if (!this.host.nativeElement.contains(event.target as Node)) this.overflowOpen.set(false);
    else if (!(event.target as HTMLElement).closest('.workspace-more'))
      this.overflowOpen.set(false);
  }
  @HostListener('document:keydown.escape')
  protected escapeOverflow() {
    if (!this.overflowOpen()) return;
    this.overflowOpen.set(false);
    this.moreButton()?.nativeElement.focus();
  }
  @HostListener('focusout', ['$event'])
  protected leaveOverflow(event: FocusEvent) {
    const more = this.workspaceNav()?.nativeElement.querySelector('.workspace-more');
    if (more?.contains(event.target as Node) && !more.contains(event.relatedTarget as Node))
      this.overflowOpen.set(false);
  }
  protected tabIcon(path: string) {
    return (
      (
        {
          journal: 'forum',
          communications: 'groups',
          medication: 'pill',
          risks: 'health_and_safety',
          visits: 'calendar_month',
          'visit-notes': 'clinical_notes',
          documents: 'description',
          incidents: 'report',
          feedback: 'reviews',
          audit: 'history',
          contacts: 'contacts',
          family: 'group',
        } as Record<string, string>
      )[path] || 'folder'
    );
  }
  private readonly diagnoses = computed(() => {
    const file = this.file();
    return [
      file.sections['diagnoses']?.['primary'],
      ...(file.entries['diagnoses'] ?? [])
        .filter((entry) => entry.status === 'Active')
        .map((entry) => entry.name),
    ].filter(Boolean);
  });
  private readonly profileConditions = computed(() => [
    ...new Set([...this.diagnoses(), ...(this.client().riskFlags ?? [])]),
  ]);
  private readonly profileContextSignals = computed(() => {
    const file = this.file();
    const mar = this.client().overview?.mar_header;
    const kin =
      mar?.next_of_kin ??
      (file.contacts?.find((c) => c.nextOfKin)?.name || this.client().representative?.name);
    const scheduledCalls = this.calls();
    const calls = mar
      ? mar.time_sensitive_calls
      : scheduledCalls.length
        ? scheduledCalls.some((call) => call.timeSensitive)
        : null;
    return [
      {
        label: 'Capacity: ' + (file.sections['capacity']?.['status'] || 'Not recorded'),
        icon: 'balance',
        tone: 'amber',
      },
      {
        label:
          'LPA: Health & Welfare' +
          (file.sections['capacity']?.['welfareLpa'] ? ' · Recorded' : ' · Not recorded'),
        icon: 'description',
        tone: file.sections['capacity']?.['welfareLpa'] ? 'green' : 'neutral',
      },
      {
        label:
          'LPA: Property & Finance' +
          (file.sections['capacity']?.['financeLpa'] ? ' · Recorded' : ' · Not recorded'),
        icon: 'description',
        tone: file.sections['capacity']?.['financeLpa'] ? 'green' : 'neutral',
      },
      {
        label: 'Time-sensitive calls: ' + (calls === null ? 'Not recorded' : calls ? 'Yes' : 'No'),
        icon: 'schedule',
        tone: calls ? 'red' : 'neutral',
      },
      {
        label:
          'Behaviour: ' +
          (file.sections['support']?.['behaviour'] ? 'Support recorded' : 'Not recorded'),
        icon: 'verified_user',
        tone: file.sections['support']?.['behaviour'] ? 'green' : 'neutral',
      },
      {
        label: 'Key safe: ' + (file.sections['access']?.['location'] ? 'Recorded' : 'Not recorded'),
        icon: 'key',
        tone: file.sections['access']?.['location'] ? 'green' : 'neutral',
      },
      { label: 'Next of kin: ' + (kin || 'Not recorded'), icon: 'group', tone: 'blue' },
    ];
  });
  protected readonly marSignals = computed(() => {
    const allergy = [
      ...new Set(
        [
          this.client().overview?.clinical.allergies,
          ...(this.file().entries['allergies'] ?? [])
            .filter((entry) => entry.status === 'Active')
            .map((entry) => [entry.name, entry.detail].filter(Boolean).join(' · ')),
        ]
          .map((value) => value?.trim())
          .filter((value): value is string => !!value),
      ),
    ].join('\n');
    return [
      {
        label: 'Allergy status: ' + (allergy || 'Not recorded'),
        icon: 'warning',
        tone: allergy ? 'red' : 'neutral',
      },
      ...this.profileContextSignals(),
    ];
  });
  protected readonly marClinicalRows = computed(() => {
    const client = this.client();
    const mar = client.overview?.mar_header;
    const escalation = client.overview?.clinical.emergency_escalation;
    const companyId = client.overview?.record.company_id || this.access.companyId();
    const provider =
      mar?.provider ?? this.auth.workspaces().find((workspace) => workspace.id === companyId)?.name;
    const contacts =
      this.marContacts
        ?.contacts()
        .filter(
          (contact) => contact.company_id === companyId && contact.service_user_id === client.id,
        ) ?? [];
    const gp =
      contacts.find((contact) => contact.primaryGp) ??
      contacts.find((contact) => contact.type === 'GP');
    const emergency = contacts.find((contact) => contact.type === 'Emergency');
    const emergencyDetails = (
      mar
        ? [mar.emergency_contact_name, mar.emergency_contact_phone, mar.emergency_contact_email]
        : [emergency?.name, emergency?.phone, emergency?.email]
    )
      .filter(Boolean)
      .join(' · ');
    const roleName = (role: string) =>
      contacts.find(
        (contact) =>
          contact.type === 'Professional' && contact.relationship.trim().toLowerCase() === role,
      )?.name;
    const unavailable =
      !mar && this.marContacts?.loading()
        ? 'Loading…'
        : !mar && this.marContacts?.error()
          ? 'Unavailable'
          : 'Not recorded';
    const conditions = [
      ...new Set(
        [
          ...this.profileConditions(),
          client.overview?.clinical.primary_diagnosis,
          client.overview?.clinical.other_conditions,
          ...(client.overview?.risks ?? []).map((risk) => risk.title),
        ]
          .map((value) => value?.trim())
          .filter(Boolean),
      ),
    ].join('\n');
    return [
      { label: 'Provider', value: provider || 'Not recorded' },
      {
        label: 'GP Practice',
        value: (mar?.gp_practice ?? gp?.name) || unavailable,
      },
      { label: 'GP Telephone', value: (mar?.gp_telephone ?? gp?.phone) || unavailable },
      {
        label: 'Emergency / Escalation',
        value: emergencyDetails || (escalation ? 'See escalation instructions' : unavailable),
      },
      {
        label: 'Care Coordinator',
        value: (mar?.care_coordinator ?? roleName('care coordinator')) || unavailable,
      },
      {
        label: 'Registered Manager',
        value: (mar?.registered_manager ?? roleName('registered manager')) || unavailable,
      },
      { label: 'Relevant Conditions & Risks', value: conditions || 'Not recorded' },
      ...(!(mar?.gp_practice ?? gp?.name) && this.file().details['gp']
        ? [{ label: 'Legacy GP notes', value: this.file().details['gp'] }]
        : []),
      ...(escalation === undefined
        ? []
        : [{ label: 'Escalation Instructions', value: escalation || 'Not recorded' }]),
    ];
  });
  protected readonly marPanels = computed(() => [
    {
      id: 'mar-service-user-details',
      title: 'Service User Details',
      icon: 'person',
      sectionClass: 'mar-profile-details',
      rows: this.marUserRows(),
    },
    {
      id: 'mar-provider-clinical',
      title: 'Provider & Clinical Information',
      icon: 'clinical_notes',
      sectionClass: 'mar-profile-provider',
      rows: this.marClinicalRows(),
    },
  ]);
}
