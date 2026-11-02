import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RotaClient } from '../rota/rota.models';
import { PlanVersion } from './care-plan.models';

/** Fixed Dashboard Overview-3 identity header. Page-specific variants are intentionally unsupported. */
@Component({
  selector: 'cv-care-plan-identity-header',
  imports: [DatePipe],
  templateUrl: './care-plan-identity-header.html',
  styleUrl: './care-plan-identity-header.css',
})
export class CarePlanIdentityHeader {
  readonly client = input.required<RotaClient>();
  readonly plan = input<PlanVersion>();
  readonly photo = input('');
  readonly canManage = input(false);
  readonly canExport = input(false);
  readonly canSave = input(false);
  readonly hasWorkingReview = input(false);
  readonly action = output<string>();
  get initials() {
    return this.client()
      .name.split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0])
      .join('');
  }
}
