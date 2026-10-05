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
