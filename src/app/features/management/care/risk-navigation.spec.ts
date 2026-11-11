import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { RiskApi } from './risk-api.service';

describe('Risk assessment scoped navigation', () => {
  let api: RiskApi,
    scope: ReturnType<typeof signal<string>>,
    request: ReturnType<typeof vi.fn>,
    permissions: Set<string>;
  const workspace = () => ({
    company_id: 'north',
    service_user_id: 'person-1',
    local_date: '2026-11-11',
    company_name: 'North Care',
    assessments: [],
    history: [],
    legacy: [],
    documents: [],
    incidents_available: false,
  });
  beforeEach(() => {
    scope = signal('north:1');
    permissions = new Set(['read', 'export']);
    request = vi.fn().mockResolvedValue(workspace());
    TestBed.configureTestingModule({
      providers: [
        RiskApi,
        { provide: AuthService, useValue: { api: request } },
        {
          provide: ServiceUsersApi,
          useValue: {
            scope,
            companyId: signal('north'),
            allowed: signal(true),
            access: { can: (_m: string, _s: string, a: string) => permissions.has(a) },
          },
        },
      ],
    });
    api = TestBed.inject(RiskApi);
  });
  it('opens the exact patient workspace without a browser directory lookup', async () => {
    await api.load('person-1');
    expect(request).toHaveBeenCalledWith(
      '/companies/north/service-users/person-1/risk-assessments',
    );
  });
  it('rejects responses belonging to another patient', async () => {
    request.mockResolvedValue({ ...workspace(), service_user_id: 'other-person' });
    await expect(api.load('person-1')).rejects.toThrow('workspace changed');
  });
  it('rejects embedded history belonging to another company', async () => {
    request.mockResolvedValue({
      ...workspace(),
      history: [{ assessment: { company_id: 'south', service_user_id: 'person-1' } }],
    });
    await expect(api.load('person-1')).rejects.toThrow('workspace changed');
  });
  it('rejects a response arriving after the active scope changes', async () => {
    let resolve!: (value: any) => void;
    request.mockImplementation(() => new Promise((r) => (resolve = r)));
    const pending = api.load('person-1');
    scope.set('south:2');
    resolve(workspace());
    await expect(pending).rejects.toThrow('workspace changed');
  });
  it('requires its own read action in addition to service-user access', async () => {
    permissions.clear();
    await expect(api.load('person-1')).rejects.toThrow('unavailable');
    expect(request).not.toHaveBeenCalled();
  });
});
