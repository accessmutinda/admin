import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyContactsApiService } from './company-contacts-api.service';
const record = {
  etag: '"v3"',
  channels: {
    main_phone: '020 1234 5678',
    secondary_phone: '020 8765 4321',
    general_email: 'care@example.com',
    billing_email: 'billing@example.com',
    website: 'https://example.com',
    emergency_contact: 'Jane Smith',
    out_of_hours_number: '020 1234 9876',
  },
  billing_uses_registered: true,
  addresses: [
    {
      id: 'address-1',
      version: 2,
      kind: 'registered',
      line1: 'Stored Road',
      line2: 'Suite 1',
      city: 'London',
      county: '',
      postcode: 'SW1A 1AA',
      country: 'United Kingdom',
    },
    {
      id: 'address-2',
      version: 1,
      kind: 'billing',
      line1: 'Independent Billing Road',
      line2: '',
      city: 'London',
      county: '',
      postcode: 'SW1A 1AA',
      country: 'United Kingdom',
    },
  ],
  contacts: [
    {
      id: 'contact-1',
      version: 4,
      category: 'registered_manager',
      name: 'Stored Manager',
      job_role: 'Manager',
      email: 'manager@example.com',
      phone: '020 1234 5678',
      active: true,
    },
  ],
};
describe('Contact information API', () => {
  let api: ReturnType<typeof vi.fn>;
  let service: CompanyContactsApiService;
  let allowed = true;
  beforeEach(() => {
    allowed = true;
    api = vi.fn().mockResolvedValue(structuredClone(record));
    TestBed.configureTestingModule({
      providers: [
        CompanyContactsApiService,
        {
          provide: AuthService,
          useValue: {
            api,
            profile: () => ({ id: 'admin', company_id: 'company-1' }),
            canAccessCompany: () => allowed,
          },
        },
      ],
    });
    service = TestBed.inject(CompanyContactsApiService);
  });
  it('loads every stored field and keeps an independent billing address while inheritance is enabled', async () => {
    const value = await service.load('company-1');
    expect(api).toHaveBeenCalledExactlyOnceWith('/companies/company-1/contact-information');
    expect(value.primary).toMatchObject({
      mainPhone: '020 1234 5678',
      billingEmail: 'billing@example.com',
      emergencyContact: 'Jane Smith',
      outOfHoursNumber: '020 1234 9876',
    });
    expect(value.addresses.registered.line1).toBe('Stored Road');
    expect(value.addresses.billing.line1).toBe('Independent Billing Road');
    expect(value.billingSameAsRegistered).toBe(true);
    expect(value.addresses.headOffice.country).toBe('');
    expect(value.keyContacts[0]).toMatchObject({
      id: 'contact-1',
      category: 'Registered Manager',
      role: 'Manager',
    });
    expect(value.addressChecks).toEqual({});
  });
  it('sends one atomic versioned save for fields, address deletions and contact additions/removals', async () => {
    const value = await service.load('company-1');
    value.primary.mainPhone = '';
    value.addresses.registered = {
      line1: '',
      line2: '',
      city: '',
      county: '',
      postcode: '',
      country: '',
    };
    value.keyContacts = [
      {
        id: 'local-draft',
        category: 'Other',
        name: 'New Contact',
        role: 'Coordinator',
        email: 'new@example.com',
        phone: '020 1234 5678',
        active: false,
      },
    ];
    await service.save('company-1', value);
    const call = api.mock.calls[1];
    expect(call[0]).toBe('/companies/company-1/contact-information');
    expect(call[2]).toBe('PATCH');
    expect(call[3]).toMatchObject({ 'If-Match': '"v3"', 'Idempotency-Key': expect.any(String) });
    expect(call[1].channels.main_phone).toBe('');
    expect(call[1].addresses[0]).toMatchObject({ id: 'address-1', version: 2, delete: true });
    expect(call[1].contacts[0]).toMatchObject({
      client_id: 'local-draft',
      category: 'other',
      active: false,
    });
    expect(call[1].contacts[0]).not.toHaveProperty('id');
    expect(call[1].removed_contacts).toEqual([{ id: 'contact-1', version: 4 }]);
  });
  it('reuses the idempotency key for an unchanged failed save', async () => {
    const value = await service.load('company-1');
    api.mockRejectedValueOnce(new Error('Connection lost.'));
    await expect(service.save('company-1', value)).rejects.toThrow('Connection lost.');
    await service.save('company-1', value);
    expect(api.mock.calls[1][3]['Idempotency-Key']).toBe(api.mock.calls[2][3]['Idempotency-Key']);
  });
  it('does not save after losing company access', async () => {
    const value = await service.load('company-1');
    allowed = false;
    await expect(service.save('company-1', value)).rejects.toThrow('context changed');
    expect(api).toHaveBeenCalledTimes(1);
  });
});
