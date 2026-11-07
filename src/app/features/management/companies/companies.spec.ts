import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CompaniesApiService } from './companies-api.service';
import { ManagementStore, Company } from '../shared/management.store';
import { Companies } from './companies';

const company: Company = {
  id: 'api-company',
  name: 'API Company',
  code: 'API',
  active: true,
  apiSummaryOnly: true,
  sector: '',
  size: '',
  registration: '',
  postcode: '',
  color: '',
  accent: '',
  tagline: '',
  logo: '',
  modules: [],
};
describe('Original Companies overview with API data', () => {
  it('preserves the original cards, checklist and quick actions while binding returned values', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: CompaniesApiService,
          useValue: {
            loaded: () => true,
            loading: () => false,
            error: () => '',
            overview: () => null,
          },
        },
        {
          provide: ManagementStore,
          useValue: {
            companies: () => [company],
            company: () => company,
            data: () => ({ members: [], locations: [] }),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(Companies);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.textContent).toContain('Company Setup Overview');
    expect(
      Array.from(root.querySelectorAll('.co-stat h2')).map((node) => node.textContent!.trim()),
    ).toEqual([
      'Total Companies',
      'Active Companies',
      'Pending Setups',
      'Profile Completion',
      'Open Admin Tasks',
    ]);
    expect(root.textContent).toContain('API Company');
    expect(root.querySelectorAll('.co-check-card')).toHaveLength(8);
    expect(root.textContent).toContain('Duplicate Existing Setup');
    expect(root.textContent).toContain('Edit Company Profile');
    expect(root.textContent).toContain('Invite Admin User');
    expect(root.querySelectorAll('.co-stat strong')[0].textContent).toBe('1');
    expect(root.querySelectorAll('.co-stat strong')[3].textContent).toBe('—');
    expect(root.textContent).not.toContain('25%');
  });
  it('uses server totals and colours setup indicators while preserving category colours', () => {
    const current: Company = {
      ...company,
      profileCompletion: 57,
      setupProgress: {
        general: { complete: true, state: 'complete' },
        registration: { complete: false, state: 'in_progress' },
        contacts: { complete: false, state: 'pending' },
        locations: { complete: true, state: 'complete' },
        branding: { complete: false, state: 'pending' },
        modules: { complete: true, state: 'complete' },
        access: { complete: true, state: 'complete' },
        integrations: { complete: null, available: false, state: 'unavailable' },
      },
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: CompaniesApiService,
          useValue: {
            loaded: () => true,
            loading: () => false,
            error: () => '',
            overview: () => ({
              authorised_total: 18,
              active_total: 12,
              pending_setup_total: 3,
              profile_completion_percent: 64,
              open_admin_tasks: 45,
            }),
          },
        },
        {
          provide: ManagementStore,
          useValue: {
            companies: () => [current],
            company: () => current,
            data: () => ({ members: [], locations: [] }),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(Companies);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(
      [...root.querySelectorAll('.co-stat strong')].map((el) => el.textContent?.trim()),
    ).toEqual(['18', '12', '3', '64%', '45']);
    const cards = [...root.querySelectorAll('.co-check-card')];
    expect(
      cards.map((el) => el.querySelector('.co-check-status')?.getAttribute('data-setup-state')),
    ).toEqual(['green', 'orange', 'neutral', 'green', 'neutral', 'green', 'green', 'neutral']);
    expect(
      cards.map((el) => el.querySelector('.co-check-icon')?.getAttribute('data-tone')),
    ).toEqual(['teal', 'teal', 'cyan', 'blue', 'teal', 'orange', 'cyan', 'blue']);
    expect(cards.every((el) => !el.hasAttribute('data-setup-state'))).toBe(true);
    expect(cards[0].querySelector('.co-check-status')?.textContent).toContain('Complete');
    expect(cards[1].querySelector('.co-check-status')?.textContent).toContain('In Progress');
    expect(cards[7].textContent).toContain('Unavailable');
    expect(root.querySelector('.co-overall')?.textContent).toContain('57%');
  });

  it('shows unavailable metrics instead of zero while loading or after an API failure', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: CompaniesApiService,
          useValue: {
            loaded: () => false,
            loading: () => false,
            error: () => 'Unable to load companies.',
            overview: () => null,
          },
        },
        {
          provide: ManagementStore,
          useValue: {
            companies: () => [],
            company: () => undefined,
            data: () => ({ members: [], locations: [] }),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(Companies);
    fixture.detectChanges();
    expect(
      [...fixture.nativeElement.querySelectorAll('.co-stat strong')].map((el: Element) =>
        el.textContent?.trim(),
      ),
    ).toEqual(['—', '—', '—', '—', '—']);
  });
});
