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

export type MapLocation = Pick<ServiceLocation, 'id' | 'name' | 'latitude' | 'longitude'> & {
  kind?: 'service-user' | 'care-worker';
  badge?: string;
  label?: string;
  offset?: readonly [number, number];
};
export type MapPoint = readonly [number, number];

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
        [attr.aria-label]="mapLabel()"
        [hidden]="!mapped().length"
      ></div>
      @if (!mapped().length) {
        <div class="loc-map-empty">
          <span class="material-symbols-outlined" aria-hidden="true">map</span
          ><strong>No coordinates recorded</strong><span>{{ emptyMessage() }}</span>
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
  readonly locations = input.required<MapLocation[]>();
  readonly route = input<readonly MapPoint[]>([]);
  readonly mapLabel = input('Service locations map');
  readonly emptyMessage = input('Add latitude and longitude to show locations here.');
  readonly selectedId = input<string>();
  readonly select = output<string>();
  protected readonly mapped = computed(() => this.locations().filter(hasCoordinates));
  protected readonly tilesUnavailable = signal(false);
  private readonly canvas = viewChild.required<ElementRef<HTMLDivElement>>('canvas');
  private readonly tiles = inject(LOCATION_MAP_TILES);
  private map?: L.Map;
  private observer?: ResizeObserver;
  private markers = new Map<string, L.Marker>();
  private routeLine?: L.Polyline;
  private extent = '';

  constructor() {
    afterRenderEffect(() => this.renderMap(this.mapped(), this.selectedId(), this.route()));
    inject(DestroyRef).onDestroy(() => this.removeMap());
  }

  private renderMap(
    locations: MapLocation[],
    selectedId: string | undefined,
    route: readonly MapPoint[],
  ): void {
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
    const routePoints = route.map(([latitude, longitude]) => L.latLng(latitude, longitude));
    if (routePoints.length > 1) {
      this.routeLine ??= L.polyline([], { color: '#26467a', weight: 5, interactive: false }).addTo(
        map,
      );
      this.routeLine.setLatLngs(routePoints);
    } else {
      this.routeLine?.remove();
      this.routeLine = undefined;
    }
    const ids = new Set(locations.map((location) => location.id));
    for (const [id, marker] of this.markers) {
      if (!ids.has(id)) {
        marker.remove();
        this.markers.delete(id);
      }
    }
    for (const location of locations) {
      const selected = location.id === selectedId;
      const [x, y] = location.offset ?? [0, 0];
      const pin = document.createElement('div');
      const symbol = document.createElement('span');
      symbol.className = 'material-symbols-outlined loc-map-marker-symbol';
      symbol.setAttribute('aria-hidden', 'true');
      symbol.textContent = 'location_on';
      if (location.badge) {
        const badge = document.createElement('span');
        badge.className = 'material-symbols-outlined loc-map-marker-badge';
        badge.setAttribute('aria-hidden', 'true');
        badge.textContent = location.badge;
        pin.append(symbol, badge);
      } else pin.append(symbol);
      const label = location.label ?? location.name;
      const icon = L.divIcon({
        className: [
          'loc-map-pin',
          location.kind && 'loc-map-' + location.kind,
          selected && 'loc-map-selected',
        ]
          .filter(Boolean)
          .join(' '),
        html: pin.childNodes.length === 1 ? symbol : pin,
        iconSize: [36, 36],
        iconAnchor: [18 - x, 30 - y],
        tooltipAnchor: [x, y - 26],
      });
      let marker = this.markers.get(location.id);
      if (!marker) {
        marker = L.marker([location.latitude!, location.longitude!], { keyboard: true, icon })
          .on('click', () => this.select.emit(location.id))
          .addTo(map);
        this.markers.set(location.id, marker);
      }
      marker.setLatLng([location.latitude!, location.longitude!]);
      marker.setIcon(icon);
      marker.setZIndexOffset(selected ? 1000 : 0);
      const element = marker.getElement();
      if (element)
        element.onkeydown = (event) => {
          if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            this.select.emit(location.id);
          }
        };
      element?.setAttribute('aria-label', 'Select ' + label);
      element?.setAttribute('aria-pressed', String(selected));
      element?.setAttribute('title', label);
      const tooltip = document.createElement('span');
      tooltip.textContent = label;
      if (marker.getTooltip()) marker.setTooltipContent(tooltip);
      else marker.bindTooltip(tooltip);
    }
    const extent = JSON.stringify([
      locations.map((row) => [row.id, row.latitude, row.longitude]).sort(),
      route,
    ]);
    if (extent !== this.extent) {
      map.invalidateSize({ pan: false });
      const points = locations.map((row) => L.latLng(row.latitude!, row.longitude!));
      map.fitBounds(L.latLngBounds(points.concat(routePoints)), {
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
    this.routeLine = undefined;
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
