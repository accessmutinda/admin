import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RiskPrintPreview } from './risk-print-preview';

@Component({
  imports: [RiskPrintPreview],
  template: `<cv-risk-print-preview
    ><article class="print-document">
      <header>London Quality Care Services</header>
      <h1>Individual Risk Assessment</h1>
      <p>Service user and assessment summary</p>
      <section class="print-risk">
        <h2>Moving & Handling</h2>
        <table>
          <thead>
            <tr>
              <th>Task</th>
              <th>Support</th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows; track row) {
              <tr>
                <td>Task {{ row }}</td>
                <td>Independent</td>
              </tr>
            }
          </tbody>
        </table>
      </section>
      <section class="print-risk">
        <h2>Behaviour</h2>
        <h3>Carer instructions</h3>
        <p>{{ instructions }}</p>
      </section>
    </article></cv-risk-print-preview
  >`,
})
class DocumentHost {
  rows = Array.from({ length: 60 }, (_, i) => i + 1);
  instructions = Array.from({ length: 1600 }, (_, i) => 'instruction' + i).join(' ');
}

function height(element: Element): number {
  if (element.tagName === 'TR') return 30;
  if (element.tagName === 'P') return Math.ceil((element.textContent?.length ?? 0) / 80) * 18 + 10;
  if (/^H[123]$/.test(element.tagName) || element.tagName === 'HEADER') return 36;
  return Array.from(element.children).reduce((sum, child) => sum + height(child), 0);
}

describe('Paginated risk document preview', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      return {
        width: 794,
        height: height(this),
        top: 0,
        left: 0,
        right: 794,
        bottom: height(this),
        x: 0,
        y: 0,
        toJSON: () => ({}),
      };
    });
  });
  function setup() {
    const fixture = TestBed.createComponent(DocumentHost);
    fixture.detectChanges();
    const component = fixture.debugElement.query(By.directive(RiskPrintPreview))
      .componentInstance as RiskPrintPreview;
    (component as any).paginate();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const sheets = () =>
      Array.from(root.querySelectorAll<HTMLElement>('.risk-document-pages > article'));
    return { fixture, component, root, sheets };
  }
  it('continues long tables and paragraphs onto additional pages without losing content', () => {
    const { fixture, component, root, sheets } = setup();
    expect(component.pageCount()).toBeGreaterThan(4);
    expect(root.querySelectorAll('.risk-document-pages tbody tr')).toHaveLength(60);
    const instructions = Array.from(root.querySelectorAll('.risk-document-pages p'))
      .flatMap((paragraph) => (paragraph.textContent ?? '').trim().split(/\s+/))
      .filter((word) => word.startsWith('instruction'));
    expect(instructions).toEqual(fixture.componentInstance.instructions.split(' '));
    expect(
      sheets().every((sheet) => height(sheet.querySelector('.risk-print-body')!) <= 1055),
    ).toBe(true);
    expect(root.querySelectorAll('.risk-document-pages thead').length).toBeGreaterThan(1);
    expect(sheets().filter((sheet) => !sheet.hidden)).toHaveLength(1);
    expect(root.querySelector('.risk-print-page-footer')!.textContent).toBe(
      'Page 1 of ' + component.pageCount(),
    );
  });
  it('supports previous/next buttons, keyboard arrows and horizontal swipes with bounded navigation', () => {
    const { fixture, component, root, sheets } = setup();
    expect(root.querySelector<HTMLButtonElement>('[aria-label="Previous page"]')!.disabled).toBe(
      true,
    );
    root.querySelector<HTMLButtonElement>('[aria-label="Next page"]')!.click();
    fixture.detectChanges();
    expect(component.currentPage()).toBe(1);
    expect(sheets()[1].hidden).toBe(false);
    const viewport = root.querySelector<HTMLElement>('.risk-document-viewport')!;
    viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(component.currentPage()).toBe(2);
    const touch = (type: string, x: number, y: number, ended = false) => {
      const event = new Event(type, { bubbles: true });
      const point = { identifier: 1, clientX: x, clientY: y };
      Object.defineProperties(event, {
        touches: { value: ended ? [] : [point] },
        changedTouches: { value: [point] },
      });
      viewport.dispatchEvent(event);
    };
    touch('touchstart', 250, 100);
    touch('touchend', 100, 105, true);
    expect(component.currentPage()).toBe(3);
    touch('touchstart', 100, 100);
    touch('touchend', 250, 105, true);
    expect(component.currentPage()).toBe(2);
    touch('touchstart', 100, 100);
    touch('touchend', 110, 250, true);
    expect(component.currentPage()).toBe(2);
    component.turn(-10000);
    fixture.detectChanges();
    expect(component.currentPage()).toBe(0);
    component.turn(10000);
    fixture.detectChanges();
    expect(component.currentPage()).toBe(component.pageCount() - 1);
    expect(root.querySelector<HTMLButtonElement>('[aria-label="Next page"]')!.disabled).toBe(true);
  });
  it('prints every page even when a later page is selected and restores the on-screen selection', () => {
    const { component, sheets } = setup();
    component.turn(2);
    component.beforePrint();
    expect(sheets().every((sheet) => !sheet.hidden)).toBe(true);
    expect(sheets()).toHaveLength(component.pageCount());
    component.afterPrint();
    expect(component.currentPage()).toBe(2);
    expect(sheets().filter((sheet) => !sheet.hidden)).toHaveLength(1);
    expect(sheets()[2].hidden).toBe(false);
  });
});
