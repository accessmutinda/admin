import { TestBed } from '@angular/core/testing';
import { LocationMap } from './location-map';
import { ServiceLocation, emptyLocation } from './locations.models';

describe('Geographic location map', () => {
  const north = {
    ...emptyLocation(),
    id: 'north',
    name: 'North Home',
    latitude: 51.5,
    longitude: -0.12,
  };
  const south = {
    ...emptyLocation(),
    id: 'south',
    name: 'South Home',
    latitude: 50.8,
    longitude: -0.14,
  };

  async function render(locations: ServiceLocation[] = [north, south]) {
    const fixture = TestBed.createComponent(LocationMap);
    fixture.componentRef.setInput('locations', locations);
    fixture.componentRef.setInput('selectedId', 'north');
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  it('shows only recorded coordinates with a geographic basemap and attribution', async () => {
    const fixture = await render([north, { ...south, latitude: null }]);
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.leaflet-marker-icon')).toHaveLength(1);
    expect(element.querySelector('.leaflet-tile-pane')).not.toBeNull();
    expect(element.querySelector('.leaflet-control-attribution')?.textContent).toContain(
      'OpenStreetMap',
    );
    expect(element.querySelector('.loc-map-caption')?.textContent).toContain('1 of 2');
    const pin = element.querySelector('[aria-label="Select North Home"]')!;
    expect(pin.getAttribute('aria-pressed')).toBe('true');
  });

  it('selects pins by click and keyboard and preserves the map on selection changes', async () => {
    const fixture = await render();
    const selected: string[] = [];
    fixture.componentInstance.select.subscribe((id) => selected.push(id));
    const element = fixture.nativeElement as HTMLElement;
    const pane = element.querySelector('.leaflet-map-pane');
    const pin = element.querySelector('[aria-label="Select South Home"]') as HTMLElement;
    pin.click();
    pin.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(selected).toEqual(['south', 'south']);
    fixture.componentRef.setInput('selectedId', 'south');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(element.querySelector('.leaflet-map-pane')).toBe(pane);
    expect(
      element.querySelector('[aria-label="Select South Home"]')?.getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('removes stale pins and restores the empty state without loading a basemap', async () => {
    const fixture = await render();
    fixture.componentRef.setInput('locations', [south]);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[aria-label="Select North Home"]')).toBeNull();
    fixture.componentRef.setInput('locations', []);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('No coordinates recorded');
    expect(fixture.nativeElement.querySelector('.leaflet-tile-pane')).toBeNull();
    fixture.componentRef.setInput('locations', [north]);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.loc-map-pin')).toHaveLength(1);
  });

  it('keeps names as plain text and reports tile failures while retaining pins', async () => {
    const fixture = await render([{ ...north, name: '<img src=x onerror=alert(1)>' }]);
    const element = fixture.nativeElement as HTMLElement;
    const pin = element.querySelector('.loc-map-pin') as HTMLElement;
    pin.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(element.querySelector('.leaflet-tooltip')?.textContent).toBe(
      '<img src=x onerror=alert(1)>',
    );
    expect(element.querySelector('.leaflet-tooltip img')).toBeNull();
    element.querySelector('.leaflet-tile')?.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(element.textContent).toContain('Map tiles are unavailable');
    expect(element.querySelector('.loc-map-pin')).not.toBeNull();
  });
});
