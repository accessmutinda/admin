import type { WorkspaceData } from '../shared/management.store';

export function removeWorkforceSamples(data: WorkspaceData): WorkspaceData {
  const seeded = (id: string) => /^(hr-sample-|care-demo-staff-|system-demo-)/.test(id);
  const removed = new Set(
    (data.people ?? []).filter((person) => seeded(person.id)).map((person) => person.id),
  );
  const keepRelated = (row: { id: string; personId?: string }) =>
    !seeded(row.id) && !seeded(row.personId ?? '') && !removed.has(row.personId ?? '');
  const people = (data.people ?? []).filter((person) => !removed.has(person.id));
  const leaves = (data.leaves ?? []).filter(keepRelated),
    reviews = (data.reviews ?? []).filter(keepRelated),
    cpd = (data.cpd ?? []).filter(keepRelated);
  const drafts = data.staffDrafts?.filter(
    (draft) => !seeded(draft.id) && !seeded(draft.person.id) && !removed.has(draft.person.id),
  );
  if (
    !removed.size &&
    leaves.length === (data.leaves ?? []).length &&
    reviews.length === (data.reviews ?? []).length &&
    cpd.length === (data.cpd ?? []).length &&
    drafts?.length === data.staffDrafts?.length &&
    !('hrDemoVersion' in data)
  )
    return data;
  const { hrDemoVersion: discarded, ...retained } = data as WorkspaceData & {
    hrDemoVersion?: number;
  };
  return { ...retained, people, leaves, reviews, cpd, ...(drafts ? { staffDrafts: drafts } : {}) };
}
