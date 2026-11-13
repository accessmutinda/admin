import { AcademyRefreshersApi } from './academy-refreshers-api.service';
import { ACADEMY_LEARNER_ONLY } from './academy-learner-context';
import { AcademyService } from './academy.service';
import { AcademyApi } from './academy-api.service';
import { AcademyAssignmentsApi } from './academy-assignments-api.service';
import { AcademyResultsApi } from './academy-results-api.service';
import { AcademyCertificatesApi } from './academy-certificates-api.service';
import { AcademyGovernanceApi } from './academy-governance-api.service';
import { AcademySettingsApi } from './academy-settings-api.service';
import { AcademyAssets } from './academy-assets.service';
import { AcademyMyCoursesApi } from './academy-my-courses-api.service';
import { AcademyMyAssessmentsApi } from './academy-my-assessments-api.service';
import { AcademyTrainingRecordApi } from './academy-training-record-api.service';
import { AcademyMyLearningApi } from './academy-my-learning-api.service';

export const ACADEMY_LEARNER_PROVIDERS = [
  { provide: ACADEMY_LEARNER_ONLY, useValue: true },
  AcademyService,
  AcademyApi,
  AcademyAssignmentsApi,
  AcademyResultsApi,
  AcademyCertificatesApi,
  AcademyGovernanceApi,
  AcademySettingsApi,
  AcademyAssets,
  AcademyMyLearningApi,
  AcademyMyCoursesApi,
  AcademyMyAssessmentsApi,
  AcademyTrainingRecordApi,
  AcademyRefreshersApi,
];
