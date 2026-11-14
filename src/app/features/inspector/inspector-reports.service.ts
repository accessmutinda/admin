import { Injectable, computed, inject } from '@angular/core';
import { InspectorService } from './inspector.service';
import { InspectorReportsApi } from './inspector-reports-api.service';
import { InspectionDraft } from './inspector.models';

@Injectable()
export class InspectorReportsService extends InspectorService {
  override readonly reportsBackend = inject(InspectorReportsApi);
  override readonly company = this.reportsBackend.company;
  override readonly companyId = this.reportsBackend.companyId;
  override readonly state = this.reportsBackend.state;
  override readonly documents = this.reportsBackend.documents;
  override readonly clients = computed(() => []);
  override readonly staff = computed(() => []);
  override readonly visits = computed(() => []);
  override readonly locations = computed(() => []);
  override readonly careInstructions = computed(() => []);
  override saveDraft(_draft: InspectionDraft, _companyId: string): string {
    return 'Save the draft through the connected report workspace.';
  }
}
