import { compactDemoVisit } from './system-demo-care-workspaces';
import type { WorkspaceData } from '../features/management/shared/management.store';
import { addDays } from '../features/management/rota/rota.models';
import { demoCareDocument } from './care-demo-profiles';

export function seedDocumentExamples(data: WorkspaceData, today: string): WorkspaceData {
  const primary = data.rota?.clients
    .filter((c) => c.id.startsWith('care-demo-client-') && c.active && c.file)
    .map((c) => c.id)
    .sort()[0];
  if (!primary || !data.rota) return data;
  const examples = [
    ['Support plan – daily routine.pdf', 'Support Plan', true, true, true],
    ['Moving & Handling Plan.pdf', 'Mobility', true, false, true],
    ['Nutrition & Hydration Plan.pdf', 'Care Plan', true, true, false],
    ['Mental Capacity Assessment.pdf', 'Assessment', false, false, true],
    ['Hospital Discharge Summary.pdf', 'Other', true, true, true],
  ] as const;
  return {
    ...data,
    rota: {
      ...data.rota,
      visits: data.rota.visits.map(compactDemoVisit),
      clients: data.rota.clients.map((c) => {
        if (c.id !== primary || !c.file) return c;
        const existing = new Set(
          [...(c.file.documents ?? []), ...(c.file.documentArchive ?? [])].map((d) => d.id),
        );
        const added = examples
          .map(([name, category, staff, family, inspector], i) => ({
            ...demoCareDocument(`system-demo-document-${c.id}-${i}`, name, category, today, family),
            at: addDays(today, -(i + 1) * 3) + 'T09:00:00Z',
            issueDate: addDays(today, -(i + 1) * 3),
            reviewDate: addDays(today, 180),
            description: `Fictional demonstration ${category.toLowerCase()} for ${c.name}.`,
            visibility: { staff, family, inspector },
            status: i === 2 ? ('Under Review' as const) : ('Current' as const),
          }))
          .filter((d) => !existing.has(d.id));
        return { ...c, file: { ...c.file, documents: [...(c.file.documents ?? []), ...added] } };
      }),
    },
  };
}
