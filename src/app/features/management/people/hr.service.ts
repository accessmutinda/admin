import { Injectable, computed, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ROLES } from '../../../core/auth/models/role';
import {
  ManagementStore,
  Person,
  CHECKS,
  ONBOARDING,
  StaffDocument,
  WorkspaceData,
} from '../shared/management.store';
import { StaffDraft, staffErrors, staffRecord, readiness, today, dateValid } from './hr.models';

@Injectable({ providedIn: 'root' })
export class HrService {
  readonly store = inject(ManagementStore);
  readonly auth = inject(AuthService);
  readonly staff = computed(() =>
    this.can('view') ? this.store.staff().map((p) => ({ ...p, hr: staffRecord(p) })) : [],
  );
  readonly drafts = computed(() =>
    (this.store.data().staffDrafts ?? []).filter(
      (d) => d.companyId === this.store.companyId() && d.ownerId === this.auth.currentUser()?.id,
    ),
  );
  can(action: 'view' | 'create' | 'edit' | 'export'): boolean {
    const role = ROLES[this.auth.currentUser()?.roleCode ?? 'CW'].label;
    const flags = this.store.data().permissions[role + ':People & HR'];
    return (
      !!this.auth.currentUser() &&
      !!this.store.company()?.modules.includes('People & HR') &&
      (!flags || (!!flags[0] && !!flags[{ view: 0, create: 1, edit: 2, export: 4 }[action]]))
    );
  }
  readonly sampleError = signal('');
  async loadSampleData(): Promise<void> {
    if (!this.can('create') || this.store.data().hrDemoVersion === 1) return;
    const workspace = this.store.companyId();
    const { seedHrDemo } = await import('./hr-demo-data');
    if (workspace !== this.store.companyId() || !this.can('create')) return;
    this.sampleError.set(
      this.store.saveWorkspace((data) => seedHrDemo(data))
        ? ''
        : 'Sample HR records could not be saved on this device. Free some storage and try again.',
    );
  }
  canPay(edit = false): boolean {
    const role = ROLES[this.auth.currentUser()?.roleCode ?? 'CW'].label;
    const flags = this.store.data().permissions[role + ':Finance'];
    return (
      !!this.auth.currentUser() &&
      !!this.store.company()?.modules.includes('Finance') &&
      (!flags || (!!flags[0] && (!edit || !!flags[2])))
    );
  }
  saveDraft(draft: StaffDraft): string | null {
    if (
      !this.can('create') ||
      draft.ownerId !== this.auth.currentUser()?.id ||
      draft.companyId !== this.store.companyId()
    )
      return 'You cannot save this draft in the current workspace.';
    return this.store.saveWorkspace((d) => ({
      ...d,
      staffDrafts: [
        ...(d.staffDrafts ?? []).filter((v) => !(v.id === draft.id && v.ownerId === draft.ownerId)),
        structuredClone({ ...draft, savedAt: new Date().toISOString() }),
      ],
    }))
      ? null
      : 'Draft could not be saved on this device. Your entries are still here.';
  }
  savePerson(
    person: Person,
    companyId: string,
    action: string,
    options: { draftId?: string; sourceId?: string; expectedAudit?: string } = {},
  ): string | null {
    if (companyId !== this.store.companyId())
      return 'The workspace changed. Return to the original company before saving.';
    const existing = this.store.data().people.find((p) => p.id === person.id);
    const creating = !existing || existing.stage !== 'Hired';
    if (existing && existing.stage !== 'Hired' && !options.sourceId)
      return 'Start staff setup from the accepted offer before converting this applicant.';
    if (!this.can(creating ? 'create' : 'edit')) return 'Your role cannot save this staff record.';
    if (
      options.sourceId &&
      (!existing || existing.id !== options.sourceId || existing.stage !== 'Offer')
    )
      return 'This application must be at Offer stage before staff setup can be completed.';
    if (options.draftId && existing?.stage === 'Hired')
      return 'This staff setup has already been completed. Open the existing profile.';
    const latestAudit = existing?.hr?.audit.at(-1)?.id ?? '';
    if (options.expectedAudit !== undefined && latestAudit !== options.expectedAudit)
      return 'This record changed while you were editing. Reload it before saving.';
    const errors = staffErrors(person).flat();
    const previousErrors = existing ? staffErrors(existing).flat() : [];
    const newErrors = creating ? errors : errors.filter((e) => !previousErrors.includes(e));
    if (newErrors.length) return newErrors[0];
    const h = staffRecord(person);
    const oldEmployment = existing ? staffRecord(existing).employment : undefined;
    if (
      !this.canPay(true) &&
      (h.employment.rate !== (oldEmployment?.rate ?? null) ||
        h.employment.payrollNumber !== (oldEmployment?.payrollNumber ?? ''))
    )
      return 'Your role cannot edit pay information.';
    if (
      this.store
        .data()
        .people.some(
          (p) =>
            p.id !== person.id &&
            p.hr?.reference.trim().toLowerCase() === h.reference.trim().toLowerCase(),
        )
    )
      return 'That staff reference is already in use.';
    if (
      h.status === 'Active' &&
      (creating || existing?.hr?.status !== 'Active') &&
      !readiness(person).ready
    )
      return 'Complete the outstanding readiness requirements before activating this employee.';
    if (
      h.checks.some(
        (c) =>
          (c.completed && (!dateValid(c.completed) || c.completed > today())) ||
          (c.expiry && (!dateValid(c.expiry) || (c.completed && c.expiry < c.completed))),
      )
    )
      return 'Enter valid check dates; renewal cannot precede completion.';
    if (
      h.training.some((t) => t.competency === 'Competent' && (!t.assessor.trim() || !t.completed))
    )
      return 'Competency assessments need an assessor and completion date.';
    if (
      h.checks.some(
        (c) =>
          c.status === 'Verified' &&
          (!c.completed ||
            c.completed > today() ||
            !c.reviewer.trim() ||
            !person.documents?.some((d) => d.id === c.documentId)),
      )
    )
      return 'Verified checks need a completion date, reviewer and attached evidence.';
    if (
      h.training.some(
        (t) =>
          (t.score !== undefined &&
            t.score !== null &&
            (!Number.isFinite(t.score) || t.score < 0 || t.score > 100)) ||
          (t.reassessmentDue && !dateValid(t.reassessmentDue)),
      )
    )
      return 'Enter a score from 0 to 100 and valid reassessment dates.';
    if (person.documents?.some((d) => d.expiry && !dateValid(d.expiry)))
      return 'Enter valid document expiry dates.';
    h.audit = [
      ...(existing?.hr?.audit ?? []),
      {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        actor: this.auth.currentUser()!.name,
        action,
      },
    ];
    const saved: Person = {
      ...structuredClone(person),
      hr: h,
      name: [h.personal.firstName, h.personal.middleName, h.personal.surname]
        .filter(Boolean)
        .map((v) => v!.trim())
        .join(' '),
      email: person.email.trim(),
      stage: 'Hired',
      checks: CHECKS.map((title) =>
        h.checks.some((c) => c.title === title && c.status === 'Verified'),
      ),
      checkExpiry: Object.fromEntries(h.checks.map((c) => [c.title, c.expiry])),
      onboarding: ONBOARDING.map((title) => !!h.induction.find((t) => t.title === title)?.complete),
      learning: h.training.map((t) => t.courseId),
    };
    try {
      return this.store.saveWorkspace((d) => {
        const latest = d.people.find((p) => p.id === person.id);
        if (
          options.expectedAudit !== undefined &&
          (latest?.hr?.audit.at(-1)?.id ?? '') !== options.expectedAudit
        )
          throw new Error('This record changed while you were editing. Reload it before saving.');
        if (options.draftId && latest?.stage === 'Hired')
          throw new Error(
            'This staff setup has already been completed. Open the existing profile.',
          );
        if (options.sourceId && latest?.stage !== 'Offer')
          throw new Error(
            'The application stage changed. Review the application before continuing.',
          );
        if (
          d.people.some(
            (p) =>
              p.id !== person.id &&
              p.hr?.reference.trim().toLowerCase() === h.reference.trim().toLowerCase(),
          )
        )
          throw new Error('That staff reference is already in use.');
        if (existing && !latest)
          throw new Error('This staff record was removed while you were editing.');
        const uniqueLegacyName =
          !!existing && d.people.filter((p) => p.name === existing.name).length === 1;
        const belongs = (v: { personId?: string; person: string }) =>
          v.personId === saved.id ||
          (!v.personId && uniqueLegacyName && v.person === existing?.name);
        return {
          ...d,
          people: existing
            ? d.people.map((p) => (p.id === saved.id ? saved : p))
            : [...d.people, saved],
          staffDrafts: (d.staffDrafts ?? []).filter(
            (v) => v.id !== options.draftId || v.ownerId !== this.auth.currentUser()?.id,
          ),
          leaves: d.leaves.map((v) =>
            belongs(v) ? { ...v, personId: saved.id, person: saved.name } : v,
          ),
          reviews: d.reviews.map((v) =>
            belongs(v) ? { ...v, personId: saved.id, person: saved.name } : v,
          ),
        };
      })
        ? null
        : 'Staff details could not be saved on this device. Your edits are still here.';
    } catch (error) {
      return error instanceof Error ? error.message : 'The staff record could not be saved.';
    }
  }
  related(
    companyId: string,
    personId: string,
    action: string,
    change: (data: WorkspaceData) => WorkspaceData,
  ): string | null {
    if (!this.can('edit') || companyId !== this.store.companyId())
      return 'You cannot change this record in the current workspace.';
    try {
      return this.store.saveWorkspace((data) => {
        const person = data.people.find((p) => p.id === personId && p.stage === 'Hired');
        if (!person) throw new Error('This staff record is no longer available.');
        const h = staffRecord(person);
        h.audit.push({
          id: crypto.randomUUID(),
          at: new Date().toISOString(),
          actor: this.auth.currentUser()!.name,
          action,
        });
        const next = change(data);
        return {
          ...next,
          people: next.people.map((p) => (p.id === personId ? { ...p, hr: h } : p)),
        };
      })
        ? null
        : 'Changes could not be saved on this device.';
    } catch (error) {
      return error instanceof Error ? error.message : 'The record could not be saved.';
    }
  }
  async document(file: File, category: string): Promise<StaffDocument> {
    if (
      ![
        'application/pdf',
        'image/jpeg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ].includes(file.type)
    )
      throw new Error('Choose a PDF, JPG, PNG, DOC or DOCX file.');
    if (file.size > 1024 * 1024) throw new Error('Choose a file under 1 MB for device storage.');
    const content = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error('The file could not be read.'));
      r.readAsDataURL(file);
    });
    return {
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type,
      content,
      category,
      uploadedAt: new Date().toISOString(),
      status: 'Pending review',
      version: 1,
    };
  }
  export(people: Person[]): void {
    if (!this.can('export')) return;
    const rows = [
      ['Staff reference', 'Name', 'Role', 'Branch', 'Employment status'],
      ...people.map((p) => [
        staffRecord(p).reference,
        p.name,
        p.role,
        p.location,
        staffRecord(p).status,
      ]),
    ];
    this.exportRows('staff-directory.csv', rows);
  }
  exportRows(filename: string, rows: string[][]): void {
    if (!this.can('export')) return;
    const cell = (value: string) =>
      '"' + (/^\s*[=+@-]|^[\t\r\n]/.test(value) ? "'" + value : value).replaceAll('"', '""') + '"';
    this.store.download(
      filename,
      rows.map((row) => row.map(cell).join(',')).join('\r\n'),
      'text/csv',
    );
  }
}
export const hrGuard: CanActivateFn = async () => {
  const hr = inject(HrService),
    router = inject(Router);
  if (!hr.can('view')) return router.createUrlTree(['/manage/companies']);
  if (hr.store.companyId() === 'lqcs' && hr.store.data().hrDemoVersion !== 1)
    await hr.loadSampleData();
  return true;
};
