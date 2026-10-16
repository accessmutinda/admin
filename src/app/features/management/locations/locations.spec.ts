import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { ToastService } from '../../../shared/ui/toast.service';
import { ManagementStore } from '../shared/management.store';
import { LocationsPage } from './locations';
import { LocationsService } from './locations.service';
import { LocationDialog } from './location-dialog';
import { LocationImportDialog } from './location-import-dialog';
import { LocationMapDialog } from './location-map';
import {
  LOCATION_CSV_HEADERS,
  ServiceLocation,
  emptyLocation,
  hasCoordinates,
  locationErrors,
  locationsComplete,
  parseCsv,
  parseLocations,
} from './locations.models';
@Component({ template: '' })
class EmptyPage {}
interface LocationsEditor {
  locations(): ServiceLocation[];
  filtered(): ServiceLocation[];
  rows(): ServiceLocation[];
  selected(): ServiceLocation | undefined;
  stats(): { value: number }[];
  page: { set(value: number): void };
  pageCount(): number;
  currentPage(): number;
  setFilter(key: string, value: string): void;
  clearFilters(): void;
  choose(id: string): void;
  sort(key: string): void;
  openLocation(mode: string, row?: ServiceLocation): void;
  importLocations(): void;
  expandMap(): void;
  toggleActive(row: ServiceLocation): void;
  error(): string;
}
interface LocationEditor {
  draft: ServiceLocation;
  servicesText: string;
  save(): void;
  error(): string;
  editing: { set(value: boolean): void };
}
interface ImportEditor {
  read(event: Event): Promise<void>;
  save(): void;
  error(): string;
  rows(): ServiceLocation[];
}
function location(index = 1): ServiceLocation {
  return {
    ...emptyLocation(),
    id: 'location-' + index,
    name: 'Care Location ' + String(index).padStart(2, '0'),
    code: 'LOC-' + index,
    type: index % 2 ? 'Residential Care Home' : 'Community Service',
    region: index % 2 ? 'London' : 'South East',
    address: {
      line1: index + ' Green Lane',
      line2: '',
      city: 'London',
      county: 'London',
      postcode: 'SW1A 1AA',
      country: 'United Kingdom',
    },
    registeredPlaces: index % 2 ? 20 : 0,
    manager: 'Manager ' + index,
    status: index % 3 === 0 ? 'Pending Review' : index % 3 === 1 ? 'Active' : 'In Progress',
    modifiedAt: new Date(Date.now() - index * 86400000).toISOString(),
    modifiedBy: 'Administrator',
  };
}
describe('Branches and service locations', () => {
  let store: ManagementStore;
  let service: LocationsService;
  let harness: RouterTestingHarness;
  const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'manage/locations', component: LocationsPage },
          { path: 'manage/companies', component: EmptyPage },
        ]),
        { provide: ToastService, useValue: toast },
      ],
    });
    TestBed.inject(AuthService).signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    store = TestBed.inject(ManagementStore);
    service = TestBed.inject(LocationsService);
    harness = await RouterTestingHarness.create();
    vi.clearAllMocks();
  });
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    vi.restoreAllMocks();
  });
  async function open() {
    return (await harness.navigateByUrl(
      '/manage/locations',
      LocationsPage,
    )) as unknown as LocationsEditor;
  }
  function populate(count = 23) {
    const rows = Array.from({ length: count }, (_, i) => location(i + 1));
    store.saveWorkspace((data) => ({ ...data, locations: rows }));
    return rows;
  }
  it('shows the current company banner, empty register and filters without tabs', async () => {
    const editor = await open();
    expect(harness.routeNativeElement!.querySelector('.co-summary')!.textContent).toContain(
      store.company()!.name,
    );
    expect(harness.routeNativeElement!.textContent).toContain('No locations yet');
    expect(harness.routeNativeElement!.querySelector('[role="tablist"]')).toBeNull();
    expect(harness.routeNativeElement!.querySelectorAll('mat-select')).toHaveLength(3);
    expect(editor.stats().map((row) => row.value)).toEqual([0, 0, 0, 0]);
    expect(editor.selected()).toBeUndefined();
  });
  it('paginates seven rows, combines filters and selects a map location on another page', async () => {
    const rows = populate();
    const editor = await open();
    expect(editor.rows()).toHaveLength(7);
    expect(editor.pageCount()).toBe(4);
    expect(editor.stats().map((row) => row.value)).toEqual([23, 8, 240, 7]);
    editor.choose(rows[22].id);
    expect(editor.currentPage()).toBe(4);
    expect(editor.selected()!.id).toBe(rows[22].id);
    editor.setFilter('type', 'Community Service');
    expect(editor.filtered()).toHaveLength(11);
    expect(editor.currentPage()).toBe(1);
    editor.setFilter('status', 'Pending Review');
    expect(editor.filtered()).toHaveLength(3);
    editor.setFilter('search', 'Manager 12');
    expect(editor.filtered().map((row) => row.id)).toEqual(['location-12']);
    editor.clearFilters();
    editor.sort('registeredPlaces');
    editor.sort('registeredPlaces');
    expect(editor.rows()[0].registeredPlaces).toBe(20);
  });
  it('keeps locations isolated and resets filters on workspace changes', async () => {
    populate(2);
    const editor = await open();
    editor.setFilter('search', 'Care');
    TestBed.inject(WorkspaceService).switchWorkspace('riverside');
    harness.detectChanges();
    expect(editor.locations()).toEqual([]);
    expect(editor.filtered()).toEqual([]);
    expect(harness.routeNativeElement!.querySelector('.co-summary')!.textContent).toContain(
      'Riverside',
    );
    const row = location(3);
    expect(service.save([row], 'riverside', true)).toBeNull();
    expect(store.records()['lqcs'].locations).toHaveLength(2);
    expect(store.data().locations).toHaveLength(1);
  });
  it('opens real add/edit/profile/map dialogs and closes editors when the workspace changes', async () => {
    populate(1);
    const editor = await open();
    const dialog = harness.routeDebugElement!.injector.get(MatDialog);
    editor.openLocation('new');
    expect(dialog.openDialogs.at(-1)!.componentInstance).toBeInstanceOf(LocationDialog);
    dialog.closeAll();
    editor.openLocation('view');
    const profile = dialog.openDialogs.at(-1)!.componentInstance as unknown as LocationEditor;
    expect(profile.draft.name).toBe(location().name);
    expect(document.querySelector('cv-location-dialog input')).toBeNull();
    dialog.closeAll();
    editor.openLocation('edit');
    expect(dialog.openDialogs.at(-1)!.componentInstance).toBeInstanceOf(LocationDialog);
    TestBed.inject(WorkspaceService).switchWorkspace('riverside');
    harness.detectChanges();
    expect(dialog.openDialogs.every((ref) => ref.getState() !== 0)).toBe(true);
    editor.expandMap();
    expect(dialog.openDialogs.at(-1)!.componentInstance).toBeInstanceOf(LocationMapDialog);
  });
  it('saves and edits locations with real metadata while preserving unrelated data', () => {
    const before = structuredClone(store.data());
    const row = location();
    expect(service.save([row], 'lqcs', true)).toBeNull();
    const saved = store.data().locations![0];
    expect(saved.modifiedBy).toBe('Jane Doe');
    expect(Number.isFinite(Date.parse(saved.modifiedAt))).toBe(true);
    expect(
      service.save([{ ...saved, name: 'Updated Home', registeredPlaces: 24 }], 'lqcs', false),
    ).toBeNull();
    expect(store.data().locations).toHaveLength(1);
    expect(store.data().locations![0].name).toBe('Updated Home');
    expect(store.data().people).toEqual(before.people);
    expect(store.data().members).toEqual(before.members);
    expect(store.company()!.registeredPlaces).toBeUndefined();
    expect(
      JSON.parse(localStorage.getItem('cv_management_v1')!).lqcs.locations[0].registeredPlaces,
    ).toBe(24);
  });
  it('rejects invalid fields, duplicate codes and edits to missing locations', () => {
    const invalid = {
      ...location(),
      name: '',
      registeredPlaces: -1,
      email: 'bad',
      latitude: 100,
      longitude: null,
    };
    expect(locationErrors(invalid, []).join(' ')).toContain('nonnegative whole');
    expect(service.save([invalid], 'lqcs', true)).toContain('valid email');
    expect(store.data().locations).toBeUndefined();
    expect(service.save([location()], 'lqcs', true)).toBeNull();
    expect(service.save([{ ...location(2), code: ' loc-1 ' }], 'lqcs', true)).toContain(
      'already exists',
    );
    expect(service.save([location(3)], 'lqcs', false)).toContain('removed');
  });
  it('refuses stale workspace writes and keeps all-or-nothing imports on validation/storage failure', () => {
    expect(service.save([location()], 'riverside', true)).toContain('workspace changed');
    const duplicate = { ...location(2), code: 'LOC-1' };
    expect(service.save([location(), duplicate], 'lqcs', true)).toContain('already exists');
    expect(store.data().locations).toBeUndefined();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Full');
    });
    expect(service.save([location(), location(2)], 'lqcs', true)).toContain('could not be saved');
    expect(store.data().locations).toBeUndefined();
  });
  it('retains dialog edits on failure and saves explicit zero places', async () => {
    const editor = await open();
    editor.openLocation('new');
    const dialog = harness.routeDebugElement!.injector.get(MatDialog);
    const ref = dialog.openDialogs.at(-1)!;
    const form = ref.componentInstance as unknown as LocationEditor;
    Object.assign(form.draft, location(2));
    form.servicesText = 'Day care, Respite care';
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Full');
    });
    form.save();
    expect(form.error()).toContain('could not be saved');
    expect(form.draft.registeredPlaces).toBe(0);
    write.mockRestore();
    form.save();
    expect(store.data().locations![0].services).toEqual(['Day care', 'Respite care']);
    expect(store.data().locations![0].registeredPlaces).toBe(0);
  });
  it('plots only supplied valid coordinates and permits explicit external map links', async () => {
    const rows = populate(2);
    rows[0] = { ...rows[0], latitude: 51.5, longitude: -0.12 };
    store.saveWorkspace((data) => ({ ...data, locations: rows }));
    await open();
    expect(harness.routeNativeElement!.querySelectorAll('.loc-map-pin')).toHaveLength(1);
    expect(harness.routeNativeElement!.querySelector('.loc-map-caption')!.textContent).toContain(
      '1 of 2',
    );
    const link = harness.routeNativeElement!.querySelector(
      'a[aria-label*="address on map"]',
    ) as HTMLAnchorElement;
    expect(link.href).toContain('https://www.google.com/maps/search/');
    expect(link.target).toBe('_blank');
    expect(hasCoordinates({ ...rows[0], latitude: null })).toBe(false);
  });
  it('uses actual pending states for the setup checklist', () => {
    expect(locationsComplete(undefined)).toBe(false);
    expect(locationsComplete([location()])).toBe(true);
    expect(locationsComplete([location(2)])).toBe(false);
    expect(locationsComplete([{ ...location(2), status: 'Inactive' }])).toBe(true);
  });
  it('confirms status changes without removing records', async () => {
    const [row] = populate(1);
    const editor = await open();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    editor.toggleActive(row);
    expect(store.data().locations![0].status).toBe('Active');
    confirm.mockReturnValue(true);
    editor.toggleActive(row);
    expect(store.data().locations![0].status).toBe('Inactive');
    expect(store.data().locations).toHaveLength(1);
  });
  it('parses quoted CSV fields and rejects malformed or oversized imports', () => {
    const text =
      'name,code,type,addressLine1,city,postcode,registeredPlaces\r\n"Home, \"\"One\"\"",IMP-1,Community Service,12 Green Lane,London,SW1A 1AA,0';
    const [row] = parseLocations(text);
    expect(row.name).toBe('Home, "One"');
    expect(row.registeredPlaces).toBe(0);
    expect(locationErrors(row, [])).toEqual([]);
    expect(() => parseCsv('name\n"unclosed')).toThrow('not closed');
    expect(() => parseLocations('name,code\nHome,A')).toThrow('Missing required');
    expect(() => parseLocations('name,name\nHome,A')).toThrow('unique');
    expect(() =>
      parseLocations(
        'name,code,type,addressLine1,city,postcode,registeredPlaces\n' +
          Array(501).fill('Home,X,Community Service,Street,London,SW1A 1AA,0').join('\n'),
      ),
    ).toThrow('500');
    expect(LOCATION_CSV_HEADERS).toContain('services');
  });
  it('previews CSV rows and keeps them available to retry after storage failure', async () => {
    const editor = await open();
    editor.importLocations();
    const dialog = harness.routeDebugElement!.injector.get(MatDialog);
    const form = dialog.openDialogs.at(-1)!.componentInstance as unknown as ImportEditor;
    const content =
      'name,code,type,addressLine1,city,postcode,registeredPlaces\nImported Home,IMP-1,Community Service,12 Green Lane,London,SW1A 1AA,0';
    await form.read({
      target: {
        files: [{ name: 'locations.csv', size: content.length, text: async () => content }],
      },
    } as unknown as Event);
    expect(form.rows()).toHaveLength(1);
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Full');
    });
    form.save();
    expect(form.error()).toContain('could not be saved');
    expect(form.rows()).toHaveLength(1);
    write.mockRestore();
    form.save();
    expect(store.data().locations![0].name).toBe('Imported Home');
  });
});
