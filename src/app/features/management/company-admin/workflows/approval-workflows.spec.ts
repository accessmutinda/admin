import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../../core/auth/auth.service';
import { WorkspaceService } from '../../../../core/auth/workspace.service';
import { ManagementStore } from '../../shared/management.store';
import { ApprovalWorkflows } from './approval-workflows';

interface WorkflowEditor {
  workflow: string;
  steps: string[];
  escalation: number;
  chooseWorkflow(name: string): void;
  saveWorkflow(): void;
  discardWorkflow(): void;
  workflowChanged(): boolean;
}

describe('Approval workflow configuration', () => {
  let editor: WorkflowEditor;
  let store: ManagementStore;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [ApprovalWorkflows] }).overrideComponent(
      ApprovalWorkflows,
      { set: { template: '' } },
    );
    TestBed.inject(AuthService).signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    store = TestBed.inject(ManagementStore);
    editor = TestBed.createComponent(ApprovalWorkflows)
      .componentInstance as unknown as WorkflowEditor;
  });

  it('keeps document drafts isolated and saves only the selected route', () => {
    const original = [...store.data().workflows['Care plans']];
    editor.steps.push('Director review');
    editor.chooseWorkflow('Policies');
    editor.steps.push('Policy owner');
    editor.saveWorkflow();
    expect(store.data().workflows['Care plans']).toEqual(original);
    expect(store.data().workflows['Policies'].at(-1)).toBe('Policy owner');
    editor.chooseWorkflow('Care plans');
    expect(editor.steps.at(-1)).toBe('Director review');
    editor.discardWorkflow();
    expect(editor.steps).toEqual(original);
    expect(editor.workflowChanged()).toBe(false);
  });

  it('does not persist an invalid escalation or unnamed reviewer', () => {
    const original = structuredClone(store.data());
    editor.steps.push('Director review');
    editor.escalation = 1.5;
    editor.saveWorkflow();
    expect(store.data()).toEqual(original);
    editor.escalation = 4;
    editor.steps.push('   ');
    editor.saveWorkflow();
    expect(store.data()).toEqual(original);
  });
});

describe('Approval workflow cards', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [ApprovalWorkflows] });
    TestBed.inject(AuthService).signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
  });

  it('renders every card when payroll routes have not been saved', () => {
    const fixture = TestBed.createComponent(ApprovalWorkflows);
    fixture.detectChanges();
    const cards = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.workflow-type'),
    );
    expect(cards.map((card) => card.querySelector('strong')?.textContent?.trim())).toEqual([
      'Overtime',
      'Timesheets',
      'Contractor invoices',
      'Payroll runs',
      'Care plans',
      'Policies',
      'Incidents',
      'Training',
      'Exports',
    ]);
    expect(cards.map((card) => card.querySelector('small')?.textContent?.trim())).toEqual([
      '2 review steps',
      '1 review step',
      '2 review steps',
      '1 review step',
      '3 review steps',
      '3 review steps',
      '3 review steps',
      '3 review steps',
      '3 review steps',
    ]);
  });

  it('preserves a saved paused route instead of showing the default steps', () => {
    TestBed.inject(ManagementStore).update((data) => ({
      ...data,
      workflows: { ...data.workflows, Overtime: [] },
    }));
    const fixture = TestBed.createComponent(ApprovalWorkflows);
    fixture.detectChanges();
    const card = (fixture.nativeElement as HTMLElement).querySelector('.workflow-type');
    expect(card?.querySelector('small')?.textContent?.trim()).toBe('Routing paused');
    (fixture.componentInstance as unknown as WorkflowEditor).chooseWorkflow('Overtime');
    fixture.detectChanges();
    expect((fixture.componentInstance as unknown as WorkflowEditor).steps).toEqual([]);
  });
});
