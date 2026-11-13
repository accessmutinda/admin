import { inject } from '@angular/core';
import { CareDocumentsApi } from './care-documents-api.service';
import { CarePlanApi } from './care-plan-api.service';
import { CarePlanService } from './care-plan.service';
import { CareService } from './care.service';

export const CARE_PLAN_PROVIDERS = [
  CareDocumentsApi,
  CarePlanApi,
  { provide: CareService, useFactory: () => inject(CarePlanApi).care },
  { provide: CarePlanService, useExisting: CarePlanApi },
];
