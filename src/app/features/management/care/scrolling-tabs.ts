import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
export interface WorkspaceTab {
  id: string;
  label: string;
  icon?: string;
}
@Component({
  selector: 'cv-scrolling-tabs',
  template: `<nav
    class="tab-shell"
    [class.reference-nav]="appearance() === 'underline'"
    [attr.aria-label]="label()"
  >
    <button
      class="scroll-arrow"
      type="button"
      [disabled]="!left()"
      [attr.aria-label]="'Scroll ' + label() + ' left'"
      (click)="scroll(-1)"
    >
      <span class="material-symbols-outlined" aria-hidden="true">chevron_left</span>
    </button>
    <div
      class="tab-viewport"
      #viewport
      role="tablist"
      [attr.aria-label]="label()"
      (scroll)="measure()"
    >
      @for (tab of tabs(); track tab.id; let i = $index) {
        <button
          type="button"
          role="tab"
          [attr.id]="prefix() + '-' + domId(tab.id)"
          [attr.data-tab]="tab.id"
          [attr.aria-selected]="selected() === tab.id"
          [attr.aria-controls]="panel()"
          [attr.tabindex]="selected() === tab.id || (!selected() && i === 0) ? 0 : -1"
          [class.selected]="selected() === tab.id"
          (click)="selectedChange.emit(tab.id)"
          (keydown)="key($event, i)"
        >
          @if (tab.icon) {
            <span class="material-symbols-outlined" aria-hidden="true">{{ tab.icon }}</span>
          }
          {{ tab.label }}
        </button>
      }
    </div>
    <button
      class="scroll-arrow"
      type="button"
      [disabled]="!right()"
      [attr.aria-label]="'Scroll ' + label() + ' right'"
      (click)="scroll(1)"
    >
      <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
    </button>
  </nav>`,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .tab-shell {
        display: flex;
        align-items: stretch;
        min-width: 0;
        background: white;
        border-bottom: 1px solid #e0e8f1;
      }
      .tab-viewport {
        display: flex;
        flex: 1;
        min-width: 0;
        overflow-x: auto;
        overscroll-behavior-x: contain;
        scrollbar-width: thin;
        scrollbar-color: #c2d4e5 transparent;
        scroll-behavior: smooth;
      }
      .tab-viewport > button {
        flex: none;
        display: flex;
        align-items: center;
        gap: 7px;
        white-space: nowrap;
        border: 0;
        border-bottom: 3px solid transparent;
        border-radius: 0;
        background: transparent;
        color: #546c85;
        font: inherit;
        font-size: 12px;
        padding: 13px 15px;
        cursor: pointer;
      }
      .tab-viewport > button.selected {
        color: #075b9e;
        background: #f0f6ff;
        border-bottom-color: #1675c5;
        font-weight: 700;
      }
      .reference-nav .tab-viewport > button.selected {
        background: white;
        color: #0057ff;
        border-bottom-color: #0057ff;
      }
      .tab-viewport .material-symbols-outlined {
        font-size: 19px;
      }
      .scroll-arrow {
        display: grid;
        place-items: center;
        flex: 0 0 30px;
        border: 0;
        background: white;
        color: #2e6393;
        cursor: pointer;
        padding: 0;
      }
      .scroll-arrow:disabled {
        color: #c2cdd7;
        cursor: default;
      }
      .scroll-arrow .material-symbols-outlined {
        font-size: 23px;
      }
      button:focus-visible {
        outline: 2px solid #2586c4;
        outline-offset: -3px;
      }
      @media (max-width: 650px) {
        .tab-viewport > button {
          padding: 11px 12px;
          font-size: 11px;
        }
        .scroll-arrow {
          flex-basis: 26px;
        }
      }
    `,
  ],
})
export class ScrollingTabs implements AfterViewInit, OnDestroy {
  readonly appearance = input<'default' | 'underline'>('default');
  readonly tabs = input.required<readonly WorkspaceTab[]>();
  readonly selected = input.required<string>();
  readonly label = input('Workspace tabs');
  readonly prefix = input('workspace-tab');
  readonly panel = input('care-plan-content');
  readonly selectedChange = output<string>();
  readonly left = signal(false);
  readonly right = signal(false);
  private readonly viewport = viewChild<ElementRef<HTMLElement>>('viewport');
  private observer?: ResizeObserver;
  constructor() {
    effect(() => {
      this.selected();
      this.tabs();
      queueMicrotask(() => this.reveal());
    });
  }
  ngAfterViewInit() {
    const node = this.viewport()?.nativeElement;
    if (node && typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => this.measure());
      this.observer.observe(node);
    }
    this.measure();
  }
  domId(id: string) {
    return id.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
  }
  measure() {
    const node = this.viewport()?.nativeElement;
    if (!node) return;
    this.left.set(node.scrollLeft > 1);
    this.right.set(node.scrollLeft + node.clientWidth < node.scrollWidth - 2);
  }
  scroll(direction: number) {
    const node = this.viewport()?.nativeElement;
    if (!node) return;
    const amount = Math.max(160, node.clientWidth * 0.7) * direction;
    if (node.scrollBy) node.scrollBy({ left: amount, behavior: 'smooth' });
    else node.scrollLeft += amount;
    this.measure();
  }
  private reveal() {
    const node = this.viewport()?.nativeElement;
    const button = node?.querySelector<HTMLElement>(`[data-tab="${this.selected()}"]`);
    if (!node || !button) return;
    if (button.offsetLeft < node.scrollLeft) node.scrollLeft = button.offsetLeft;
    else if (button.offsetLeft + button.offsetWidth > node.scrollLeft + node.clientWidth)
      node.scrollLeft = button.offsetLeft + button.offsetWidth - node.clientWidth;
    this.measure();
  }
  key(event: KeyboardEvent, index: number) {
    const last = this.tabs().length - 1;
    const next =
      event.key === 'ArrowRight'
        ? Math.min(last, index + 1)
        : event.key === 'ArrowLeft'
          ? Math.max(0, index - 1)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : -1;
    if (next < 0) return;
    event.preventDefault();
    const tab = this.tabs()[next];
    this.selectedChange.emit(tab.id);
    this.viewport()?.nativeElement.querySelector<HTMLElement>(`[data-tab="${tab.id}"]`)?.focus();
  }
  ngOnDestroy() {
    this.observer?.disconnect();
  }
}
