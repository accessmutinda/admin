import {
  DocumentMetadata,
  documentMetadata,
  documentMetadataError,
  documentVisibility,
  documentRevision,
  sharedDocument,
} from './care-documents.models';
import {
  VisitNote,
  VisitNoteDraft,
  VisitNoteAudience,
  visitNoteRevision,
  validVisitNoteAttachment,
} from './visit-notes.models';
import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { ManagementStore } from '../shared/management.store';
import { RotaService } from '../rota/rota.service';
import { ClientFile, emptyClientFile } from '../clients/client-file.models';
import { londonDate, londonInstant, completedVisit, validTime } from '../rota/rota.models';
import {
  Administration,
  CareContact,
  CareDocument,
  FAMILY_SCOPES,
  FamilyAccess,
  FamilyUpdate,
  FAMILY_UPDATE_CATEGORIES,
  Prescription,
  medicationActive,
  medicationDue,
  prescriptionError,
  validDate,
} from './care.models';

@Injectable({ providedIn: 'root' })
export class CareService {
  readonly store = inject(ManagementStore);
  readonly rota = inject(RotaService);
  readonly auth = inject(AuthService);
  readonly clients = computed(() => (this.rota.can('view') ? this.rota.data().clients : []));
  client(id: string) {
    return this.clients().find((c) => c.id === id);
  }
  readonly canManageNoteVisibility = computed(
    () => this.canWriteVisitNotes() && this.rota.can('manage'),
  );
  private hasVisitNoteStaffIdentity(): boolean {
    const user = this.auth.currentUser();
    return (
      !!user &&
      (user.roleCode !== 'CW' ||
        this.store
          .staff()
          .some((person) => person.email.toLowerCase() === user.email.toLowerCase()))
    );
  }
  canWriteVisitNotes(): boolean {
    return (
      ['PO', 'CA', 'RM', 'CC', 'CW', 'FS'].includes(this.auth.currentUser()?.roleCode ?? '') &&
      this.hasVisitNoteStaffIdentity() &&
      (this.rota.can('attendance') || this.rota.can('manage'))
    );
  }
  canEditVisitNote(note: VisitNote): boolean {
    return (
      this.canWriteVisitNotes() &&
      (note.createdById === this.auth.currentUser()?.id ||
        (['PO', 'CA', 'RM', 'CC', 'FS'].includes(this.auth.currentUser()?.roleCode ?? '') &&
          this.rota.can('manage')))
    );
  }
  visitNotes(id: string): VisitNote[] {
    if (!this.hasVisitNoteStaffIdentity()) return [];
    const notes = this.client(id)?.file?.visitNotes ?? [];
    if (this.canManageNoteVisibility()) return notes;
    const audience = this.auth.currentUser()?.roleCode === 'IN' ? 'inspector' : 'staff';
    return notes.filter((note) => note.visibility[audience]);
  }
  saveVisitNote(
    id: string,
    workspace: string,
    draft: VisitNoteDraft,
    version?: number,
  ): string | null {
    if (!this.canWriteVisitNotes()) return 'You do not have permission to write visit notes.';
    return this.change(
      id,
      workspace,
      version ? 'Visit note updated' : 'Visit note added',
      draft.date,
      (file) => {
        const previous = file.visitNotes?.find((note) => note.id === draft.id);
        if ((previous && previous.version !== version) || (!previous && version !== undefined))
          return 'This note changed. Reopen it before editing.';
        if (
          previous &&
          (!this.canEditVisitNote(previous) ||
            !this.visitNotes(id).some((n) => n.id === previous.id))
        )
          return 'You cannot edit this note.';
        if (!draft.id.trim()) return 'A visit note reference is required.';
        if (
          !validDate(draft.date) ||
          !validTime(draft.start) ||
          !validTime(draft.end) ||
          draft.start === draft.end
        )
          return 'Enter a valid visit date and different start and end times.';
        const start = londonInstant(draft.date, draft.start);
        const endDate =
          draft.end < draft.start
            ? new Date(Date.parse(draft.date + 'T12:00:00Z') + 86400000).toISOString().slice(0, 10)
            : draft.date;
        const end = londonInstant(endDate, draft.end);
        if (!start || !end || Date.parse(end) > Date.now() || Date.parse(end) <= Date.parse(start))
          return 'Notes require a past visit with unambiguous UK start and end times.';
        const carer = this.store.staff().find((p) => p.id === draft.carerId);
        if (
          !carer ||
          !draft.visitType.trim() ||
          draft.visitType.length > 100 ||
          !draft.body.trim() ||
          draft.body.length > 10000 ||
          !['Completed', 'Flagged'].includes(draft.status)
        )
          return 'Choose a carer and visit type, and enter a note of up to 10,000 characters.';
        if (
          this.auth.currentUser()?.roleCode === 'CW' &&
          carer.email.toLowerCase() !== this.auth.currentUser()?.email.toLowerCase()
        )
          return 'Care workers can record notes only for their own care visits.';
        if (draft.visitId) {
          const visit = this.rota
            .data()
            .visits.find(
              (v) => v.id === draft.visitId && v.clientId === id && v.state !== 'Cancelled',
            );
          if (!visit || !visit.staffIds.includes(draft.carerId))
            return 'Choose a current visit and one of its allocated carers.';
        }
        const audiences: VisitNoteAudience[] = ['staff', 'family', 'inspector'];
        if (audiences.some((key) => typeof draft.visibility?.[key] !== 'boolean'))
          return 'Choose valid visibility settings.';
        const allowed = previous?.visibility ?? { staff: true, family: false, inspector: false };
        if (
          !this.canManageNoteVisibility() &&
          audiences.some((key) => draft.visibility[key] !== allowed[key])
        )
          return 'Care management permission is required to change visibility settings.';
        if (
          draft.attachments.length > 10 ||
          new Set(draft.attachments.map((a) => a.id)).size !== draft.attachments.length ||
          draft.attachments.reduce((sum, a) => sum + a.size, 0) > 5 * 1024 * 1024
        )
          return 'Use up to 10 attachments with a combined size no larger than 5 MB.';
        if (draft.attachments.some((a) => !validVisitNoteAttachment(a)))
          return 'Use valid PNG, JPEG or PDF attachments.';
        if (
          previous?.attachments.some(
            (a) =>
              !draft.attachments.some(
                (b) => b.id === a.id && JSON.stringify(a) === JSON.stringify(b),
              ),
          )
        )
          return 'Saved attachments are retained. Add a new attachment instead of replacing one.';
        const actor = this.auth.currentUser()!;
        const at = new Date().toISOString();
        const note: VisitNote = {
          ...structuredClone(draft),
          attachments: draft.attachments.map(
            (attachment) =>
              previous?.attachments.find((a) => a.id === attachment.id) ?? {
                ...structuredClone(attachment),
                uploadedAt: at,
                uploadedBy: actor.name,
              },
          ),
          body: draft.body.trim(),
          visitType: draft.visitType.trim(),
          version: (previous?.version ?? 0) + 1,
          createdAt: previous?.createdAt ?? at,
          createdById: previous?.createdById ?? actor.id,
          createdBy: previous?.createdBy ?? actor.name,
          updatedAt: at,
          updatedBy: actor.name,
          revisions: previous ? [...previous.revisions, visitNoteRevision(previous)] : [],
        };
        file.visitNotes = [...(file.visitNotes ?? []).filter((n) => n.id !== note.id), note];
        return null;
      },
      this.rota.can('manage') ? 'manage' : 'attendance',
    );
  }
  setVisitNoteVisibility(
    id: string,
    workspace: string,
    noteId: string,
    audience: VisitNoteAudience,
    value: boolean,
    version: number,
  ): string | null {
    if (!this.canManageNoteVisibility())
      return 'Care management permission is required to change visibility settings.';
    return this.change(
      id,
      workspace,
      'Visit note visibility changed',
      `${audience}: ${value ? 'shared' : 'restricted'}`,
      (file) => {
        const note = file.visitNotes?.find((n) => n.id === noteId);
        if (!note || note.version !== version)
          return 'This note changed. Refresh it and try again.';
        if (!['staff', 'family', 'inspector'].includes(audience) || typeof value !== 'boolean')
          return 'Choose a valid audience.';
        note.revisions.push(visitNoteRevision(note));
        note.visibility[audience] = value;
        note.version++;
        note.updatedAt = new Date().toISOString();
        note.updatedBy = this.auth.currentUser()!.name;
        return null;
      },
    );
  }
  readonly canManageDocuments = computed(
    () =>
      this.rota.can('manage') &&
      this.auth.currentUser()?.roleCode !== 'IN' &&
      this.hasVisitNoteStaffIdentity(),
  );
  documents(id: string): CareDocument[] {
    if (!this.hasVisitNoteStaffIdentity()) return [];
    const documents = this.client(id)?.file?.documents ?? [];
    if (this.canManageDocuments()) return documents;
    const audience = this.auth.currentUser()?.roleCode === 'IN' ? 'inspector' : 'staff';
    return documents
      .filter((document) => documentVisibility(document)[audience])
      .map(sharedDocument);
  }
  updateDocument(
    id: string,
    workspace: string,
    documentId: string,
    metadata: DocumentMetadata,
    revision: number,
  ): string | null {
    if (!this.canManageDocuments())
      return 'Care management permission is required to edit documents.';
    return this.change(id, workspace, 'Document information updated', metadata.name, (file) => {
      const document = file.documents?.find((d) => d.id === documentId);
      if (!document || (document.revision ?? 1) !== revision)
        return 'This document changed. Reopen it before editing.';
      const error = documentMetadataError(metadata);
      if (error) return error;
      document.revisions = [...(document.revisions ?? []), documentRevision(document)];
      Object.assign(document, structuredClone(metadata), {
        name: metadata.name.trim(),
        category: metadata.category.trim(),
        version: metadata.version.trim().replace(/^v/i, ''),
        revision: (document.revision ?? 1) + 1,
        updatedAt: new Date().toISOString(),
        updatedBy: this.auth.currentUser()!.name,
      });
      return null;
    });
  }
  setDocumentVisibility(
    id: string,
    workspace: string,
    documentId: string,
    audience: VisitNoteAudience,
    value: boolean,
    revision?: number,
  ): string | null {
    if (!this.canManageDocuments())
      return 'Care management permission is required to change visibility settings.';
    return this.change(
      id,
      workspace,
      'Document visibility changed',
      `${documentId} · ${audience}: ${value ? 'shared' : 'restricted'}`,
      (file) => {
        const document = file.documents?.find((d) => d.id === documentId);
        if (!document || (revision !== undefined && (document.revision ?? 1) !== revision))
          return 'This document changed. Refresh it and try again.';
        if (!['staff', 'family', 'inspector'].includes(audience) || typeof value !== 'boolean')
          return 'Choose a valid audience.';
        document.revisions = [...(document.revisions ?? []), documentRevision(document)];
        document.visibility = { ...documentVisibility(document), [audience]: value };
        document.familyShared = document.visibility.family;
        document.revision = (document.revision ?? 1) + 1;
        document.updatedAt = new Date().toISOString();
        document.updatedBy = this.auth.currentUser()!.name;
        return null;
      },
    );
  }
  private change(
    id: string,
    workspace: string,
    action: string,
    detail: string,
    apply: (file: ClientFile) => string | null,
    permission: 'manage' | 'attendance' | 'view' = 'manage',
    version?: string,
  ): string | null {
    if (workspace !== this.store.companyId()) return 'The workspace changed. Reopen this record.';
    if (!this.rota.can(permission)) return 'You do not have permission for this action.';
    const client = this.client(id);
    if (!client) return 'Service user no longer available.';
    if (version !== undefined && (client.file?.updatedAt ?? '') !== version)
      return 'This record changed while you were editing. Reopen it before saving.';
    const file = structuredClone(client.file ?? emptyClientFile());
    const error = apply(file);
    if (error) return error;
    const actor = this.auth.currentUser()!;
    const at = new Date().toISOString();
    file.updatedAt = at;
    file.audit = [
      ...(file.audit ?? []),
      { id: crypto.randomUUID(), at, by: actor.name, action, detail },
    ];
    return this.store.saveWorkspace((data) => ({
      ...data,
      rota: {
        ...this.rota.data(),
        clients: this.rota.data().clients.map((c) => (c.id === id ? { ...c, file } : c)),
        audit: [
          ...this.rota.data().audit,
          {
            id: crypto.randomUUID(),
            clientId: id,
            userId: actor.id,
            at,
            user: actor.name,
            action,
            detail: `${client.name} · ${detail}`,
          },
        ],
      },
    }))
      ? null
      : 'Could not save. Device storage may be full. Your draft is retained.';
  }
  saveMedication(
    id: string,
    workspace: string,
    medication: Prescription,
    version: string,
  ): string | null {
    const error = prescriptionError(medication);
    if (error) return error;
    return this.change(
      id,
      workspace,
      'Prescription saved',
      medication.name,
      (file) => {
        const existing = file.medications?.find((m) => m.id === medication.id);
        if (existing?.discontinuedAt) return 'Discontinued prescriptions cannot be edited.';
        if (existing && file.administrations?.some((a) => a.medicationId === existing.id)) {
          if (JSON.stringify(existing) !== JSON.stringify(medication))
            return 'This prescription has administration records. Discontinue it and add a replacement to preserve the recorded schedule.';
        }
        file.medications = [
          ...(file.medications ?? []).filter((m) => m.id !== medication.id),
          structuredClone(medication),
        ];
        return null;
      },
      'manage',
      version,
    );
  }
  discontinue(id: string, workspace: string, medicationId: string, reason: string): string | null {
    return this.change(id, workspace, 'Prescription discontinued', reason, (file) => {
      const m = file.medications?.find((m) => m.id === medicationId);
      if (!m || m.discontinuedAt || !reason.trim())
        return 'Choose a current prescription and record the reason.';
      m.discontinuedAt = new Date().toISOString();
      m.discontinuedReason = reason.trim();
      return null;
    });
  }
  adjustStock(
    id: string,
    workspace: string,
    medicationId: string,
    amount: number,
    reason: string,
  ): string | null {
    return this.change(
      id,
      workspace,
      'Medication stock adjusted',
      `${amount} units · ${reason}`,
      (file) => {
        const m = file.medications?.find((m) => m.id === medicationId);
        if (!m || !Number.isFinite(amount) || !reason.trim() || (m.stock ?? 0) + amount < 0)
          return 'Enter a valid stock change and reason.';
        m.stock = (m.stock ?? 0) + amount;
        return null;
      },
    );
  }
  record(
    id: string,
    workspace: string,
    entry: Omit<Administration, 'id' | 'at' | 'by' | 'userId'>,
  ): string | null {
    return this.change(
      id,
      workspace,
      entry.correctionOf ? 'MAR correction recorded' : 'MAR administration recorded',
      `${entry.date} ${entry.time} · ${entry.outcome}`,
      (file) => {
        const m = file.medications?.find((m) => m.id === entry.medicationId);
        if (
          !m ||
          !m.requiresMar ||
          !validDate(entry.date) ||
          !validTime(entry.time) ||
          !medicationActive(m, entry.date)
        )
          return 'Select an active MAR prescription and a valid date and time.';
        const instant = londonInstant(entry.date, entry.time);
        if (
          !instant ||
          Date.parse(instant) > Date.now() ||
          (m.discontinuedAt && Date.parse(instant) >= Date.parse(m.discontinuedAt))
        )
          return 'Administration cannot be recorded in the future or at an ambiguous clock-change time.';
        if (!['Given', 'Refused', 'Omitted', 'Absent'].includes(entry.outcome))
          return 'Choose an administration outcome.';
        if (!entry.reason.trim() && (entry.outcome !== 'Given' || entry.correctionOf))
          return 'Record a reason for this outcome or correction.';
        if (!Number.isFinite(entry.doseUnits) || entry.doseUnits <= 0)
          return 'Enter the actual dose quantity in stock units.';
        if (
          m.frequency !== 'PRN' &&
          (!medicationDue(m, entry.date) || !m.times.includes(entry.time))
        )
          return 'This medication is not due at the selected date and time.';
        const all = file.administrations ?? [];
        const corrected = new Set(all.map((a) => a.correctionOf).filter(Boolean));
        const current = all.filter((a) => !corrected.has(a.id));
        const previous = entry.correctionOf
          ? current.find((a) => a.id === entry.correctionOf)
          : undefined;
        if (
          entry.correctionOf &&
          (!this.rota.can('manage') ||
            !previous ||
            previous.medicationId !== m.id ||
            previous.date !== entry.date ||
            previous.time !== entry.time)
        )
          return 'Only managers may correct a current MAR record in the same scheduled slot.';
        if (
          !entry.correctionOf &&
          m.frequency !== 'PRN' &&
          current.some(
            (a) => a.medicationId === m.id && a.date === entry.date && a.time === entry.time,
          )
        )
          return 'This scheduled dose already has a record. Use a correction to retain its history.';
        if (
          m.controlled &&
          entry.outcome === 'Given' &&
          (!entry.witness.trim() ||
            entry.witness.trim().toLowerCase() === this.auth.currentUser()!.name.toLowerCase())
        )
          return 'Record an independent witness for controlled-drug administration.';
        const atTime = Date.parse(instant);
        if (m.frequency === 'PRN' && entry.outcome === 'Given') {
          const given = current.filter(
            (a) => a.medicationId === m.id && a.outcome === 'Given' && a.id !== previous?.id,
          );
          const proposed = [
            ...given.map((a) => ({
              time: Date.parse(londonInstant(a.date, a.time)!),
              units: a.doseUnits,
            })),
            { time: atTime, units: entry.doseUnits },
          ].sort((a, b) => a.time - b.time);
          for (let i = 0; i < proposed.length; i++) {
            if (i && proposed[i].time - proposed[i - 1].time < m.prnInterval! * 3600000)
              return 'The PRN minimum interval would be breached.';
            if (
              proposed
                .filter((p) => p.time <= proposed[i].time && p.time > proposed[i].time - 86400000)
                .reduce((sum, p) => sum + p.units, 0) > m.prnMax!
            )
              return 'The PRN maximum dose units in a rolling 24 hours would be exceeded.';
          }
        }
        const delta =
          (previous?.outcome === 'Given' ? previous.doseUnits : 0) -
          (entry.outcome === 'Given' ? entry.doseUnits : 0);
        if (m.stock !== null && m.stock + delta < 0)
          return 'Insufficient recorded stock. Reconcile stock before recording this dose.';
        if (m.stock !== null) m.stock += delta;
        const user = this.auth.currentUser()!;
        file.administrations = [
          ...all,
          {
            ...entry,
            id: crypto.randomUUID(),
            at: new Date().toISOString(),
            by: user.name,
            userId: user.id,
          },
        ];
        return null;
      },
      'attendance',
    );
  }
  saveContact(id: string, workspace: string, contact: CareContact, version: string): string | null {
    return this.change(
      id,
      workspace,
      'Contact saved',
      contact.name,
      (file) => {
        if (
          !contact.name.trim() ||
          !contact.relationship.trim() ||
          (!contact.phone.trim() && !contact.email.trim())
        )
          return 'Enter a name, relationship and a phone number or email.';
        if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email))
          return 'Enter a valid email address.';
        file.contacts = [
          ...(file.contacts ?? [])
            .filter((c) => c.id !== contact.id)
            .map((c) => (contact.nextOfKin ? { ...c, nextOfKin: false } : c)),
          structuredClone(contact),
        ];
        return null;
      },
      'manage',
      version,
    );
  }
  saveDocument(id: string, workspace: string, document: CareDocument): string | null {
    if (!this.canManageDocuments())
      return 'Care management permission is required to upload documents.';
    return this.change(id, workspace, 'Document uploaded', document.name, (file) => {
      if (
        !document.name.trim() ||
        !document.data.startsWith('data:') ||
        document.size <= 0 ||
        document.size > 5 * 1024 * 1024
      )
        return 'Choose a nonempty document up to 5 MB.';
      const error = documentMetadataError(documentMetadata(document));
      if (error) return error;
      if (
        file.documents?.some((d) => d.id === document.id) ||
        file.documentArchive?.some((d) => d.id === document.id)
      )
        return 'This document reference already exists.';
      if (
        document.visibility &&
        ['staff', 'family', 'inspector'].some(
          (key) => typeof document.visibility?.[key as VisitNoteAudience] !== 'boolean',
        )
      )
        return 'Choose valid visibility settings.';
      const at = new Date().toISOString(),
        by = this.auth.currentUser()!.name;
      file.documents = [
        ...(file.documents ?? []),
        {
          ...structuredClone(document),
          at,
          by,
          revision: 1,
          updatedAt: at,
          updatedBy: by,
          ...(document.visibility ? { familyShared: document.visibility.family } : {}),
        },
      ];
      return null;
    });
  }
  shareDocument(id: string, workspace: string, documentId: string, shared: boolean): string | null {
    return this.setDocumentVisibility(id, workspace, documentId, 'family', shared);
  }
  removeDocument(
    id: string,
    workspace: string,
    documentId: string,
    revision?: number,
  ): string | null {
    if (!this.canManageDocuments())
      return 'Care management permission is required to delete documents.';
    return this.change(id, workspace, 'Document deleted from active list', documentId, (file) => {
      const document = file.documents?.find((d) => d.id === documentId);
      if (!document || (revision !== undefined && (document.revision ?? 1) !== revision))
        return 'This document changed. Refresh it and try again.';
      file.documentArchive = [
        ...(file.documentArchive ?? []),
        {
          ...structuredClone(document),
          deletedAt: new Date().toISOString(),
          deletedBy: this.auth.currentUser()!.name,
        },
      ];
      file.documents = file.documents!.filter((d) => d.id !== documentId);
      return null;
    });
  }
  saveAccess(id: string, workspace: string, access: FamilyAccess, version: string): string | null {
    return this.change(
      id,
      workspace,
      'Family access saved',
      `${access.email} · ${access.status} · ${access.scopes.join(', ')}`,
      (file) => {
        if (
          !access.name.trim() ||
          !access.relationship.trim() ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(access.email)
        )
          return 'Enter a name, relationship and valid email.';
        if (
          !['Pending', 'Active', 'Revoked'].includes(access.status) ||
          access.scopes.some((s) => !FAMILY_SCOPES.includes(s))
        )
          return 'Choose recognised permissions and status.';
        if (access.status === 'Active' && file.sections['consent']?.['family'] !== 'Agreed')
          return 'Record agreement to share with family in Consent & agreements before activating access.';
        if (
          file.familyAccess?.some(
            (a) =>
              a.id !== access.id && a.email.toLowerCase() === access.email.trim().toLowerCase(),
          )
        )
          return 'This email already has a family access record.';
        file.familyAccess = [
          ...(file.familyAccess ?? []).filter((a) => a.id !== access.id),
          {
            ...structuredClone(access),
            email: access.email.trim().toLowerCase(),
            at: new Date().toISOString(),
          },
        ];
        return null;
      },
      'manage',
      version,
    );
  }
  shareFamilyUpdate(
    id: string,
    workspace: string,
    update: Pick<FamilyUpdate, 'date' | 'category' | 'text'>,
  ): string | null {
    return this.change(id, workspace, 'Approved family update shared', update.category, (file) => {
      if (
        !validDate(update.date) ||
        update.date > londonDate() ||
        !FAMILY_UPDATE_CATEGORIES.includes(update.category) ||
        !update.text.trim() ||
        update.text.length > 5000
      )
        return 'Enter a valid date up to today, a recognised category and an update of 1–5000 characters.';
      file.familyUpdates = [
        ...(file.familyUpdates ?? []),
        {
          ...update,
          text: update.text.trim(),
          id: crypto.randomUUID(),
          by: this.auth.currentUser()!.name,
          at: new Date().toISOString(),
        },
      ];
      return null;
    });
  }
  familyPreviewAccessId(id: string): string {
    return `administrator-preview:${id}`;
  }
  familyRecord(id: string, accessId: string, preview = false) {
    if (!this.rota.can('view')) return null;
    const client = this.client(id);
    const fullPreview =
      preview && this.rota.can('manage') && accessId === this.familyPreviewAccessId(id);
    const access: FamilyAccess | undefined = fullPreview
      ? {
          id: accessId,
          name: this.auth.currentUser()!.name,
          email: this.auth.currentUser()!.email,
          relationship: 'Administrator preview',
          status: 'Active',
          scopes: [...FAMILY_SCOPES],
          at: '',
        }
      : client?.file?.familyAccess?.find((a) => a.id === accessId);
    if (
      !client ||
      !access ||
      access.status !== 'Active' ||
      (!fullPreview && client.file?.sections['consent']?.['family'] !== 'Agreed')
    )
      return null;
    if (
      !(preview && this.rota.can('manage')) &&
      access.email.toLowerCase() !== this.auth.currentUser()?.email.toLowerCase()
    )
      return null;
    const file = client.file ?? emptyClientFile();
    const corrections = new Set(
      (file.administrations ?? []).map((a) => a.correctionOf).filter(Boolean),
    );
    return {
      name: client.name,
      profile: {
        dob: file.details['dob'] ?? '',
        postcode: client.postcode,
        photo:
          fullPreview || file.sections['consent']?.['photo'] === 'Agreed' ? (file.photo ?? '') : '',
      },
      access,
      photoConsent: fullPreview || file.sections['consent']?.['photo'] === 'Agreed',
      plan: access.scopes.includes('Care plan')
        ? { details: file.sections['plan'] ?? {}, goals: file.entries['plan'] ?? [] }
        : null,
      medication: access.scopes.includes('Medication')
        ? (file.medications ?? []).map((m) => ({
            id: m.id,
            controlled: m.controlled,
            support: m.support,
            frequency: m.frequency,
            name: m.name,
            strength: m.strength,
            dose: m.dose,
            route: m.route,
            times: m.times,
            start: m.start,
            end: m.end,
            discontinuedAt: m.discontinuedAt,
          }))
        : null,
      administrations: access.scopes.includes('Medication')
        ? (file.administrations ?? [])
            .filter(
              (a) =>
                !corrections.has(a.id) &&
                (file.medications ?? []).some((m) => m.id === a.medicationId),
            )
            .map((a) => ({
              id: a.id,
              date: a.date,
              time: a.time,
              outcome: a.outcome,
              by: a.by,
              medication: file.medications!.find((m) => m.id === a.medicationId)!.name,
            }))
        : null,
      allergies: access.scopes.includes('Medication')
        ? (file.entries['allergies'] ?? []).map((a) => ({
            id: a.id,
            name: a.name,
            detail: a.detail,
            status: a.status,
          }))
        : null,
      updates: access.scopes.includes('Notes') ? (file.familyUpdates ?? []) : null,
      visitNotes: access.scopes.includes('Notes')
        ? (file.visitNotes ?? [])
            .filter((note) => note.visibility.family)
            .map((note) => ({
              id: note.id,
              date: note.date,
              start: note.start,
              end: note.end,
              visitType: note.visitType,
              body: note.body,
              status: note.status,
              carer:
                this.store.data().people.find((p) => p.id === note.carerId)?.name ??
                'Care team member',
            }))
        : null,
      visits: access.scopes.includes('Visits')
        ? this.rota
            .data()
            .visits.filter((v) => v.clientId === id && v.state === 'Published')
            .map((v) => ({
              id: v.id,
              date: v.date,
              start: v.start,
              end: v.end,
              callName: v.callName,
              completed: completedVisit(v),
              carers: v.staffIds.map(
                (id) =>
                  this.store.data().people.find((p) => p.id === id)?.name ?? 'Care team member',
              ),
              location: v.location ?? '',
              attendance: v.attendance
                .filter((a) => v.staffIds.includes(a.personId))
                .map((a) => ({
                  name:
                    this.store.data().people.find((p) => p.id === a.personId)?.name ??
                    'Care team member',
                  start: a.start,
                  end: a.end,
                  duration:
                    a.start &&
                    a.end &&
                    Number.isFinite(Date.parse(a.start)) &&
                    Number.isFinite(Date.parse(a.end)) &&
                    Date.parse(a.end) >= Date.parse(a.start)
                      ? Math.round((Date.parse(a.end) - Date.parse(a.start)) / 60000)
                      : null,
                })),
            }))
        : null,
      documents: access.scopes.includes('Documents')
        ? (file.documents ?? [])
            .filter(
              (d) => (fullPreview || documentVisibility(d).family) && !d.mime.startsWith('image/'),
            )
            .map(sharedDocument)
        : null,
      photos:
        access.scopes.includes('Photos') &&
        (fullPreview || file.sections['consent']?.['photo'] === 'Agreed')
          ? (file.documents ?? [])
              .filter(
                (d) =>
                  (fullPreview || documentVisibility(d).family) &&
                  ['image/png', 'image/jpeg'].includes(d.mime),
              )
              .map(sharedDocument)
          : null,
      notes: access.scopes.includes('Notes') ? (file.sections['family']?.['approved'] ?? '') : null,
      invoices: access.scopes.includes('Invoices')
        ? (this.rota.data().ecm?.invoices ?? []).filter(
            (i) => i.clientId === id && (fullPreview || i.state !== 'Draft'),
          )
        : null,
      messages: access.scopes.includes('Messages')
        ? (file.messages ?? []).filter((m) => fullPreview || m.accessId === accessId)
        : null,
    };
  }
  message(
    id: string,
    workspace: string,
    accessId: string,
    text: string,
    fromFamily: boolean,
  ): string | null {
    if (workspace !== this.store.companyId() || !this.rota.can('view'))
      return 'Workspace or access changed.';
    const access = this.client(id)?.file?.familyAccess?.find((a) => a.id === accessId);
    if (
      !access ||
      access.status !== 'Active' ||
      !access.scopes.includes('Messages') ||
      this.client(id)?.file?.sections['consent']?.['family'] !== 'Agreed' ||
      !text.trim()
    )
      return 'Messages require active sharing permission and a nonempty message.';
    if (fromFamily && access.email.toLowerCase() !== this.auth.currentUser()?.email.toLowerCase())
      return 'This family account does not match the signed-in user.';
    if (!fromFamily && !this.rota.can('manage')) return 'You cannot send care-team messages.';
    // The message is stored locally; delivery is provided by a future messaging integration.
    return this.change(
      id,
      workspace,
      'Family message recorded',
      access.email,
      (file) => {
        file.messages = [
          ...(file.messages ?? []),
          {
            id: crypto.randomUUID(),
            accessId,
            text: text.trim(),
            at: new Date().toISOString(),
            by: this.auth.currentUser()!.name,
            fromFamily,
          },
        ];
        return null;
      },
      fromFamily ? 'view' : 'manage',
    );
  }
}
