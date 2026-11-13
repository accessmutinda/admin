import { Injectable, computed, inject } from '@angular/core';
import { InspectorService, InspectorStaff } from './inspector.service';
import { InspectorStaffApi } from './inspector-staff-api.service';
import { InspectionDraft } from './inspector.models';

@Injectable()
export class InspectorStaffService extends InspectorService {
  override readonly staffBackend = inject(InspectorStaffApi);
  override readonly company = this.staffBackend.company;
  override readonly companyId = this.staffBackend.companyId;
  override readonly state = this.staffBackend.state;
  override readonly staff = computed<InspectorStaff[]>(() =>
    this.staffBackend
      .records()
      .map((row) => ({
        id: row.id,
        name: row.name,
        role: row.role ?? '',
        location: row.location ?? '',
      })),
  );
  override readonly training = computed(() => this.staffBackend.summary()?.training ?? []);
  override readonly documents = this.staffBackend.documents;
  override readonly clients = computed(() => []);
  override readonly visits = computed(() => []);
  override readonly locations = computed(() => []);
  override readonly careInstructions = computed(() => []);
  override saveDraft(_draft: InspectionDraft, _companyId: string): string {
    return 'Inspection details are managed in the provider profile.';
  }
}
