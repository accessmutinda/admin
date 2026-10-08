import {
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { Router } from '@angular/router';
import { A11yModule } from '@angular/cdk/a11y';
import { EcmService } from './ecm.service';
import { liveVisit, onBoardDate } from './ecm.models';
import { RISK_FLAGS, RiskFlag, RotaVisit, londonDate } from '../rota/rota.models';
import { ManagementStore } from '../shared/management.store';
import { AccessRequired } from '../shared/access-required';
import { Logo } from '../../../shared/ui/logo';

@Component({
  selector: 'cv-ecm-wallboard',
  imports: [FormsModule, MatSelectModule, CvSelect, A11yModule, AccessRequired, Logo],
  templateUrl: './ecm-wallboard.html',
})
export class EcmWallboard {
  protected readonly service = inject(EcmService);
  protected readonly store = inject(ManagementStore);
  private readonly router = inject(Router);
  protected readonly now = signal(Date.now());
  protected readonly refreshed = signal(Date.now());
  protected readonly filtersOpen = signal(false);
  protected readonly call = signal('');
  protected readonly status = signal('');
  protected readonly risk = signal('');
  protected readonly double = signal(false);
  protected readonly highOnly = signal(false);
  protected readonly view = signal('All visits');
  protected readonly page = signal(0);
  protected readonly paused = signal(false);
  protected readonly fullscreenActive = signal(!!document.fullscreenElement);
  protected readonly fullscreenError = signal('');
  protected readonly riskFlags = RISK_FLAGS;
  protected readonly views = [
    'All visits',
    'Late visits',
    'Missed visits',
    'Not checked in',
    'Still on duty',
    'Completed',
    'Manager action',
  ];
  protected readonly statuses = [
    'Scheduled',
    'Early',
    'In progress',
    'Running late',
    'Missed visit risk',
    'Missed visit',
    'Completed',
    'Timing unavailable',
  ];
  protected readonly all = computed(() =>
    this.service.rota.can('view')
      ? this.service.rota
          .data()
          .visits.filter(
            (v) => v.state === 'Published' && onBoardDate(v, londonDate(new Date(this.now()))),
          )
          .map((v) => ({ v, live: liveVisit(v, this.now(), this.service.data()) }))
          .sort((a, b) => a.live.rank - b.live.rank || a.v.start.localeCompare(b.v.start))
      : [],
  );
  protected readonly calls = computed(() =>
    [...new Set(this.all().map((r) => r.v.callName))].sort(),
  );
  protected readonly filtered = computed(() =>
    this.all().filter(
      ({ v, live }) =>
        (!this.call() || v.callName === this.call()) &&
        (!this.status() || live.status === this.status()) &&
        (!this.risk() || this.flags(v).includes(this.risk() as RiskFlag)) &&
        (!this.double() || v.carers === 2) &&
        (!this.highOnly() || this.isHigh(v)),
    ),
  );
  protected readonly rows = computed(() =>
    this.filtered().filter((r) => this.matches(r, this.view())),
  );
  protected readonly attention = computed(() =>
    this.rows().filter((r) => this.matches(r, 'Manager action')),
  );
  protected readonly totals = computed(() => {
    const rows = this.filtered();
    return [
      {
        label: 'Visits today',
        value: rows.length,
        tone: 'blue',
        icon: 'event_note',
        view: 'All visits',
      },
      {
        label: 'Running late',
        value: rows.filter((r) => r.live.status === 'Running late').length,
        tone: 'amber',
        icon: 'schedule',
        view: 'Late visits',
      },
      {
        label: 'Missed / at risk',
        value: rows.filter((r) => ['Missed visit', 'Missed visit risk'].includes(r.live.status))
          .length,
        tone: 'red',
        icon: 'warning',
        view: 'Missed visits',
      },
      {
        label: 'Not checked in',
        value: rows.filter((r) => this.matches(r, 'Not checked in')).length,
        tone: 'slate',
        icon: 'person_off',
        view: 'Not checked in',
      },
      {
        label: 'Still on duty',
        value: rows.filter((r) => this.matches(r, 'Still on duty')).length,
        tone: 'teal',
        icon: 'monitor_heart',
        view: 'Still on duty',
      },
      {
        label: 'Completed',
        value: rows.filter((r) => r.live.status === 'Completed').length,
        tone: 'green',
        icon: 'task_alt',
        view: 'Completed',
      },
    ];
  });
  protected readonly compact = toSignal(inject(BreakpointObserver).observe('(max-height: 850px)'));
  protected readonly pageSize = computed(() => (this.compact()?.matches ? 4 : 6));
  protected readonly attentionSize = computed(() => (this.compact()?.matches ? 2 : 3));
  protected readonly pages = computed(() =>
    Math.max(
      1,
      Math.ceil(this.rows().length / this.pageSize()),
      Math.ceil(this.attention().length / this.attentionSize()),
    ),
  );
  protected readonly currentPage = computed(() => this.page() % this.pages());
  protected readonly visible = computed(() =>
    this.rows().slice(
      this.currentPage() * this.pageSize(),
      (this.currentPage() + 1) * this.pageSize(),
    ),
  );
  protected readonly visibleAttention = computed(() => {
    const rows = this.attention();
    const start =
      (this.currentPage() % Math.max(1, Math.ceil(rows.length / this.attentionSize()))) *
      this.attentionSize();
    return rows.slice(start, start + this.attentionSize());
  });
  protected readonly highCount = computed(() => this.rows().filter((r) => this.isHigh(r.v)).length);
  protected readonly filterCount = computed(
    () =>
      [this.call(), this.status(), this.risk(), this.double(), this.highOnly()].filter(Boolean)
        .length,
  );

  constructor() {
    afterNextRender(() => document.getElementById('tv-wallboard-title')?.focus());
    effect(() => {
      this.service.data();
      this.service.rota.data();
      this.refreshed.set(Date.now());
    });
    let rotation = 0;
    const timer = setInterval(() => {
      this.now.set(Date.now());
      if (this.now() - this.refreshed() >= 180000) this.refreshed.set(this.now());
      if (!this.paused() && !this.filtersOpen() && ++rotation >= 15) {
        this.next();
        rotation = 0;
      }
    }, 1000);
    const onFullscreen = () => this.fullscreenActive.set(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreen);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      document.removeEventListener('fullscreenchange', onFullscreen);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    });
  }
  protected matches(
    r: { v: RotaVisit; live: ReturnType<typeof liveVisit> },
    view: string,
  ): boolean {
    switch (view) {
      case 'Late visits':
        return r.live.status === 'Running late';
      case 'Missed visits':
        return ['Missed visit', 'Missed visit risk'].includes(r.live.status);
      case 'Not checked in':
        return r.live.arrived < r.v.carers && r.live.status !== 'Completed';
      case 'Still on duty':
        return r.v.attendance.some((a) => r.v.staffIds.includes(a.personId) && a.start && !a.end);
      case 'Completed':
        return r.live.status === 'Completed';
      case 'Manager action':
        return (
          ['red', 'amber'].includes(r.live.tone) ||
          r.live.overrun > 0 ||
          (r.live.arrived > 0 && r.live.arrived < r.v.carers)
        );
      default:
        return true;
    }
  }
  protected flags(v: RotaVisit): RiskFlag[] {
    return (
      this.service.rota.data().clients.find((c) => c.id === v.clientId)?.riskFlags ??
      v.riskFlags ??
      []
    );
  }
  protected isHigh(v: RotaVisit): boolean {
    return v.priority === 'High' || this.flags(v).includes('Critical / welfare-sensitive');
  }
  protected names(v: RotaVisit): string {
    const names = v.staffIds.map(
      (id) => this.store.data().people.find((p) => p.id === id)?.name ?? 'Former staff member',
    );
    while (names.length < v.carers) names.push('Unallocated');
    return names.join(' + ');
  }
  protected displayStatus(r: { v: RotaVisit; live: ReturnType<typeof liveVisit> }): string {
    if (r.live.overrun > 0) return 'Overstayed';
    if (r.live.arrived > 0 && r.live.arrived < r.v.carers) return 'Awaiting second carer';
    return r.live.status;
  }
  protected time(value: number, seconds = false): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      minute: '2-digit',
      second: seconds ? '2-digit' : undefined,
      hourCycle: 'h23',
    }).format(value);
  }
  protected dateLabel(): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(this.now());
  }
  protected selectView(view: string): void {
    this.view.set(view);
    this.page.set(0);
  }
  protected next(direction = 1): void {
    this.page.set((this.currentPage() + direction + this.pages()) % this.pages());
  }
  protected reset(): void {
    this.call.set('');
    this.status.set('');
    this.risk.set('');
    this.double.set(false);
    this.highOnly.set(false);
    this.selectView('All visits');
  }
  protected async fullscreen(): Promise<void> {
    try {
      await document.documentElement.requestFullscreen();
      this.fullscreenError.set('');
    } catch {
      this.fullscreenError.set('Browser full screen is unavailable. TV mode is still active.');
    }
  }
  protected exit(): void {
    void this.router.navigateByUrl('/manage/ecm');
  }
}
