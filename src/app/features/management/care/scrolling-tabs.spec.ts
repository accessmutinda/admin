import { TestBed } from '@angular/core/testing';
import { ScrollingTabs } from './scrolling-tabs';
describe('Scrolling care-workspace tabs', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [ScrollingTabs] }));
  it('scrolls overflowing tabs with arrows and updates the end controls', async () => {
    const fixture = TestBed.createComponent(ScrollingTabs);
    fixture.componentRef.setInput(
      'tabs',
      Array.from({ length: 17 }, (_, i) => ({ id: 'area-' + i, label: 'Area ' + i })),
    );
    fixture.componentRef.setInput('selected', 'area-0');
    fixture.detectChanges();
    await fixture.whenStable();
    const node = fixture.nativeElement.querySelector('.tab-viewport') as HTMLElement;
    Object.defineProperties(node, {
      clientWidth: { value: 100, configurable: true },
      scrollWidth: { value: 900, configurable: true },
    });
    fixture.componentInstance.measure();
    fixture.detectChanges();
    expect(fixture.componentInstance.left()).toBe(false);
    expect(fixture.componentInstance.right()).toBe(true);
    fixture.componentInstance.scroll(1);
    expect(node.scrollLeft).toBe(160);
    node.scrollLeft = 800;
    fixture.componentInstance.measure();
    fixture.detectChanges();
    expect(fixture.componentInstance.left()).toBe(true);
    expect(fixture.componentInstance.right()).toBe(false);
  });
  it('supports arrow, Home and End keyboard selection and safe tab identifiers', () => {
    const fixture = TestBed.createComponent(ScrollingTabs);
    fixture.componentRef.setInput('tabs', [
      { id: 'Client details', label: 'Client details' },
      { id: 'Care sections', label: 'Care areas' },
    ]);
    fixture.componentRef.setInput('selected', 'Client details');
    fixture.detectChanges();
    const emit = vi.spyOn(fixture.componentInstance.selectedChange, 'emit');
    fixture.componentInstance.key(new KeyboardEvent('keydown', { key: 'End' }), 0);
    expect(emit).toHaveBeenLastCalledWith('Care sections');
    fixture.componentInstance.key(new KeyboardEvent('keydown', { key: 'Home' }), 1);
    expect(emit).toHaveBeenLastCalledWith('Client details');
    expect(fixture.nativeElement.querySelector('[role="tab"]').id).not.toContain(' ');
  });
});
