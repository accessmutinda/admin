import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { CompaniesApiService } from '../companies/companies-api.service';
import { ManagementStore } from '../shared/management.store';
import { newStaff } from './hr.models';

export function legacyHrProviders() {
  const editable = signal(true);
  return {
    editable,
    providers: [
      provideRouter([]),
      {
        provide: AuthService,
        useValue: {
          isAuthenticated: () => true,
          isSuperAdmin: () => false,
          profile: signal({ id: 'tester', company_id: 'lqcs', company_entry_state: 'ready' }),
          currentUser: () => ({ id: 'tester', name: 'Test Reviewer' }),
          canAccessCompany: (id: string) => id === 'lqcs',
        },
      },
      {
        provide: CompanyAccessService,
        useValue: {
          canPath: (_path: string, action: string) => action === 'view' || editable(),
          can: (_module: string, _area: string, action: string) =>
            ['read', 'view'].includes(action) || editable(),
          context: () => null,
        },
      },
      {
        provide: CompaniesApiService,
        useValue: {
          scope: () => null,
          companies: () => [],
          details: () => ({}),
        },
      },
    ],
  };
}

export function seedLegacyHr() {
  const store = TestBed.inject(ManagementStore);
  const staff = newStaff();
  Object.assign(staff, {
    name: 'Existing Employee',
    email: 'existing@example.org',
    role: 'Care Worker',
    location: 'London',
    start: '2026-01-01',
    stage: 'Hired',
  });
  Object.assign(staff.hr!.personal, { firstName: 'Existing', surname: 'Employee' });
  staff.hr!.employment.type = 'Permanent';
  const applicant = newStaff();
  Object.assign(applicant, {
    name: 'Offer Applicant',
    email: 'applicant@example.org',
    stage: 'Offer',
    documents: [],
    notes: [],
  });
  store.update((data) => ({ ...data, people: [staff, applicant] }));
  return store;
}
