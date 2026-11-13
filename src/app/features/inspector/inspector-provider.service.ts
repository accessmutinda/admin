import { Injectable, computed, inject } from '@angular/core';
import { InspectorService } from './inspector.service';
import { InspectorProviderApi } from './inspector-provider-api.service';
import { InspectionDraft } from './inspector.models';

@Injectable()
export class InspectorProviderService extends InspectorService {
  override readonly backend = inject(InspectorProviderApi);
  override readonly company = this.backend.company;
  override readonly companyId = this.backend.companyId;
  override readonly state = this.backend.state;
  override readonly serviceUserCount = this.backend.serviceUserCount;
  override readonly locations = computed(() =>
    this.backend
      .locations()
      .map((row) => ({ ...row, type: row.type ?? '', registeredPlaces: row.registered_places })),
  );
  override readonly documents = this.backend.documents;
  override readonly clients = computed(() => []);
  override readonly staff = computed(() => []);
  override saveDraft(_draft: InspectionDraft, _companyId: string): string {
    return 'Save inspection details using the connected provider form.';
  }
}
