import { londonInstant } from '../rota/rota.models';

export function upcomingFamilyVisit(
  visit: { date: string; start: string; completed: boolean },
  now: number,
): boolean {
  const start = londonInstant(visit.date, visit.start);
  return !visit.completed && start !== null && Date.parse(start) >= now;
}

export function familyMedicationStatus(
  medication: { start: string; end: string; discontinuedAt: string },
  date: string,
): string {
  if (medication.discontinuedAt && medication.discontinuedAt.slice(0, 10) <= date)
    return 'Discontinued';
  if (medication.end && medication.end < date) return 'Ended';
  if (medication.start > date) return 'Scheduled';
  return 'Current';
}
