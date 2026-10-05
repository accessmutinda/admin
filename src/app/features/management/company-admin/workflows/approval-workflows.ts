import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ManagementStore } from '../../shared/management.store';
import { ToastService } from '../../../../shared/ui/toast.service';
@Component({
  selector: 'cv-approval-workflows',
  imports: [FormsModule],
  templateUrl: './approval-workflows.html',
})
export class ApprovalWorkflows {
  protected readonly store = inject(ManagementStore);
  private readonly toast = inject(ToastService);
  protected workflow = 'Care plans';
  protected readonly workflowTypes = [
    {
      name: 'Care plans',
      icon: 'favorite',
      tone: 'teal',
      description: 'Person-centred care, reviewed together',
    },
    {
      name: 'Policies',
      icon: 'description',
      tone: 'blue',
      description: 'Consistent standards across your service',
    },
    {
      name: 'Incidents',
      icon: 'health_and_safety',
      tone: 'amber',
      description: 'Clear oversight when it matters most',
    },
    {
      name: 'Training',
      icon: 'school',
      tone: 'purple',
      description: 'Support learning and development',
    },
    {
      name: 'Exports',
      icon: 'file_download',
      tone: 'green',
      description: 'Review information before it leaves',
    },
  ];
  protected steps = [...this.store.data().workflows[this.workflow]];
  protected newStep = '';
  protected workflowEnabled = this.steps.length > 0;
  protected notify = this.store.data().workflowPreferences?.[this.workflow]?.notify ?? true;
  protected escalation = this.store.data().workflowPreferences?.[this.workflow]?.escalation ?? 3;
  protected workflowSubmitted = false;
  private readonly workflowDrafts: Record<
    string,
    { steps: string[]; enabled: boolean; notify: boolean; escalation: number }
  > = {};
  protected selectWorkflow(): void {
    const saved = this.store.data().workflows[this.workflow];
    this.workflowEnabled = saved.length > 0;
    this.steps = [...saved];
    this.notify = this.store.data().workflowPreferences?.[this.workflow]?.notify ?? true;
    this.escalation = this.store.data().workflowPreferences?.[this.workflow]?.escalation ?? 3;
    this.workflowSubmitted = false;
    this.newStep = '';
  }
  protected workflowDescription(): string {
    return this.workflowTypes.find((type) => type.name === this.workflow)?.description ?? '';
  }
  protected chooseWorkflow(name: string): void {
    this.workflowDrafts[this.workflow] = this.workflowState();
    this.workflow = name;
    this.selectWorkflow();
    const draft = this.workflowDrafts[name];
    if (draft) {
      this.steps = [...draft.steps];
      this.workflowEnabled = draft.enabled;
      this.notify = draft.notify;
      this.escalation = draft.escalation;
    }
  }
  private workflowState() {
    return {
      steps: [...this.steps],
      enabled: this.workflowEnabled,
      notify: this.notify,
      escalation: this.escalation,
    };
  }
  protected workflowChanged(): boolean {
    const saved = this.store.data().workflows[this.workflow];
    const preferences = this.store.data().workflowPreferences?.[this.workflow];
    return (
      JSON.stringify(this.workflowState()) !==
      JSON.stringify({
        steps: saved,
        enabled: saved.length > 0,
        notify: preferences?.notify ?? true,
        escalation: preferences?.escalation ?? 3,
      })
    );
  }
  protected discardWorkflow(): void {
    delete this.workflowDrafts[this.workflow];
    this.selectWorkflow();
  }
  protected workflowValid(): boolean {
    return (
      (!this.workflowEnabled || (this.steps.length > 0 && this.steps.every((s) => s.trim()))) &&
      Number.isInteger(this.escalation) &&
      this.escalation >= 1 &&
      this.escalation <= 30
    );
  }
  protected escalationValid(): boolean {
    return Number.isInteger(this.escalation) && this.escalation >= 1 && this.escalation <= 30;
  }
  protected saveWorkflow(): void {
    this.workflowSubmitted = true;
    if (!this.workflowValid()) return;
    this.steps = this.workflowEnabled ? this.steps.map((s) => s.trim()) : [];
    this.store.update((d) => ({
      ...d,
      workflows: { ...d.workflows, [this.workflow]: this.workflowEnabled ? [...this.steps] : [] },
      workflowPreferences: {
        ...d.workflowPreferences,
        [this.workflow]: { notify: this.notify, escalation: this.escalation },
      },
    }));
    delete this.workflowDrafts[this.workflow];
    this.workflowSubmitted = false;
    this.toast.success('Approval workflow saved.');
  }
  protected addStep(): void {
    if (this.newStep.trim()) {
      this.steps.push(this.newStep.trim());
      this.newStep = '';
    }
  }
  protected moveStep(i: number, offset: number): void {
    const j = i + offset;
    if (j < 0 || j >= this.steps.length) return;
    [this.steps[i], this.steps[j]] = [this.steps[j], this.steps[i]];
  }
}
