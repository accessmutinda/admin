import { seedSystemDemo } from './system-demo';
import { SYSTEM_DEMO_VERSION } from './system-demo-utils';
import type { WorkspaceData } from '../features/management/shared/management.store';
import { validVisitNoteAttachment } from '../features/management/care/visit-notes.models';

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
const today = '2026-10-31';
const now = Date.parse('2026-10-31T10:00:00Z');
describe('New workspace demonstration records', () => {
  it('populates every active demo service user with linked, dated notes and working attachments', () => {
    const data = seedSystemDemo(blank(), today, now);
    const rota = data.rota!;
    const clients = rota.clients.filter(
      (client) => client.active && client.id.startsWith('care-demo-client-'),
    );
    expect(clients.length).toBeGreaterThan(0);
    for (const client of clients) {
      const notes = client.file!.visitNotes!;
      expect(notes.length).toBeGreaterThan(0);
      expect(notes.some((note) => note.status === 'Flagged')).toBe(true);
      expect(notes.some((note) => !note.visibility.family)).toBe(true);
      expect(notes.some((note) => note.visibility.family && note.visibility.inspector)).toBe(true);
      for (const note of notes) {
        const visit = rota.visits.find((v) => v.id === note.visitId)!;
        expect(visit.clientId).toBe(client.id);
        expect(visit.date).toBe(note.date);
        expect(visit.staffIds).toContain(note.carerId);
        expect(note.date < today).toBe(true);
        expect(data.people.some((person) => person.id === note.carerId)).toBe(true);
        expect(note.body).toContain('Fictional');
        expect(note.attachments.every(validVisitNoteAttachment)).toBe(true);
      }
    }
    expect(clients[0].file!.visitNotes!.length).toBeGreaterThan(8);
    expect(clients[0].file!.visitNotes!.some((note) => note.revisions.length)).toBe(true);
    expect(clients[0].file!.visitNotes!.some((note) => note.attachments.length === 2)).toBe(true);
  });
  it('provides call types, draft, unallocated, published, cancelled and conflicting scenarios', () => {
    const data = seedSystemDemo(blank(), today, now);
    const rota = data.rota!;
    for (const type of [
      'Morning call',
      'Lunch call',
      'Tea call',
      'Bed call',
      'Welfare check',
      'Community support',
    ])
      expect(rota.ecm!.styles[type]).toBeDefined();
    const visits = rota.visits.filter((visit) => visit.id.startsWith('system-demo-workspace-'));
    expect(visits.some((v) => v.state === 'Draft' && v.staffIds.length === v.carers)).toBe(true);
    expect(visits.some((v) => v.state === 'Draft' && !v.staffIds.length)).toBe(true);
    expect(visits.some((v) => v.state === 'Published' && v.date > today)).toBe(true);
    expect(visits.some((v) => v.state === 'Cancelled' && v.exception)).toBe(true);
    expect(visits.filter((v) => v.id.startsWith('system-demo-workspace-conflict-'))).toHaveLength(
      2,
    );
    expect(rota.calls.some((call) => !call.active)).toBe(true);
    expect(rota.audit.some((entry) => entry.action === 'Demo visit notes added')).toBe(true);
    expect(data.quality!.demoReferenceMonth).toBe('2026-10-01');
  });
  it('preserves saved records and visibility settings when upgrading an existing seeded company', () => {
    const first = seedSystemDemo(blank(), today, now);
    const client = first.rota!.clients.find((c) => c.file?.visitNotes?.length)!;
    client.file!.visitNotes![0].body = 'Saved user edit';
    client.file!.visitNotes![0].visibility.family = false;
    first.rota!.calls.find((call) => call.id.startsWith('system-demo-workspace-package-'))!.tasks =
      'Saved call instructions';
    first.systemDemoVersion = SYSTEM_DEMO_VERSION - 1;
    const next = seedSystemDemo(first, today, now);
    const note = next.rota!.clients.find((c) => c.id === client.id)!.file!.visitNotes![0];
    expect(note.body).toBe('Saved user edit');
    expect(note.visibility.family).toBe(false);
    expect(next.rota!.calls.some((call) => call.tasks === 'Saved call instructions')).toBe(true);
    for (const records of [next.rota!.calls, next.rota!.visits, next.rota!.audit])
      expect(new Set(records.map((record) => record.id)).size).toBe(records.length);
    for (const c of next.rota!.clients)
      if (c.file?.visitNotes)
        expect(new Set(c.file.visitNotes.map((note) => note.id)).size).toBe(
          c.file.visitNotes.length,
        );
    expect(seedSystemDemo(next, today, now)).toBe(next);
  });
  it('upgrades an existing company without resurrecting removed records or unrelated fixtures', () => {
    const data = seedSystemDemo(blank(), today, now);
    data.systemDemoVersion = 3;
    data.payroll!.invoices.pop();
    const count = data.payroll!.invoices.length;
    const next = seedSystemDemo(data, today, now);
    expect(next.payroll!.invoices).toHaveLength(count);
    const cleared = {
      ...blank(),
      systemDemoVersion: 3,
      rota: { clients: [], calls: [], visits: [], audit: [], travelMinutes: 15 },
    };
    const emptyUpgrade = seedSystemDemo(cleared, today, now);
    expect(emptyUpgrade.rota!.clients).toHaveLength(0);
    expect(emptyUpgrade.people).toHaveLength(0);
    expect(emptyUpgrade.systemDemoVersion).toBe(SYSTEM_DEMO_VERSION);
  });
  it('keeps note IDs stable if the saved service-user directory order changes', () => {
    const data = seedSystemDemo(blank(), today, now);
    const counts = new Map(data.rota!.clients.map((c) => [c.id, c.file?.visitNotes?.length ?? 0]));
    data.rota!.clients.reverse();
    data.systemDemoVersion = 3;
    const next = seedSystemDemo(data, today, now);
    for (const client of next.rota!.clients)
      expect(client.file?.visitNotes?.length ?? 0).toBe(counts.get(client.id));
  });
});
