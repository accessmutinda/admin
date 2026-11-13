import { QualityApi } from './quality-api.service';
import { QualityService } from './quality.service';
export const QUALITY_PROVIDERS = [QualityApi, { provide: QualityService, useExisting: QualityApi }];
