import { Component, input, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from './service-users-api.service';
import { CareHeader } from '../care/care-header';
import { ClientAudit } from './client-audit';
@Component({ selector: 'cv-care-header', template: '' })
class HeaderStub {
  client = input<any>();
  active = input('');
}
describe('Saved service-user audit', () => {
  let request: ReturnType<typeof vi.fn>,
    scope: ReturnType<typeof signal<string>>,
    grant: ReturnType<typeof signal<boolean>>;
  const record = () => ({
    company_id: 'north',
    service_user_id: 'person',
    timezone: 'Europe/London',
    count: 1,
    page: 1,
    next: null,
    results: [
      {
        id: 'event',
        action: 'care.records.updated',
        actor: 'Care manager',
        at: '2026-11-15T08:00:00Z',
        version: 2,
      },
    ],
  });
  beforeEach(() => {
    request = vi.fn(async () => record());
    scope = signal('north:actor');
    grant = signal(true);
    const api = {
      scope,
      companyId: () => 'north',
      selected: signal({ id: 'person', name: 'Recorded person' }),
      access: { can: () => grant() },
      detail: vi.fn().mockResolvedValue(undefined),
      detailLoading: () => false,
      error: () => '',
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { api: request } },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: new BehaviorSubject(convertToParamMap({ id: 'person' })),
            snapshot: { paramMap: convertToParamMap({ id: 'person' }) },
          },
        },
      ],
    });
    TestBed.overrideComponent(ClientAudit, {
      remove: { imports: [CareHeader], providers: [ServiceUsersApi] },
      add: { imports: [HeaderStub], providers: [{ provide: ServiceUsersApi, useValue: api }] },
    });
  });
  async function setup() {
    const fixture = TestBed.createComponent(ClientAudit);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }
  it('renders backend events and searches the saved service-user history', async () => {
    const fixture = await setup();
    expect(fixture.nativeElement.textContent).toContain('Care manager');
    expect(fixture.nativeElement.textContent).toContain('records updated');
    fixture.componentInstance.query = 'medication';
    fixture.componentInstance.search();
    await fixture.whenStable();
    expect(request.mock.calls.at(-1)![0]).toContain(
      '/service-users/person/audit?page=1&search=medication',
    );
  });
  it('rejects an audit returned for another service user', async () => {
    request.mockResolvedValue({ ...record(), service_user_id: 'other' });
    const fixture = await setup();
    expect(fixture.componentInstance.data()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('does not match');
    expect(fixture.nativeElement.textContent).not.toContain('Care manager');
  });
  it('clears previous events when a refresh is denied', async () => {
    const fixture = await setup();
    request.mockRejectedValueOnce(Error('Audit permission revoked'));
    await fixture.componentInstance.load();
    fixture.detectChanges();
    expect(fixture.componentInstance.data()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Audit permission revoked');
  });
  it('does not request an export when export permission is unavailable', async () => {
    const fixture = await setup();
    grant.set(false);
    request.mockClear();
    await fixture.componentInstance.download();
    expect(request).not.toHaveBeenCalled();
    expect(fixture.componentInstance.canLeave()).toBe(true);
  });
});
