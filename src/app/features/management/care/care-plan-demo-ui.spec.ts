import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { DEMO_USER } from '../../../core/auth/fixtures';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { seedCareDemo } from '../../../demo/care-demo';
import { ManagementStore } from '../shared/management.store';
import { PortalClientShell } from '../staff-portal/portal-client-shell';
import { PortalAllocation } from '../staff-portal/portal-allocation';
import { EcmService } from '../ecm/ecm.service';
import { CarePlan } from './care-plan';

describe('Care-plan demo screens', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'staff-portal/service-users/:id',
            component: PortalClientShell,
            children: [{ path: 'allocation', component: PortalAllocation }],
          },
          { path: 'manage/care-plans/:id', component: CarePlan },
        ]),
      ],
    });
    const auth = TestBed.inject(AuthService);
    auth.signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    vi.spyOn(auth, 'currentUser').mockReturnValue({ ...DEMO_USER, roleCode: 'CA' });
    TestBed.inject(ManagementStore).saveWorkspace((data) => seedCareDemo(data));
  });
  it('submits the three-section scope and captures an independent demonstration signature in Review History', async () => {
    const harness = await RouterTestingHarness.create(
      '/manage/care-plans/care-demo-client-1?view=versions',
    );
    const page = harness.fixture.nativeElement as HTMLElement;
    const root = harness.routeDebugElement!.componentInstance as any;
    const draft = root.plan;
    draft.confirmed = true;
    draft.capacity['concerns'] = 'No';
    draft.capacity['decision'] = 'Understands care support.';
    draft.packageDecision = 'No change';
    draft.qualityReview = 'Reviewed the demo evidence and the three available areas.';
    draft.sections.forEach((section: any, index: number) => {
      section.complete = index < 3;
      if (index < 3)
        Object.keys(section.fields).forEach(
          (key) => (section.fields[key] = 'Reviewed with the service user.'),
        );
    });
    page.querySelector<HTMLInputElement>('.demo-approval-scope input[type="checkbox"]')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.querySelector('.demo-approval-scope')?.textContent).toContain(
      '14 care areas deferred',
    );
    [...page.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Submit three-section demo'))!
      .click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(root.plan.status).toBe('In review');
    vi.mocked(TestBed.inject(AuthService).currentUser).mockReturnValue({
      ...DEMO_USER,
      id: 'demo-independent-ui',
      name: 'UI Demo Manager',
      roleCode: 'RM',
    });
    harness.detectChanges();
    const signatureName = page.querySelector<HTMLInputElement>(
      '.demo-signoff input:not([type="checkbox"])',
    )!;
    signatureName.value = 'UI Demo Manager';
    signatureName.dispatchEvent(new Event('input'));
    page.querySelector<HTMLInputElement>('.demo-signoff input[type="checkbox"]')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const download = vi.spyOn(root, 'download').mockResolvedValue(undefined);
    [...page.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Approve three-section demo'))!
      .click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(root.plan.status).toBe('Approved');
    expect(root.plan.demoSignature.name).toBe('UI Demo Manager');
    expect(root.plan.sections.slice(3).every((section: any) => !section.complete)).toBe(true);
    expect(page.querySelector('.demo-signed-name')?.textContent).toContain('UI Demo Manager');
    expect(download).toHaveBeenCalledOnce();
  }, 15000);
  it('records task evidence through the existing staff visit screen and exposes it in the care-plan review', async () => {
    const harness = await RouterTestingHarness.create(
      '/staff-portal/service-users/care-demo-client-1/allocation',
    );
    const page = harness.fixture.nativeElement as HTMLElement;
    const visitPicker = page.querySelector<HTMLSelectElement>('cv-portal-allocation select')!;
    expect(visitPicker.options.length).toBeGreaterThan(1);
    visitPicker.value = visitPicker.options[1].value;
    const visitId = visitPicker.value;
    visitPicker.dispatchEvent(new Event('change'));
    await harness.fixture.whenStable();
    harness.detectChanges();
    [...page.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Open visit evidence'))!
      .click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const outcome = page.querySelector<HTMLSelectElement>('.visit-task-capture select')!;
    expect(outcome).toBeTruthy();
    outcome.value = 'Concern';
    outcome.dispatchEvent(new Event('change'));
    await harness.fixture.whenStable();
    harness.detectChanges();
    const taskNote = page.querySelector<HTMLTextAreaElement>('.visit-task-capture textarea')!;
    taskNote.value = 'Personal care took longer; discuss the next review.';
    taskNote.dispatchEvent(new Event('input'));
    const note = page.querySelector<HTMLTextAreaElement>('textarea[name="note"]')!;
    note.value = 'Demo visit evidence reviewed before submission.';
    note.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();
    harness.detectChanges();
    page.querySelector<HTMLButtonElement>('cv-visit-evidence button[type="submit"]')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.textContent).toContain('Visit evidence saved.');
    const evidence = TestBed.inject(EcmService).data().evidence.at(-1)!;
    expect(evidence.visitId).toBe(visitId);
    expect(evidence.taskResults?.[0].outcome).toBe('Concern');
    await harness.navigateByUrl('/manage/care-plans/care-demo-client-1?view=quality');
    harness.detectChanges();
    expect(page.querySelector('.demo-evidence-review')?.textContent).toContain(
      'Personal care took longer',
    );
  }, 15000);
});
