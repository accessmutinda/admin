import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { DEMO_USER } from '../../../core/auth/fixtures';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { ManagementStore } from '../shared/management.store';
import { PortalService } from './portal.service';
import { PortalConnections } from './portal-connections.service';
import { seedSystemDemo } from '../../../demo/system-demo';

describe('Shared Staff and Admin portal records', () => {
  let portal: PortalService, links: PortalConnections, store: ManagementStore;
  const actor = signal({
    ...DEMO_USER,
    roleCode: 'CA' as const,
    email: 'admin@example.test',
    name: 'Alex Morgan',
  });
  let clientId: string, staffId: string, staffEmail: string;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    const auth = TestBed.inject(AuthService);
    auth.signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    actor.set({ ...DEMO_USER, roleCode: 'CA', email: 'admin@example.test', name: 'Alex Morgan' });
    vi.spyOn(auth, 'currentUser').mockImplementation(() => actor());
    store = TestBed.inject(ManagementStore);
    store.saveWorkspace((d) => seedSystemDemo(d));
    portal = TestBed.inject(PortalService);
    links = TestBed.inject(PortalConnections);
    clientId = portal.clients().find((c) => c.name === 'Margaret Williams')!.id;
    const staff = store.staff().find((p) => p.name === 'Fatima Bullet')!;
    staffId = staff.id;
    staffEmail = staff.email;
  });
  it('shows the same task and resolution in the client and HR summaries without copying it', () => {
    const initialClient = links.client(clientId)!.tasks,
      initialStaff = links.staff(staffId)!.tasks;
    const task = {
      ...portal.newTask(clientId, staffEmail),
      title: 'Confirm shared care follow-up',
    };
    expect(portal.saveTask(task)).toBeNull();
    expect(links.client(clientId)!.tasks).toBe(initialClient + 1);
    expect(links.staff(staffId)!.tasks).toBe(initialStaff + 1);
    const row = links.staff(staffId)!.records.find((r) => r.query?.['task'] === task.id)!;
    expect(row.path).toEqual(['/staff-portal/tasks']);
    expect(
      portal.saveTask({
        ...task,
        status: 'Resolved',
        actions: 'Reviewed and confirmed with the care team.',
      }),
    ).toBeNull();
    expect(links.client(clientId)!.tasks).toBe(initialClient);
    expect(links.staff(staffId)!.tasks).toBe(initialStaff);
    expect(links.client(clientId)!.records.find((r) => r.query?.['task'] === task.id)?.status).toBe(
      'Resolved',
    );
    expect(store.data().journal!.tasks.filter((t) => t.id === task.id)).toHaveLength(1);
  });
  it('uses Admin profile/contact changes in Staff Portal and links communications back to the same contact', () => {
    const client = portal.care.client(clientId)!;
    expect(
      portal.care.rota.saveClient({ ...client, name: 'Margaret Williams Updated' }),
    ).toBeNull();
    expect(links.client(clientId)?.name).toBe('Margaret Williams Updated');
    const contact = portal.care.client(clientId)!.file!.contacts![0];
    const version = portal.care.client(clientId)!.file!.updatedAt;
    expect(
      portal.care.saveContact(clientId, 'lqcs', { ...contact, phone: '07700 900888' }, version),
    ).toBeNull();
    expect(
      portal
        .clients()
        .find((c) => c.id === clientId)!
        .file!.contacts!.find((c) => c.id === contact.id)?.phone,
    ).toBe('07700 900888');
    const record = {
      ...portal.newCommunication(clientId),
      contactId: contact.id,
      subject: 'Connected care update',
      details: 'Confirmed through the shared contact record.',
    };
    expect(portal.saveCommunication(record)).toBeNull();
    expect(links.client(clientId)!.records.some((r) => r.query?.['record'] === record.id)).toBe(
      true,
    );
    expect(portal.clientTimeline(clientId).some((e) => e.entityId === record.id)).toBe(true);
  });
  it('keeps private tasks and drafts out of another account’s Admin summaries', () => {
    const task = { ...portal.newTask(clientId), title: 'Private follow-up', shared: false };
    expect(portal.journal.saveTask(task)).toBeNull();
    const draft = portal.journal.newEntry();
    draft.clientId = clientId;
    draft.subject = 'Private unsent draft';
    expect(portal.journal.save(draft, false)).toBeNull();
    actor.set({ ...actor(), email: DEMO_USER.email });
    expect(
      links
        .client(clientId)!
        .records.some((r) => r.title === task.title || r.title === draft.subject),
    ).toBe(false);
  });
  it('respects module permissions and company boundaries', () => {
    store.update((d) => ({
      ...d,
      permissions: {
        ...d.permissions,
        'Company Admin:Care delivery': [false, false, false, false, false],
        'Company Admin:People & HR': [false, false, false, false, false],
      },
    }));
    expect(links.client(clientId)).toBeNull();
    expect(links.staff(staffId)).toBeNull();
    TestBed.inject(WorkspaceService).switchWorkspace('riverside');
    expect(links.client(clientId)).toBeNull();
    expect(links.staff(staffId)).toBeNull();
  });
});
