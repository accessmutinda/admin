import { Component, computed, inject, input, output } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ServiceLocation, hasCoordinates } from './locations.models';
@Component({
  selector: 'cv-location-map',
  template: `<div class="loc-map" role="group" aria-label="Location coordinate overview">
      @for (point of points(); track point.location.id) {
        <button
          type="button"
          class="loc-map-pin"
          [class.loc-map-selected]="point.location.id === selectedId()"
          [style.left.%]="point.x"
          [style.top.%]="point.y"
          [attr.aria-label]="'Select ' + point.location.name"
          [attr.aria-pressed]="point.location.id === selectedId()"
          [title]="point.location.name"
          (click)="select.emit(point.location.id)"
        >
          <span class="material-symbols-outlined" aria-hidden="true">location_on</span>
        </button>
      } @empty {
        <div class="loc-map-empty">
          <span class="material-symbols-outlined" aria-hidden="true">map</span
          ><strong>No coordinates recorded</strong
          ><span>Add latitude and longitude to show locations here.</span>
        </div>
      }
    </div>
    <p class="loc-map-caption">
      Schematic view of saved coordinates · {{ points().length }} of
      {{ locations().length }} locations mapped.
    </p>`,
})
export class LocationMap {
  readonly locations = input.required<ServiceLocation[]>();
  readonly selectedId = input<string>();
  readonly select = output<string>();
  protected readonly points = computed(() => {
    const mapped = this.locations().filter(hasCoordinates);
    const lat = mapped.map((row) => row.latitude!);
    const lng = mapped.map((row) => row.longitude!);
    const minLat = Math.min(...lat),
      maxLat = Math.max(...lat),
      minLng = Math.min(...lng),
      maxLng = Math.max(...lng);
    return mapped.map((location) => ({
      location,
      x: maxLng === minLng ? 50 : 15 + ((location.longitude! - minLng) / (maxLng - minLng)) * 70,
      y: maxLat === minLat ? 50 : 85 - ((location.latitude! - minLat) / (maxLat - minLat)) * 70,
    }));
  });
}
@Component({
  selector: 'cv-location-map-dialog',
  imports: [MatDialogModule, LocationMap],
  template: `<div class="loc-dialog">
    <div class="loc-dialog-heading"><h2 mat-dialog-title>Location Overview</h2></div>
    <mat-dialog-content
      ><cv-location-map
        [locations]="data.locations"
        [selectedId]="data.selectedId"
        (select)="dialog.close($event)" /></mat-dialog-content
    ><mat-dialog-actions align="end"
      ><button type="button" class="loc-button" (click)="dialog.close()">
        Close
      </button></mat-dialog-actions
    >
  </div>`,
})
export class LocationMapDialog {
  protected readonly data = inject<{ locations: ServiceLocation[]; selectedId?: string }>(
    MAT_DIALOG_DATA,
  );
  protected readonly dialog = inject(MatDialogRef<LocationMapDialog>);
}
