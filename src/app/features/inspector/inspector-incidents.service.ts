import { Injectable, computed, inject } from '@angular/core';
import { InspectorService } from './inspector.service';
import { InspectorIncidentsApi } from './inspector-incidents-api.service';
import { InspectionDraft, InspectorDocument } from './inspector.models';

@Injectable()
export class InspectorIncidentsService extends InspectorService {
  override readonly incidentsBackend = inject(InspectorIncidentsApi);
  override readonly company = this.incidentsBackend.company;
  override readonly companyId = this.incidentsBackend.companyId;
  override readonly state = this.incidentsBackend.state;
  override readonly incidents = this.incidentsBackend.records;
  override readonly clients = computed(() => []);
  override readonly staff = computed(() => []);
  override readonly visits = computed(() => []);
  override readonly locations = computed(() => []);
  override readonly careInstructions = computed(() => []);
  override readonly documents = computed<InspectorDocument[]>(() =>
    this.incidentsBackend.records().map((r) => ({
      id: r.id,
      name: r.name + ' · ' + r.client,
      category: 'Incident Records',
      questions: ['Safe'],
      owner: 'Source record',
      updated: r.updated_at,
      version: String(r.version),
      expiry: '',
      status: 'Recorded',
      content: '',
      source: r.source_type === 'care' ? 'Care incident' : 'Visit concern',
    })),
  );
  override saveDraft(_draft: InspectionDraft, _companyId: string): string {
    return 'Save individual findings using the connected inspection form.';
  }
}
