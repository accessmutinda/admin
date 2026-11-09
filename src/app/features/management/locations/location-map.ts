import {
  Component,
  DestroyRef,
  ElementRef,
  InjectionToken,
  afterRenderEffect,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import * as L from 'leaflet';
import { ServiceLocation, hasCoordinates } from './locations.models';

export const LOCATION_MAP_TILES = new InjectionToken('Location map tiles', {
  providedIn: 'root',
  factory: () => ({
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }),
});

@Component({
  selector: 'cv-location-map',
  template: `<div class="loc-map">
      <div
        #canvas
        class="loc-map-canvas"
        role="region"
        aria-label="Service locations map"
        [hidden]="!mapped().length"
      ></div>
      @if (!mapped().length) {
        <div class="loc-map-empty">
          <span class="material-symbols-outlined" aria-hidden="true">map</span
          ><strong>No coordinates recorded</strong
          ><span>Add latitude and longitude to show locations here.</span>
        </div>
      }
    </div>
    <p class="loc-map-caption">
      Saved coordinates · {{ mapped().length }} of {{ locations().length }} locations mapped.
      @if (tilesUnavailable()) {
        <span role="status">Map tiles are unavailable. Saved location pins are still shown.</span>
      }
    </p>`,
})
export class LocationMap {
  readonly locations = input.required<ServiceLocation[]>();
  readonly selectedId = input<string>();
  readonly select = output<string>();
  protected readonly mapped = computed(() => this.locations().filter(hasCoordinates));
  protected readonly tilesUnavailable = signal(false);
  private readonly canvas = viewChild.required<ElementRef<HTMLDivElement>>('canvas');
  private readonly tiles = inject(LOCATION_MAP_TILES);
  private map?: L.Map;
  private observer?: ResizeObserver;
  private markers = new Map<string, L.Marker>();
  private extent = '';

  constructor() {
    afterRenderEffect(() => this.renderMap(this.mapped(), this.selectedId()));
    inject(DestroyRef).onDestroy(() => this.removeMap());
  }

  private renderMap(locations: ServiceLocation[], selectedId: string | undefined): void {
    if (!locations.length) {
      this.removeMap();
      this.tilesUnavailable.set(false);
      return;
    }
    if (!this.map) {
      this.map = L.map(this.canvas().nativeElement, {
        center: [locations[0].latitude!, locations[0].longitude!],
        zoom: 15,
        scrollWheelZoom: false,
        zoomAnimation: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
      });
      L.tileLayer(this.tiles.url, {
        attribution: this.tiles.attribution,
        maxZoom: this.tiles.maxZoom,
      })
        .on('tileerror', () => this.tilesUnavailable.set(true))
        .addTo(this.map);
      if (typeof ResizeObserver !== 'undefined') {
        this.observer = new ResizeObserver(() => this.map?.invalidateSize({ pan: false }));
        this.observer.observe(this.canvas().nativeElement);
      }
    }
    const map = this.map;
    const ids = new Set(locations.map((location) => location.id));
    for (const [id, marker] of this.markers) {
      if (!ids.has(id)) {
        marker.remove();
        this.markers.delete(id);
      }
    }
    for (const location of locations) {
      const selected = location.id === selectedId;
      const icon = L.divIcon({
        className: 'loc-map-pin' + (selected ? ' loc-map-selected' : ''),
        html: '<span class="material-symbols-outlined" aria-hidden="true">location_on</span>',
        iconSize: [36, 36],
        iconAnchor: [18, 30],
        tooltipAnchor: [0, -26],
      });
      let marker = this.markers.get(location.id);
      if (!marker) {
        marker = L.marker([location.latitude!, location.longitude!], { keyboard: true, icon })
          .on('click', () => this.select.emit(location.id))
          .addTo(map);
        this.markers.set(location.id, marker);
        marker.getElement()?.addEventListener('keydown', (event) => {
          if (event.key === ' ') {
            event.preventDefault();
            this.select.emit(location.id);
          }
        });
      }
      marker.setLatLng([location.latitude!, location.longitude!]);
      marker.setIcon(icon);
      marker.setZIndexOffset(selected ? 1000 : 0);
      const element = marker.getElement();
      element?.setAttribute('aria-label', 'Select ' + location.name);
      element?.setAttribute('aria-pressed', String(selected));
      element?.setAttribute('title', location.name);
      const tooltip = document.createElement('span');
      tooltip.textContent = location.name;
      if (marker.getTooltip()) marker.setTooltipContent(tooltip);
      else marker.bindTooltip(tooltip);
    }
    const extent = JSON.stringify(
      locations.map((row) => [row.id, row.latitude, row.longitude]).sort(),
    );
    if (extent !== this.extent) {
      map.invalidateSize({ pan: false });
      map.fitBounds(L.latLngBounds(locations.map((row) => [row.latitude!, row.longitude!])), {
        padding: [32, 32],
        maxZoom: 15,
        animate: false,
      });
      this.extent = extent;
    }
  }

  private removeMap(): void {
    this.observer?.disconnect();
    this.observer = undefined;
    this.map?.remove();
    this.map = undefined;
    this.markers.clear();
    this.extent = '';
  }
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
