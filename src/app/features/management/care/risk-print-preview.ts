import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  ViewEncapsulation,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'cv-risk-print-preview',
  encapsulation: ViewEncapsulation.None,
  template: `
    <section class="risk-document-preview" aria-label="Risk assessment document preview">
      <nav class="risk-document-controls" aria-label="Document pages">
        <button
          type="button"
          [disabled]="currentPage() === 0"
          (click)="turn(-1)"
          aria-label="Previous page"
        >
          <span class="material-symbols-outlined" aria-hidden="true">chevron_left</span>Previous
        </button>
        <span role="status" aria-live="polite" aria-atomic="true"
          >Page {{ currentPage() + 1 }} of {{ pageCount() }}</span
        >
        <button
          type="button"
          [disabled]="currentPage() >= pageCount() - 1"
          (click)="turn(1)"
          aria-label="Next page"
        >
          Next<span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
        </button>
      </nav>
      <div
        #viewport
        class="risk-document-viewport"
        tabindex="0"
        role="region"
        aria-label="Document page. Use left and right arrow keys or swipe to change pages."
        (keydown)="key($event)"
        (touchstart)="touchStart($event)"
        (touchend)="touchEnd($event)"
        (touchcancel)="cancelTouch()"
      >
        <div #pages class="risk-document-pages"></div>
      </div>
      <nav
        class="risk-document-controls risk-document-controls-bottom"
        aria-label="Document pages at bottom"
      >
        <button
          type="button"
          [disabled]="currentPage() === 0"
          (click)="turn(-1)"
          aria-label="Previous page at bottom"
        >
          <span class="material-symbols-outlined" aria-hidden="true">chevron_left</span>Previous
        </button>
        <span>Page {{ currentPage() + 1 }} of {{ pageCount() }}</span>
        <button
          type="button"
          [disabled]="currentPage() >= pageCount() - 1"
          (click)="turn(1)"
          aria-label="Next page at bottom"
        >
          Next<span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
        </button>
      </nav>
      <div #source class="risk-print-source" aria-hidden="true" inert><ng-content /></div>
    </section>
  `,
  styleUrl: './risk-print-preview.css',
})
export class RiskPrintPreview {
  readonly currentPage = signal(0);
  readonly pageCount = signal(1);
  private readonly source = viewChild.required<ElementRef<HTMLElement>>('source');
  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  private readonly pages = viewChild.required<ElementRef<HTMLElement>>('pages');
  private readonly destroyRef = inject(DestroyRef);
  private start: { x: number; y: number; id: number } | null = null;
  private signature = '';
  private printing = false;
  private frame: number | undefined;

