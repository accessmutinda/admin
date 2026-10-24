import { DEMO_WORKSPACES } from './system-demo-utils';
import { effect, Injector } from '@angular/core';
import {
  ManagementStore,
  type WorkspaceData,
} from '../features/management/shared/management.store';
import { staffRecord } from '../features/management/people/hr.models';
import {
  emptyAcademy,
  type AcademyAsset,
  type AcademyCourse,
} from '../features/management/learning/academy/academy.models';

const VERSION = 1;
const ROOT = '/demo/images/';
const COURSES = ['safeguarding', 'handling', 'medication', 'dementia', 'wellbeing', 'infection'];
const LEGACY: Record<string, string> = {
  sophie: 'Sophie Williams',
  oliver: 'Oliver Bennett',
  amara: 'Amara Khan',
  ella: 'Ella Thompson',
  james: 'James Carter',
  aisha: 'Aisha Khan',
  maria: 'Maria Lopez',
};
export const demoImageFiles = [
  ...Array.from({ length: 10 }, (_, index) => 'client-' + index + '.webp'),
  ...Array.from({ length: 8 }, (_, index) => 'staff-' + index + '.webp'),
  ...Object.keys(LEGACY).map((id) => 'staff-' + id + '.webp'),
  ...COURSES.map((id) => 'course-' + id + '.webp'),
  'activity-garden.jpg',
  'company-mark.svg',
];
const courseImage = (id: string) => 'care-demo-image-course-' + id;

export function seedImageRecords(data: WorkspaceData, assets: AcademyAsset[]): WorkspaceData {
  if (data.careDemoImagesVersion === VERSION) return data;
  const academy = data.academy ?? emptyAcademy();
  const courses = (items: AcademyCourse[]) =>
    items.map((course) => {
      if (!COURSES.includes(course.id)) return course;
      const image = courseImage(course.id);
      return {
        ...course,
        thumbnailId: course.thumbnailId || image,
        lessons: course.lessons.map((lesson) => ({
          ...lesson,
          thumbnailId: lesson.thumbnailId || course.thumbnailId || image,
        })),
      };
    });
  return {
    ...data,
    careDemoImagesVersion: VERSION,
    people: data.people.map((person) => {
      const demo = /^care-demo-staff-(\d+)$/.exec(person.id);
      const file = demo
        ? 'staff-' + demo[1] + '.webp'
        : LEGACY[person.id] === person.name
          ? 'staff-' + person.id + '.webp'
          : '';
      if (!file || person.hr?.personal.photo) return person;
      const hr = staffRecord(person);
      return { ...person, hr: { ...hr, personal: { ...hr.personal, photo: ROOT + file } } };
    }),
    rota: data.rota
      ? {
          ...data.rota,
          clients: data.rota.clients.map((client) => {
            const match = /^care-demo-client-(\d+)$/.exec(client.id);
            if (!match || !client.file) return client;
            const file = client.file;
            const photoId = 'care-demo-activity-' + match[1];
            return {
              ...client,
              file: {
                ...file,
                photo: file.photo || ROOT + 'client-' + match[1] + '.webp',
                documents: [
                  ...(file.documents ?? []),
                  ...(file.documents?.some((document) => document.id === photoId)
                    ? []
                    : [
                        {
                          id: photoId,
                          name: 'Demo garden activity.jpg',
                          category: 'Photo',
                          version: '1.0',
                          data: ROOT + 'activity-garden.jpg',
                          mime: 'image/jpeg',
                          size:
                            assets.find((asset) => asset.id === 'care-demo-image-activity')?.size ??
                            0,
                          at: new Date().toISOString(),
                          by: 'Demo care coordinator',
                          familyShared: false,
                        },
                      ]),
                ],
              },
            };
          }),
        }
      : data.rota,
    academy: {
      ...academy,
      courses: courses(academy.courses),
      courseDrafts: courses(academy.courseDrafts ?? []),
      assets: [
        ...academy.assets,
        ...assets.filter((asset) => !academy.assets.some((saved) => saved.id === asset.id)),
      ],
      settings: {
        ...academy.settings,
        logoId: academy.settings.logoId || 'care-demo-image-brand-logo',
      },
    },
  };
}

async function saveMedia(workspace: string, files: { id: string; blob: Blob }[]): Promise<void> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('careverity-academy-media', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Demo image storage is unavailable.'));
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('files', 'readwrite');
      const store = transaction.objectStore('files');
      for (const file of files) store.put(file.blob, workspace + ':' + file.id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Demo images could not be saved.'));
      transaction.onabort = () => reject(new Error('Demo image storage was interrupted.'));
    });
  } finally {
    database.close();
  }
}

export function installDemoImages(injector: Injector): void {
  const store = injector.get(ManagementStore);
  let pending = false;
  effect(
    () => {
      const data = store.data();
      const workspace = store.companyId();
      if (
        !DEMO_WORKSPACES.includes(workspace) ||
        !data.careDemoVersion ||
        data.careDemoImagesVersion === VERSION ||
        pending
      )
        return;
      pending = true;
      const urls = [...demoImageFiles.map((file) => ROOT + file), '/brand/logo-full.png'];
      void Promise.all(
        urls.map(async (url) => {
          const response = await fetch(url);
          if (!response.ok) throw new Error('Demo image unavailable: ' + url);
          const blob = await response.blob();
          if (!blob.type.startsWith('image/')) throw new Error('Invalid demo image: ' + url);
          return { url, blob };
        }),
      )
        .then(async (files) => {
          const media = files
            .filter(
              (file) =>
                file.url.includes('/course-') ||
                file.url.endsWith('logo-full.png') ||
                file.url.endsWith('activity-garden.jpg'),
            )
            .map((file) => ({
              ...file,
              id: file.url.endsWith('logo-full.png')
                ? 'care-demo-image-brand-logo'
                : file.url.endsWith('activity-garden.jpg')
                  ? 'care-demo-image-activity'
                  : courseImage(file.url.split('/course-')[1].replace('.webp', '')),
            }));
          await saveMedia(workspace, media);
          if (store.companyId() !== workspace) return;
          const assets: AcademyAsset[] = media.map((file) => ({
            id: file.id,
            name: file.url.split('/').at(-1)!,
            mime: file.blob.type,
            size: file.blob.size,
            kind: 'Image',
            at: new Date().toISOString(),
            by: 'Demo media library',
          }));
          store.saveWorkspace((current) => seedImageRecords(current, assets));
          const company = store.company();
          if (company?.id === 'lqcs' && !company.logo) {
            store.saveCompany({ ...company, logo: ROOT + 'company-mark.svg' });
          }
        })
        .catch((error) => console.warn('Demo image setup:', error))
        .finally(() => {
          pending = false;
        });
    },
    { injector },
  );
}
