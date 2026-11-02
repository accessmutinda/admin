import { TestBed } from '@angular/core/testing';
import { CarePlanSectionNav } from './care-plan-section-nav';
import { CARE_AREA_TABS } from './care-plan-workspace.models';

describe('Vertical care-plan section navigation', () => {
  function setup() {
    const fixture = TestBed.createComponent(CarePlanSectionNav);
    fixture.componentRef.setInput('tabs', CARE_AREA_TABS);
    fixture.componentRef.setInput('selected', 'area-0');
    fixture.detectChanges();
    return fixture;
  }
  it('renders all existing sections as a vertical list with one selected tab and stable panel IDs', () => {
    const fixture = setup();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.textContent).toContain('Care Plan Sections');
    expect(page.querySelector('[role=tablist]')?.getAttribute('aria-orientation')).toBe('vertical');
    expect(page.querySelectorAll('[role=tab]')).toHaveLength(17);
    expect(page.querySelectorAll('[aria-selected=true]')).toHaveLength(1);
    expect(page.querySelector('[data-tab="area-0"]')?.id).toBe('care-area-area-0');
    expect(page.querySelector('[data-tab="area-16"]')?.textContent).toContain('Call Package');
    expect(page.querySelectorAll('.section-chevron')).toHaveLength(17);
  });
  it('selects a new area without resetting the active area on a repeated click', () => {
    const fixture = setup();
    const emit = vi.spyOn(fixture.componentInstance.selectedChange, 'emit');
    fixture.nativeElement.querySelector('[data-tab="area-0"]').click();
    expect(emit).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('[data-tab="area-2"]').click();
    expect(emit).toHaveBeenLastCalledWith('area-2');
  });
  it('supports vertical arrow, Home and End selection with keyboard focus', () => {
    const fixture = setup();
    const emit = vi.spyOn(fixture.componentInstance.selectedChange, 'emit');
    fixture.componentInstance.key(new KeyboardEvent('keydown', { key: 'ArrowDown' }), 0);
    expect(emit).toHaveBeenLastCalledWith('area-1');
    fixture.componentInstance.key(new KeyboardEvent('keydown', { key: 'End' }), 1);
    expect(emit).toHaveBeenLastCalledWith('area-16');
    fixture.componentInstance.key(new KeyboardEvent('keydown', { key: 'Home' }), 16);
    expect(emit).toHaveBeenLastCalledWith('area-0');
    fixture.componentInstance.key(new KeyboardEvent('keydown', { key: 'ArrowUp' }), 2);
    expect(emit).toHaveBeenLastCalledWith('area-1');
    expect(document.activeElement?.getAttribute('data-tab')).toBe('area-1');
  });
  it('keeps the selected item visible inside the scrolling section panel', async () => {
    const fixture = setup();
    const list = fixture.nativeElement.querySelector('.section-list') as HTMLElement;
    const last = fixture.nativeElement.querySelector('[data-tab="area-16"]') as HTMLElement;
    Object.defineProperties(list, {
      clientHeight: { value: 100, configurable: true },
      offsetTop: { value: 0, configurable: true },
    });
    Object.defineProperties(last, {
      offsetTop: { value: 600, configurable: true },
      offsetHeight: { value: 34, configurable: true },
    });
    fixture.componentRef.setInput('selected', 'area-16');
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(list.scrollTop).toBe(534);
  });
  it('tracks header height for sticky positioning and disconnects the observer', () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'ResizeObserver');
    let callback: () => void = () => {};
    const disconnect = vi.fn();
    class Observer {
      constructor(fn: () => void) {
        callback = fn;
      }
      observe = vi.fn();
      disconnect = disconnect;
    }
    Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, value: Observer });
    const fixture = setup();
    const header = document.createElement('div');
    let height = 150;
    header.getBoundingClientRect = () => ({ height }) as DOMRect;
    try {
      fixture.componentRef.setInput('stickyHeader', header);
      fixture.detectChanges();
      expect(fixture.componentInstance.stickyTop()).toBe(216);
      height = 200;
      callback();
      expect(fixture.componentInstance.stickyTop()).toBe(266);
      fixture.destroy();
      expect(disconnect).toHaveBeenCalled();
    } finally {
      fixture.destroy();
      if (previous) Object.defineProperty(globalThis, 'ResizeObserver', previous);
      else delete (globalThis as any).ResizeObserver;
    }
  });
});
