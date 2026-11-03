import { seedCareDemo } from './care-demo';
import { seedRiskAssessments } from './risk-assessment-demo';
import { latestRisks, riskError } from '../features/management/care/risk-assessment.models';
import { WorkspaceData } from '../features/management/shared/management.store';
import { emptyClientFile } from '../features/management/clients/client-file.models';

const workspace = (): WorkspaceData => ({
  people: [],
  vacancies: [],
  members: [],
  permissions: {},
  workflows: {},
  backup: false,
  leaves: [],
  reviews: [],
  cpd: [],
});

describe('Persisted risk assessment examples', () => {
  it('seeds complete assessments, reviews, actions and linked evidence on the existing demo service users', () => {
    const data = seedCareDemo(workspace(), '2026-11-03');
    for (const client of data.rota!.clients) {
      const register = client.file!.riskRegister!;
      expect(latestRisks(register.assessments)).toHaveLength(8);
      expect(register.assessments.every((r) => riskError(r, true) === null)).toBe(true);
      expect(register.assessments.some((r) => r.status === 'Approved' && r.visibility.staff)).toBe(
        true,
      );
      expect(register.assessments.flatMap((r) => r.actions).some((a) => a.status === 'Open')).toBe(
        true,
      );
      expect(register.history.length).toBeGreaterThanOrEqual(16);
      for (const r of register.assessments) {
        expect(
          r.incidentIds.every((id) => client.file!.entries['incidents'].some((i) => i.id === id)),
        ).toBe(true);
        expect(r.documentIds.every((id) => client.file!.documents!.some((d) => d.id === id))).toBe(
          true,
        );
      }
    }
    expect(
      data.rota!.clients[0].file!.riskRegister!.assessments.some((r) => r.status === 'In review'),
    ).toBe(true);
    expect(
      data.rota!.clients[1].file!.riskRegister!.assessments.some((r) => r.status === 'Draft'),
    ).toBe(true);
  });
  it('upgrades existing demo workspaces without replacing edited risks or seeding ordinary service users', () => {
    const data = seedCareDemo(workspace(), '2026-11-03');
    data.careDemoVersion = 10;
    const first = data.rota!.clients[0];
    const saved = first.file!.riskRegister!;
    saved.assessments[0].fields['controls'] = 'User recorded controls';
    delete data.rota!.clients[1].file!.riskRegister;
    data.rota!.clients.push({ ...first, id: 'ordinary-client', file: emptyClientFile() });
    const upgraded = seedCareDemo(data, '2026-11-04');
    expect(upgraded.careDemoVersion).toBe(11);
    expect(upgraded.rota!.clients[0].file!.riskRegister).toBe(saved);
    expect(saved.assessments[0].fields['controls']).toBe('User recorded controls');
    expect(upgraded.rota!.clients[1].file!.riskRegister).toBeTruthy();
    expect(upgraded.rota!.clients.at(-1)!.file!.riskRegister).toBeUndefined();
    expect(upgraded.rota!.visits).toBe(data.rota!.visits);
    expect(seedRiskAssessments(upgraded, '2026-11-05')).toBe(upgraded);
    expect(seedCareDemo(upgraded, '2026-11-05')).toBe(upgraded);
  });
});
