import { Injectable, computed, inject } from '@angular/core';
import { InspectorService } from './inspector.service';
import { InspectorMedicationApi } from './inspector-medication-api.service';
import { InspectionDraft } from './inspector.models';
import { companyDateKey } from '../../shared/pipes/company-date.pipe';

@Injectable()
export class InspectorMedicationService extends InspectorService {
  override readonly medicationBackend = inject(InspectorMedicationApi);
  override readonly company = this.medicationBackend.company;
  override readonly companyId = this.medicationBackend.companyId;
  override readonly state = this.medicationBackend.state;
  override get today() {
    return companyDateKey(
      this.medicationBackend.value()?.meta.as_of ?? '',
      this.medicationBackend.value()?.meta.timezone,
    );
  }
  override readonly clients = computed(() => []);
  override readonly prescriptions = computed(() =>
    this.medicationBackend
      .records()
      .flatMap((row) =>
        row.prescriptions.map((p) => ({ ...p, client: row.name, clientId: row.id })),
      ),
  );
  override readonly administrations = computed(() =>
    this.medicationBackend
      .records()
      .flatMap((row) =>
        row.administrations.map((a) => ({ ...a, client: row.name, clientId: row.id })),
      ),
  );
  override readonly documents = computed(() => []);
  override readonly visits = computed(() => []);
  override readonly staff = computed(() => []);
  override readonly locations = computed(() => []);
  override readonly careInstructions = computed(() => []);
  override saveDraft(_draft: InspectionDraft, _companyId: string): string {
    return 'Inspection details are managed in the provider profile.';
  }
}
