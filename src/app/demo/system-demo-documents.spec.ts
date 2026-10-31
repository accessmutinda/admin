import { seedSystemDemo } from './system-demo';
import { seedDocumentExamples } from './system-demo-documents';
import { documentGroup } from '../features/management/care/care-documents.models';
import type { WorkspaceData } from '../features/management/shared/management.store';

const blank = (): WorkspaceData => ({
  people: [],
  vacancies: [],
  members: [],
  permissions: {},
  workflows: {},
  backup: false,
  leaves: [],
  reviews: [],
  cpd: [],
});
describe('Document demonstration records', () => {
  it('populates categories with real PDFs and calculated audience variations', () => {
    const data = seedSystemDemo(blank(), '2026-10-31');
    const docs = data.rota!.clients.find((c) => c.id === 'care-demo-client-0')!.file!.documents!;
    expect(new Set(docs.map(documentGroup)).size).toBe(4);
    expect(docs.some((d) => d.status === 'Under Review')).toBe(true);
    for (const d of docs.filter((d) => d.id.startsWith('system-demo-document-')))
      expect(atob(d.data.split(',')[1]).startsWith('%PDF-')).toBe(true);
    expect(docs.some((d) => d.visibility?.staff === false)).toBe(true);
  });
  it('preserves saved metadata and does not restore archived records on migration', () => {
    const data = seedSystemDemo(blank(), '2026-10-31');
    const c = data.rota!.clients.find((c) => c.id === 'care-demo-client-0')!;
    const deleted = c.file!.documents!.find((d) => d.id.startsWith('system-demo-document-'))!;
    c.file!.documentArchive = [deleted];
    c.file!.documents = c.file!.documents!.filter((d) => d.id !== deleted.id);
    c.file!.documents[0].description = 'Saved user information';
    data.systemDemoVersion = 4;
    const next = seedSystemDemo(data, '2026-10-31');
    const file = next.rota!.clients.find((x) => x.id === c.id)!.file!;
    expect(file.documents!.some((d) => d.id === deleted.id)).toBe(false);
    expect(file.documents![0].description).toBe('Saved user information');
    expect(
      seedDocumentExamples(next, '2026-10-31').rota!.clients.find((x) => x.id === c.id)!.file!
        .documents,
    ).toHaveLength(file.documents!.length);
  });
});
