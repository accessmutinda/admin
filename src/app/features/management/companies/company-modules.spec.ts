import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  CompanyAccessService,
  ModuleConfiguration,
} from '../../../core/access/company-access.service';
import { ManagementStore } from '../shared/management.store';
import { CompanyModulesPage } from './company-modules';

const initial: ModuleConfiguration = {
  company_id: 'north',
  version: 0,
  etag: '"v0"',
  core_permissions: [],
  modules: [
    {
      code: 'care',
      name: 'Care delivery',
      enabled: true,
      submodules: [
        {
          code: 'records',
          name: 'Records',
          description: 'Client records',
          enabled: false,
          effective_enabled: false,
          permissions: [],
        },
      ],
    },
  ],
};
describe('Company module configuration', () => {
  const change = vi.fn();
  let harness: RouterTestingHarness;
  let page: any;
  beforeEach(async () => {
    change.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'manage/companies/:id/modules/:section', component: CompanyModulesPage },
        ]),
        {
          provide: CompanyAccessService,
          useValue: {
            context: signal({ company_id: 'north', can_manage_modules: true }),
            refresh: vi.fn().mockResolvedValue(undefined),
            configuration: vi.fn().mockResolvedValue(structuredClone(initial)),
            change,
          },
        },
        {
          provide: ManagementStore,
          useValue: {
            companies: signal([{ id: 'north', name: 'North', code: 'NORTH', active: true }]),
          },
        },
      ],
    });
    harness = await RouterTestingHarness.create();
    page = await harness.navigateByUrl(
      '/manage/companies/north/modules/configure?module=care',
      CompanyModulesPage,
    );
    await TestBed.tick();
    await harness.fixture.whenStable();
    harness.detectChanges();
  });
  it('shows submodule switches without subscription sections', () => {
    const text = harness.routeNativeElement!.textContent!;
    expect(text).toContain('Records');
    expect(text).toContain('Modules & Feature Access');
    expect(text).not.toContain('Billing History');
    expect(harness.routeNativeElement!.querySelector('[role="switch"]')).toBeTruthy();
  });
  it('saves a switch once with its version and shows only confirmed state', async () => {
    let resolve!: (value: ModuleConfiguration) => void;
    change.mockReturnValue(new Promise<ModuleConfiguration>((r) => (resolve = r)));
    const pending = page.toggle(page.state().modules[0], 'records');
    expect(page.saving()).toBe(true);
    expect(page.state().modules[0].submodules[0].enabled).toBe(false);
    await page.toggle(page.state().modules[0], 'records');
    expect(change).toHaveBeenCalledTimes(1);
    expect(change).toHaveBeenCalledWith('north', '"v0"', 'care', true, 'records');
    const saved = structuredClone(initial);
    saved.version = 1;
    saved.etag = '"v1"';
    saved.modules[0].submodules[0].enabled = true;
    resolve(saved);
    await pending;
    expect(page.state().modules[0].submodules[0].enabled).toBe(true);
    expect(page.saved()).toBe(true);
  });
  it('keeps confirmed configuration and exposes failed saves', async () => {
    change.mockRejectedValue(new Error('Configuration changed. Reload before retrying.'));
    await page.toggle(page.state().modules[0], 'records');
    expect(page.state().modules[0].submodules[0].enabled).toBe(false);
    expect(page.saved()).toBe(false);
    expect(page.error()).toContain('Reload');
  });
});
