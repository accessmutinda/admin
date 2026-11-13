import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PortalAllocation } from './portal-allocation';
import { PortalClientContext } from './portal-client-context';
import { EcmService } from '../ecm/ecm.service';
const visit = (id = 'visit', etag = '"v1"') => ({
  id,
  etag,
  clientId: 'client',
  date: '2026-11-12',
  start: '08:00',
  end: '08:30',
  staffIds: ['worker'],
  carers: 1,
  state: 'Published',
  attendance: [],
});
describe('Staff service-user allocation safeguards', () => {
  let component: any, context: any, rows: ReturnType<typeof signal<any>>, api: any;
  beforeEach(() => {
    rows = signal({ clients: [], calls: [], visits: [visit()] });
    api = {
      allocation: vi.fn().mockResolvedValue(null),
      available: vi.fn().mockReturnValue(true),
      context: () => ({ person_id: 'worker' }),
    };
    context = {
      staffApi: api,
      id: () => 'client',
      tasks: () => [],
      audit: () => [],
      portal: {
        today: '2026-11-13',
        care: { rota: { data: rows, can: () => true } },
        store: { companyId: () => 'north' },
      },
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: PortalClientContext, useValue: context },
        { provide: EcmService, useValue: { canCaptureEvidence: () => false } },
      ],
    });
    TestBed.overrideComponent(PortalAllocation, { set: { template: '' } });
    component = TestBed.createComponent(PortalAllocation).componentInstance;
  });
  it('does not classify withheld attendance as a missed call', () => {
    expect(component.missed()).toHaveLength(1);
    api.available.mockReturnValue(false);
    rows.set({ ...rows(), visits: [visit()] });
    expect(component.missed()).toEqual([]);
  });
  it('cancels using the visit version reviewed before the confirmation opened', async () => {
    component.beginCancel('visit');
    component.cancelReason = 'Confirmed cancellation';
    rows.set({ ...rows(), visits: [visit('visit', '"v9"')] });
    await component.cancelVisit();
    expect(api.allocation).toHaveBeenCalledWith(
      'client',
      { reason: 'Confirmed cancellation' },
      '/visit/cancel',
      'POST',
      '"v1"',
    );
  });
  it('keeps bulk cancellation limited to the visits reviewed at confirmation', async () => {
    component.beginCancel('allocation');
    component.cancelReason = 'Cancel reviewed calls';
    rows.set({ ...rows(), visits: [visit('visit', '"v9"'), visit('new-visit')] });
    await component.cancelVisit();
    expect(api.allocation).toHaveBeenCalledWith(
      'client',
      { reason: 'Cancel reviewed calls', visits: [{ id: 'visit', etag: '"v1"' }] },
      '/cancel-batch',
    );
  });
});
