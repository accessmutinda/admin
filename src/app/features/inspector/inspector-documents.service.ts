import { Injectable, computed, inject } from '@angular/core';
import { InspectorService } from './inspector.service';
import { InspectorDocumentsApi } from './inspector-documents-api.service';
import { InspectionDraft } from './inspector.models';

@Injectable()
export class InspectorDocumentsService extends InspectorService {
  override readonly documentsBackend = inject(InspectorDocumentsApi);
  override readonly company = this.documentsBackend.company;
  override readonly companyId = this.documentsBackend.companyId;
  override readonly state = this.documentsBackend.state;
  override readonly documents = this.documentsBackend.documents;
  override readonly clients = computed(() => []);
  override readonly staff = computed(() => []);
  override readonly visits = computed(() => []);
  override readonly locations = computed(() => []);
  override readonly careInstructions = computed(() => []);
  override saveDraft(_draft: InspectionDraft, _companyId: string): string {
    return 'Quality source records are maintained in the management workspace.';
  }
}
