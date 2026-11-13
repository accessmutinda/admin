import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { InspectorPage } from './inspector-page';
import { InspectorService } from './inspector.service';
import { emptyInspection } from './inspector.models';
import { RotaClient } from '../management/rota/rota.models';

const clients: RotaClient[] = Array.from({ length: 10 }, (_, index) => ({
  id: `person-${index}`,
  name: `Person ${index}`,
  reference: `REF-${index}`,
  address: `${index} Example Road`,
  postcode: 'AB1 2CD',
  funding: index % 2 ? 'Private' : 'NHS',
  priority: 'High',
  active: index < 8,
}));

describe('Inspector service user directory', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InspectorPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            data: new BehaviorSubject({ page: 'service-users' }),
            queryParamMap: new BehaviorSubject(convertToParamMap({})),
            snapshot: { data: { page: 'service-users' }, queryParamMap: convertToParamMap({}) },
          },
        },
        {
          provide: InspectorService,
          useValue: {
            company: signal({ name: 'Example Care', active: true }),
            companyId: signal('example'),
            today: '2026-11-13',
            state: signal(emptyInspection()),
            clients: signal(structuredClone(clients)),
            documents: signal([]),
            staff: signal([]),
            visits: signal([]),
            administrations: signal([]),
            careInstructions: signal([]),
          },
        },
      ],
    });
  });

  it('shares filters and eight-record pagination between list and card views', () => {
    const fixture = TestBed.createComponent(InspectorPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelectorAll('tbody tr')).toHaveLength(8);
    page.currentPage.set(2);
    root.querySelector<HTMLButtonElement>('[aria-label="Card view"]')!.click();
    fixture.detectChanges();
    expect(root.querySelectorAll('.person-card')).toHaveLength(2);
    page.fundingFilter.set('Private');
    page.filterChanged();
    fixture.detectChanges();
    expect(page.currentPage()).toBe(1);
    expect(root.querySelectorAll('.person-card')).toHaveLength(5);
    page.search.set('no matching person');
    fixture.detectChanges();
    expect(root.textContent).toContain('No matching service users');
    root.querySelector<HTMLButtonElement>('.directory-empty button')!.click();
    fixture.detectChanges();
    expect(root.querySelectorAll('.person-card')).toHaveLength(8);
  });

  it('keeps visit priority out of clinical risk counts and opens a read-only record', () => {
    const fixture = TestBed.createComponent(InspectorPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    expect(page.metrics().find((metric) => metric.label === 'High risk')?.value).toBe(0);
    expect(page.metrics().find((metric) => metric.label === 'Risk not assessed')?.value).toBe(10);
    expect(page.metrics().find((metric) => metric.label === 'Active service users')?.value).toBe(8);
    root.querySelector<HTMLButtonElement>('.record-link')!.click();
    fixture.detectChanges();
    expect(root.querySelector('.service-user-drawer')?.textContent).toContain('Person 0');
    expect(root.querySelector('.service-user-drawer')?.textContent).toContain(
      'Read-only service user record',
    );
    expect(
      root.querySelectorAll('.service-user-drawer input, .service-user-drawer textarea'),
    ).toHaveLength(0);
    page.closeModal();
    fixture.detectChanges();
    expect(root.querySelector('[role="dialog"]')).toBeNull();
  });
});
