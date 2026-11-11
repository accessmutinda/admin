import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { ServiceUsersApi } from './service-users-api.service';
import type { ServiceUser, ServiceUserOverview } from './service-users.generated';
function row(): ServiceUser {
  return {
    id: 'user-1',
    company_id: 'north',
    version: 1,
    etag: '"v1"',
    name: 'Alex Citizen',
    reference: 'SU-1',
    address: '1 Real Road',
    postcode: 'AB1 2CD',
    funding: 'Private',
    priority: 'High',
    active: true,
    phone: '0700',
    email: 'alex@example.com',
    details: {
      dob: '1950-01-01',
      preferredName: 'Alex',
      gp: 'North Practice',
      about: 'My routines',
    },
    representative: {
      name: 'Sam',
      relationship: 'Sibling',
      phone: '0701',
      email: 'sam@example.com',
    },
    riskFlags: ['Living alone'],
    photo_id: null,
    primary_needs: [],
    packages: [],
    next_visit: null,
  };
}
function overview(record: ServiceUser = row()): ServiceUserOverview {
  return {
    record,
    workspace: { sections: [], visits: [], visits_read: false },
    care_plan: null,
    family: { approved: '', preferences: '', sharing_consent: '' },
    clinical: {
      primary_diagnosis: 'Recorded diagnosis',
      other_conditions: '',
      allergies: 'Recorded allergy',
      diet: 'Dietary guidance',
      ongoing: '',
      equipment: 'Walking frame',
      mobility_support: 'One person',
      mobility_instructions: 'Support with transfers',
      communication: 'Speak clearly',
      hearing: '',
      vision: '',
      sensory: '',
      decision_support: 'Give time to respond',
      welfare_lpa: 'Named attorney',
      finance_lpa: '',
      personal: 'Morning support',
      nutrition: 'Regular drinks',
      continence: '',
      safety: '',
      behaviour: '',
      continuity: 'Familiar team',
      key_safe_location: '',
    },
    capacity: { status: 'Has capacity', assessed_on: '2026-11-01', reason: 'Recorded assessment' },
    medication_reference: 'Recorded medicine reference',
    medication_read: true,
    medication_edit: true,
    risks: [],
    risks_read: true,
    services_read: true,
    local_date: '2026-11-10',
  };
}

describe('Service user initialisation', () => {
  it('keeps an in-flight profile read when the root access effect first runs', async () => {
    let resolve!: (value: ServiceUserOverview) => void;
    const request = vi.fn(() => new Promise<ServiceUserOverview>((r) => (resolve = r)));
    TestBed.configureTestingModule({
      providers: [
        ServiceUsersApi,
        { provide: AuthService, useValue: { api: request, profile: signal({ id: 'actor' }) } },
        {
          provide: CompanyAccessService,
          useValue: { companyId: signal('north'), can: () => true, context: signal(null) },
        },
      ],
    });
    const api = TestBed.inject(ServiceUsersApi);
    const pending = api.detail('user-1');
    TestBed.tick();
    resolve(overview());
    await pending;
    expect(api.selected()?.id).toBe('user-1');
    expect(api.error()).toBe('');
    expect(api.detailLoading()).toBe(false);
  });
});
