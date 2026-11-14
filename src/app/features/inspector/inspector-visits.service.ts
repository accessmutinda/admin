import { Injectable, computed, inject } from '@angular/core';
import { InspectorService } from './inspector.service';
import { InspectorVisitsApi } from './inspector-visits-api.service';
import { InspectionDraft } from './inspector.models';

@Injectable()
export class InspectorVisitsService extends InspectorService {
  override readonly visitsBackend = inject(InspectorVisitsApi);
  override readonly company = this.visitsBackend.company;
  override readonly companyId = this.visitsBackend.companyId;
  override readonly state = this.visitsBackend.state;
  override readonly documents = computed(() => []);
  override readonly visitNotes = computed(() =>
    this.visitsBackend.notes().map((note) => ({
      id: note.id,
      clientId: note.client_id,
      client: note.client,
      date: note.date,
      start: note.start,
      end: note.end + (note.end_date !== note.date ? ' (' + note.end_date + ')' : ''),
      visitType: note.visit_type,
      body: note.body,
      status: note.status,
      carer: note.carer,
    })),
  );
  override readonly clients = computed(() => []);
  override readonly staff = computed(() => []);
  override readonly visits = computed(() => []);
  override readonly locations = computed(() => []);
  override readonly careInstructions = computed(() => []);
  override saveDraft(_draft: InspectionDraft, _companyId: string): string {
    return 'Visit source records are maintained in the management workspace.';
  }
}
