import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../app.routes';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { ManagementLayout } from '../layout/management-layout';
import { QualityService } from './quality.service';
import { QUALITY_DASHBOARDS } from './quality-dashboard.models';

const children = routes
  .find((r) => r.path === 'manage')!
  .children!.filter((r) => r.path?.startsWith('quality'));

describe('Quality & Compliance dashboards', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'manage', children }])] });
    TestBed.inject(AuthService).signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
  });
  async function open(path = '') {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/manage/quality' + path);
    return harness;
  }
  function button(root: Element, text: string): HTMLButtonElement {
    const result = Array.from(root.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(text),
    );
    expect(result, 'Missing button: ' + text).toBeDefined();
    return result!;
  }
  it('opens all nine dashboards with their own headings, metrics and panels', async () => {
    const harness = await open();
    for (const page of QUALITY_DASHBOARDS) {
      await harness.navigateByUrl('/manage/quality' + (page.slug ? '/' + page.slug : ''));
      const root = harness.routeNativeElement!;
      expect(root.querySelector('h1')?.textContent).toContain(page.title);
      expect(root.querySelectorAll('.qd-metric').length).toBe(page.metrics.length);
      expect(root.querySelectorAll('cv-quality-panel').length).toBe(page.panels.length);
    }
  }, 20000);
  it('shows an empty report month and returns to the reference snapshot', async () => {
    const harness = await open();
    const root = harness.routeNativeElement!;
    (root.querySelector('[aria-label="Next report month"]') as HTMLButtonElement).click();
    harness.detectChanges();
    expect(root.querySelector('.qd-empty')?.textContent).toContain('May 2025');
    expect(root.querySelectorAll('.qd-metric').length).toBe(0);
    button(root, 'Return to April 2025').click();
    harness.detectChanges();
    expect(root.querySelectorAll('.qd-metric').length).toBe(17);
  });
  it('filters branch records and searches a full register in its detail dialog', async () => {
    const harness = await open('/safe-care');
    const root = harness.routeNativeElement!;
    const select = root.querySelector('.qd-location select') as HTMLSelectElement;
    select.value = 'Manchester';
    select.dispatchEvent(new Event('change'));
    harness.detectChanges();
    const panels = Array.from(root.querySelectorAll('cv-quality-panel'));
    const heatmap = panels.find((p) => p.textContent?.includes('High-Risk Service Users Heatmap'))!;
    expect(heatmap.querySelectorAll('tbody tr').length).toBe(1);
    expect(heatmap.querySelector('tbody')?.textContent).toContain('Manchester');
    const actions = panels.find((p) => p.textContent?.includes('Corrective Actions Tracker'))!;
    expect(actions.querySelectorAll('tbody tr').length).toBe(5);
    const register = panels.find((p) => p.textContent?.includes('Risk Register'))!;
    button(register, 'View all').click();
    harness.detectChanges();
    const dialog = root.querySelector('[role="dialog"]')!;
    const search = dialog.querySelector('input[type="search"]') as HTMLInputElement;
    search.value = 'slippery';
    search.dispatchEvent(new Event('input'));
    harness.detectChanges();
    expect(dialog.querySelectorAll('tbody tr').length).toBe(1);
    expect(dialog.querySelector('tbody')?.textContent).toContain('Environmental hazard');
  });
  it('saves a pending evidence record for the current company and restores it', async () => {
    const harness = await open('/inspection-readiness');
    const root = harness.routeNativeElement!;
    button(root, 'Add Evidence').click();
    harness.detectChanges();
    await harness.fixture.whenStable();
    const dialog = root.querySelector('.qd-evidence-dialog')!;
    for (const [name, value] of [
      ['title', 'Quarterly quality audit'],
      ['statement', 'Governance and oversight'],
      ['owner', 'Demo Owner'],
    ]) {
      const field = dialog.querySelector(`[name="${name}"]`) as HTMLInputElement;
      field.value = value;
      field.dispatchEvent(new Event('input'));
    }
    harness.detectChanges();
    await harness.fixture.whenStable();
    dialog
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    harness.detectChanges();
    expect(root.querySelector('.qd-evidence-dialog')).toBeNull();
    expect(root.textContent).toContain('Quarterly quality audit');
    const saved = JSON.parse(localStorage.getItem('cv-quality-evidence:lqcs')!);
    expect(saved[0][4]).toBe('Pending');
    await harness.navigateByUrl('/manage/quality');
    await harness.navigateByUrl('/manage/quality/inspection-readiness');
    expect(harness.routeNativeElement!.textContent).toContain('Quarterly quality audit');
  });
  it('keeps assessment workflows accessible and supports legacy workspace links', async () => {
    const harness = await open('/workspace?tab=Assessments');
    expect(harness.routeNativeElement!.textContent).toContain('Assessments');
    await harness.navigateByUrl('/manage/quality?tab=Review%20schedule');
    expect(TestBed.inject(Router).url).toBe('/manage/quality/workspace?tab=Review%20schedule');
  });
  it('expands the Rich KPI menu itself with every reference page and the saved workspace', async () => {
    const fixture = TestBed.createComponent(ManagementLayout);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const menu = button(root, 'Rich KPI');
    expect(menu.getAttribute('aria-expanded')).toBe('false');
    menu.click();
    fixture.detectChanges();
    const links = Array.from(root.querySelectorAll('.quality-submenu a'));
    expect(links).toHaveLength(10);
    expect(links[0].textContent).toContain('Executive KPI Command Centre');
    expect(links[0].getAttribute('href')).toBe('/manage/quality');
    expect(links[9].getAttribute('href')).toBe('/manage/quality/workspace');
    expect(menu.getAttribute('aria-expanded')).toBe('true');
    menu.click();
    fixture.detectChanges();
    expect(root.querySelector('.quality-submenu')).toBeNull();
  });
  it('does not render dashboard data without the view permission', async () => {
    vi.spyOn(TestBed.inject(QualityService), 'can').mockReturnValue(false);
    const harness = await open();
    expect(harness.routeNativeElement!.querySelectorAll('.qd-metric')).toHaveLength(0);
    expect(harness.routeNativeElement!.querySelector('cv-access-required')).not.toBeNull();
  });
});
