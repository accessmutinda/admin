import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { DEMO_USER } from '../../../core/auth/fixtures';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { ManagementStore } from '../shared/management.store';
import { emptyClientFile } from '../clients/client-file.models';
import { PortalService } from './portal.service';

describe('Staff portal workflows', () => {
  let portal: PortalService;
  let store: ManagementStore;
  const actor = signal({ ...DEMO_USER });
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    const auth = TestBed.inject(AuthService);
    auth.signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    actor.set({ ...DEMO_USER });
    vi.spyOn(auth, 'currentUser').mockImplementation(() => actor());
    portal = TestBed.inject(PortalService);
    store = portal.store;
    expect(
      portal.care.rota.saveClient({
        id: 'client',
        name: 'Service user',
        reference: 'C1',
        address: '1 Test Road',
        postcode: 'HA1 1AA',
        active: true,
        funding: 'Private',
        priority: 'Standard',
        file: emptyClientFile(),
      }),
    ).toBeNull();
    expect(
      portal.care.saveContact(
        'client',
        'lqcs',
        {
          id: 'gp',
          name: 'Dr Patel',
          relationship: 'GP surgery',
          email: 'gp@example.com',
          phone: '',
          type: 'GP',
          nextOfKin: false,
        },
        portal.care.client('client')?.file?.updatedAt ?? '',
      ),
    ).toBeNull();
  });
  it('assigns shared tasks while preserving private journal task isolation', () => {
    const privateTask = portal.journal.newEntry();
    privateTask.subject = 'Private draft';
    expect(portal.journal.save(privateTask, false)).toBeNull();
    const task = portal.newTask('client');
    task.title = 'Request GP notes';
    expect(portal.saveTask(task)).toBeNull();
    const privateFollowUp = {
      ...portal.newTask(),
      id: 'private-task',
      title: 'Private reminder',
      shared: undefined,
    };
    expect(portal.journal.saveTask(privateFollowUp)).toBeNull();
    actor.set({ ...DEMO_USER, email: portal.contacts()[0].email.toLowerCase() });
    expect(portal.tasks().map((t) => t.id)).toEqual([task.id]);
    expect(portal.journal.entries()).toHaveLength(0);
    expect(portal.saveTask({ ...privateFollowUp, owner: portal.journal.email() })).toContain(
      'private',
    );
  });
  it('keeps private tasks and their portal audit events private after an update', () => {
    const task = { ...portal.newTask('client'), title: 'Private care reminder', shared: undefined };
    expect(portal.journal.saveTask(task)).toBeNull();
    task.notes = 'Updated private reminder';
    expect(portal.saveTask(task)).toBeNull();
    expect(portal.tasks()[0].shared).toBe(false);
    actor.set({ ...DEMO_USER, email: portal.contacts()[0].email.toLowerCase() });
    expect(portal.tasks()).toHaveLength(0);
    expect(portal.timeline().some((e) => e.entityId === task.id)).toBe(false);
    expect(portal.clientTimeline('client').some((e) => e.entityId === task.id)).toBe(false);
  });
  it('requires resolution evidence and valid dates before completing tasks', () => {
    const task = portal.newTask('client');
    task.title = 'Follow up care review';
    task.status = 'Resolved';
    expect(portal.saveTask(task)).toContain('action taken');
    task.actions = 'Reviewed care notes with the team.';
    task.due = '2026-02-31';
    expect(portal.saveTask(task)).toContain('valid dates');
    task.due = '2026-10-23';
    expect(portal.saveTask(task)).toBeNull();
    expect(
      portal
        .clientTimeline('client')
        .some((e) => e.entityId === task.id && e.status === 'Resolved'),
    ).toBe(true);
  });
  it('preserves investigation notes when saving a previously opened concern draft', () => {
    const concern = portal.newConcern();
    concern.title = 'Care delivery concern';
    concern.description = 'Review the reported care delivery issue.';
    concern.clientId = 'client';
    expect(portal.saveConcern(concern)).toBeNull();
    const draft = structuredClone(portal.concerns()[0]);
    expect(portal.addNote(concern.id, 'Interview scheduled with the care team.')).toBeNull();
    draft.status = 'Under investigation';
    draft.checklist[0].done = true;
    expect(portal.saveConcern(draft)).toBeNull();
    expect(portal.concerns()[0].notes).toHaveLength(1);
    expect(portal.concerns()[0].checklist[0].done).toBe(true);
    expect(
      portal.clientTimeline('client').some((e) => e.action === 'Investigation note added'),
    ).toBe(true);
  });
  it('requires an outcome and resolution before closing a concern', () => {
    const concern = portal.newConcern();
    concern.title = 'Reported issue';
    concern.description = 'Investigate the report.';
    expect(portal.saveConcern(concern)).toBeNull();
    concern.status = 'Resolved';
    expect(portal.saveConcern(concern)).toContain('outcome');
    concern.outcome = 'Reviewed evidence and agreed follow-up actions.';
    concern.status = 'Closed';
    expect(portal.saveConcern(concern)).toContain('Resolve');
    concern.status = 'Resolved';
    expect(portal.saveConcern(concern)).toBeNull();
    concern.status = 'Closed';
    expect(portal.saveConcern(concern)).toBeNull();
    expect(portal.addNote(concern.id, 'New note')).toContain('Reopen');
  });
  it('links professional records to real care contacts and preserves the original author', () => {
    const record = portal.newCommunication('client');
    record.subject = 'GP review notes';
    record.details = 'Review received and follow-up recorded.';
    expect(portal.saveCommunication(record)).toContain('professional contact');
    record.contactId = 'gp';
    expect(portal.saveCommunication(record)).toBeNull();
    expect(portal.clientTimeline('client').find((e) => e.entityId === record.id)?.direction).toBe(
      'Received',
    );
    expect(portal.clientTimeline('client').find((e) => e.entityId === record.id)?.recipient).toBe(
      'Dr Patel',
    );
    actor.set({ ...DEMO_USER, name: 'Another colleague' });
    record.details = 'Additional information received.';
    expect(portal.saveCommunication(record)).toBeNull();
    expect(portal.communications()[0].loggedBy).toBe(DEMO_USER.name);
    expect(portal.clientTimeline('client').some((e) => e.entityId === record.id)).toBe(true);
  });
  it('keeps portal records scoped to the selected workspace', () => {
    const concern = portal.newConcern();
    concern.title = 'Reported issue';
    concern.description = 'Review the concern.';
    expect(portal.saveConcern(concern)).toBeNull();
    const workspaces = TestBed.inject(WorkspaceService);
    workspaces.switchWorkspace('riverside');
    expect(portal.concerns()).toHaveLength(0);
    expect(portal.tasks()).toHaveLength(0);
    workspaces.switchWorkspace('lqcs');
    expect(portal.concerns()[0].id).toBe(concern.id);
  });
  it('retains the current records and reports failed storage writes', () => {
    const concern = portal.newConcern();
    concern.title = 'Reported issue';
    concern.description = 'Review the concern.';
    vi.spyOn(store, 'saveWorkspace').mockReturnValue(false);
    expect(portal.saveConcern(concern)).toContain('Could not save');
    expect(portal.concerns()).toHaveLength(0);
  });
  it('allows client journal recipients from that client’s professional contacts', () => {
    const entry = portal.journal.newEntry();
    entry.clientId = 'client';
    entry.to = ['gp@example.com'];
    entry.subject = 'GP follow-up';
    entry.body = 'Please review the care update.';
    expect(portal.journal.save(entry, true)).toBeNull();
    const other = portal.journal.newEntry();
    other.subject = 'Unlinked update';
    other.body = 'Update';
    other.to = ['gp@example.com'];
    expect(portal.journal.save(other, true)).toContain('linked professional');
  });
  it('respects care permissions when saving professional communications', () => {
    const record = portal.newCommunication('client');
    record.contactId = 'gp';
    record.subject = 'GP notes';
    record.details = 'Review the notes.';
    store.update((d) => ({
      ...d,
      permissions: {
        ...d.permissions,
        'Care Worker:Care delivery': [true, false, false, false, false],
      },
    }));
    expect(portal.saveCommunication(record)).toContain('permission');
    expect(portal.communications()).toHaveLength(0);
  });
});
