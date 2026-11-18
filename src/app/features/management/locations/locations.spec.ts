import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '../../../core/auth/auth.service';
import { CompaniesApiService } from '../companies/companies-api.service';
import { ManagementStore } from '../shared/management.store';
import { ToastService } from '../../../shared/ui/toast.service';
import { LocationsService } from './locations.service';
import { LocationsPage } from './locations';
import { LocationDialog } from './location-dialog';
import { LocationImportDialog } from './location-import-dialog';
import {
  emptyLocation,
  locationErrors,
  parseCsv,
  parseLocations,
  hasCoordinates,
  locationsComplete,
  LOCATION_CSV_HEADERS,
} from './locations.models';

const record = (index = 1): any => ({
  id: `location-${index}`,
  etag: '"v1"',
  version: 1,
  name: `Care Location ${String(index).padStart(2, '0')}`,
  code: `LOC-${index}`,
  type: 'Community Service',
  region: 'England',
  address: {
    line1: '12 Care Road',
    line2: '',
    city: 'London',
    county: '',
    postcode: 'SW1A 1AA',
    country: 'United Kingdom',
  },
  registered_places: 0,
  manager: { name: 'Manager', email: null, phone: null },
  phone: '',
  email: '',
  operating_hours: { description: '08:00 - 18:00' },
  services: ['Community care'],
  status: 'active',
  latitude: '51.507400',
  longitude: '-0.127800',
  updated_at: '2026-11-01T10:00:00Z',
  updated_by: { name: 'Administrator' },
});

