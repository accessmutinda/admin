import { RotaClient, RotaVisit } from '../rota/rota.models';
import { inReviewScope } from './care-plan.models';

export interface CarePlanVisitTask {
  taskId: string;
  planVersionId: string;
  planVersion: string;
  section: string;
  instruction: string;
}
export interface CarePlanTaskResult extends CarePlanVisitTask {
  outcome: 'Completed' | 'Not completed' | 'Concern';
  note: string;
}
export function careAreaMatchesVisit(name: string, wording: string): boolean {
  const task = wording.toLowerCase();
  return (
    task.includes(name.toLowerCase()) ||
    (/personal|wash|dress|skin|toilet/.test(task) &&
      ['Personal Care', 'Continence', 'Dressing & Grooming'].includes(name)) ||
    (/transfer|mobil|moving|hoist|walk/.test(task) && name === 'Mobility') ||
    (/meal|food|drink|nutrition|fluid/.test(task) &&
      ['Nutrition & Hydration', 'Cultural / Religious Needs'].includes(name)) ||
    (/medic|mar/.test(task) && name === 'Medication Support')
  );
}

/** Derive tasks only from the current approved, staff-visible snapshot. */
export function carePlanVisitTasks(client: RotaClient, visit: RotaVisit): CarePlanVisitTask[] {
  if (visit.clientId !== client.id || visit.state !== 'Published') return [];
  const plan = client.file?.carePlan?.versions.find((p) => p.status === 'Approved');
  if (!plan) return [];
  const sections = plan.sections.filter(
    (s) => inReviewScope(plan, s) && s.required && s.visibility.staff,
  );
  const wording = (visit.callName + ' ' + visit.tasks).toLowerCase();
  const matching = sections.filter((section) => careAreaMatchesVisit(section.name, wording));
  // Generic care-plan visits expose the available approved sections for the carer to confirm.
  const chosen = matching.length
    ? matching
    : /personalised care plan|follow.*care plan/.test(wording)
      ? sections.filter((s) => ['Personal Care', 'Mobility'].includes(s.name))
      : [];
  return chosen.flatMap((s) => {
    const seen = new Set<string>();
    return ['assistance', 'actions'].flatMap((field) =>
      (s.fields[field] || '')
        .split(/\n+/)
        .map((text) =>
          text
            .replace(/<[^>]*>/g, '')
            .replace(/^\s*[-•]\s*/, '')
            .trim(),
        )
        .filter((text) => {
          if (!text || seen.has(text)) return false;
          seen.add(text);
          return true;
        })
        .map((instruction, index) => ({
          taskId: `${plan.id}:${s.name}:${field}:${index}`,
          planVersionId: plan.id,
          planVersion: plan.version,
          section: s.name,
          instruction,
        })),
    );
  });
}
