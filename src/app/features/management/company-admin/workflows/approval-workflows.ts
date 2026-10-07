import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../../shared/ui/select';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ManagementStore } from '../../shared/management.store';
import { ToastService } from '../../../../shared/ui/toast.service';
@Component({
  selector: 'cv-approval-workflows',
  imports: [FormsModule, MatSelectModule, CvSelect],
  templateUrl: './approval-workflows.html',
})
export class ApprovalWorkflows {
  protected readonly store = inject(ManagementStore);
  private readonly toast = inject(ToastService);
  protected workflow = 'Care plans';
  protected readonly payrollReviewers = [
    'Registered Manager',
    'Finance Officer',
    'Company Admin',
    'HR Officer',
  ];
  private readonly payrollRoutes: Record<string, string[]> = {
    Overtime: ['Registered Manager', 'Finance Officer'],
    Timesheets: ['Registered Manager'],
    'Contractor invoices': ['Registered Manager', 'Finance Officer'],
    'Payroll runs': ['Finance Officer'],
  };
  protected isPayrollWorkflow(): boolean {
    return !!this.payrollRoutes[this.workflow];
  }
  protected savedSteps(name = this.workflow): string[] {
    return this.store.data().workflows[name] ?? this.payrollRoutes[name] ?? [];
  }
  protected readonly workflowTypes = [
    {
      name: 'Overtime',
      icon: 'more_time',
      tone: 'purple',
      description: 'Authorise extra work, then approve actual hours',
    },
    {
      name: 'Timesheets',
      icon: 'schedule',
      tone: 'teal',
      description: 'Confirm work before preparing pay',
    },
    {
      name: 'Contractor invoices',
      icon: 'receipt_long',
      tone: 'blue',
      description: 'Confirm services, then approve the invoice',
    },
    {
      name: 'Payroll runs',
      icon: 'payments',
      tone: 'green',
      description: 'Independent sign-off before payroll export',
    },
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
  protected steps = [...this.savedSteps()];
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
    const saved = this.savedSteps();
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
    const saved = this.savedSteps();
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
      (!this.workflowEnabled ||
        (this.steps.length > 0 &&
          this.steps.every((s) => s.trim()) &&
          (!this.isPayrollWorkflow() ||
            (this.steps.length === this.payrollRoutes[this.workflow].length &&
              this.steps.every((s) => this.payrollReviewers.includes(s)))))) &&
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
    const saved = this.store.saveWorkspace((d) => ({
      ...d,
      workflows: { ...d.workflows, [this.workflow]: this.workflowEnabled ? [...this.steps] : [] },
      workflowPreferences: {
        ...d.workflowPreferences,
        [this.workflow]: { notify: this.notify, escalation: this.escalation },
      },
    }));
    if (!saved) {
      this.toast.error(
        'Could not save the approval route. Free some browser storage and try again.',
      );
      return;
    }
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
