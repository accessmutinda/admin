import { EnvironmentInjector, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  CanActivateChildFn,
  provideRouter,
} from '@angular/router';
import { vi } from 'vitest';
import { routes } from '../../../app.routes';
import { CompaniesApiService } from './companies-api.service';
import { CompanyLoading } from './company-loading';
import { Companies } from './companies';
import { ManagementStore } from '../shared/management.store';
describe('Company data skeletons', () => {
  it('allows a company page to activate before its data resolves', async () => {
    let complete!: () => void;
    const pending = new Promise<void>((resolve) => (complete = resolve));
    const api = {
      ensureLoaded: vi.fn(() => pending),
      loadDetail: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: CompaniesApiService, useValue: api }],
    });
    const guard = routes.find((route) => route.path === 'manage')!
      .canActivateChild![1] as CanActivateChildFn;
    const route = {
      paramMap: { get: () => 'company-1' },
      routeConfig: { path: 'companies/:id' },
    } as unknown as ActivatedRouteSnapshot;
    const result = await runInInjectionContext(TestBed.inject(EnvironmentInjector), () =>
      guard(route, { url: '/manage/companies/company-1' } as RouterStateSnapshot),
    );
    expect(result).toBe(true);
    expect(api.loadDetail).not.toHaveBeenCalled();
    complete();
    await Promise.resolve();
    expect(api.loadDetail).toHaveBeenCalledWith('company-1');
  });
  it('shows only decorative skeletons while company content is pending', () => {
    const fixture = TestBed.createComponent(CompanyLoading);
    fixture.componentRef.setInput('view', 'contacts');
    fixture.detectChanges();
    fixture.componentRef.setInput('company', { name: 'Saved Care', code: 'SAVED' });
    fixture.componentRef.setInput('heading', 'Contact Information');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('Loading saved company information.');
    expect(fixture.nativeElement.querySelector('h1, h2, h3, label, small, strong')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('cv-skeleton').length).toBeGreaterThan(10);
    expect(fixture.nativeElement.querySelector('input')).toBeNull();
    expect(fixture.nativeElement.getAttribute('aria-busy')).toBe('true');
  });
  it('replaces an overview skeleton with actual data when the list arrives', () => {
    const loading = signal(true);
    const loaded = signal(false);
    const companies = signal<any[]>([]);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: CompaniesApiService,
          useValue: { loading, loaded, error: () => '', overview: () => null },
        },
        {
          provide: ManagementStore,
          useValue: {
            companies,
            company: () => companies()[0],
            data: () => ({ members: [], locations: [] }),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(Companies);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('cv-company-loading')).toBeTruthy();
    companies.set([
      {
        id: 'company-1',
        name: 'Actual Care',
        code: 'ACT',
        lifecycle: 'active',
        apiSummaryOnly: true,
        modules: [],
        sector: '',
        registration: '',
        postcode: '',
      },
    ]);
    loaded.set(true);
    loading.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('cv-company-loading')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Actual Care');
  });
});
