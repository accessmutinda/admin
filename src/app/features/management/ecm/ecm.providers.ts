import { inject } from '@angular/core';
import { EcmApi } from './ecm-api.service';
import { EcmService } from './ecm.service';
import { EcmOperations } from './ecm.operations';
import { EcmDemo } from './ecm.demo';
import { ManagementStore } from '../shared/management.store';
import { RotaService } from '../rota/rota.service';
import { CareService } from '../care/care.service';
export const ECM_PROVIDERS = [
  EcmApi,
  { provide: EcmService, useExisting: EcmApi },
  { provide: EcmOperations, useExisting: EcmApi },
  { provide: EcmDemo, useFactory: () => inject(EcmApi).preview },
  { provide: ManagementStore, useFactory: () => inject(EcmApi).store },
  { provide: RotaService, useFactory: () => inject(EcmApi).rota },
  { provide: CareService, useFactory: () => inject(EcmApi).care },
];
