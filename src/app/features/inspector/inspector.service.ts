import { documentVisibility } from '../management/care/care-documents.models';
import { Injectable, computed, inject } from '@angular/core';
import { ManagementStore, COURSES } from '../management/shared/management.store';
import { AuthService } from '../../core/auth/auth.service';
import {
  completedVisit,
  londonDate,
  londonInstant,
  RotaVisit,
} from '../management/rota/rota.models';
import {
  CATEGORIES,
  InspectorDocument,
  InspectionDraft,
  Question,
  emptyInspection,
  documentStatus,
} from './inspector.models';

@Injectable({ providedIn: 'root' })
export class InspectorService {
  readonly store = inject(ManagementStore);
  readonly auth = inject(AuthService);
  readonly today = londonDate();
  readonly state = computed(() => this.store.data().inspection ?? emptyInspection());
  readonly clients = computed(() => this.store.data().rota?.clients ?? []);
  readonly staff = this.store.staff;
  readonly quality = computed(() => this.store.data().quality ?? { assessments: [], actions: [] });
  readonly visits = computed(() =>
    (this.store.data().rota?.visits ?? []).filter((v) => v.state === 'Published'),
  );
  readonly visitNotes = computed(() =>
    this.clients()
      .flatMap((client) =>
        (client.file?.visitNotes ?? [])
          .filter((note) => note.visibility.inspector)
          .map((note) => ({
            id: note.id,
            clientId: client.id,
            client: client.name,
            date: note.date,
            start: note.start,
            end: note.end,
            visitType: note.visitType,
            body: note.body,
            status: note.status,
            carer:
              this.staff().find((person) => person.id === note.carerId)?.name ?? 'Care team member',
          })),
      )
      .sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start)),
  );
  readonly prescriptions = computed(() =>
    this.clients().flatMap((c) =>
      (c.file?.medications ?? []).map((p) => ({ ...p, client: c.name, clientId: c.id })),
    ),
  );
  readonly administrations = computed(() =>
    this.clients().flatMap((c) =>
      (c.file?.administrations ?? []).map((a) => ({
        ...a,
        client: c.name,
        clientId: c.id,
        medication:
          c.file?.medications?.find((p) => p.id === a.medicationId)?.name ?? 'Unknown medicine',
      })),
    ),
  );
  readonly incidents = computed(() => [
    ...(this.store.data().rota?.ecm?.evidence ?? [])
      .filter(
        (e) => e.type === 'Safeguarding' || e.type === 'Wound / skin' || e.type === 'Other concern',
      )
      .map((e) => ({
        id: e.id,
        name: e.type,
        detail: e.note,
        date: e.at.slice(0, 10),
        level: 'Not assessed',
        status: e.reviewedAt ? 'Reviewed' : 'Awaiting review',
        client: this.visits().find((v) => v.id === e.visitId)?.clientName ?? 'Visit record',
        category: e.type === 'Safeguarding' ? 'Safeguarding' : 'Incident',
      })),
    ...this.clients().flatMap((c) =>
      ['incidents', 'safeguarding'].flatMap((key) =>
        (c.file?.entries[key] ?? []).map((e) => ({
          ...e,
          client: c.name,
          category: key === 'safeguarding' ? 'Safeguarding' : 'Incident',
        })),
      ),
    ),
  ]);
  readonly documents = computed<InspectorDocument[]>(() => {
    const compliance = Object.entries(this.store.company()?.compliance?.documents ?? {}).map(
      ([key, d]) => ({
        id: 'company:' + key,
        name: d.name,
        category:
          (
            {
              insurance: 'Insurance',
              continuity: 'Business Continuity',
              dataProtection: 'Data Protection',
            } as Record<string, string>
          )[key] ?? 'Policies',
        questions: ['Well-led'] as Question[],
        owner: d.owner || d.uploadedBy,
        updated: d.uploadedAt,
        version: '—',
        expiry: d.expiry,
        status: 'Recorded',
        content: d.content,
        source: 'Provider compliance',
      }),
    );
    const staff = this.staff().flatMap((p) =>
      (p.documents ?? []).map((d) => ({
        id: 'staff:' + p.id + ':' + d.id,
        name: d.name,
        category: d.category === 'Training' ? 'Training Certificates' : 'Staffing Records',
        questions: ['Effective'] as Question[],
        owner: p.name,
        updated: d.uploadedAt ?? '',
        version: String(d.version ?? 1),
        expiry: d.expiry ?? '',
        status: d.status === 'Verified' ? 'Verified' : 'Pending review',
        content: d.content,
        source: 'Staff record',
      })),
    );
    const care = this.clients().flatMap((c) =>
      (c.file?.documents ?? [])
        .filter((d) => documentVisibility(d).inspector)
        .map((d) => ({
          id: 'care:' + c.id + ':' + d.id,
          name: d.name,
          category: CATEGORIES.includes(d.category) ? d.category : 'Care Plan Samples',
          questions: ['Caring'] as Question[],
          owner: d.by,
          updated: d.at,
          version: d.version,
          expiry: '',
          status: 'Recorded',
          content: d.data,
          source: 'Care record',
        })),
    );
    const quality = this.quality().assessments.flatMap((a) =>
      a.evidence.map((d) => ({
        id: 'quality:' + a.id + ':' + d.id,
        name: d.name,
        category: 'Audits',
        questions: ['Well-led'] as Question[],
        owner: a.assessorName,
        updated: a.date,
        version: String(a.revision),
        expiry: '',
        status: a.status === 'Signed off' ? 'Verified' : 'Pending review',
        content: d.content,
        source: 'Quality assessment',
      })),
    );
    return [...compliance, ...staff, ...care, ...quality, ...this.state().documents].map((d) => ({
      ...d,
      status: documentStatus(d, this.today),
    }));
  });
  readonly training = computed(() =>
    COURSES.map((course) => {
      const records = this.staff().map((p) => p.hr?.training.find((t) => t.courseId === course.id));
      return {
        name: course.title,
        current: records.filter((t) => t?.completed && (!t.expiry || t.expiry >= this.today))
          .length,
        expired: records.filter((t) => t?.expiry && t.expiry < this.today).length,
        missing: records.filter((t) => !t?.completed).length,
        competent: records.filter((t) => t?.competency === 'Competent').length,
      };
    }),
  );
  status(v: RotaVisit): string {
    if (completedVisit(v)) return 'Completed';
    if (v.attendance.some((a) => a.start)) return 'In progress';
    if (v.staffIds.length < v.carers) return 'Unallocated';
    const end = londonInstant(v.date, v.end);
    return end && Date.parse(end) < Date.now() ? 'No attendance' : 'Scheduled';
  }
  saveDraft(draft: InspectionDraft, companyId: string): string {
    if (companyId !== this.store.companyId())
      return 'The workspace changed. Reopen the inspection before saving.';
    let conflict = false;
    const saved = this.store.saveWorkspace((data) => {
      const inspection = data.inspection ?? emptyInspection();
      if (inspection.draft.revision !== draft.revision) {
        conflict = true;
        return data;
      }
      return {
        ...data,
        inspection: {
          ...inspection,
          draft: {
            ...structuredClone(draft),
            revision: draft.revision + 1,
            updated: new Date().toISOString(),
            by: this.auth.currentUser()?.name ?? 'Inspector',
          },
        },
      };
    });
    return conflict
      ? 'This inspection changed in another window. Reload the saved draft before editing.'
      : saved
        ? ''
        : 'Could not save. Your draft is still here; free browser storage and try again.';
  }
  addDocument(document: InspectorDocument, companyId: string): string {
    if (companyId !== this.store.companyId())
      return 'The workspace changed. Select the document again.';
    const saved = this.store.saveWorkspace((data) => ({
      ...data,
      inspection: {
        ...(data.inspection ?? emptyInspection()),
        documents: [...(data.inspection?.documents ?? []), document],
      },
    }));
    return saved ? '' : 'Could not save the document. Free browser storage and try again.';
  }
}
