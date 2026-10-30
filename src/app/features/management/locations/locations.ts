import { CardTonePipe } from '../../../shared/ui/card-tone.pipe';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { CvSelect } from '../../../shared/ui/select';
import { ManagementStore } from '../shared/management.store';
import { ToastService } from '../../../shared/ui/toast.service';
import { companyModifiedAt } from '../companies/company-profile.models';
import {
  LOCATION_TYPES,
  LOCATION_STATUSES,
  ServiceLocation,
  locationAddress,
} from './locations.models';
import { LocationsService } from './locations.service';
import { LocationDialog } from './location-dialog';
import { LocationImportDialog } from './location-import-dialog';
import { LocationMap, LocationMapDialog } from './location-map';
type LocationSort =
  'name' | 'type' | 'address' | 'region' | 'registeredPlaces' | 'manager' | 'status' | 'modifiedAt';
@Component({
  selector: 'cv-locations',
  host: { class: 'module-page companies-page locations-page' },
  imports: [
    CardTonePipe,
    FormsModule,
    RouterLink,
    MatDialogModule,
    MatSelectModule,
    MatMenuModule,
    CvSelect,
    LocationMap,
  ],
  templateUrl: './locations.html',
})
export class LocationsPage {
  protected readonly store = inject(ManagementStore);
  private readonly dialog = inject(MatDialog);
  private readonly service = inject(LocationsService);
  private readonly toast = inject(ToastService);
  protected readonly company = this.store.company;
  protected readonly locations = computed(() => this.store.data().locations ?? []);
  protected readonly search = signal('');
  protected readonly type = signal('all');
  protected readonly region = signal('all');
  protected readonly status = signal('all');
  protected readonly pageSize = 7;
  protected readonly page = signal(1);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly sortKey = signal<LocationSort>('name');
  protected readonly descending = signal(false);
  protected readonly error = signal('');
  protected readonly types = LOCATION_TYPES;
  protected readonly statuses = LOCATION_STATUSES;
  protected readonly modifiedAt = companyModifiedAt;
  protected readonly address = locationAddress;
  protected readonly columns: { key: LocationSort; label: string }[] = [
    { key: 'name', label: 'Location Name' },
    { key: 'type', label: 'Type' },
    { key: 'address', label: 'Address' },
    { key: 'region', label: 'Region' },
    { key: 'registeredPlaces', label: 'Registered Places' },
    { key: 'manager', label: 'Manager' },
    { key: 'status', label: 'Status' },
    { key: 'modifiedAt', label: 'Last Updated' },
  ];
  private closeDialog?: () => void;
  protected regionOf(row: ServiceLocation): string {
    return row.region || row.address.county;
  }
  protected readonly regions = computed(() =>
    [
      ...new Set(
        this.locations()
          .map((row) => this.regionOf(row))
          .filter(Boolean),
      ),
    ].sort(),
  );
  protected readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    return this.locations().filter(
      (row) =>
        (row.name + ' ' + row.code + ' ' + this.address(row) + ' ' + row.manager)
          .toLowerCase()
          .includes(query) &&
        (this.type() === 'all' || row.type === this.type()) &&
        (this.region() === 'all' ||
          (this.region() === 'missing'
            ? !this.regionOf(row)
            : this.regionOf(row) === this.region())) &&
        (this.status() === 'all' || row.status === this.status()),
    );
  });
  private value(row: ServiceLocation, key: LocationSort): string | number | null {
    if (key === 'address') return this.address(row);
    if (key === 'region') return this.regionOf(row);
    if (key === 'modifiedAt')
      return Number.isFinite(Date.parse(row.modifiedAt)) ? Date.parse(row.modifiedAt) : null;
    return row[key];
  }
  protected readonly sorted = computed(() =>
    [...this.filtered()].sort((a, b) => {
      const av = this.value(a, this.sortKey()),
        bv = this.value(b, this.sortKey());
      if ((av === null || av === '') && bv !== null && bv !== '') return 1;
      if ((bv === null || bv === '') && av !== null && av !== '') return -1;
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av ?? '').localeCompare(String(bv ?? ''), 'en', {
              numeric: true,
              sensitivity: 'base',
            });
      return (this.descending() ? -cmp : cmp) || a.id.localeCompare(b.id);
    }),
  );
  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / this.pageSize)),
  );
  protected readonly currentPage = computed(() =>
    Math.min(this.pageCount(), Math.max(1, this.page())),
  );
  protected readonly rows = computed(() =>
    this.sorted().slice(
      (this.currentPage() - 1) * this.pageSize,
      this.currentPage() * this.pageSize,
    ),
  );
  protected readonly selected = computed(
    () => this.rows().find((row) => row.id === this.selectedId()) ?? this.rows()[0],
  );
  protected readonly start = computed(() =>
    this.filtered().length ? (this.currentPage() - 1) * this.pageSize + 1 : 0,
  );
  protected readonly end = computed(() =>
    Math.min(this.currentPage() * this.pageSize, this.filtered().length),
  );
  protected readonly pages = computed(() => {
    const start = Math.max(1, Math.min(this.currentPage() - 2, this.pageCount() - 4));
    return Array.from({ length: Math.min(5, this.pageCount()) }, (_, i) => i + start);
  });
  protected readonly stats = computed(() => {
    const all = this.locations();
    return [
      {
        label: 'Total Locations',
        value: all.length,
        hint: 'Current workspace',
        icon: 'domain',
        color: '#008afa',
        progress: false,
      },
      {
        label: 'Active Locations',
        value: all.filter((row) => row.status === 'Active').length,
        hint: 'active',
        icon: 'domain',
        color: '#00a34e',
        progress: true,
      },
      {
        label: 'Registered Places',
        value: all.reduce((sum, row) => sum + (row.registeredPlaces ?? 0), 0),
        hint: 'Recorded location capacity',
        icon: 'location_on',
        color: '#ffb000',
        progress: false,
      },
      {
        label: 'New Location Requests',
        value: all.filter((row) => row.status === 'Pending Review').length,
        hint: 'Awaiting review',
        icon: 'pending_actions',
        color: '#ff3047',
        progress: false,
      },
    ];
  });
  constructor() {
    let current = this.store.companyId();
    effect(() => {
      const id = this.store.companyId();
      if (id === current) return;
      current = id;
      untracked(() => {
        this.clearFilters();
        this.closeDialog?.();
        this.closeDialog = undefined;
      });
    });
  }
  protected setFilter(key: 'search' | 'type' | 'region' | 'status', value: string): void {
    this[key].set(value);
    this.page.set(1);
    this.selectedId.set(null);
    this.error.set('');
  }
  protected clearFilters(): void {
    this.search.set('');
    this.type.set('all');
    this.region.set('all');
    this.status.set('all');
    this.page.set(1);
    this.selectedId.set(null);
    this.error.set('');
  }
  protected readonly hasFilters = computed(
    () =>
      !!this.search() ||
      this.type() !== 'all' ||
      this.region() !== 'all' ||
      this.status() !== 'all',
  );
  protected sort(key: LocationSort): void {
    this.descending.set(this.sortKey() === key ? !this.descending() : false);
    this.sortKey.set(key);
    this.page.set(1);
  }
  protected choose(id: string): void {
    const index = this.sorted().findIndex((row) => row.id === id);
    if (index < 0) return;
    this.page.set(Math.floor(index / this.pageSize) + 1);
    this.selectedId.set(id);
  }
  protected openLocation(mode: 'new' | 'edit' | 'view', row = this.selected()): void {
    const company = this.company();
    if (!company || (mode !== 'new' && !row)) return;
    const id = this.store.companyId();
    const ref = this.dialog.open(LocationDialog, {
      width: '760px',
      maxWidth: 'calc(100vw - 24px)',
      autoFocus: mode === 'view' ? 'first-tabbable' : '#loc-name',
      data: {
        companyId: id,
        companyName: company.name,
        mode,
        location: mode === 'new' ? undefined : row,
      },
    });
    this.closeDialog = () => ref.close();
    ref.afterClosed().subscribe((locationId?: string) => {
      if (id !== this.store.companyId() || !locationId) return;
      if (mode === 'new') this.clearFilters();
      this.choose(locationId);
      this.toast.success('Location saved.');
    });
  }
  protected importLocations(): void {
    const company = this.company();
    if (!company) return;
    const id = this.store.companyId();
    const ref = this.dialog.open(LocationImportDialog, {
      width: '700px',
      maxWidth: 'calc(100vw - 24px)',
      data: { companyId: id, companyName: company.name },
    });
    this.closeDialog = () => ref.close();
    ref.afterClosed().subscribe((count?: number) => {
      if (id !== this.store.companyId() || !count) return;
      this.clearFilters();
      this.toast.success(count + ' locations imported.');
    });
  }
  protected expandMap(): void {
    const ref = this.dialog.open(LocationMapDialog, {
      width: '800px',
      maxWidth: 'calc(100vw - 24px)',
      data: { locations: this.filtered(), selectedId: this.selected()?.id },
    });
    this.closeDialog = () => ref.close();
    ref.afterClosed().subscribe((id?: string) => {
      if (id) this.choose(id);
    });
  }
  protected mapUrl(row: ServiceLocation): string {
    return (
      'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(this.address(row))
    );
  }
  protected toggleActive(row: ServiceLocation): void {
    const status = row.status === 'Active' ? 'Inactive' : 'Active';
    if (!window.confirm('Mark ' + row.name + ' as ' + status.toLowerCase() + '?')) return;
    const error = this.service.save([{ ...row, status }], this.store.companyId(), false);
    this.error.set(error ?? '');
    if (!error) this.toast.success('Location status updated.');
  }
  protected phoneUrl(value: string): string {
    return 'tel:' + value.replace(/[^+\d]/g, '');
  }
}
