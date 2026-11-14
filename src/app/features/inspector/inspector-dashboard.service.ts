import { Injectable, computed, inject } from '@angular/core';
import { InspectorService } from './inspector.service';
import { InspectorDashboardApi } from './inspector-dashboard-api.service';

@Injectable()
export class InspectorDashboardService extends InspectorService {
  override readonly dashboardBackend = inject(InspectorDashboardApi);
  override readonly company = this.dashboardBackend.company;
  override readonly companyId = this.dashboardBackend.companyId;
  override readonly state = this.dashboardBackend.state;
  override readonly documents = this.dashboardBackend.documents;
  override readonly clients = computed(() => []);
  override readonly staff = computed(() => []);
  override readonly visits = computed(() => []);
  override readonly locations = computed(() => []);
  override readonly careInstructions = computed(() => []);
}
