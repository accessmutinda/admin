import { Injectable, computed, inject } from '@angular/core';
import { InspectorService } from './inspector.service';
import { InspectorQualityApi } from './inspector-quality-api.service';
import { InspectionDraft } from './inspector.models';

@Injectable()
export class InspectorQualityService extends InspectorService {
  override readonly qualityBackend = inject(InspectorQualityApi);
  override readonly company = this.qualityBackend.company;
  override readonly companyId = this.qualityBackend.companyId;
  override readonly state = this.qualityBackend.state;
  override readonly quality = computed(() => ({
    assessments: this.qualityBackend.records(),
    actions: this.qualityBackend.value()?.actions ?? [],
  }));
  override readonly documents = this.qualityBackend.documents;
  override readonly clients = computed(() => []);
  override readonly staff = computed(() => []);
  override readonly visits = computed(() => []);
  override readonly locations = computed(() => []);
  override readonly careInstructions = computed(() => []);
  override saveDraft(_draft: InspectionDraft, _companyId: string): string {
    return 'Quality source records are maintained in the management workspace.';
  }
}
