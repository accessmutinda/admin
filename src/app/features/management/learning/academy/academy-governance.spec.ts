import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AcademyService } from './academy.service';
import { AcademyGovernanceApi } from './academy-governance-api.service';
import { AcademyGovernanceService } from './academy-governance.service';
import { emptyGovernance } from './academy-governance.models';

describe('Academy governance source ownership', () => {
  let operations: AcademyGovernanceService, save: ReturnType<typeof vi.fn>;
  const company = signal('company');
  beforeEach(() => {
    company.set('company');
    save = vi.fn(async () => {});
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AcademyService,
          useValue: {
            store: { companyId: company },
            certificatesApi: {
              requirements: () => [],
              saveRequirement: save,
              requests: () => [],
              load: save,
            },
            resultsApi: { releaseFeedback: save, invalidate: save },
          },
        },
        {
          provide: AcademyGovernanceApi,
          useValue: {
            data: () => emptyGovernance(),
            canRead: () => true,
            summary: () => ({
              finalPassRate: '—',
              checkpointPassRate: '—',
              exceptions: null,
              currency: '—',
            }),
            load: save,
            saveReview: save,
            approveAdjustment: save,
            saveObservation: save,
            queue: save,
          },
        },
      ],
    });
    operations = TestBed.inject(AcademyGovernanceService);
  });
  it('loads live evaluation data instead of simulating a scheduler', async () => {
    expect(await operations.runSchedules()).toBeNull();
    expect(save).toHaveBeenCalledOnce();
  });
  it('rejects a different workspace before queuing a mutation', async () => {
    expect(await operations.saveRequirement({} as never, 'other')).toContain('workspace changed');
    expect(save).not.toHaveBeenCalled();
  });
  it('does not grant access or simulate provider outcomes', () => {
    expect(operations.saveCapabilities('HR', ['review'])).toContain('Company access');
    expect(operations.saveGrant({} as never)).toContain('supported access adapter');
    expect(operations.processDelivery('notice')).toContain('authenticated recipient');
    expect(operations.setOffline(true)).toContain('not accepted');
  });
  it('reports unknown provider totals explicitly', () => {
    expect(operations.kpis().exceptions).toBeNull();
  });
});
