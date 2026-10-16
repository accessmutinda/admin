import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { companyModifiedAt } from '../companies/company-profile.models';
import { LocationsService } from './locations.service';
import {
  LOCATION_TYPES,
  LOCATION_STATUSES,
  ServiceLocation,
  emptyLocation,
} from './locations.models';
export interface LocationDialogData {
  companyId: string;
  companyName: string;
  mode: 'new' | 'edit' | 'view';
  location?: ServiceLocation;
}
@Component({
  selector: 'cv-location-dialog',
  imports: [FormsModule, MatDialogModule, MatSelectModule, CvSelect],
  template: `<div class="loc-dialog">
    <div class="loc-dialog-heading">
      <span class="loc-icon material-symbols-outlined" aria-hidden="true">location_on</span>
      <h2 mat-dialog-title>
        {{
          data.mode === 'new'
            ? 'Add New Location'
            : editing()
              ? 'Edit Location'
              : 'Location Profile'
        }}
      </h2>
      @if (!editing()) {
        <button type="button" class="loc-button loc-primary" (click)="editing.set(true)">
          <span class="material-symbols-outlined" aria-hidden="true">edit</span>Edit
        </button>
      }
    </div>
    <form (ngSubmit)="save()" novalidate>
      <mat-dialog-content
        ><p>{{ data.companyName }}</p>
        <div class="loc-dialog-fields">
          @for (field of fields; track field.key) {
            <div>
              <label [for]="'loc-' + field.key"
                >{{ field.label }}
                @if (field.required) {
                  <span aria-hidden="true"> *</span>
                }
              </label>
              @if (editing()) {
                @switch (field.key) {
                  @case ('type') {
                    <mat-select
                      cvSelect
                      [id]="'loc-' + field.key"
                      [name]="field.key"
                      aria-label="Location type"
                      [(ngModel)]="draft.type"
                    >
                      @for (type of types; track type) {
                        <mat-option [value]="type">{{ type }}</mat-option>
                      }
                    </mat-select>
                  }
                  @case ('status') {
                    <mat-select
                      cvSelect
                      [id]="'loc-' + field.key"
                      [name]="field.key"
                      aria-label="Location status"
                      [(ngModel)]="draft.status"
                    >
                      @for (status of statuses; track status) {
                        <mat-option [value]="status">{{ status }}</mat-option>
                      }
                    </mat-select>
                  }
                  @default {
                    <input
                      [id]="'loc-' + field.key"
                      [name]="field.key"
                      [type]="field.type ?? 'text'"
                      [ngModel]="draft[field.key]"
                      (ngModelChange)="setField(field.key, $event)"
                      [attr.maxlength]="
                        field.type === 'number'
                          ? null
                          : field.key === 'code'
                            ? 40
                            : field.type === 'email'
                              ? 254
                              : 150
                      "
                      [attr.step]="field.key === 'registeredPlaces' ? '1' : 'any'"
                      [attr.min]="field.key === 'registeredPlaces' ? 0 : null"
                      [required]="!!field.required"
                    />
                  }
                }
              } @else {
                <div class="loc-read-value">
                  {{
                    draft[field.key] === null || draft[field.key] === ''
                      ? 'Not recorded'
                      : draft[field.key]
                  }}
                </div>
              }
            </div>
          }
          <div class="loc-dialog-wide loc-dialog-subheading">
            <span class="material-symbols-outlined" aria-hidden="true">home</span>
            <h3>Location Address</h3>
          </div>
          @for (field of addressFields; track field.key) {
            <div>
              <label [for]="'loc-address-' + field.key"
                >{{ field.label }}
                @if (field.required) {
                  <span aria-hidden="true"> *</span>
                }
              </label>
              @if (editing()) {
                <input
                  [id]="'loc-address-' + field.key"
                  [name]="'address-' + field.key"
                  [(ngModel)]="draft.address[field.key]"
                  maxlength="150"
                  [required]="!!field.required"
                />
              } @else {
                <div class="loc-read-value">{{ draft.address[field.key] || 'Not recorded' }}</div>
              }
            </div>
          }
          <div class="loc-dialog-wide">
            <label for="loc-services">Services Offered</label>
            @if (editing()) {
              <input
                id="loc-services"
                name="services"
                [(ngModel)]="servicesText"
                maxlength="1600"
                placeholder="Separate service names with commas"
              /><small>Up to 20 services, 80 characters each.</small>
            } @else {
              <div class="loc-service-tags">
                @for (service of draft.services; track service) {
                  <span>{{ service }}</span>
                } @empty {
                  <span>Not recorded</span>
                }
              </div>
            }
          </div>
        </div>
        @if (error()) {
          <p class="loc-error" role="alert">{{ error() }}</p>
        }
        @if (editing()) {
          <p>
            Save Changes updates this workspace's location register. Manager details do not create
            user accounts.
          </p>
        } @else {
          <p>
            Last updated: {{ modifiedAt(draft.modifiedAt) }} ·
            {{ draft.modifiedBy || 'Not recorded' }}
          </p>
        }</mat-dialog-content
      ><mat-dialog-actions align="end"
        ><button type="button" class="loc-button" (click)="dialog.close()">
          {{ editing() ? 'Cancel' : 'Close' }}
        </button>
        @if (editing()) {
          <button type="submit" class="loc-button loc-primary">
            <span class="material-symbols-outlined" aria-hidden="true">save</span>Save Changes
          </button>
        }
      </mat-dialog-actions>
    </form>
  </div>`,
})
export class LocationDialog {
  protected readonly data = inject<LocationDialogData>(MAT_DIALOG_DATA);
  protected readonly dialog = inject(MatDialogRef<LocationDialog>);
  private readonly locations = inject(LocationsService);
  protected readonly editing = signal(this.data.mode !== 'view');
  protected readonly error = signal('');
  protected readonly draft = structuredClone(this.data.location ?? emptyLocation());
  protected servicesText = this.draft.services.join(', ');
  protected readonly modifiedAt = companyModifiedAt;
  protected readonly types = LOCATION_TYPES;
  protected readonly statuses = LOCATION_STATUSES;
  protected readonly fields: {
    key: Exclude<
      keyof ServiceLocation,
      'address' | 'services' | 'id' | 'modifiedAt' | 'modifiedBy'
    >;
    label: string;
    type?: string;
    required?: boolean;
  }[] = [
    { key: 'name', label: 'Location Name', required: true },
    { key: 'code', label: 'Location Code', required: true },
    { key: 'type', label: 'Type', required: true },
    { key: 'status', label: 'Status', required: true },
    { key: 'region', label: 'Region' },
    { key: 'registeredPlaces', label: 'Registered Places', type: 'number', required: true },
    { key: 'manager', label: 'Manager' },
    { key: 'hours', label: 'Operating Hours' },
    { key: 'phone', label: 'Contact Phone', type: 'tel' },
    { key: 'email', label: 'Contact Email', type: 'email' },
    { key: 'managerPhone', label: 'Manager Phone', type: 'tel' },
    { key: 'managerEmail', label: 'Manager Email', type: 'email' },
    { key: 'latitude', label: 'Latitude (optional)', type: 'number' },
    { key: 'longitude', label: 'Longitude (optional)', type: 'number' },
  ];
  protected readonly addressFields: {
    key: keyof ServiceLocation['address'];
    label: string;
    required?: boolean;
  }[] = [
    { key: 'line1', label: 'Address Line 1', required: true },
    { key: 'line2', label: 'Address Line 2' },
    { key: 'city', label: 'City', required: true },
    { key: 'county', label: 'County' },
    { key: 'postcode', label: 'Postcode', required: true },
    { key: 'country', label: 'Country', required: true },
  ];
  protected setField(
    key: (typeof this.fields)[number]['key'],
    value: string | number | null,
  ): void {
    Object.assign(this.draft, { [key]: value });
  }
  protected save(): void {
    if (!this.editing()) return;
    const draft = { ...this.draft, services: this.servicesText.split(',') };
    const error = this.locations.save([draft], this.data.companyId, this.data.mode === 'new');
    this.error.set(error ?? '');
    if (!error) this.dialog.close(this.draft.id);
  }
}
