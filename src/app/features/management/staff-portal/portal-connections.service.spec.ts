import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HrService } from '../people/hr.service';
import { RotaClient } from '../rota/rota.models';
import { JournalEntry, JournalTask } from '../journal/journal.models';
import { PortalConcern, ProfessionalRecord } from './portal.models';
import { PortalService } from './portal.service';
import { PortalConnections } from './portal-connections.service';

describe('Shared record navigation over authorised source projections', () => {
  const clients = signal<RotaClient[]>([]),
    tasks = signal<JournalTask[]>([]),
    concerns = signal<PortalConcern[]>([]),
    communications = signal<ProfessionalRecord[]>([]),
    entries = signal<JournalEntry[]>([]),
    staff = signal<{ id: string; name: string; email: string }[]>([]);
  const email = 'worker@example.test';
  let links: PortalConnections;
  beforeEach(() => {
    clients.set([
      {
        id: 'client',
        name: 'Assigned person',
        reference: 'SU-1',
        address: '1 Example Road',
        postcode: 'AB1',
        funding: 'Private',
        priority: 'Standard',
        active: true,
      },
    ]);
    tasks.set([]);
    concerns.set([]);
    communications.set([]);
    entries.set([]);
    staff.set([{ id: 'worker', name: 'Recorded worker', email }]);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: PortalService,
          useValue: {
            clients,
            tasks,
            concerns,
            communications,
            journal: { entries, email: () => email },
            care: { rota: { can: () => true } },
          },
        },
        { provide: HrService, useValue: { staff } },
      ],
    });
    links = TestBed.inject(PortalConnections);
  });
  it('reflects the same task resolution in client and staff summaries and retains its direct link', () => {
    const task: JournalTask = {
      id: 'task',
      owner: email,
      title: 'Confirm care follow-up',
      clientId: 'client',
      due: '2026-11-13',
      priority: 'Normal',
      status: 'Open',
    };
    tasks.set([task]);
    expect(links.client('client')?.tasks).toBe(1);
    expect(links.staff('worker')?.tasks).toBe(1);
    expect(links.staff('worker')?.records[0].path).toEqual(['/staff-portal/tasks']);
    expect(links.staff('worker')?.records[0].query).toEqual({ task: 'task' });
    tasks.set([{ ...task, status: 'Resolved' }]);
    expect(links.client('client')?.tasks).toBe(0);
    expect(links.staff('worker')?.tasks).toBe(0);
    expect(links.client('client')?.records[0].status).toBe('Resolved');
    expect(tasks()).toHaveLength(1);
  });
  it('reads changed identities and links professional records to the same assigned service user', () => {
    clients.update((rows) => rows.map((row) => ({ ...row, name: 'Updated assigned person' })));
    communications.set([
      {
        id: 'communication',
        clientId: 'client',
        contactId: 'contact',
        type: 'GP note',
        subject: 'Shared care update',
        details: 'Reviewed source contact',
        at: '2026-11-13T10:00:00Z',
        loggedBy: 'Recorded worker',
        loggedByEmail: email,
        followUp: '',
        status: 'Open',
        attachments: [],
      },
    ]);
    const source = structuredClone(communications());
    expect(links.client('client')?.name).toBe('Updated assigned person');
    const record = links.client('client')!.records[0];
    expect(record.path).toEqual(['/staff-portal/service-users', 'client', 'communications']);
    expect(record.query).toEqual({ record: 'communication' });
    expect(communications()).toEqual(source);
  });
  it('omits drafts and deleted journal entries while preserving the published entry link', () => {
    const entry: JournalEntry = {
      id: 'published',
      author: 'Recorded worker',
      authorEmail: email,
      to: [email],
      cc: [],
      subject: 'Published care update',
      clientId: 'client',
      category: 'Care',
      priority: 'Normal',
      body: 'Update',
      attachments: [],
      state: 'Sent',
      createdAt: '2026-11-13T10:00:00Z',
      readBy: [],
      archivedBy: [],
      starredBy: [],
      followUpBy: [],
    };
    entries.set([
      entry,
      { ...entry, id: 'draft', state: 'Draft' },
      { ...entry, id: 'deleted', deletedBy: [email] },
    ]);
    const connection = links.client('client')!;
    expect(connection.journals).toBe(1);
    expect(connection.records).toHaveLength(1);
    expect(connection.records[0].path).toEqual([
      '/staff-portal/service-users',
      'client',
      'journal',
    ]);
    expect(connection.records[0].query).toEqual({ entry: 'published' });
  });
  it('returns no connection for unavailable identities or a cleared account/workspace source', () => {
    expect(links.client('foreign')).toBeNull();
    expect(links.staff('foreign')).toBeNull();
    clients.set([]);
    staff.set([]);
    expect(links.client('client')).toBeNull();
    expect(links.staff('worker')).toBeNull();
  });
});
