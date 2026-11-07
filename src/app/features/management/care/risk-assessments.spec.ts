import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { DEMO_USER } from '../../../demo/business-fixtures';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { RotaService } from '../rota/rota.service';
import { emptyClientFile } from '../clients/client-file.models';
import { CareService } from './care.service';
import { RiskAssessments } from './risk-assessments';
import {
  RiskAssessment,
  RiskStatus,
  blankRisk,
  latestRisks,
  riskLevel,
} from './risk-assessment.models';

describe('Structured risk assessment workspace', () => {
  let care: CareService;
  const actor = signal({ ...DEMO_USER, roleCode: 'CA' as typeof DEMO_USER.roleCode });
  const revision = () => care.client('risk-client')?.file?.riskRegister?.revision ?? 0;
  const save = (risk: RiskAssessment, status: RiskStatus = 'Draft', expected = revision()) =>
    care.saveRiskAssessment(
      'risk-client',
      'lqcs',
      risk,
      expected,
      status,
      'Review of recorded needs',
    );
  const complete = () => {
    const risk = blankRisk('Medication');
    risk.specific = 'Medication refusal';
    risk.review = '2027-12-01';
    risk.harmed = ['Service user'];
    risk.fields = {
      description: 'Risk description',
      controls: 'Current controls',
      instructions: 'Approved instructions',
      escalation: 'Contact office',
    };
    return risk;
  };
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: 'risk-client' })),
            snapshot: { paramMap: convertToParamMap({ id: 'risk-client' }), data: {} },
          },
        },
      ],
    });
    const auth = TestBed.inject(AuthService);
    auth.signInDemoSession();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    actor.set({ ...DEMO_USER, roleCode: 'CA' });
    vi.spyOn(auth, 'currentUser').mockImplementation(() => actor());
    care = TestBed.inject(CareService);
    expect(
      TestBed.inject(RotaService).saveClient({
        id: 'risk-client',
        name: 'Test person',
        reference: 'R1',
        address: 'Test Road',
        postcode: 'HA1 1AA',
        active: true,
        funding: 'Private',
        priority: 'Standard',
        file: emptyClientFile(),
      }),
    ).toBeNull();
  });
  it('uses the specified scoring boundaries including critical 16', () => {
    expect([1, 4, 5, 9, 10, 15, 16, 25].map(riskLevel)).toEqual([
      'Low',
      'Low',
      'Medium',
      'Medium',
      'High',
      'High',
      'Critical',
      'Critical',
    ]);
  });
  it('validates scores, required submission fields, and incomplete handling tasks', () => {
    const risk = blankRisk('Medication');
    risk.specific = 'Test';
    expect(save(risk, 'In review')).toContain('Complete');
    risk.likelihood = 6;
    expect(save(risk)).toContain('between 1 and 5');
    const handling = { ...complete(), domain: 'Moving & Handling' };
    expect(save(handling, 'In review')).toContain('every mobility task');
    expect(revision()).toBe(0);
  });
  it('persists drafts, rejects stale writes and preserves approved versions through a review', () => {
    const risk = complete();
    risk.visibility.staff = true;
    expect(save(risk)).toBeNull();
    expect(save(risk, 'Draft', 0)).toContain('changed');
    expect(save(risk, 'In review')).toBeNull();
    expect(save(risk, 'Approved')).toContain('different');
    actor.set({ ...actor(), id: 'different-manager', name: 'Review manager' });
    expect(save(risk, 'Approved')).toBeNull();
    const approved = structuredClone(
      care.client('risk-client')!.file!.riskRegister!.assessments[0],
    );
    expect(approved.approver).toBe('Review manager');
    expect(save(approved)).toContain('new review');
    const draft = { ...approved, id: crypto.randomUUID(), version: 2, status: 'Draft' as const };
    actor.set({ ...actor(), roleCode: 'FS' });
    expect(save(draft)).toBeNull();
    const register = care.client('risk-client')!.file!.riskRegister!;
    expect(register.assessments.find((a) => a.id === approved.id)).toEqual(approved);
    expect(latestRisks(register.assessments)[0].version).toBe(2);
    expect(register.history).toHaveLength(4);
    expect(register.history[0].assessment.status).toBe('Draft');
    expect(register.history[2].assessment.status).toBe('Approved');
  });
  it('rejects workspace changes and restricts disclosure to senior managers', () => {
    const risk = complete();
    actor.set({ ...actor(), roleCode: 'FS' });
    risk.visibility.staff = true;
    expect(save(risk)).toContain('senior management');
    expect(
      care.saveRiskAssessment('risk-client', 'different-workspace', risk, 0, 'Draft', 'Reason'),
    ).toContain('workspace changed');
    expect(revision()).toBe(0);
  });
  it('keeps a draft unsaved when workspace storage fails', () => {
    const store = care.store;
    vi.spyOn(store, 'saveWorkspace').mockReturnValue(false);
    expect(save(complete())).toContain('Could not save');
    expect(revision()).toBe(0);
  });
  it('only provides specialist screens supplied in the mockups', () => {
    const fixture = TestBed.createComponent(RiskAssessments);
    fixture.detectChanges();
    const page = fixture.componentInstance as any;
    page.start('General');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Description of the risk / how harm could occur',
    );
    page.tab.set('General details');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Service User Details');
    for (const domain of [
      'Self-Harm / Suicide',
      'Diabetes',
      'Nutrition & Hydration',
      'Safeguarding',
    ]) {
      page.start(domain);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Coming soon');
    }
    for (const screen of ['voice', 'automated']) {
      page.go(screen);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Coming soon');
    }
  });
  it('renders risk overview, designed assessment and coming-soon screens', async () => {
    const fixture = TestBed.createComponent(RiskAssessments);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;
    expect(fixture.nativeElement.textContent).toContain('Risk Assessment Overview');
    component.start('Behaviour / PBS');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('What carers MUST NOT do');
    component.go('overview');
    component.start('Diabetes');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Coming soon');
  });
});