  constructor() {
    afterNextRender(() => {
      const schedule = () => {
        if (this.frame !== undefined) return;
        this.frame = requestAnimationFrame(() => {
          this.frame = undefined;
          this.paginate();
        });
      };
      const changes = new MutationObserver(schedule);
      changes.observe(this.source().nativeElement, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
      });
      const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
      resize?.observe(this.viewport().nativeElement);
      window.addEventListener('resize', schedule);
      let destroyed = false;
      document.fonts?.ready.then(() => {
        if (!destroyed) {
          this.signature = '';
          schedule();
        }
      });
      this.paginate();
      this.destroyRef.onDestroy(() => {
        destroyed = true;
        changes.disconnect();
        resize?.disconnect();
        window.removeEventListener('resize', schedule);
        if (this.frame !== undefined) cancelAnimationFrame(this.frame);
      });
    });
  }

  turn(direction: number) {
    const next = Math.max(0, Math.min(this.pageCount() - 1, this.currentPage() + direction));
    if (next === this.currentPage()) return;
    this.currentPage.set(next);
    this.reveal();
    const viewport = this.viewport().nativeElement;
    if (viewport.getBoundingClientRect().top < 0)
      viewport.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  }
  key(event: KeyboardEvent) {
    if (!(event.target instanceof HTMLElement) || event.target.matches('input, textarea, select'))
      return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    this.turn(event.key === 'ArrowRight' ? 1 : -1);
  }
  touchStart(event: TouchEvent) {
    const touch = event.touches.length === 1 ? event.touches[0] : null;
    this.start = touch ? { x: touch.clientX, y: touch.clientY, id: touch.identifier } : null;
  }
  touchEnd(event: TouchEvent) {
    const start = this.start;
    this.start = null;
    if (!start || event.touches.length) return;
    const touch = Array.from(event.changedTouches).find((t) => t.identifier === start.id);
    if (!touch) return;
    const x = touch.clientX - start.x,
      y = touch.clientY - start.y;
    if (Math.abs(x) >= 60 && Math.abs(x) > Math.abs(y) * 1.5) this.turn(x < 0 ? 1 : -1);
  }
  cancelTouch() {
    this.start = null;
  }
  private reveal() {
    Array.from(this.pages().nativeElement.children).forEach((page, index) => {
      (page as HTMLElement).hidden = !this.printing && index !== this.currentPage();
    });
  }

  @HostListener('window:beforeprint') beforePrint() {
    this.printing = true;
    this.signature = '';
    this.paginate(794);
  }
  @HostListener('window:afterprint') afterPrint() {
    this.printing = false;
    this.signature = '';
    this.paginate();
  }

  private paginate(printWidth?: number) {
    const source = this.source().nativeElement.querySelector<HTMLElement>('.print-document');
    if (!source) return;
    const width =
      printWidth ??
      (this.printing ? 794 : Math.min(794, this.viewport().nativeElement.clientWidth || 794));
    const signature = source.innerHTML + ':' + width;
    if (signature === this.signature) return;
    this.signature = signature;
    const host = this.pages().nativeElement;
    host.replaceChildren();
    const height = (width * 297) / 210;
    const header = source.querySelector(':scope > header');
    const sheets: HTMLElement[] = [];
    let body: HTMLElement;
    let capacity = 0;
    const nextPage = () => {
      const sheet = source.cloneNode(false) as HTMLElement;
      sheet.classList.add('risk-print-sheet');
      sheet.style.width = width + 'px';
      sheet.setAttribute('aria-label', 'Document page ' + (sheets.length + 1));
      if (header) sheet.append(header.cloneNode(true));
      body = document.createElement('div');
      body.className = 'risk-print-body';
      sheet.append(body);
      const footer = document.createElement('footer');
      footer.className = 'risk-print-page-footer';
      sheet.append(footer);
      host.append(sheet);
      sheets.push(sheet);
      const style = getComputedStyle(sheet);
      const headerHeight = sheet.querySelector('header')?.getBoundingClientRect().height ?? 0;
      const headerMargin = header
        ? parseFloat(getComputedStyle(sheet.querySelector('header')!).marginBottom) || 0
        : 0;
      capacity =
        height -
        (parseFloat(style.paddingTop) || 0) -
        (parseFloat(style.paddingBottom) || 0) -
        headerHeight -
        headerMargin -
        32;
    };
    const overflowing = () => body.getBoundingClientRect().height > capacity + 1;
    const paragraph = (original: HTMLElement) => {
      let words = (original.textContent ?? '').trim().split(/\s+/);
      while (words.length) {
        const fragment = original.cloneNode(false) as HTMLElement;
        body.append(fragment);
        let low = 1,
          high = words.length,
          fits = 0;
        while (low <= high) {
          const middle = Math.floor((low + high) / 2);
          fragment.textContent = words.slice(0, middle).join(' ');
          if (overflowing()) high = middle - 1;
          else {
            fits = middle;
            low = middle + 1;
          }
        }
        if (!fits && body.children.length > 1) {
          fragment.remove();
          nextPage();
          continue;
        }
        fits = Math.max(1, fits);
        fragment.textContent = words.slice(0, fits).join(' ');
        words = words.slice(fits);
        if (words.length) nextPage();
      }
    };
    const table = (original: HTMLTableElement) => {
      let clone: HTMLTableElement, rows: HTMLTableSectionElement;
      const createTable = () => {
        clone = original.cloneNode(false) as HTMLTableElement;
        if (original.caption) clone.append(original.caption.cloneNode(true));
        original
          .querySelectorAll(':scope > colgroup')
          .forEach((group) => clone.append(group.cloneNode(true)));
        if (original.tHead) clone.append(original.tHead.cloneNode(true));
        rows = document.createElement('tbody');
        clone.append(rows);
        body.append(clone);
      };
      createTable();
      for (const row of Array.from(original.querySelectorAll(':scope > tbody > tr'))) {
        const copy = row.cloneNode(true) as HTMLElement;
        rows!.append(copy);
        if (overflowing() && (rows!.children.length > 1 || body.children.length > 1)) {
          copy.remove();
          if (!rows!.children.length) clone!.remove();
          nextPage();
          createTable();
          rows!.append(copy);
        }
        if (overflowing()) copy.classList.add('risk-print-long-row');
      }
      if (original.tFoot) clone!.append(original.tFoot.cloneNode(true));
    };
    const append = (original: HTMLElement) => {
      if (original.tagName === 'TABLE') {
        table(original as HTMLTableElement);
        return;
      }
      const clone = original.cloneNode(true) as HTMLElement;
      body.append(clone);
      if (!overflowing()) return;
      const blockHeight = clone.getBoundingClientRect().height;
      clone.remove();
      if (blockHeight > capacity && original.tagName === 'P') {
        paragraph(original);
        return;
      }
      if (blockHeight > capacity && original.tagName === 'DIV') {
        Array.from(original.children).forEach((child) => append(child as HTMLElement));
        return;
      }
      if (body.children.length) nextPage();
      body.append(clone);
    };
    const blocks = (container: HTMLElement) => {
      const children = Array.from(container.children) as HTMLElement[];
      for (let i = 0; i < children.length; i++) {
        const block = children[i];
        if (block === header) continue;
        if (block.matches('.print-risk')) {
          if (body.children.length) nextPage();
          blocks(block);
          continue;
        }
        if (/^H[123]$/.test(block.tagName) && children[i + 1]?.tagName === 'P') {
          const group = document.createElement('div');
          group.className = 'risk-print-field';
          group.append(block.cloneNode(true), children[++i].cloneNode(true));
          append(group);
        } else append(block);
      }
    };
    nextPage();
    blocks(source);
    sheets.forEach((sheet, index) => {
      sheet.querySelector('.risk-print-page-footer')!.textContent =
        `Page ${index + 1} of ${sheets.length}`;
    });
    this.pageCount.set(sheets.length);
    this.currentPage.set(Math.min(this.currentPage(), sheets.length - 1));
    this.reveal();
  }
}
