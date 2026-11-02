import { ClientEntry } from '../clients/client-file.models';
export const PERSONAL_ASSISTANCE = [
  'Prompting and encouragement',
  'Set up of wash/bath area',
  'Support with back care when needed',
  'Assistance with shaving (when required)',
  'Monitoring of personal hygiene',
];
export const PERSONAL_EQUIPMENT = [
  'Shower chair',
  'Grab rails',
  'Non-slip mat',
  'Long-handled sponge',
];
export const PERSONAL_REVIEW_OUTCOMES = [
  'Not reviewed',
  'No significant change',
  'Updated care needs',
  'Further assessment required',
  'Care plan not required',
];
export const isPersonalCareIncident = (entry: ClientEntry) =>
  /personal care|hygiene|wash|bath|shower|skin|pressure|dressing|grooming|oral/i.test(
    entry.name + ' ' + entry.detail,
  );
