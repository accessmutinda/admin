import { seedCareDemo } from './care-demo';
import { seedImageRecords } from './care-demo-images';
import type { WorkspaceData } from '../features/management/shared/management.store';
import type { AcademyAsset } from '../features/management/learning/academy/academy.models';

const assets: AcademyAsset[] = [
  'safeguarding',
  'handling',
  'medication',
  'dementia',
  'wellbeing',
  'infection',
  'brand-logo',
  'activity',
].map((name) => ({
  id: 'care-demo-image-' + (['brand-logo', 'activity'].includes(name) ? name : 'course-' + name),
  name: name + '.webp',
  mime: 'image/webp',
  size: 20000,
  kind: 'Image',
  at: '2026-10-24T09:00:00Z',
  by: 'Demo media library',
}));
function workspace(): WorkspaceData {
  return seedCareDemo(
    {
      people: [],
      vacancies: [],
      members: [],
      permissions: {},
      workflows: {},
      backup: false,
      leaves: [],
      reviews: [],
      cpd: [],
    },
    '2026-10-24',
  );
}
describe('Demo image records', () => {
  it('connects profiles, staff, courses, lessons and certificates to saved image assets', () => {
    const seeded = seedImageRecords(workspace(), assets);
    expect(
      seeded.rota!.clients.every((client) =>
        client.file!.photo?.startsWith('/demo/images/client-'),
      ),
    ).toBe(true);
    expect(
      seeded.people.every((person) => person.hr!.personal.photo?.startsWith('/demo/images/staff-')),
    ).toBe(true);
    expect(
      seeded.academy!.courses.every((course) =>
        seeded.academy!.assets.some((asset) => asset.id === course.thumbnailId),
      ),
    ).toBe(true);
    expect(
      seeded.academy!.courses.every((course) =>
        course.lessons.every((lesson) => lesson.thumbnailId),
      ),
    ).toBe(true);
    expect(seeded.academy!.settings.logoId).toBe('care-demo-image-brand-logo');
    expect(seeded.rota!.clients[0].file!.documents!.at(-1)!.familyShared).toBe(false);
    expect(seedImageRecords(seeded, assets)).toBe(seeded);
  });
  it('preserves uploaded portraits, course covers and unrelated service-user records', () => {
    const original = workspace();
    original.rota!.clients[0].file!.photo = 'data:image/png;base64,saved';
    original.people[0].hr!.personal.photo = 'data:image/png;base64,staff';
    const unrelated = {
      ...original.rota!.clients[0],
      id: 'user-created-client',
      file: { ...original.rota!.clients[0].file!, photo: undefined },
    };
    original.rota!.clients.push(unrelated);
    const first = seedImageRecords(original, assets);
    first.careDemoImagesVersion = undefined;
    first.academy!.courses[0].thumbnailId = 'uploaded-cover';
    const next = seedImageRecords(first, assets);
    expect(next.rota!.clients[0].file!.photo).toBe('data:image/png;base64,saved');
    expect(next.people[0].hr!.personal.photo).toBe('data:image/png;base64,staff');
    expect(next.rota!.clients.at(-1)).toBe(unrelated);
    expect(next.academy!.courses[0].thumbnailId).toBe('uploaded-cover');
    expect(next.academy!.assets).toHaveLength(8);
  });
});
