import { InspectorReportsApi } from './inspector-reports-api.service';
import { InspectorVisitsApi } from './inspector-visits-api.service';
import { InspectorDocumentsApi } from './inspector-documents-api.service';
import { InspectorQualityApi } from './inspector-quality-api.service';
import { InspectorIncidentsApi } from './inspector-incidents-api.service';
import { InspectorMedicationApi } from './inspector-medication-api.service';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import {
  ActivatedRoute,
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
  provideRouter,
} from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { CompanyAccessService, routeAccess } from '../../core/access/company-access.service';
import {
  CONNECTED_INSPECTOR_PAGES,
  inspectorEntryPath,
  isConnectedInspectorPage,
} from '../../core/access/inspector-routes';
import { ManagementStore } from '../management/shared/management.store';
import { InspectorService } from './inspector.service';
import { InspectorLayout } from './inspector-layout';
import { InspectorUnavailable } from './inspector-unavailable';
import { InspectorProviderApi } from './inspector-provider-api.service';
import { InspectorClientsApi } from './inspector-clients-api.service';
import { InspectorStaffApi } from './inspector-staff-api.service';
import { inspectorEntryGuard, inspectorWorkspaceGuard } from './inspector-entry.guard';
import { INSPECTOR_PAGES, csv, documentStatus } from './inspector.models';
import { decodeDocument, zip } from './inspector-download';
import { routes } from '../../app.routes';

