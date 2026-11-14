import { Injectable } from '@angular/core';
import { InspectorReportsApi } from './inspector-reports-api.service';
import { InspectionDraft } from './inspector.models';
import { InspectorNotesWrite, InspectorReportRead } from './inspector-provider.generated';

@Injectable({ providedIn: 'root' })
export class InspectorNotesApi extends InspectorReportsApi {
  protected override draftRoot() {
    return `/companies/${this.companyId()}/inspector/notes`;
  }
  override async saveDraft(
    draft: InspectionDraft,
    companyId: string,
  ): Promise<InspectorReportRead | null> {
    if (companyId !== this.companyId())
      throw Error('The workspace changed. Reopen Inspector Notes.');
    if (!this.canEdit()) throw Error('Saving inspector notes is not permitted.');
    if (this.saving()) return null;
    const saved = this.value()!.draft;
    const body: InspectorNotesWrite = {};
    const notes = Object.fromEntries(
      Object.entries(draft.notes).filter(([key, value]) => value !== saved.notes[key]),
    );
    const ratings = Object.fromEntries(
      Object.entries(draft.ratings).filter(([key, value]) => value !== saved.ratings[key]),
    );
    if (Object.keys(notes).length) body.notes = notes;
    if (Object.keys(ratings).length)
      body.ratings = ratings as NonNullable<InspectorNotesWrite['ratings']>;
    if (draft.summary !== saved.summary) body.summary = draft.summary;
    if (!Object.keys(body).length) return this.refreshDraft();
    return this.write<InspectorReportRead>('', 'PATCH', body, '"v' + draft.revision + '"');
  }
}
