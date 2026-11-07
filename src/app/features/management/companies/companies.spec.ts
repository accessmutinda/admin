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
        { provide: CompaniesApiService, useValue: { loading: () => false, error: () => '' } },
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
});
