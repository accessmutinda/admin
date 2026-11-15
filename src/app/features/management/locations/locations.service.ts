import { Injectable, computed, inject, signal } from '@angular/core';
import { CompaniesApiService } from '../companies/companies-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { API_BASE, API_BASE_PATH } from '../../../core/auth/auth-api';
import { ManagementStore } from '../shared/management.store';
import { ServiceLocation, cleanLocation, locationErrors, emptyLocation } from './locations.models';

interface LocationRecord {
  id: string;
  etag: string;
  version: number;
  name: string;
  code: string;
  type: string;
  region: string | null;
  address: ServiceLocation['address'];
  registered_places: number | null;
  manager: { name: string | null; email: string | null; phone: string | null };
  phone: string | null;
  email: string | null;
  operating_hours: { description?: string };
  services: string[];
  status: string;
  latitude: string | null;
  longitude: string | null;
  updated_at: string;
  updated_by: { name: string } | null;
}
@Injectable({ providedIn: 'root' })
export class LocationsService {
  private readonly store = inject(ManagementStore);
  private readonly auth = inject(AuthService);
  private readonly companiesApi = inject(CompaniesApiService);
  private readonly snapshot = signal<{ scope: string; rows: ServiceLocation[] } | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly lastSavedId = signal('');
  private request = 0;
  private retry = { payload: '', key: '' };
  private scope(id: string): string {
    if (
      !id ||
      id !== this.store.companyId() ||
      !this.auth.isAuthenticated() ||
      !this.auth.canAccessCompany(id)
    )
      throw Error('The workspace changed. Reopen locations in the correct company.');
    return `${this.auth.profile()?.id}:${id}`;
  }
  readonly locations = computed(() => {
    const saved = this.snapshot();
    try {
      return saved?.scope === this.scope(this.store.companyId()) ? saved.rows : [];
    } catch {
      return [];
    }
  });
  private record(row: LocationRecord): ServiceLocation {
    if (!row.id || !Number.isInteger(row.version) || !row.address || !row.manager)
      throw Error('Location records could not be read. Reload this page.');
    return {
      ...emptyLocation(),
      id: row.id,
      version: row.version,
      etag: row.etag,
      name: row.name,
      code: row.code,
      type: row.type,
      region: row.region ?? '',
      address: row.address,
      registeredPlaces: row.registered_places,
      manager: row.manager.name ?? '',
      managerEmail: row.manager.email ?? '',
      managerPhone: row.manager.phone ?? '',
      phone: row.phone ?? '',
      email: row.email ?? '',
      hours: row.operating_hours?.description ?? '',
      services: row.services,
      status: row.status
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
      latitude: row.latitude === null ? null : Number(row.latitude),
      longitude: row.longitude === null ? null : Number(row.longitude),
      modifiedAt: row.updated_at,
      modifiedBy: row.updated_by?.name ?? '',
    };
  }
  private payload(raw: ServiceLocation) {
    const row = cleanLocation(raw);
    return {
      name: row.name,
      code: row.code,
      type: row.type,
      region: row.region,
      address: row.address,
      registered_places: row.registeredPlaces,
      manager_name: row.manager,
      manager_email: row.managerEmail,
      manager_phone: row.managerPhone,
      phone: row.phone,
      email: row.email,
      operating_hours: { description: row.hours },
      services: row.services,
      status: row.status.toLowerCase().replaceAll(' ', '_'),
      latitude: row.latitude,
      longitude: row.longitude,
    };
  }
  async load(id: string): Promise<string | null> {
    const request = ++this.request;
    this.loading.set(true);
    try {
      const scope = this.scope(id),
        root = `/companies/${encodeURIComponent(id)}/locations`;
      const rows: ServiceLocation[] = [],
        visited = new Set<string>();
      let path: string | null = root;
      while (path) {
        if (visited.has(path)) throw Error('Location pagination could not be completed.');
        visited.add(path);
        const response: {
          results: LocationRecord[];
          next: string | null;
          meta: { company_id: string };
        } = await this.auth.api(path);
        if (request !== this.request || scope !== this.scope(id)) return null;
        if (response.meta?.company_id !== id || !Array.isArray(response.results))
          throw Error('Location company scope mismatch.');
        rows.push(...response.results.map((row) => this.record(row)));
        if (response.next) {
          const url = new URL(response.next, API_BASE + '/');
          if (url.origin !== new URL(API_BASE).origin || url.pathname !== API_BASE_PATH + root)
            throw Error('Location pagination scope mismatch.');
          path = root + url.search;
        } else path = null;
      }
      this.snapshot.set({ scope, rows });
      return null;
    } catch (error) {
      if (request !== this.request) return null;
      this.snapshot.set(null);
      return (error as Error).message;
    } finally {
      if (request === this.request) this.loading.set(false);
    }
  }
  private key(scope: string, payload: unknown) {
    const serialized = JSON.stringify([scope, payload]);
    if (serialized !== this.retry.payload)
      this.retry = { payload: serialized, key: crypto.randomUUID() };
    return this.retry.key;
  }
  async save(locations: ServiceLocation[], id: string, creating: boolean): Promise<string | null> {
    if (this.saving()) return 'A location save is already in progress.';
    this.saving.set(true);
    try {
      const scope = this.scope(id);
      if (locations.length !== 1) throw Error('Save one location at a time or use CSV import.');
      const raw = locations[0],
        errors = locationErrors(cleanLocation(raw), this.locations());
      if (errors.length) throw Error(errors.join(' '));
      if (!creating && !raw.version) throw Error('Reload this location before editing it.');
      const body = this.payload(raw),
        root = `/companies/${encodeURIComponent(id)}/locations`;
      const response = await this.auth.api<LocationRecord>(
        creating ? root : `${root}/${raw.id}`,
        body,
        creating ? 'POST' : 'PATCH',
        creating
          ? { 'Idempotency-Key': this.key(scope + ':create', body) }
          : { 'If-Match': raw.etag ?? `"v${raw.version}"` },
      );
      if (scope !== this.scope(id)) throw Error('The workspace changed during the location save.');
      const saved = this.record(response);
      this.snapshot.set({
        scope,
        rows: [...this.locations().filter((row) => row.id !== saved.id), saved],
      });
      await this.companiesApi.refreshCompany(id);
      this.lastSavedId.set(saved.id);
      this.retry = { payload: '', key: '' };
      return null;
    } catch (error) {
      return (error as Error).message;
    } finally {
      this.saving.set(false);
    }
  }
  async importRows(
    rows: ServiceLocation[],
    id: string,
  ): Promise<{ saved: number; failed: ServiceLocation[]; error: string }> {
    const scope = this.scope(id),
      body = { locations: rows.map((row) => this.payload(row)) };
    const result = await this.auth.api<{
      results: { index: number; ok: boolean; detail?: string }[];
    }>(`/companies/${id}/locations/import`, body, 'POST', {
      'Idempotency-Key': this.key(scope + ':import', body),
    });
    if (scope !== this.scope(id)) throw Error('The workspace changed during import.');
    if (!Array.isArray(result.results) || result.results.length !== rows.length)
      throw Error('Import result could not be read. Retry the same file.');
    const failed = result.results.filter((row) => !row.ok);
    const loadError = await this.load(id);
    await this.companiesApi.refreshCompany(id);
    return {
      saved: rows.length - failed.length,
      failed: failed.map((row) => rows[row.index]),
      error: [failed.map((row) => `Row ${row.index + 2}: ${row.detail}`).join(' '), loadError]
        .filter(Boolean)
        .join(' '),
    };
  }
}
