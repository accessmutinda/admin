import {
  Component,
  computed,
  inject,
  signal,
  viewChild,
  ElementRef,
  DestroyRef,
  afterNextRender,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { QUALITY_LINKS } from './quality-navigation';

const SHORT_LABELS = [
  'Executive overview',
  'CQC scorecard',
  'Safe care',
  'Effective care',
  'Caring experience',
  'Responsive service',
  'Inspection readiness',
  'Workforce quality',
  'Predictive insights',
];
interface QualityLink {
  path: string;
  label: string;
  title: string;
  icon: string;
}

@Component({
  selector: 'cv-quality-navigation',
  imports: [RouterLink, MatMenuModule],
  template: `<nav
    #navigation
    class="quality-top-nav reference-tabs workspace-overflow-nav"
    aria-label="Rich KPI pages"
  >
    @for (item of visibleLinks(); track item.path) {
      <a
        class="quality-nav-item workspace-tab"
        [routerLink]="item.path"
        [class.active]="isActive(item)"
        [class.selected]="isActive(item)"
        [attr.aria-current]="isActive(item) ? 'page' : null"
        [title]="item.title"
        [attr.aria-label]="item.title"
      >
        <span class="material-symbols-outlined" aria-hidden="true">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </a>
    }
    @if (overflowLinks().length) {
      <button
        type="button"
        class="quality-nav-item workspace-tab workspace-more-trigger quality-more-trigger"
        [matMenuTriggerFor]="moreMenu"
        [class.active]="overflowActive()"
        [class.selected]="overflowActive()"
        aria-label="More Rich KPI pages"
      >
        <span>More</span
        ><span class="material-symbols-outlined workspace-more-chevron" aria-hidden="true"
          >expand_more</span
        >
      </button>
    }
    <mat-menu #moreMenu="matMenu" aria-label="More Rich KPI pages">
      @for (item of overflowLinks(); track item.path) {
        <a
          mat-menu-item
          class="quality-overflow-link"
          [routerLink]="item.path"
          [class.quality-menu-active]="isActive(item)"
          [attr.aria-current]="isActive(item) ? 'page' : null"
          [title]="item.title"
        >
          <span class="material-symbols-outlined" aria-hidden="true">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </a>
      }
    </mat-menu>
    <span #sizer class="quality-nav-sizer" aria-hidden="true" inert>
      @for (item of links(); track item.path) {
        <span class="quality-nav-item workspace-tab" data-measure-item>
          <span class="material-symbols-outlined">{{ item.icon }}</span
          ><span>{{ item.label }}</span>
        </span>
      }
      <span class="quality-nav-item workspace-tab" data-measure-more>
        <span>More</span
        ><span class="material-symbols-outlined workspace-more-chevron">expand_more</span>
      </span>
    </span>
  </nav>`,
  styleUrls: [
    '../care/service-user-spacing.css',
    '../care/workspace-tab-overflow.css',
    './quality-navigation-bar.css',
  ],
})
export class QualityNavigation {
  private readonly router = inject(Router);
  private readonly navigationEvents = toSignal(this.router.events);
  private readonly navigation = viewChild<ElementRef<HTMLElement>>('navigation');
  private readonly sizer = viewChild<ElementRef<HTMLElement>>('sizer');
  private readonly menuTrigger = viewChild(MatMenuTrigger);
  private readonly access = inject(CompanyAccessService);
  private readonly allLinks: QualityLink[] = [
    ...QUALITY_LINKS.map((item, index) => ({
      path: '/manage/quality' + (item.slug ? '/' + item.slug : ''),
      icon: item.icon,
      label: SHORT_LABELS[index],
      title: item.slug ? item.label : 'Executive KPI Command Centre',
    })),
    {
      path: '/manage/quality/workspace',
      icon: 'assignment',
      label: 'Assessment workspace',
      title: 'Assessment & action workspace',
    },
  ];
  protected readonly links = computed(() =>
    this.allLinks.filter((item) => this.access.canPath(item.path)),
  );
  protected readonly visibleCount = signal(this.allLinks.length);
  protected readonly visibleLinks = computed(() => this.links().slice(0, this.visibleCount()));
  protected readonly overflowLinks = computed(() => this.links().slice(this.visibleCount()));
  protected readonly overflowActive = computed(() =>
    this.overflowLinks().some((item) => this.isActive(item)),
  );
  private readonly currentPath = computed(() => {
    this.navigationEvents();
    return this.router.url.split(/[?#]/)[0];
  });
  protected isActive(item: QualityLink): boolean {
    const path = this.currentPath();
    return (
      path === item.path ||
      (item.path.endsWith('/workspace') &&
        ['/manage/quality/new/', '/manage/quality/assessments/'].some((prefix) =>
          path.startsWith(prefix),
        ))
    );
  }
  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const nav = this.navigation()?.nativeElement;
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
      const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
      observer?.observe(nav);
      this.sizer()
        ?.nativeElement.querySelectorAll<HTMLElement>('.quality-nav-item')
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
  protected updateOverflow(): void {
    const nav = this.navigation()?.nativeElement;
    const sizer = this.sizer()?.nativeElement;
    if (!nav || !sizer || !nav.clientWidth) return;
    const widths = Array.from(sizer.querySelectorAll<HTMLElement>('[data-measure-item]')).map(
      (item) => item.getBoundingClientRect().width,
    );
    const more =
      sizer.querySelector<HTMLElement>('[data-measure-more]')?.getBoundingClientRect().width ?? 0;
    if (!more || widths.some((width) => !width)) return;
    const style = getComputedStyle(nav);
    const width =
      nav.clientWidth -
      parseFloat(style.paddingLeft || '0') -
      parseFloat(style.paddingRight || '0');
    const gap = parseFloat(style.columnGap) || 0;
    let count = widths.length;
    if (widths.reduce((sum, value) => sum + value, 0) + gap * (widths.length - 1) > width) {
      count = 0;
      let used = more;
      for (const itemWidth of widths) {
        if (used + gap + itemWidth > width) break;
        used += gap + itemWidth;
        count++;
      }
    }
    if (count !== this.visibleCount()) {
      this.menuTrigger()?.closeMenu();
      this.visibleCount.set(count);
    }
  }
}
