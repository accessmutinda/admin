import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { ROLES } from '../../../core/auth/models/role';
import { ManagementStore } from '../shared/management.store';
import {
  Assessment,
  CorrectiveAction,
  QualityData,
  QualityAudit,
  emptyQuality,
  templateFor,
  dateValid,
  ukDate,
  qualityDefaults,
} from './quality.models';

type QualityPermission = 'view' | 'create' | 'edit' | 'export';
@Injectable({ providedIn: 'root' })
export class QualityService {
  readonly store = inject(ManagementStore);
  readonly auth = inject(AuthService);
  readonly data = computed(() => this.store.data().quality ?? emptyQuality());
  readonly role = computed(() => ROLES[this.auth.currentUser()?.roleCode ?? 'CW'].label);
  readonly today = signal(ukDate());
  readonly assessors = computed(() =>
    this.store.data().members.filter((m) => m.status === 'Active'),
  );
  constructor() {
    const timer = window.setInterval(() => this.today.set(ukDate()), 30_000);
    inject(DestroyRef).onDestroy(() => window.clearInterval(timer));
  }
  can(action: QualityPermission): boolean {
    if (!this.auth.currentUser() || !this.store.company()?.modules.includes('Quality & compliance'))
      return false;
    const saved = this.store.data().permissions[this.role() + ':Quality & compliance'];
    const permissions = saved ?? qualityDefaults(this.role());
    return !!permissions[0] && !!permissions[{ view: 0, create: 1, edit: 2, export: 4 }[action]];
  }
  private entry(action: string, detail = ''): QualityAudit {
    return {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      actor: this.auth.currentUser()!.name,
      action,
      detail,
    };
  }
  private commit(change: (data: QualityData) => QualityData | string): string | null {
    let error: string | null = null;
    const saved = this.store.saveWorkspace((d) => {
      const next = change(d.quality ?? emptyQuality());
      if (typeof next === 'string') {
        error = next;
        return d;
      }
      return { ...d, quality: next };
    });
    return (
      error ??
      (saved ? null : 'Could not save quality records. Free some browser storage and try again.')
    );
  }
  newAssessment(templateId: string): Assessment {
    const user = this.auth.currentUser();
    return {
      id: crypto.randomUUID(),
      templateId,
      subjectId: '',
      subjectName: '',
      assessorId: user?.id ?? '',
      assessorName: user?.name ?? '',
      date: this.today(),
      reviewDate: '',
      context: '',
      answers: {},
      outcome: '',
      recommendations: '',
      evidence: [],
      status: 'Draft',
      revision: 0,
      audit: [],
    };
  }
  subjects(templateId: string): { id: string; name: string }[] {
    const subject = templateFor(templateId)?.subject;
    if (subject === 'staff') return this.store.staff();
    if (subject === 'client') return this.store.data().rota?.clients ?? [];
    return this.store.company()
      ? [{ id: this.store.company()!.id, name: this.store.company()!.name }]
      : [];
  }
  private contextError(a: Assessment): string | null {
    if (!templateFor(a.templateId)) return 'Choose an assessment from the library.';
    if (!this.subjects(a.templateId).some((s) => s.id === a.subjectId))
      return 'Choose a current person or service for this assessment.';
    if (!dateValid(a.date) || (a.reviewDate && (!dateValid(a.reviewDate) || a.reviewDate < a.date)))
      return 'Enter valid dates, with the next review on or after the assessment.';
    if (
      !this.assessors().some((m) => m.id === a.assessorId) &&
      a.assessorId !== this.auth.currentUser()?.id
    )
      return 'Choose an active assessor.';
    return null;
  }
  saveAssessment(input: Assessment, mode: 'draft' | 'schedule' | 'submit'): string | null {
    const existing = this.data().assessments.find((a) => a.id === input.id);
    if (!this.can(existing ? 'edit' : 'create'))
      return 'Your role does not have permission to save this assessment.';
    const a = structuredClone(input);
    if (!templateFor(a.templateId)) return 'Choose a recognised assessment type.';
    if (mode !== 'draft') {
      const error = this.contextError(a);
      if (error) return error;
    } else if (
      !dateValid(a.date) ||
      (a.reviewDate && (!dateValid(a.reviewDate) || a.reviewDate < a.date))
    )
      return 'Enter valid assessment and review dates.';
    const fields = templateFor(a.templateId)!.fields;
    if (fields.some((f) => f.options && a.answers[f.id] && !f.options.includes(a.answers[f.id])))
      return 'Choose recognised assessment answers.';
    if (
      mode === 'submit' &&
      (fields.some((f) => !a.answers[f.id]?.trim()) ||
        !a.context.trim() ||
        !a.outcome.trim() ||
        !a.recommendations.trim())
    )
      return 'Complete the context, every assessment question, outcome and follow-up before submitting.';
    if (mode === 'submit' && a.date > this.today())
      return 'A future assessment can be scheduled, but cannot be submitted yet.';
    if (
      a.evidence.length > 5 ||
      a.evidence.some(
        (e) =>
          !['image/jpeg', 'image/png', 'application/pdf'].includes(e.type) ||
          e.size > 500_000 ||
          !e.content.startsWith('data:' + e.type + ';base64,'),
      )
    )
      return 'Attach up to five JPG, PNG or PDF files, each no larger than 500 KB.';
    a.subjectName = this.subjects(a.templateId).find((s) => s.id === a.subjectId)?.name ?? '';
    a.assessorName =
      a.assessorId === this.auth.currentUser()?.id
        ? this.auth.currentUser()!.name
        : (this.assessors().find((m) => m.id === a.assessorId)?.name ?? '');
    a.status = { draft: 'Draft', schedule: 'Scheduled', submit: 'Submitted' }[
      mode
    ] as Assessment['status'];
    return this.commit((d) => {
      const current = d.assessments.find((r) => r.id === a.id);
      if ((current?.revision ?? 0) !== a.revision)
        return 'This assessment changed in another tab. Reload it before saving.';
      if (current && ['Submitted', 'Signed off'].includes(current.status))
        return 'Submitted assessments are locked. Reopen the record before editing.';
      if (current && current.templateId !== a.templateId)
        return 'The assessment type cannot be changed.';
      const saved: Assessment = {
        ...a,
        signature: undefined,
        revision: a.revision + 1,
        audit: [
          ...(current?.audit ?? []),
          this.entry(
            mode === 'submit'
              ? 'Assessment submitted'
              : mode === 'schedule'
                ? 'Review scheduled'
                : 'Draft saved',
          ),
        ],
      };
      return { ...d, assessments: [...d.assessments.filter((r) => r.id !== a.id), saved] };
    });
  }
  signOff(id: string, revision: number, name: string, declaration: boolean): string | null {
    if (!this.can('edit')) return 'Your role does not have permission to sign off assessments.';
    if (!declaration || name.trim() !== this.auth.currentUser()?.name)
      return 'Enter your account name and confirm the review declaration.';
    return this.commit((d) => {
      const a = d.assessments.find((r) => r.id === id);
      if (!a || a.revision !== revision) return 'This assessment changed. Reload before signing.';
      if (a.status !== 'Submitted') return 'Submit the assessment before signing off.';
      const signature = {
        name: name.trim(),
        role: this.role(),
        at: new Date().toISOString(),
        declaration,
      };
      return {
        ...d,
        assessments: d.assessments.map((r) =>
          r.id === id
            ? {
                ...r,
                status: 'Signed off',
                signature,
                revision: r.revision + 1,
                audit: [...r.audit, this.entry('Assessment signed off', this.role())],
              }
            : r,
        ),
      };
    });
  }
  reopen(id: string, revision: number, reason: string): string | null {
    if (!this.can('edit')) return 'Your role does not have permission to reopen assessments.';
    if (!reason.trim()) return 'Record why this assessment needs revision.';
    return this.commit((d) => {
      const a = d.assessments.find((r) => r.id === id);
      if (!a || a.revision !== revision) return 'This assessment changed. Reload before reopening.';
      if (!['Submitted', 'Signed off'].includes(a.status))
        return 'Only submitted or signed-off assessments can be reopened.';
      return {
        ...d,
        assessments: d.assessments.map((r) =>
          r.id === id
            ? {
                ...r,
                signature: undefined,
                status: 'Draft',
                revision: r.revision + 1,
                audit: [...r.audit, this.entry('Assessment reopened', reason.trim())],
              }
            : r,
        ),
      };
    });
  }
  saveAction(input: CorrectiveAction): string | null {
    const existing = this.data().actions.find((a) => a.id === input.id);
    if (!this.can(existing ? 'edit' : 'create'))
      return 'Your role does not have permission to save quality actions.';
    if (
      !input.title.trim() ||
      !dateValid(input.due) ||
      !this.assessors().some((m) => m.id === input.ownerId)
    )
      return 'Enter an action, an active owner and a valid due date.';
    if (
      !['Open', 'In progress', 'Completed'].includes(input.status) ||
      !['Standard', 'High'].includes(input.priority)
    )
      return 'Choose a recognised status and priority.';
    if (input.status === 'Completed' && !input.resolution.trim())
      return 'Record the resolution before completing the action.';
    return this.commit((d) => {
      const current = d.actions.find((a) => a.id === input.id);
      if ((current?.revision ?? 0) !== input.revision)
        return 'This action changed. Reload before saving.';
      if (input.assessmentId && !d.assessments.some((a) => a.id === input.assessmentId))
        return 'Choose an existing source assessment.';
      const saved = {
        ...input,
        title: input.title.trim(),
        revision: input.revision + 1,
        audit: [
          ...(current?.audit ?? []),
          this.entry(
            current ? 'Action updated' : 'Action created',
            input.status + (input.resolution.trim() ? ': ' + input.resolution.trim() : ''),
          ),
        ],
      };
      return { ...d, actions: [...d.actions.filter((a) => a.id !== input.id), saved] };
    });
  }
}
