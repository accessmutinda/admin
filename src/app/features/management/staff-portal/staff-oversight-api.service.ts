import { Injectable, inject } from '@angular/core';
import { StaffDashboardApi } from './staff-dashboard-api.service';
@Injectable()
export class StaffOversightApi extends StaffDashboardApi {
  override readonly oversight = true;
  private readonly header = inject(StaffDashboardApi);
  protected override received(company: { id: string; name: string; code: string }, actor: string) {
    this.header.rememberCompany(company, actor);
  }
}
