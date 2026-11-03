import { visibleWorkspaceTabCount } from './workspace-tab-overflow';
import {
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
  ElementRef,
  afterNextRender,
  DestroyRef,
  HostListener,
  ChangeDetectorRef,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RotaClient } from '../rota/rota.models';
import { RotaService } from '../rota/rota.service';
import { age } from './care.models';
import { emptyClientFile } from '../clients/client-file.models';
@Component({
  selector: 'cv-care-header',
  imports: [DatePipe, RouterLink],
  templateUrl: './care-header.html',
  styleUrls: [
    './service-user-spacing.css',
    './care-shared.css',
    './care-controls.css',
    '../clients/client-profile-overview.css',
    '../clients/client-profile-responsive.css',
    './care-profile-header.css',
    './workspace-tab-overflow.css',
  ],
})
export class CareHeader {
  protected readonly embeddedInCarePlan =
    inject(ActivatedRoute).snapshot.data?.['carePlanWorkspace'] === true;
  readonly client = input.required<RotaClient>();
  readonly active = input('overview');
  readonly breadcrumb = input(true);
  readonly local = input(false);
  readonly disabled = input(false);
  readonly edit = output<void>();
  readonly sectionChange = output<string>();
  protected readonly service = inject(RotaService);
  private readonly router = inject(Router);
  protected readonly age = age;
  protected readonly file = computed(() => this.client().file ?? emptyClientFile());
  protected readonly calls = computed(() =>
    this.service.data().calls.filter((c) => c.clientId === this.client().id && c.active),
  );
  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((n) => n[0])
      .join('');
  }
  protected editProfile(): void {
    if (!this.service.can('manage') || this.disabled()) return;
    if (this.local()) this.edit.emit();
    else
      void this.router.navigate(['/manage/clients', this.client().id], {
        queryParams: { edit: 'profile' },
      });
  }
  protected printProfile(): void {
    if (this.service.can('export')) window.print();
  }
  protected select(section: string): void {
    if (this.disabled()) return;
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
  protected readonly tabs = [
    { label: 'Client Journal', path: 'journal' },
    { label: 'Professional Communications', path: 'communications' },
    { label: 'Medication & MAR', path: 'medication' },
    { label: 'Visits & Allocation', path: 'visits' },
    { label: 'Visit Notes', path: 'visit-notes' },
    { label: 'Documents', path: 'documents' },
    { label: 'Incidents & Complaints', path: 'incidents' },
    { label: 'Reviews & Feedback', path: 'feedback' },
    { label: 'Contacts', path: 'contacts' },
    { label: 'Family Portal', path: 'family' },
    { label: 'Audit Trail', path: 'audit' },
  ];
  protected readonly visibleTabCount = signal(this.tabs.length);
  protected readonly overflowTabs = computed(() => this.tabs.slice(this.visibleTabCount()));
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
  protected readonly profileSignals = computed(() => {
    const file = this.file();
    const diagnoses = [
      file.sections['diagnoses']?.['primary'],
      ...(file.entries['diagnoses'] ?? []).filter((e) => e.status === 'Active').map((e) => e.name),
    ].filter(Boolean);
    const conditions = [...new Set([...diagnoses, ...(this.client()?.riskFlags ?? [])])];
    const kin =
      file.contacts?.find((c) => c.nextOfKin)?.name || this.client()?.representative?.name;
    return [
      ...conditions.slice(0, 2).map((label) => ({ label, icon: 'neurology', tone: 'red' })),
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
        label:
          'Time-sensitive calls: ' +
          (this.calls().some((c) => c.timeSensitive)
            ? 'Yes'
            : this.calls().length
              ? 'No'
              : 'Not recorded'),
        icon: 'schedule',
        tone: this.calls().some((c) => c.timeSensitive) ? 'red' : 'neutral',
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
}
