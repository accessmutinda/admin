import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { DEMO_USER } from '../../../core/auth/fixtures';
import { ManagementStore } from '../shared/management.store';
import { JournalService } from './journal.service';

describe('Staff communication journal', () => {
  let service: JournalService;
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
    store = TestBed.inject(ManagementStore);
    service = TestBed.inject(JournalService);
  });
  function message() {
    const entry = service.newEntry();
    entry.to = [service.contacts()[0].email.toLowerCase()];
    entry.subject = 'Visit follow-up';
    entry.body = 'Please confirm the next visit.';
    return entry;
  }
  it('keeps drafts private, delivers sent entries to recipients and prevents sent edits', () => {
    const entry = message();
    expect(service.save(entry, false)).toBeNull();
    actor.set({ ...DEMO_USER, email: entry.to[0] });
    expect(service.entries()).toHaveLength(0);
    expect(service.events()).toHaveLength(0);
    actor.set({ ...DEMO_USER });
    expect(service.save(entry, true)).toBeNull();
    expect(service.save(entry, false)).toContain('drafts');
    actor.set({ ...DEMO_USER, email: entry.to[0] });
    expect(service.entries()[0].subject).toBe(entry.subject);
    expect(service.events()).toHaveLength(1);
    actor.set({ ...DEMO_USER, email: 'unrelated@example.com' });
    expect(service.entries()).toHaveLength(0);
    expect(service.mark(entry.id, 'readBy', true)).toContain('unavailable');
  });
  it('validates recipients and message content while allowing incomplete drafts', () => {
    const entry = message();
    entry.to = [];
    entry.body = '';
    expect(service.save(entry, true)).toContain('recipient');
    expect(service.save(entry, false)).toBeNull();
    entry.to = ['unknown@example.com'];
    entry.body = 'Update';
    expect(service.save(entry, true)).toContain('current staff');
  });
  it('keeps archive and follow-up flags personal and records their activity privately', () => {
    const entry = message();
    expect(service.save(entry, true)).toBeNull();
    expect(service.mark(entry.id, 'archivedBy', true)).toBeNull();
    actor.set({ ...DEMO_USER, email: entry.to[0] });
    expect(service.entries()[0].archivedBy).not.toContain(entry.to[0]);
    expect(service.events()).toHaveLength(1);
    expect(service.mark(entry.id, 'followUpBy', true)).toBeNull();
    expect(service.entries()[0].followUpBy).toContain(entry.to[0]);
  });
  it('isolates records by workspace and persists entries through service recreation', () => {
    const entry = message();
    expect(service.save(entry, true)).toBeNull();
    const workspace = TestBed.inject(WorkspaceService);
    workspace.switchWorkspace('riverside');
    expect(service.entries()).toHaveLength(0);
    workspace.switchWorkspace('lqcs');
    expect(service.entries()[0].id).toBe(entry.id);
    expect(JSON.parse(localStorage.getItem('cv_management_v1')!).lqcs.journal.entries[0].id).toBe(
      entry.id,
    );
  });
  it('rejects oversized attachments without creating an entry', () => {
    const entry = message();
    entry.attachments = [
      {
        id: 'large',
        name: 'evidence.pdf',
        size: 6 * 1024 * 1024,
        content: 'data:application/pdf;base64,',
      },
    ];
    expect(service.save(entry, true)).toContain('5 MB');
    expect(service.entries()).toHaveLength(0);
  });
  it('rejects invalid calendar dates for follow-up tasks', () => {
    expect(
      service.saveTask({
        id: 'invalid',
        owner: service.email(),
        title: 'Follow up',
        clientId: '',
        due: '2026-02-31',
        priority: 'Normal',
        status: 'Open',
      }),
    ).toContain('valid due date');
    expect(service.tasks()).toHaveLength(0);
  });
  it('preserves existing data and reports failed storage writes', () => {
    const entry = message();
    vi.spyOn(store, 'saveWorkspace').mockReturnValue(false);
    expect(service.save(entry, true)).toContain('could not be saved');
    expect(service.entries()).toHaveLength(0);
    expect(service.events()).toHaveLength(0);
  });
  it('owns task updates and records completed tasks in the timeline', () => {
    const task = {
      id: 'task-1',
      owner: service.email(),
      title: 'Review visit notes',
      clientId: '',
      due: '2026-10-23',
      priority: 'Normal',
      status: 'Open' as const,
    };
    expect(service.saveTask(task)).toBeNull();
    expect(service.saveTask({ ...task, status: 'Resolved' })).toBeNull();
    expect(service.tasks()[0].status).toBe('Resolved');
    actor.set({ ...DEMO_USER, email: 'another@example.com' });
    expect(service.tasks()).toHaveLength(0);
    expect(service.saveTask({ ...task, owner: service.email() })).toContain('own tasks');
  });
  it('tracks a requested reply separately from unread state and completes it when the recipient replies', () => {
    const original = { ...message(), responseRequired: true };
    expect(service.save(original, true)).toBeNull();
    const recipient = original.to[0];
    actor.set({ ...DEMO_USER, email: recipient });
    expect(service.mark(original.id, 'readBy', true)).toBeNull();
    expect(service.entries()[0].responseStatus).toBe('Awaiting response');
    const reply = service.newEntry();
    reply.to = [original.authorEmail];
    reply.subject = 'Re: ' + original.subject;
    reply.body = 'Follow-up confirmed.';
    reply.replyToId = original.id;
    expect(service.save(reply, true)).toBeNull();
    expect(service.data().entries.find((e) => e.id === original.id)?.responseStatus).toBe(
      'Responded',
    );
  });
  it('keeps Trash personal and retains the sent record for other recipients', () => {
    const entry = message();
    expect(service.save(entry, true)).toBeNull();
    expect(service.mark(entry.id, 'deletedBy', true)).toBeNull();
    expect(service.entries()[0].deletedBy).toContain(DEMO_USER.email);
    actor.set({ ...DEMO_USER, email: entry.to[0] });
    expect(service.entries()[0].deletedBy).not.toContain(entry.to[0]);
    expect(service.data().entries).toHaveLength(1);
  });
});
