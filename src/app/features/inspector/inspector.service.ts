import { approvedInstructions } from '../management/care/care-plan.models';
import { documentVisibility } from '../management/care/care-documents.models';
import { Injectable, Injector, computed, inject } from '@angular/core';
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

export interface InspectorStaff {
  id: string;
  name: string;
  role: string;
  location: string;
  documents?: import('../management/shared/management.store').StaffDocument[];
  hr?: Pick<
    import('../management/people/hr.models').StaffRecord,
    'status' | 'checks' | 'training' | 'references'
  > & { employment: { type: string } };
}

@Injectable({ providedIn: 'root' })
export class InspectorService {
  private readonly injector = inject(Injector);
  get store(): ManagementStore {
    return this.injector.get(ManagementStore);
  }
  readonly qualityBackend?: import('./inspector-quality-api.service').InspectorQualityApi;
  readonly incidentsBackend?: import('./inspector-incidents-api.service').InspectorIncidentsApi;
  readonly medicationBackend?: import('./inspector-medication-api.service').InspectorMedicationApi;
  readonly staffBackend?: import('./inspector-staff-api.service').InspectorStaffApi;
  readonly clientsBackend?: import('./inspector-clients-api.service').InspectorClientsApi;
  readonly backend?: import('./inspector-provider-api.service').InspectorProviderApi;
  readonly company = computed(() => this.store.company());
  readonly companyId = computed(() => this.store.companyId());
  readonly locations = computed<
    Pick<
      import('../management/locations/locations.models').ServiceLocation,
      'id' | 'name' | 'type' | 'registeredPlaces' | 'status'
    >[]
  >(() => this.store.data().locations ?? []);
  readonly serviceUserCount = computed(() => this.clients().length);
  readonly auth = inject(AuthService);
  get today() {
    return londonDate();
  }
  readonly state = computed(() => this.store.data().inspection ?? emptyInspection());
  readonly clients = computed(() => this.store.data().rota?.clients ?? []);
  readonly careInstructions = computed(() =>
    this.clients().flatMap((c) =>
      approvedInstructions(c, 'inspector').map((s) => ({
        ...s,
        client: c.name,
        partialDemo:
          c.file?.carePlan?.versions.find((p) => p.status === 'Approved')?.demoScope ===
          'available-sections',
      })),
    ),
  );
  readonly staff = computed<InspectorStaff[]>(() => this.store.staff());
  readonly quality = computed<{
    assessments: import('./inspector-provider.generated').InspectorQualityAssessment[];
    actions: import('./inspector-provider.generated').InspectorQualityAction[];
  }>(() => ({ assessments: [], actions: [] }));
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
  readonly prescriptions = computed<
    import('./inspector-provider.generated').InspectorMedicationPrescriptionDetail[]
  >(() => []);
  readonly administrations = computed<
    import('./inspector-provider.generated').InspectorMedicationAdministrationDetail[]
  >(() => []);
  readonly incidents = computed<import('./inspector-provider.generated').InspectorIncidentRead[]>(
    () => [],
  );
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
    return [...compliance, ...staff, ...care, ...this.state().documents].map((d) => ({
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
