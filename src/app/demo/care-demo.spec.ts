import { seedCareDemo } from './care-demo';
import { prescriptionError } from '../features/management/care/care.models';
import { emptyRota } from '../features/management/rota/rota.models';
import type { WorkspaceData } from '../features/management/shared/management.store';

const workspace = (): WorkspaceData => ({
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

describe('Care demonstration data', () => {
  it('creates linked profiles, carers, calls and two varied weeks of visits', () => {
    const data = seedCareDemo(workspace(), '2026-10-24');
    expect(data.people).toHaveLength(8);
    expect(data.rota!.clients).toHaveLength(10);
    expect(data.rota!.visits).toHaveLength(256);
    const week = data.rota!.visits.filter((visit) => visit.date <= '2026-10-25');
    expect(week).toHaveLength(128);
    expect(week.filter((visit) => !visit.staffIds.length)).toHaveLength(10);
    expect(week.filter((visit) => visit.carers === 2)).toHaveLength(8);
    expect(new Set(week.map((visit) => visit.callName)).size).toBe(4);
    for (const visit of data.rota!.visits) {
      expect(data.rota!.clients.some((client) => client.id === visit.clientId)).toBe(true);
      expect(data.rota!.calls.some((call) => call.id === visit.callId)).toBe(true);
      expect(visit.staffIds.every((id) => data.people.some((person) => person.id === id))).toBe(
        true,
      );
    }
    expect(data.rota!.clients.every((client) => client.file?.contacts?.length)).toBe(true);
    expect(data.leaves).toHaveLength(1);
    expect(
      data
        .rota!.visits.filter((visit) => visit.date < '2026-10-24' && visit.staffIds.length)
        .every((visit) => visit.attendance.length === visit.staffIds.length),
    ).toBe(true);
    expect(
      data
        .rota!.visits.filter((visit) => !visit.staffIds.length)
        .every((visit) => visit.state === 'Draft'),
    ).toBe(true);
  });

  it('preserves existing records, other module data and changes after the first seed', () => {
    const existing = workspace();
    existing.rota = emptyRota();
    existing.rota.clients.push({
      id: 'existing',
      name: 'Existing service user',
      reference: 'SU1',
      address: 'Saved address',
      postcode: 'HA1 1AA',
      active: true,
      funding: 'Private',
      priority: 'Standard',
    });
    const first = seedCareDemo(existing, '2026-10-24');
    expect(first.rota!.clients[0]).toBe(existing.rota.clients[0]);
    expect(existing.rota.clients).toHaveLength(1);
    expect(first.permissions).toBe(existing.permissions);
    first.rota!.clients[1].name = 'Edited demo service user';
    first.rota!.visits.pop();
    const again = seedCareDemo(first, '2026-10-25');
    expect(again).toBe(first);
    expect(again.rota!.visits).toHaveLength(255);
    expect(again.rota!.clients[1].name).toBe('Edited demo service user');
  });
  it('populates every profile tab with valid medicines, historical MAR and downloadable documents', () => {
    const seeded = seedCareDemo(workspace(), '2026-10-24');
    for (const client of seeded.rota!.clients) {
      const file = client.file!;
      expect(file.medications).toHaveLength(4);
      expect(file.medications!.every((medicine) => prescriptionError(medicine) === null)).toBe(
        true,
      );
      expect(file.medications!.some((medicine) => medicine.controlled)).toBe(true);
      expect(file.medications!.some((medicine) => medicine.frequency === 'PRN')).toBe(true);
      expect(new Set(file.administrations!.map((record) => record.outcome)).size).toBe(4);
      expect(file.administrations!.every((record) => Date.parse(record.at) <= Date.now())).toBe(
        true,
      );
      expect(file.documents).toHaveLength(3);
      expect(atob(file.documents![0].data.split(',')[1]).startsWith('%PDF-1.4')).toBe(true);
      expect(file.contacts!.some((contact) => contact.type === 'GP')).toBe(true);
      expect(file.contacts!.some((contact) => contact.type === 'Pharmacy')).toBe(true);
      expect(file.familyAccess![0].status).toBe('Active');
      expect(file.familyUpdates!.length).toBeGreaterThan(0);
      expect(file.messages!.length).toBeGreaterThan(0);
      expect(file.audit).toHaveLength(4);
      expect(file.sections['capacity']['welfareLpa']).toBeTruthy();
      expect(file.sections['support']['behaviour']).toBeTruthy();
    }
  });

  it('upgrades earlier demo profiles without replacing edited fields, medicines or visits', () => {
    const previous = seedCareDemo(workspace(), '2026-10-24');
    previous.careDemoVersion = 1;
    const client = previous.rota!.clients[0];
    client.name = 'Edited name';
    client.file!.sections['capacity']['welfareLpa'] = 'User-recorded representative';
    client.file!.medications![0].notes = 'User-edited medication note';
    const visits = previous.rota!.visits;
    const upgraded = seedCareDemo(previous, '2026-10-25');
    expect(upgraded.careDemoVersion).toBe(2);
    expect(upgraded.rota!.visits).toBe(visits);
    expect(upgraded.rota!.clients[0].name).toBe('Edited name');
    expect(upgraded.rota!.clients[0].file!.sections['capacity']['welfareLpa']).toBe(
      'User-recorded representative',
    );
    expect(upgraded.rota!.clients[0].file!.medications![0].notes).toBe(
      'User-edited medication note',
    );
    expect(upgraded.rota!.clients[0].file!.medications).toHaveLength(4);
    expect(seedCareDemo(upgraded, '2026-10-25')).toBe(upgraded);
  });
});
