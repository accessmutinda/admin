import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { emptyClientFile } from '../clients/client-file.models';
import { CareHeader } from './care-header';
import { visibleWorkspaceTabCount } from './workspace-tab-overflow';

describe('Service-user navigation overflow', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    TestBed.inject(AuthService).signInDemoSession();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
  });
  function setup(width = 550, active = 'overview') {
    const fixture = TestBed.createComponent(CareHeader);
    fixture.componentRef.setInput('client', {
      id: 'overflow-client',
      name: 'Demo Person',
      reference: 'DEMO-1',
      address: 'Demo Road',
      postcode: 'HA1 1AA',
      active: true,
      funding: 'Private',
      priority: 'Standard',
    });
    fixture.componentRef.setInput('active', active);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    const nav = page.querySelector<HTMLElement>('.workspace-overflow-nav')!;
    const size = { width };
    Object.defineProperty(nav, 'clientWidth', { get: () => size.width });
    page
      .querySelectorAll<HTMLElement>('[data-measure-tab]')
      .forEach((item) =>
        vi.spyOn(item, 'getBoundingClientRect').mockReturnValue({ width: 100 } as DOMRect),
      );
    vi.spyOn(
      page.querySelector<HTMLElement>('[data-measure-more]')!,
      'getBoundingClientRect',
    ).mockReturnValue({ width: 90 } as DOMRect);
    (fixture.componentInstance as any).updateOverflow();
    fixture.detectChanges();
    return { fixture, page, nav, size };
  }
  it('keeps all tabs when they fit and reserves More space only when needed', () => {
    expect(visibleWorkspaceTabCount(400, [100, 100, 100, 100], 90)).toBe(4);
    expect(visibleWorkspaceTabCount(350, [100, 100, 100, 100], 90)).toBe(2);
    expect(visibleWorkspaceTabCount(100, [100, 100, 100], 90)).toBe(1);
  });
  it('moves only the overflow destinations into More and marks an active overflow section', async () => {
    const { fixture, page, nav } = setup(550, 'audit');
    expect(nav.querySelectorAll(':scope > a')).toHaveLength(3);
    const more = page.querySelector<HTMLButtonElement>('.workspace-more-trigger')!;
    expect(more.classList.contains('selected')).toBe(true);
    expect(more.getAttribute('aria-expanded')).toBe('false');
    more.click();
    fixture.detectChanges();
    expect(more.getAttribute('aria-expanded')).toBe('true');
    const links = page.querySelectorAll<HTMLAnchorElement>('.workspace-overflow-menu a');
    expect(links).toHaveLength(8);
    expect(links[0].textContent).toContain('Visits & Allocation');
    const audit = page.querySelector<HTMLAnchorElement>(
      '.workspace-overflow-menu a[aria-current="page"]',
    )!;
    expect(audit.getAttribute('href')).toBe('/manage/clients/overflow-client/audit');
    expect(page.querySelector('.workspace-tab-sizer')?.hasAttribute('inert')).toBe(true);
    fixture.destroy();
  });
  it('supports keyboard movement, Escape and outside-click dismissal', () => {
    const { fixture, page } = setup();
    const more = page.querySelector<HTMLButtonElement>('.workspace-more-trigger')!;
    more.click();
    fixture.detectChanges();
    const links = page.querySelectorAll<HTMLAnchorElement>('.workspace-overflow-menu a');
    // The fixture is detached in jsdom; attach it to verify actual focus movement.
    document.body.appendChild(page);
    links[0].focus();
    links[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(links[1]);
    links[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(document.activeElement).toBe(links[links.length - 1]);
    links[links.length - 1].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    fixture.detectChanges();
    expect(page.querySelector('.workspace-overflow-menu')).toBeNull();
    expect(document.activeElement).toBe(more);
    more.click();
    fixture.detectChanges();
    document.body.click();
    fixture.detectChanges();
    expect(page.querySelector('.workspace-overflow-menu')).toBeNull();
    page.remove();
    fixture.destroy();
  });
  it('restores destinations to the row after resize and handles a narrow screen', () => {
    const { fixture, page, nav, size } = setup(240);
    expect(nav.querySelectorAll(':scope > a')).toHaveLength(0);
    expect(page.querySelector('.workspace-more-trigger')).toBeTruthy();
    size.width = 1400;
    (fixture.componentInstance as any).updateOverflow();
    fixture.detectChanges();
    expect(nav.querySelectorAll(':scope > a')).toHaveLength(11);
    expect(page.querySelector('.workspace-more')).toBeNull();
    fixture.destroy();
  });
  it('shows a view-more icon for a long address or living arrangement and expands it', async () => {
    const { fixture, page } = setup();
    const living =
      'I live with my parents and older sister in our family home. I enjoy spending time with my family and feel safest when familiar adults are around me.';
    fixture.componentRef.setInput('client', {
      id: 'overflow-client',
      name: 'Demo Person',
      reference: 'DEMO-1',
      address: '56 POLE HILL ROAD',
      postcode: 'UB10 0QA',
      active: true,
      funding: 'Private',
      priority: 'Standard',
      file: { ...emptyClientFile(), details: { living } },
    });
    fixture.detectChanges();
    for (const text of page.querySelectorAll<HTMLElement>('.profile-address-text')) {
      Object.defineProperty(text, 'scrollWidth', { configurable: true, get: () => 400 });
      Object.defineProperty(text, 'clientWidth', { configurable: true, get: () => 120 });
      Object.defineProperty(text, 'scrollHeight', { configurable: true, get: () => 48 });
    }
    await Promise.resolve();
    (fixture.componentInstance as any).measureProfileText();
    fixture.detectChanges();
    const buttons = page.querySelectorAll<HTMLButtonElement>('.profile-address-more');
    expect(buttons).toHaveLength(2);
    expect(buttons[0].getAttribute('aria-label')).toBe('View full address');
    expect(buttons[1].getAttribute('aria-expanded')).toBe('false');
    buttons[1].click();
    fixture.detectChanges();
    expect(page.querySelectorAll('.profile-address-line')[1].classList.contains('expanded')).toBe(
      true,
    );
    expect(buttons[1].getAttribute('aria-expanded')).toBe('true');
    expect(buttons[1].getAttribute('aria-label')).toBe('Show less living arrangement');
    expect(page.querySelectorAll('.profile-address-text')[1].textContent).toContain(
      'family home',
    );
    fixture.destroy();
  });
});
