import { Component, ElementRef, effect, input, output, signal, viewChild } from '@angular/core';
import { WorkspaceTab } from './scrolling-tabs';

@Component({
  selector: 'cv-care-plan-section-nav',
  host: { '[style.--section-nav-top]': "stickyTop() + 'px'" },
  template: `<aside class="section-navigation">
    <h2>Care Plan Sections</h2>
    <div
      #list
      class="section-list"
      role="tablist"
      aria-label="Care areas"
      aria-orientation="vertical"
    >
      @for (tab of tabs(); track tab.id; let i = $index) {
        <button
          type="button"
          role="tab"
          [id]="'care-area-' + tab.id"
          [attr.data-tab]="tab.id"
          [attr.aria-selected]="selected() === tab.id"
          aria-controls="care-plan-content"
          [attr.tabindex]="selected() === tab.id ? 0 : -1"
          [class.selected]="selected() === tab.id"
          (click)="choose(tab.id)"
          (keydown)="key($event, i)"
        >
          @if (i === 0) {
            <span class="section-person material-symbols-outlined" aria-hidden="true">person</span>
          } @else {
            <span class="section-number" aria-hidden="true">{{ i + 1 }}</span>
          }
          <span class="section-label">{{ tab.label }}</span
          ><span class="section-chevron material-symbols-outlined" aria-hidden="true"
            >chevron_right</span
          >
        </button>
      }
    </div>
  </aside>`,
  styleUrl: './care-plan-section-nav.css',
})
export class CarePlanSectionNav {
  readonly tabs = input.required<readonly WorkspaceTab[]>();
  readonly selected = input('area-0');
  readonly stickyHeader = input<HTMLElement>();
  readonly selectedChange = output<string>();
  readonly stickyTop = signal(260);
  private readonly list = viewChild<ElementRef<HTMLElement>>('list');
  constructor() {
    effect((onCleanup) => {
      const header = this.stickyHeader();
      if (!header) return;
      const measure = () => this.stickyTop.set(56 + header.getBoundingClientRect().height + 10);
      measure();
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(measure);
      observer.observe(header);
      onCleanup(() => observer.disconnect());
    });
    effect((onCleanup) => {
      this.selected();
      const list = this.list()?.nativeElement;
      if (!list) return;
      const timer = setTimeout(() => this.revealSelected(), 0);
      onCleanup(() => clearTimeout(timer));
    });
  }
  private revealSelected() {
    const list = this.list()?.nativeElement;
    const button = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !button || !list.clientHeight) return;
    const top = button.offsetTop - list.offsetTop;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (top + button.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = top + button.offsetHeight - list.clientHeight;
  }
  choose(id: string) {
    if (id !== this.selected()) this.selectedChange.emit(id);
  }
  key(event: KeyboardEvent, index: number) {
    const last = this.tabs().length - 1;
    let next = index;
    if (event.key === 'ArrowDown') next = Math.min(last, index + 1);
    else if (event.key === 'ArrowUp') next = Math.max(0, index - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    else return;
    event.preventDefault();
    const tab = this.tabs()[next];
    if (!tab) return;
    if (next !== index) this.selectedChange.emit(tab.id);
    this.list()?.nativeElement.querySelectorAll<HTMLButtonElement>('[role=tab]')[next]?.focus();
  }
}
