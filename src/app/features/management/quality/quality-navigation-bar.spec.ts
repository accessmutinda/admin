import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { QualityNavigation } from './quality-navigation-bar';

@Component({ template: '' })
class Destination {}

interface NavigationEditor {
  updateOverflow(): void;
}

describe('Rich KPI More navigation', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'manage/quality', component: Destination },
          { path: 'manage/quality/:page', component: Destination },
        ]),
      ],
    }),
  );
  async function setup(width: number, page = 'predictive-insights') {
    await TestBed.inject(Router).navigateByUrl('/manage/quality/' + page);
    const fixture = TestBed.createComponent(QualityNavigation);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const nav = root.querySelector<HTMLElement>('.quality-top-nav')!;
    const size = { width };
    Object.defineProperty(nav, 'clientWidth', { get: () => size.width });
    root
      .querySelectorAll<HTMLElement>('[data-measure-item]')
      .forEach((item) =>
        vi.spyOn(item, 'getBoundingClientRect').mockReturnValue({ width: 100 } as DOMRect),
      );
    vi.spyOn(
      root.querySelector<HTMLElement>('[data-measure-more]')!,
      'getBoundingClientRect',
    ).mockReturnValue({ width: 80 } as DOMRect);
    const editor = fixture.componentInstance as unknown as NavigationEditor;
    editor.updateOverflow();
    fixture.detectChanges();
    return { fixture, root, nav, size, editor };
  }
  it('shows all destinations without More when there is sufficient space', async () => {
    const { nav, root } = await setup(2000);
    expect(nav.querySelectorAll(':scope > a')).toHaveLength(10);
    expect(root.querySelector('.quality-more-trigger')).toBeNull();
    expect(nav.querySelector('a[aria-current="page"]')?.getAttribute('href')).toBe(
      '/manage/quality/predictive-insights',
    );
    expect(root.querySelector('.quality-nav-sizer')?.hasAttribute('inert')).toBe(true);
  });
  it('moves overflow pages into More and highlights the current hidden page', async () => {
    const { fixture, nav, root } = await setup(508);
    const visible = [...nav.querySelectorAll<HTMLAnchorElement>(':scope > a')];
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.length).toBeLessThan(10);
    const more = root.querySelector<HTMLButtonElement>('.quality-more-trigger')!;
    expect(more.classList.contains('active')).toBe(true);
    more.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const hidden = [...document.querySelectorAll<HTMLAnchorElement>('.quality-overflow-link')];
    expect(hidden.length + visible.length).toBe(10);
    expect(new Set([...visible, ...hidden].map((a) => a.getAttribute('href'))).size).toBe(10);
    expect(
      document.querySelector('.quality-overflow-link[aria-current="page"]')?.getAttribute('href'),
    ).toBe('/manage/quality/predictive-insights');
    expect(more.getAttribute('aria-expanded')).toBe('true');
    hidden.find((link) => link.getAttribute('href') === '/manage/quality/workspace')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/manage/quality/workspace');
  });
  it('uses More alone at narrow widths and restores links after resizing', async () => {
    const { fixture, nav, root, size, editor } = await setup(100);
    expect(nav.querySelectorAll(':scope > a')).toHaveLength(0);
    expect(root.querySelector('.quality-more-trigger')).not.toBeNull();
    size.width = 2000;
    editor.updateOverflow();
    fixture.detectChanges();
    expect(nav.querySelectorAll(':scope > a')).toHaveLength(10);
    expect(root.querySelector('.quality-more-trigger')).toBeNull();
  });
  it('closes More with Escape and returns focus to its trigger', async () => {
    const { fixture, root } = await setup(508);
    const more = root.querySelector<HTMLButtonElement>('.quality-more-trigger')!;
    more.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const menu = document.querySelector<HTMLElement>('[role="menu"]')!;
    expect(menu).not.toBeNull();
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(more.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(more);
  });
});
