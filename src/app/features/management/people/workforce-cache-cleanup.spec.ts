import { removeWorkforceSamples } from './workforce-cache-cleanup';
import type { WorkspaceData, Person } from '../shared/management.store';
const record = (id: string): Person => ({
  id,
  name: 'Test member',
  email: 'member@example.com',
  role: 'Care Worker',
  location: 'London',
  stage: 'Hired',
  vacancy: '',
  start: '',
  notes: [],
  checks: [],
  onboarding: [],
  learning: [],
  progress: {},
});
describe('Workforce cache cleanup', () => {
  it('removes only tagged sample people and their sample HR records', () => {
    const data = {
      people: [
        record('real-record'),
        record('hr-sample-01'),
        record('care-demo-staff-1'),
        record('system-demo-portal-staff-1'),
      ],
      leaves: [
        { id: 'real-leave', personId: 'real-record' },
        { id: 'hr-sample-01-leave', personId: 'hr-sample-01' },
      ],
      reviews: [{ id: 'real-review', personId: 'real-record' }],
      cpd: [{ id: 'sample-cpd', personId: 'hr-sample-01' }],
      staffDrafts: [],
      members: [],
      permissions: {},
      workflows: {},
      backup: false,
      vacancies: [],
      hrDemoVersion: 1,
    } as unknown as WorkspaceData;
    const clean = removeWorkforceSamples(data);
    expect(clean.people.map((person) => person.id)).toEqual(['real-record']);
    expect(clean.leaves.map((leave) => leave.id)).toEqual(['real-leave']);
    expect(clean.reviews).toEqual(data.reviews);
    expect(clean.cpd).toEqual([]);
    expect('hrDemoVersion' in clean).toBe(false);
    expect(data.people.length).toBe(4);
    expect(removeWorkforceSamples(clean)).toBe(clean);
  });
});