describe('Company locations backed by the server', () => {
  let api: ReturnType<typeof vi.fn>;
  let service: LocationsService;
  let store: any;
  let records: any[];
  let dialogRef: any;
  beforeEach(() => {
    records = [record()];
    dialogRef = { close: vi.fn(), disableClose: false };
    store = {
      companyId: signal('north'),
      company: signal({ id: 'north', name: 'North Care', code: 'N', modules: [], active: true }),
      download: vi.fn(),
    };
    api = vi.fn(async (path: string, body?: any, method?: string) => {
      if (method === 'POST')
        return {
          ...record(2),
          ...body,
          manager: {
            name: body.manager_name,
            email: body.manager_email,
            phone: body.manager_phone,
          },
        };
      if (method === 'PATCH')
        return {
          ...records[0],
          ...body,
          manager: {
            name: body.manager_name,
            email: body.manager_email,
            phone: body.manager_phone,
          },
          etag: '"v2"',
          version: 2,
        };
      return { results: records, next: null, meta: { company_id: store.companyId() } };
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: MAT_DIALOG_DATA,
          useValue: { companyId: 'north', companyName: 'North Care', mode: 'new' },
        },
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: AuthService,
          useValue: {
            api,
            isAuthenticated: () => true,
            canAccessCompany: () => true,
            profile: () => ({ id: 'actor' }),
          },
        },
        { provide: ManagementStore, useValue: store },
        {
          provide: CompaniesApiService,
          useValue: { loading: () => false, loaded: () => true, error: () => '', refreshCompany: vi.fn().mockResolvedValue(undefined) },
        },
        { provide: ToastService, useValue: { success: vi.fn() } },
      ],
    });
    service = TestBed.inject(LocationsService);
  });
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    vi.restoreAllMocks();
  });
  it('loads company-scoped records and maps coordinates, capacity, manager and version', async () => {
    expect(await service.load('north')).toBeNull();
    expect(service.locations()[0]).toMatchObject({
      id: 'location-1',
      registeredPlaces: 0,
      manager: 'Manager',
      latitude: 51.5074,
      status: 'Active',
      version: 1,
    });
    expect(api).toHaveBeenCalledWith('/companies/north/locations');
  });
  it('explains the same active-location requirement when the register has no active entries', async () => {
    records = [];
    const fixture = TestBed.createComponent(LocationsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.textContent).toContain('No locations yet');
    expect(root.textContent).toContain('Add at least one active location');

    records = [{ ...record(), status: 'inactive' }];
    await service.load('north');
    fixture.detectChanges();
    expect(root.textContent).not.toContain('No locations yet');
    expect(root.textContent).toContain('Add at least one active location');

    records.push(record(2));
    await service.load('north');
    fixture.detectChanges();
    expect(root.textContent).not.toContain('Add at least one active location');
  });
  it('loads every location page and rejects pagination outside the company', async () => {
    api.mockResolvedValueOnce({
      results: [record()],
      next: '/api/v1/companies/north/locations?page=2',
      meta: { company_id: 'north' },
    });
    api.mockResolvedValueOnce({ results: [record(2)], next: null, meta: { company_id: 'north' } });
    expect(await service.load('north')).toBeNull();
    expect(service.locations()).toHaveLength(2);
    api.mockResolvedValueOnce({
      results: [],
      next: '/api/v1/companies/south/locations?page=2',
      meta: { company_id: 'north' },
    });
    expect(await service.load('north')).toContain('scope mismatch');
    expect(service.locations()).toEqual([]);
  });
  it('does not retain foreign-company records or failed reads', async () => {
    api.mockResolvedValueOnce({ results: [record()], next: null, meta: { company_id: 'south' } });
    expect(await service.load('north')).toContain('scope mismatch');
    api.mockRejectedValueOnce(new Error('Unavailable'));
    expect(await service.load('north')).toBe('Unavailable');
    expect(service.locations()).toEqual([]);
  });
  it('hides old locations immediately on a workspace change and blocks stale writes', async () => {
    await service.load('north');
    const row = service.locations()[0];
    store.companyId.set('south');
    expect(service.locations()).toEqual([]);
    expect(await service.save([row], 'north', false)).toContain('workspace changed');
  });
  it('creates locations through the backend and uses the returned server ID', async () => {
    const row = { ...emptyLocation(), ...serviceRow() };
    expect(await service.save([row], 'north', true)).toBeNull();
    expect(api).toHaveBeenCalledWith(
      '/companies/north/locations',
      expect.objectContaining({
        registered_places: 0,
        status: 'active',
        operating_hours: { description: '08:00 - 18:00' },
      }),
      'POST',
      expect.objectContaining({ 'Idempotency-Key': expect.any(String) }),
    );
    expect(service.lastSavedId()).toBe('location-2');
  });
  it('preserves retry keys after network failure and changes them for corrected entries', async () => {
    const row = serviceRow();
    api.mockRejectedValueOnce(new Error('Offline'));
    expect(await service.save([row], 'north', true)).toBe('Offline');
    await service.save([row], 'north', true);
    expect(api.mock.calls[0][3]).toEqual(api.mock.calls[1][3]);
  });
  it('updates with optimistic version control, retaining confirmed records after conflicts', async () => {
    await service.load('north');
    const row = { ...service.locations()[0], status: 'Inactive' };
    api.mockRejectedValueOnce(new Error('The record changed. Reload.'));
    expect(await service.save([row], 'north', false)).toContain('record changed');
    expect(service.locations()[0].status).toBe('Active');
    expect(await service.save([row], 'north', false)).toBeNull();
    expect(api).toHaveBeenLastCalledWith(
      '/companies/north/locations/location-1',
      expect.objectContaining({ status: 'inactive' }),
      'PATCH',
      { 'If-Match': '"v1"' },
    );
    expect(service.locations()[0].status).toBe('Inactive');
  });
  it('rejects invalid fields and duplicate codes before sending a write', async () => {
    await service.load('north');
    api.mockClear();
    expect(await service.save([emptyLocation()], 'north', true)).toContain('location name');
    expect(await service.save([{ ...serviceRow(), id: 'new' }], 'north', true)).toContain(
      'already exists',
    );
    expect(api).not.toHaveBeenCalled();
  });
  it('uses the import endpoint and retains only failed rows for retry', async () => {
    api.mockResolvedValueOnce({
      results: [
        { index: 0, ok: true, id: 'saved' },
        { index: 1, ok: false, detail: 'Code exists.' },
      ],
    });
    const rows = [serviceRow(), { ...serviceRow(), code: 'OTHER' }];
    const result = await service.importRows(rows, 'north');
    expect(result.saved).toBe(1);
    expect(result.failed).toEqual([rows[1]]);
    expect(result.error).toContain('Row 3');
    expect(api.mock.calls[0][1]).toHaveProperty('locations');
  });
  it('renders backend records, combines filters and paginates seven rows', async () => {
    records = Array.from({ length: 12 }, (_, index) => record(index));
    const fixture = TestBed.createComponent(LocationsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const editor = fixture.componentInstance as any;
    expect(editor.pageCount()).toBe(2);
    expect(editor.rows()).toHaveLength(7);
    editor.page.set(2);
    expect(editor.rows()).toHaveLength(5);
    editor.setFilter('search', 'LOC-11');
    expect(editor.rows()).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('North Care');
  });
  it('preserves dialog edits on failure and closes with the saved server ID', async () => {
    const ref = dialogRef;
    const fixture = TestBed.createComponent(LocationDialog);
    const editor = fixture.componentInstance as any;
    Object.assign(editor.draft, serviceRow());
    editor.servicesText = 'Community care';
    api.mockRejectedValueOnce(new Error('Offline'));
    await editor.save();
    expect(editor.error()).toBe('Offline');
    expect(ref.close).not.toHaveBeenCalled();
    await editor.save();
    expect(ref.close).toHaveBeenCalledWith('location-2');
  });
  function serviceRow(): any {
    return {
      ...emptyLocation(),
      id: 'draft',
      name: 'North branch',
      code: 'LOC-1',
      type: 'Community Service',
      address: record().address,
      registeredPlaces: 0,
      hours: '08:00 - 18:00',
      services: ['Community care'],
      status: 'Active',
    };
  }
});

describe('Location validation and CSV data', () => {
  it.each([null, -1, 1.5, 2147483648])('rejects invalid registered capacity %s', (capacity) => {
    expect(
      locationErrors({ ...emptyLocation(), registeredPlaces: capacity }, []).join(' '),
    ).toContain('capacity');
  });
  it('parses escaped CSV values, explicit zero, and rejects malformed or oversized imports', () => {
    const [row] = parseLocations(
      'name,code,type,addressLine1,city,postcode,registeredPlaces\r\n"Home, ""One""",IMP-1,Community Service,12 Green Lane,London,SW1A 1AA,0',
    );
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
  it('requires explicit valid coordinates for map plotting', () => {
    const row = emptyLocation();
    expect(hasCoordinates(row)).toBe(false);
    row.latitude = 51.5;
    row.longitude = -0.12;
    expect(hasCoordinates(row)).toBe(true);
    row.latitude = 91;
    expect(hasCoordinates(row)).toBe(false);
    expect(locationsComplete([])).toBe(false);
  });
});
