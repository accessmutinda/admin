import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ManagementStore } from '../shared/management.store';
import { LocationsService } from './locations.service';
import {
  LOCATION_CSV_HEADERS,
  LOCATION_TYPES,
  ServiceLocation,
  locationErrors,
  parseLocations,
} from './locations.models';
@Component({
  selector: 'cv-location-import',
  imports: [MatDialogModule],
  template: `<div class="loc-dialog">
    <div class="loc-dialog-heading">
      <span class="loc-icon material-symbols-outlined" aria-hidden="true">upload_file</span>
      <h2 mat-dialog-title>Import Locations</h2>
    </div>
    <mat-dialog-content
      ><p>
        Add locations to {{ data.companyName }} from a CSV file. Existing records will not be
        overwritten.
      </p>
      <button type="button" class="loc-button loc-outline" (click)="template()">
        <span class="material-symbols-outlined" aria-hidden="true">download</span>Download Template</button
      ><label for="loc-csv">CSV file · up to 1 MB / 500 locations</label
      ><input
        id="loc-csv"
        type="file"
        accept=".csv,text/csv"
        (change)="read($event)"
        [disabled]="loading()"
      />
      <p>
        Required columns: name, code, type, addressLine1, city, postcode and registeredPlaces. Use
        zero places for community services. Separate services with semicolons.
      </p>
      <p>Supported types: {{ types.join(', ') }}.</p>
      @if (loading()) {
        <p role="status">Reading locations…</p>
      }
      @if (error()) {
        <p class="loc-error" role="alert">{{ error() }}</p>
      }
      @if (rows().length) {
        <h3>Preview · {{ rows().length }} locations</h3>
        <div class="loc-import-preview">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Type</th>
                <th>Places</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows().slice(0, 5); track row.id) {
                <tr>
                  <td>{{ row.name }}</td>
                  <td>{{ row.code }}</td>
                  <td>{{ row.type }}</td>
                  <td>{{ row.registeredPlaces }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p>
          Showing the first {{ rows().slice(0, 5).length }} rows. All {{ rows().length }} rows will
          be validated and saved together.
        </p>
      }</mat-dialog-content
    ><mat-dialog-actions align="end"
      ><button type="button" class="loc-button" (click)="dialog.close()">Cancel</button
      ><button
        type="button"
        class="loc-button loc-primary"
        [disabled]="loading() || !rows().length"
        (click)="save()"
      >
        Import {{ rows().length || '' }} Locations
      </button></mat-dialog-actions
    >
  </div>`,
})
export class LocationImportDialog {
  protected readonly data = inject<{ companyId: string; companyName: string }>(MAT_DIALOG_DATA);
  protected readonly dialog = inject(MatDialogRef<LocationImportDialog>);
  private readonly store = inject(ManagementStore);
  private readonly service = inject(LocationsService);
  protected readonly rows = signal<ServiceLocation[]>([]);
  protected readonly error = signal('');
  protected readonly loading = signal(false);
  protected readonly types = LOCATION_TYPES;
  protected template(): void {
    this.store.download(
      'locations-template.csv',
      LOCATION_CSV_HEADERS.join(',') + '\r\n',
      'text/csv;charset=utf-8',
    );
  }
  protected async read(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.rows.set([]);
    this.error.set('');
    if (file.size > 1024 * 1024 || !/\.csv$/i.test(file.name)) {
      this.error.set('Choose a CSV file up to 1 MB.');
      return;
    }
    this.loading.set(true);
    try {
      const rows = parseLocations(await file.text());
      const existing = [...(this.store.data().locations ?? [])];
      for (const [index, row] of rows.entries()) {
        const errors = locationErrors(row, existing);
        if (errors.length) throw new Error('Row ' + (index + 2) + ': ' + errors.join(' '));
        existing.push(row);
      }
      this.rows.set(rows);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'The file could not be read.');
    } finally {
      this.loading.set(false);
    }
  }
  protected save(): void {
    if (this.loading() || !this.rows().length) return;
    const error = this.service.save(this.rows(), this.data.companyId, true);
    this.error.set(error ?? '');
    if (!error) this.dialog.close(this.rows().length);
  }
}