describe('Inspector portal routes and availability', () => {
  const allowed = signal(new Set<string>()),
    switching = signal(false),
    authenticated = signal(true),
    admin = signal(false),
    core = signal(new Set<string>());
  const route = { snapshot: { data: { page: 'reports' } } };
  const workspace = signal<string | null>('one');
  let access: {
    canPath: (path: string) => boolean;
    core: (permission: string) => boolean;
    refreshForNavigation: () => Promise<void>;
    companyId: () => string;
    context: () => { company_id: string; roles: { id: string; name: string; code: string }[] };
  };
  const company = signal({ id: 'one', name: 'Current provider' }),
    ready = signal(true);
  beforeEach(() => {
    allowed.set(new Set(CONNECTED_INSPECTOR_PAGES.map((page) => '/inspector/' + page)));
    workspace.set('one');
    switching.set(false);
    authenticated.set(true);
    admin.set(false);
    core.set(new Set());
    route.snapshot.data.page = 'reports';
    ready.set(true);
    access = {
      companyId: () => 'one',
      context: () => ({
        company_id: 'one',
        roles: [{ id: 'role', name: 'Inspection reviewer', code: 'CUSTOM' }],
      }),
      canPath: vi.fn((path: string) => allowed().has(path)),
      core: vi.fn((permission: string) => core().has(permission)),
      refreshForNavigation: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      imports: [InspectorLayout, InspectorUnavailable],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: route },
        {
          provide: BreakpointObserver,
          useValue: { observe: () => of({ matches: false, breakpoints: {} }) },
        },
        {
          provide: AuthService,
          useValue: {
            currentUser: () => ({ roleCode: 'IN', name: 'Inspector', initials: 'I' }),
            isAuthenticated: () => authenticated(),
            isSuperAdmin: () => admin(),
            canSwitchWorkspace: () => switching(),
            nextRoute: () => '/auth/sign-in',
            signOut: vi.fn(),
            session: () => ({ workspaceId: workspace() }),
            profile: () => ({ company_entry_state: 'ready', company_id: 'one' }),
          },
        },
        { provide: CompanyAccessService, useValue: access },
        ...[
          InspectorProviderApi,
          InspectorClientsApi,
          InspectorStaffApi,
          InspectorMedicationApi,
          InspectorIncidentsApi,
          InspectorQualityApi,
          InspectorDocumentsApi,
          InspectorVisitsApi,
          InspectorReportsApi,
        ].map((provide) => ({
          provide,
          useValue: { company, ready },
        })),
        {
          provide: ManagementStore,
          useFactory: () => {
            throw Error('Inspector routes must not load the browser workspace');
          },
        },
        {
          provide: InspectorService,
          useFactory: () => {
            throw Error('The portal shell must not construct a legacy inspector service');
          },
        },
      ],
    });
  });
  afterEach(() => vi.restoreAllMocks());
  it.each([
    ['dashboard', 'provider'],
    ['provider', 'provider'],
    ['service-users', 'clients'],
    ['staffing', 'staff'],
    ['medication', 'medication'],
    ['incidents', 'incidents'],
    ['quality', 'quality'],
    ['documents', 'quality'],
    ['visits', 'visits'],
    ['reports', 'reports'],
    ['notes', 'reports'],
  ])('maps %s to the owning %s submodule', (page, sub) => {
    expect(routeAccess('/inspector/' + page)).toEqual([['inspector_portal', sub]]);
  });
  it('does not map unknown inspector areas to Provider Profile permission', () => {
    expect(routeAccess('/inspector/unknown')).toEqual([['inspector_portal', 'unmapped']]);
  });
  it('chooses an available connected entry for limited inspectors', () => {
    allowed.set(new Set(['/inspector/staffing']));
    expect(inspectorEntryPath((path) => access.canPath(path))).toBe('/inspector/staffing');
    const result = TestBed.runInInjectionContext(() =>
      inspectorEntryGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    expect(TestBed.inject(Router).serializeUrl(result as import('@angular/router').UrlTree)).toBe(
      '/inspector/staffing',
    );
  });
  it('denies portal entry when no connected modules are available', () => {
    allowed.set(new Set());
    const result = TestBed.runInInjectionContext(() =>
      inspectorEntryGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    expect(TestBed.inject(Router).serializeUrl(result as import('@angular/router').UrlTree)).toBe(
      '/access-denied',
    );
  });
  it('enters reports for inspectors limited to report access', () => {
    allowed.set(new Set(['/inspector/reports']));
    expect(inspectorEntryPath(path => access.canPath(path))).toBe('/inspector/reports');
  });
  it('requires authentication before entering the portal', async () => {
    authenticated.set(false);
    const guard = routes.find((route) => route.path === 'inspector')!
      .canActivate![0] as CanActivateFn;
    const result = await TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url: '/inspector/staffing' } as RouterStateSnapshot),
    );
    expect(TestBed.inject(Router).serializeUrl(result as import('@angular/router').UrlTree)).toBe(
      '/auth/sign-in',
    );
  });
  it('does not grant module access from an Inspector role label', async () => {
    allowed.set(new Set());
    const guard = routes.find((route) => route.path === 'inspector')!
      .canActivate![1] as CanActivateFn;
    const result = await TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url: '/inspector/notes' } as RouterStateSnapshot),
    );
    expect(access.refreshForNavigation).toHaveBeenCalledOnce();
    expect(TestBed.inject(Router).serializeUrl(result as import('@angular/router').UrlTree)).toBe(
      '/access-denied',
    );
  });
  it('shows only implemented, permitted modules in navigation', () => {
    allowed.set(new Set(INSPECTOR_PAGES.map((page) => '/inspector/' + page.path)));
    const fixture = TestBed.createComponent(InspectorLayout);
    fixture.detectChanges();
    const links = fixture.nativeElement.querySelectorAll(
      'nav[aria-label="Inspector navigation"] a',
    );
    expect(Array.from(links, (link) => (link as HTMLAnchorElement).getAttribute('href'))).toEqual([
      '/inspector/provider',
      '/inspector/service-users',
      '/inspector/staffing',
      '/inspector/medication',
      '/inspector/incidents',
      '/inspector/quality',
      '/inspector/documents',
      '/inspector/visits',
      '/inspector/reports',
      '/inspector/notes',
    ]);
    expect(fixture.nativeElement.textContent).not.toContain('Local workspace');
    expect(fixture.nativeElement.textContent).toContain('Inspection reviewer');
    expect(fixture.nativeElement.querySelector('a[href="/manage/companies"]')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Switch workspace');
  });
  it('only exposes workspace selection and admin links with matching authority', () => {
    switching.set(true);
    admin.set(true);
    const fixture = TestBed.createComponent(InspectorLayout);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a[href="/manage/companies"]')).not.toBeNull();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.componentInstance.switchWorkspace();
    expect(navigate).toHaveBeenCalledWith('/select-workspace');
    switching.set(false);
    navigate.mockClear();
    fixture.componentInstance.switchWorkspace();
    expect(navigate).not.toHaveBeenCalled();
  });
  it('keeps the logo and header search on an available live module', () => {
    allowed.set(new Set(['/inspector/staffing']));
    const fixture = TestBed.createComponent(InspectorLayout);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a.brand').getAttribute('href')).toBe(
      '/inspector/staffing',
    );
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.componentInstance.search(new Event('submit'), 'Jane');
    expect(navigate).toHaveBeenCalledWith(['/inspector/staffing'], { queryParams: { q: 'Jane' } });
  });
  it.each(INSPECTOR_PAGES.filter((page) => !isConnectedInspectorPage(page.path)))(
    'renders $path as explicitly unavailable without local records or save controls',
    (page) => {
      route.snapshot.data.page = page.path;
      const fixture = TestBed.createComponent(InspectorUnavailable);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain(page.label);
      expect(fixture.nativeElement.textContent).toContain('Live workflow unavailable');
      expect(fixture.nativeElement.textContent).toContain('not connected to the backend');
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('Save draft');
      expect(fixture.componentInstance.canLeave()).toBe(true);
    },
  );
  it('requires Super Admin to select a company before opening inspector records', () => {
    admin.set(true);
    switching.set(true);
    workspace.set(null);
    const result = TestBed.runInInjectionContext(() =>
      inspectorWorkspaceGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    expect(TestBed.inject(Router).serializeUrl(result as import('@angular/router').UrlTree)).toBe(
      '/select-workspace',
    );
  });
  it('routes unfinished sections away from the legacy workflow component', async () => {
    const parent = routes.find((route) => route.path === 'inspector')!;
    for (const page of INSPECTOR_PAGES.filter((page) => !isConnectedInspectorPage(page.path))) {
      const child = parent.children!.find((route) => route.path === page.path)!;
      const load = child.loadComponent as () => Promise<unknown>;
      expect(await load()).toBe(InspectorUnavailable);
    }
  });
});
describe('Evidence exports', () => {
  it('preserves original file bytes in a ZIP with a valid central directory', () => {
    const bytes = zip([
      { name: '../policy.txt', data: decodeDocument('data:text/plain;base64,cG9saWN5') },
    ]);
    const header = new DataView(bytes.buffer);
    expect(header.getUint32(0, true)).toBe(0x04034b50);
    const nameLength = header.getUint16(26, true),
      fileLength = header.getUint32(18, true);
    expect(
      new TextDecoder().decode(bytes.slice(30 + nameLength, 30 + nameLength + fileLength)),
    ).toBe('policy');
    expect(new TextDecoder().decode(bytes.slice(30, 30 + nameLength))).not.toContain('../');
    expect(header.getUint32(bytes.length - 22, true)).toBe(0x06054b50);
    expect(header.getUint16(bytes.length - 14, true)).toBe(1);
  });
  it('escapes spreadsheet formulas, commas and newlines in evidence indexes', () => {
    expect(csv([['=SUM(A1)', 'a,b', 'line\nbreak', 'A "quote"']])).toBe(
      '"\'=SUM(A1)","a,b","line\nbreak","A ""quote"""',
    );
  });
  it('calculates expiry labels without implying document verification', () => {
    expect(documentStatus({ status: 'Pending review', expiry: '' }, '2026-10-18')).toBe(
      'Pending review',
    );
    expect(documentStatus({ status: 'Verified', expiry: '2026-10-17' }, '2026-10-18')).toBe(
      'Expired',
    );
    expect(documentStatus({ status: 'Recorded', expiry: '2026-10-30' }, '2026-10-18')).toBe(
      'Review due',
    );
  });
});
