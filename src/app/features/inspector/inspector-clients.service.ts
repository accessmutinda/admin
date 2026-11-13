import { Injectable, computed, inject } from '@angular/core';
import { InspectorService } from './inspector.service';
import { InspectorClientsApi } from './inspector-clients-api.service';
import { InspectionDraft } from './inspector.models';

@Injectable()
export class InspectorClientsService extends InspectorService {
  override readonly clientsBackend = inject(InspectorClientsApi);
  override readonly company = this.clientsBackend.company;
  override readonly companyId = this.clientsBackend.companyId;
  override readonly state = this.clientsBackend.state;
  override readonly clients = this.clientsBackend.clients;
  override readonly careInstructions = this.clientsBackend.instructions;
  override readonly documents = this.clientsBackend.documents;
  override readonly visits = computed(() => []);
  override readonly staff = computed(() => []);
  override readonly locations = computed(() => []);
  override readonly serviceUserCount = computed(() => this.clients().length);
  override saveDraft(_draft: InspectionDraft, _companyId: string): string {
    return 'Inspection details are managed in the provider profile.';
  }
}
