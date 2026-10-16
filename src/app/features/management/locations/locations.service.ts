import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { ManagementStore } from '../shared/management.store';
import { ServiceLocation, cleanLocation, locationErrors } from './locations.models';
@Injectable({ providedIn: 'root' })
export class LocationsService {
  private readonly store = inject(ManagementStore);
  private readonly auth = inject(AuthService);
  save(locations: ServiceLocation[], companyId: string, creating: boolean): string | null {
    if (companyId !== this.store.companyId() || !this.store.company())
      return 'The workspace changed. Close this window and reopen it in the correct company.';
    if (!locations.length) return 'No locations to save.';
    let error: string | null = null;
    const saved = this.store.saveWorkspace((data) => {
      const existing = data.locations ?? [];
      const next = [...existing];
      for (const [index, raw] of locations.entries()) {
        const location = cleanLocation(raw);
        const found = next.findIndex((row) => row.id === location.id);
        if (creating && found >= 0) {
          error = 'This location already exists. Refresh the list.';
          return data;
        }
        if (!creating && found < 0) {
          error = 'This location was removed. Close the editor and refresh the list.';
          return data;
        }
        const errors = locationErrors(location, next);
        if (errors.length) {
          error = (locations.length > 1 ? 'Row ' + (index + 2) + ': ' : '') + errors.join(' ');
          return data;
        }
        const updated = {
          ...location,
          modifiedAt: new Date().toISOString(),
          modifiedBy: this.auth.currentUser()?.name ?? 'Administrator',
        };
        if (creating) next.push(updated);
        else next[found] = updated;
      }
      return { ...data, locations: next };
    });
    return (
      error ??
      (saved
        ? null
        : 'Changes could not be saved. Your entries are still here; free some browser storage and try again.')
    );
  }
}
