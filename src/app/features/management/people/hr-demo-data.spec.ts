import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { ManagementStore } from '../shared/management.store';
import { readiness, staffErrors } from './hr.models';
import { seedHrDemo } from './hr-demo-data';

describe('Sample HR workforce', () => {
  let store: ManagementStore;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    TestBed.inject(AuthService).signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    store = TestBed.inject(ManagementStore);
  });
  it('preserves existing workspace records, links sample records and remains idempotent', () => {
    const original = structuredClone(store.data());
    const seeded = seedHrDemo(original, '2026-10-24');
    expect(original.hrDemoVersion).toBeUndefined();
    expect(seeded.people).toHaveLength(original.people.length + 12);
    expect(seeded.people.slice(0, original.people.length)).toEqual(original.people);
    expect(seeded.vacancies).toEqual(original.vacancies);
    expect(seeded.permissions).toEqual(original.permissions);
    expect(seedHrDemo(seeded, '2026-11-24')).toBe(seeded);
    const ids = new Set(seeded.people.map((p) => p.id));
    for (const entry of [
      ...seeded.leaves.slice(original.leaves.length),
      ...seeded.reviews.slice(original.reviews.length),
      ...seeded.cpd.slice(original.cpd.length),
    ])
      expect(ids.has(entry.personId!)).toBe(true);
  });
  it('uses valid fictional staff and evidence while showing ready, overdue and due-soon cases', () => {
    const data = seedHrDemo(store.data(), '2026-10-24');
    const samples = data.people.filter((p) => p.id.startsWith('hr-sample-'));
    expect(samples).toHaveLength(12);
    for (const p of samples) {
      expect(staffErrors(p).flat()).toEqual([]);
      expect(p.email).toMatch(/@example\.test$/);
      expect(p.hr!.personal.additionalNotes).toContain('SAMPLE RECORD');
      for (const c of p.hr!.checks.filter((c) => c.status === 'Verified')) {
        const evidence = p.documents!.find((d) => d.id === c.documentId)!;
        expect(evidence.name).toContain('SAMPLE');
        expect(atob(evidence.content.split(',')[1])).toContain('Not valid employment');
      }
      if (p.hr!.status === 'Active') expect(readiness(p, '2026-10-24').ready).toBe(true);
    }
    expect(samples.some((p) => p.hr!.checks.some((c) => c.expiry && c.expiry < '2026-10-24'))).toBe(
      true,
    );
    expect(samples.some((p) => p.hr!.checks.some((c) => c.expiry === '2026-11-07'))).toBe(true);
    expect(samples.filter((p) => p.hr!.status === 'Onboarding')).toHaveLength(4);
  });
  it('does not overwrite colliding staff identities or create orphaned leave and reviews', () => {
    const original = store.data();
    const first = seedHrDemo(original, '2026-10-24').people.find((p) => p.id === 'hr-sample-01')!;
    const existing = { ...first, name: 'Existing person', notes: ['Keep this note'] };
    const seeded = seedHrDemo(
      { ...original, people: [...original.people, existing] },
      '2026-10-24',
    );
    expect(seeded.people.filter((p) => p.id === existing.id)).toEqual([existing]);
    expect(seeded.leaves.some((l) => l.personId === existing.id)).toBe(false);
  });
});
