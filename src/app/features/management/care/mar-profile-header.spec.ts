import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { AuthService } from '../../../core/auth/auth.service';
import { RotaClient } from '../rota/rota.models';
import { RotaService } from '../rota/rota.service';
import { CareContactsApi } from './care-contacts-api.service';
import { CareHeader } from './care-header';

describe('Service user profile header', () => {
  const load = vi.fn();
  const client: RotaClient = {
    id: 'client-1',
    name: 'Demo Person',
    reference: 'DEMO-1',
    address: 'Demo Road',
    postcode: 'HA1 1AA',
    priority: 'Standard',
    funding: 'Private',
    active: true,
    file: {
      details: { dob: '1948-02-12', nhs: 'Recorded NHS number', gp: 'Example GP Practice' },
      sections: { diagnoses: { primary: 'Recorded condition' } },
      entries: {
        allergies: [
          {
            id: 'allergy-1',
            name: 'Recorded allergen',
            detail: 'Recorded reaction',
            date: '',
            status: 'Active',
            level: 'High',
          },
        ],
      },
      updatedAt: '',
    },
  };

  beforeEach(() => {
    load.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: CompanyAccessService,
          useValue: { companyId: signal('provider-1'), can: () => true, canPath: () => true },
        },
        {
          provide: AuthService,
          useValue: { workspaces: signal([{ id: 'provider-1', name: 'Recorded Provider' }]) },
        },
        { provide: RotaService, useValue: { data: signal({ calls: [] }) } },
        {
          provide: CareContactsApi,
          useValue: {
            scope: signal('provider-1'),
            can: () => true,
            loading: signal(false),
            error: signal(''),
            load,
            contacts: signal([
              {
                company_id: 'provider-1',
                service_user_id: 'other-client',
                type: 'GP',
                phone: 'Other client number',
              },
              {
                company_id: 'provider-1',
                service_user_id: 'client-1',
                type: 'GP',
                phone: 'Recorded GP number',
              },
              {
                company_id: 'provider-1',
                service_user_id: 'client-1',
                type: 'Professional',
                relationship: 'Care Coordinator',
                name: 'Recorded Coordinator',
              },
            ]),
          },
        },
      ],
    });
  });

  it('previews four rows per table and opens the corresponding full MAR details', () => {
    const fixture = TestBed.createComponent(CareHeader);
    fixture.componentRef.setInput('client', client);
    fixture.componentRef.setInput('active', 'medication');
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(load).toHaveBeenCalledExactlyOnceWith('client-1');
    const userCard = page.querySelector('.mar-profile-details')!;
    const providerCard = page.querySelector('.mar-profile-provider')!;
    expect(userCard.nextElementSibling).toBe(providerCard);
    const details = userCard.querySelector(':scope > table');
    expect([...details!.querySelectorAll('th')].map((row) => row.textContent)).toEqual([
      'Full Name',
      'Date of Birth',
      'NHS Number',
      'Service User ID',
    ]);
    expect(details?.textContent).toContain('DEMO-1');
    expect(details?.textContent).toContain('12 Feb 1948');
    expect(details?.querySelector('#client-record-name + .badge.success')?.textContent).toBe(
      'Active',
    );
    expect(page.querySelectorAll('.profile-signal')).toHaveLength(8);
    expect(page.querySelector('.profile-signal')?.textContent).toContain('Recorded allergen');
    const providerPreview = providerCard.querySelector(':scope > table')!;
    expect([...providerPreview.querySelectorAll('th')].map((row) => row.textContent)).toEqual([
      'Provider',
      'GP Practice',
      'GP Telephone',
      'Emergency / Escalation',
    ]);
    expect(providerPreview.textContent).not.toContain('Recorded Coordinator');
    const userDialog = userCard.querySelector('dialog')!;
    const providerDialog = providerCard.querySelector('dialog')!;
    expect(userDialog.querySelectorAll('th')).toHaveLength(9);
    expect(userDialog.textContent).toContain('Demo Road');
    expect(providerDialog.querySelectorAll('th')).toHaveLength(7);
    const provider = providerDialog.textContent;
    expect(provider).toContain('Recorded Provider');
    expect(provider).toContain('Recorded Coordinator');
    expect(provider).toContain('Recorded GP number');
    expect(provider).toContain('Recorded condition');
    expect(provider).not.toContain('Other client number');
    expect(userDialog.open).toBe(false);
    expect(providerDialog.open).toBe(false);
    userDialog.showModal = vi.fn();
    providerDialog.showModal = vi.fn();
    userCard.querySelector<HTMLButtonElement>('[aria-haspopup="dialog"]')!.click();
    expect(userDialog.showModal).toHaveBeenCalledOnce();
    expect(providerDialog.showModal).not.toHaveBeenCalled();
    providerCard.querySelector<HTMLButtonElement>('[aria-haspopup="dialog"]')!.click();
    expect(providerDialog.showModal).toHaveBeenCalledOnce();
  });

  it('keeps the same profile cards on the local overview and other tabs', () => {
    const fixture = TestBed.createComponent(CareHeader);
    fixture.componentRef.setInput('client', client);
    fixture.componentRef.setInput('local', true);
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    const providerCard = page.querySelector('.mar-profile-provider');
    expect(page.querySelector('.mar-profile-details')).toBeTruthy();
    expect(providerCard?.textContent).toContain('Recorded GP number');
    expect(page.querySelector('[aria-current="page"]')?.textContent).toContain('Overview');

    fixture.componentRef.setInput('local', false);
    fixture.componentRef.setInput('active', 'visits');
    fixture.detectChanges();
    expect(page.querySelector('.mar-profile-provider')).toBe(providerCard);
    expect(page.querySelector('[aria-current="page"]')?.textContent).toContain('Visits');
  });

  it('uses the saved overview projection for the MAR header without loading legacy contacts', () => {
    const fixture = TestBed.createComponent(CareHeader);
    const overview = {
      record: { company_id: 'provider-1' },
      clinical: { emergency_escalation: 'Follow the recorded plan.', allergies: 'Saved allergy' },
      local_date: '2026-11-25',
      mar_header: {
        provider: 'Overview provider',
        care_coordinator: 'Saved coordinator',
        registered_manager: 'Saved manager',
        gp_practice: 'Saved practice',
        gp_telephone: 'Saved GP number',
        emergency_contact_name: 'Saved emergency contact',
        emergency_contact_phone: '',
        emergency_contact_email: 'duty@example.com',
        next_of_kin: 'Saved next of kin',
        time_sensitive_calls: false,
      },
    } as RotaClient['overview'];
    fixture.componentRef.setInput('client', { ...client, overview });
    fixture.componentRef.setInput('active', 'medication');
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    const providerCard = page.querySelector('.mar-profile-provider')!;
    expect(providerCard.querySelector(':scope > table')?.textContent).toContain('Saved GP number');
    expect(providerCard.querySelector('dialog')?.textContent).toContain('Saved manager');
    expect(providerCard.querySelector('dialog')?.textContent).toContain(
      'Follow the recorded plan.',
    );
    expect(providerCard.querySelector('dialog')?.textContent).toContain('duty@example.com');
    expect(page.querySelector('.profile-signal-grid')?.textContent).toContain('Saved next of kin');
    expect(page.querySelector('.profile-signal-grid')?.textContent).toContain(
      'Time-sensitive calls: No',
    );
    expect(load).not.toHaveBeenCalled();
  });
});
