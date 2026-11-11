import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiError } from '../../../core/auth/auth-api';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { JournalService } from './journal.service';
import { StaffJournal } from './staff-journal';
import { JournalEntry, JournalTask } from './journal.models';

function entry(): JournalEntry {
  return {
    id: 'entry-1',
    company_id: 'north',
    version: 1,
    etag: '"v1"',
    state_etag: '"v1"',
    author: 'Case Worker',
    authorEmail: 'worker@example.com',
    to: ['recipient@example.com'],
    cc: [],
    subject: 'Recorded update',
    body: 'Recorded care guidance',
    bodyHtml: '<b>Recorded care guidance</b>',
    clientId: 'person-1',
    kind: 'Message',
    category: 'Care update',
    priority: 'Normal',
    responseRequired: true,
    responseStatus: 'Awaiting response',
    state: 'Sent',
    createdAt: '2026-11-11T10:00:00Z',
    attachments: [],
    readBy: [],
    archivedBy: [],
    starredBy: [],
    followUpBy: [],
    deletedBy: [],
  };
}
async function settle(fixture?: ComponentFixture<unknown>) {
  TestBed.tick();
  if (fixture) {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }
  await Promise.resolve();
}

describe('Connected client journal', () => {
  let service: JournalService,
    request: ReturnType<typeof vi.fn>,
    company: ReturnType<typeof signal<string>>,
    permissions: ReturnType<typeof signal<boolean>>,
    context: ReturnType<typeof signal<any>>,
    messages: JournalEntry[],
    tasks: JournalTask[];
  beforeEach(() => {
    company = signal('north');
    permissions = signal(true);
    context = signal({
      company_id: 'north',
      company_active: true,
      platform: false,
      revision: 1,
      permissions: ['care.recording.read', 'care.recording.create', 'care.recording.edit'],
      enabled_modules: ['care'],
      roles: [{ id: 'role-1' }],
      request_id: 'one',
    });
    messages = [];
    tasks = [];
    request = vi.fn(async (path: string, body?: any, method?: string) => {
      if (path.includes('/options?'))
        return {
          company_id: company(),
          contacts: [
            { email: 'recipient@example.com', name: 'Recipient', role: 'Workspace member' },
          ],
          clients: [{ id: 'person-1', name: 'Alex Citizen' }],
          visits: [],
          next_page: null,
          can_create: true,
          can_edit: true,
          can_export: true,
          external_delivery: false,
        };
      if (path.includes('/activity?'))
        return { company_id: company(), count: 0, next_page: null, results: [] };
      if (path.includes('/tasks?'))
        return { company_id: company(), count: tasks.length, next_page: null, results: tasks };
      if (path.endsWith('/tasks') && body) {
        const task = {
          ...body,
          id: 'task-1',
          company_id: company(),
          version: 1,
          etag: '"v1"',
          assignedBy: 'worker@example.com',
          attachments: [],
          createdAt: '2026-11-11T10:00:00Z',
        };
        tasks.push(task);
        return task;
      }
      if (path.endsWith('/files') && body instanceof FormData)
        return {
          id: 'file-1',
          company_id: company(),
          name: 'note.txt',
          size: 4,
          state: 'quarantined',
          content_type: 'text/plain',
          etag: '"v1"',
        };
      if (path.endsWith('/files/file-1'))
        return {
          id: 'file-1',
          company_id: company(),
          name: 'note.txt',
          size: 4,
          state: 'clean',
          content_type: 'text/plain',
          etag: '"v2"',
        };
      if (path.endsWith('/send')) {
        const row = messages.find((row) => path.includes(row.id))!;
        Object.assign(row, { state: 'Sent', version: 2, etag: '"v2"' });
        return structuredClone(row);
      }
      if (path.endsWith('/state')) {
        const row = messages.find((row) => path.includes(row.id))!;
        Object.assign(row, {
          state_etag: '"v2"',
          [body.field]: body.enabled ? ['worker@example.com'] : [],
        });
        return structuredClone(row);
      }
      if (body && method === 'POST' && path.endsWith('/journal')) {
        const row = {
          ...entry(),
          ...body,
          id: 'entry-1',
          state: 'Draft' as const,
          authorEmail: 'worker@example.com',
          attachments: [],
        };
        messages.push(row);
        return structuredClone(row);
      }
      if (body && method === 'PATCH') {
        const row = messages.find((row) => path.endsWith(row.id))!;
        Object.assign(row, body, { version: 2, etag: '"v2"' });
        return structuredClone(row);
      }
      if (path.includes('/journal?') || path.includes('/journal/print?'))
        return {
          count: messages.length,
          next: null,
          previous: null,
          results: structuredClone(messages),
          meta: {
            company_id: company(),
            local_date: '2026-11-11',
            folders: {
              Inbox: messages.length,
              Sent: messages.filter((row) => row.state === 'Sent').length,
              Drafts: messages.filter((row) => row.state === 'Draft').length,
            },
            unread: messages.length,
            awaiting: 0,
            mentions: 0,
            as_of: '2026-11-11T10:00:00Z',
            request_id: 'request',
          },
        };
      if (path.endsWith('/entry-1')) return structuredClone(messages[0] ?? entry());
      throw Error('Unexpected journal request: ' + path);
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}), data: {} } },
        },
        {
          provide: AuthService,
          useValue: {
            profile: () => ({ id: 'actor' }),
            currentUser: () => ({
              name: 'Case Worker',
              email: 'worker@example.com',
              roleCode: 'CA',
            }),
            api: request,
          },
        },
        {
          provide: CompanyAccessService,
          useValue: { companyId: company, context, can: () => permissions() },
        },
      ],
    });
    service = TestBed.inject(JournalService);
    TestBed.tick();
  });
  it('loads scoped server options, filters, counts and pagination without browser records', async () => {
    const storage = vi.spyOn(Storage.prototype, 'getItem');
    messages = [entry()];
    await service.loadOptions('person-1');
    await service.setQuery({
      client_id: 'person-1',
      folder: 'Inbox',
      search: 'guidance',
      category: 'Care update',
      filter: 'Unread',
      order: 'Oldest first',
      page: 2,
    });
    const path = request.mock.calls.find(([path]) => path.includes('/journal?'))![0];
    const params = new URLSearchParams(path.split('?')[1]);
    expect(params.get('client_id')).toBe('person-1');
    expect(params.get('page')).toBe('2');
    expect(params.get('search')).toBe('guidance');
    expect(service.count()).toBe(1);
    expect(service.clients()[0].name).toBe('Alex Citizen');
    expect(storage).not.toHaveBeenCalled();
  });
  it('saves a draft then sends through the named command with independent retry keys', async () => {
    const draft = service.newEntry();
    draft.subject = 'Care guidance';
    draft.body = 'Recorded care';
    draft.to = ['recipient@example.com'];
    draft.clientId = 'person-1';
    expect(await service.save(draft, true)).toBeNull();
    const create = request.mock.calls.find(([path, body]) => path.endsWith('/journal') && body)!;
    const send = request.mock.calls.find(([path]) => path.endsWith('/send'))!;
    expect(create[2]).toBe('POST');
    expect(create[3]['Idempotency-Key']).toBeTruthy();
    expect(send[2]).toBe('POST');
    expect(send[3]['If-Match']).toBe('"v1"');
    expect(send[3]['Idempotency-Key']).not.toBe(create[3]['Idempotency-Key']);
    expect(draft.id).toBe('entry-1');
    expect(draft.state).toBe('Sent');
    expect(create[1].author).toBeUndefined();
  });
  it('keeps the send retry identity after an uncertain response without patching a sent entry', async () => {
    const original = request.getMockImplementation()! as (...args: any[]) => Promise<any>;
    let failed = false;
    request.mockImplementation(async (...args: any[]) => {
      if (args[0].endsWith('/send') && !failed) {
        failed = true;
        throw Error('Connection interrupted');
      }
      return original(...args);
    });
    const draft = service.newEntry();
    draft.subject = 'Reply';
    draft.body = 'A response';
    draft.to = ['recipient@example.com'];
    expect(await service.save(draft, true)).toBe('Connection interrupted');
    expect(draft.etag).toBeTruthy();
    expect(await service.save(draft, true)).toBeNull();
    const sends = request.mock.calls.filter(([path]) => path.endsWith('/send'));
    expect(sends).toHaveLength(2);
    expect(sends[0][3]['Idempotency-Key']).toBe(sends[1][3]['Idempotency-Key']);
    expect(request.mock.calls.filter(([, , method]) => method === 'PATCH')).toHaveLength(0);
  });
  it('uses the actor state revision for personal folder and read actions', async () => {
    messages = [{ ...entry(), state_etag: '"v7"' }];
    await service.getEntry('entry-1');
    expect(await service.mark('entry-1', 'starredBy', true)).toBeNull();
    const call = request.mock.calls.find(([path]) => path.endsWith('/state'))!;
    expect(call[3]['If-Match']).toBe('"v7"');
    expect(call[1]).toEqual({ field: 'starredBy', enabled: true });
    expect(service.cached('entry-1')!.starredBy).toEqual(['worker@example.com']);
  });
  it('clears stale results, metadata and details when a read is denied', async () => {
    messages = [entry()];
    await service.loadOptions();
    await service.setQuery({
      folder: 'Inbox',
      search: '',
      category: '',
      filter: 'All messages',
      order: 'Newest first',
      page: 1,
    });
    await service.getEntry('entry-1');
    request.mockRejectedValueOnce(new ApiError('Access was revoked.', 403, 'permission_denied'));
    await service.refresh();
    expect(service.entries()).toEqual([]);
    expect(service.summary().unread).toBe(0);
    expect(service.contacts()).toEqual([]);
    expect(service.detail()).toBeNull();
    expect(service.error()).toBe('Access was revoked.');
  });
  it('ignores a late response after changing workspace', async () => {
    let resolve!: (value: any) => void;
    request.mockImplementationOnce(() => new Promise((done) => (resolve = done)));
    const loading = service.loadOptions();
    company.set('south');
    TestBed.tick();
    resolve({
      company_id: 'north',
      contacts: [{ name: 'Private North', email: 'private@example.com', role: 'Staff' }],
      clients: [],
      visits: [],
      next_page: null,
      can_create: true,
      can_edit: true,
      can_export: true,
    });
    await loading;
    expect(service.contacts()).toEqual([]);
  });
  it('does not discard data or compose state for access polling metadata', async () => {
    messages = [entry()];
    await service.setQuery({
      folder: 'Inbox',
      search: '',
      category: '',
      filter: 'All messages',
      order: 'Newest first',
      page: 1,
    });
    const scope = service.scope();
    context.set({ ...context(), request_id: 'another' });
    TestBed.tick();
    expect(service.scope()).toBe(scope);
    expect(service.entries()).toHaveLength(1);
  });
  it('uploads multipart bytes and checks quarantine state without persisting browser file data', async () => {
    const file = new File(['note'], 'note.txt', { type: 'text/plain' });
    const uploaded = await service.upload(file, 'compose-1');
    expect(uploaded.content).toBe('');
    expect(uploaded.state).toBe('quarantined');
    const call = request.mock.calls.find(([path]) => path.endsWith('/files'))!;
    expect(call[1]).toBeInstanceOf(FormData);
    expect((await service.checkFile(uploaded.id)).state).toBe('clean');
  });
  it('creates linked tasks through the backend and keeps the submitted journal reference', async () => {
    const task: JournalTask = {
      id: 'intent-task',
      owner: 'recipient@example.com',
      title: 'Follow up',
      clientId: 'person-1',
      journalId: 'entry-1',
      due: '2027-01-01',
      priority: 'Normal',
      status: 'Open',
      shared: true,
    };
    expect(await service.saveTask(task)).toBeNull();
    const call = request.mock.calls.find(([path]) => path.endsWith('/tasks'))!;
    expect(call[1].journalId).toBe('entry-1');
    expect(call[3]['Idempotency-Key']).toBeTruthy();
    expect(task.id).toBe('task-1');
  });
  it('names invalid fields in a failed save and retains the entered draft', async () => {
    request.mockRejectedValueOnce(
      new ApiError('Check the fields.', 400, 'validation_error', { subject: ['Enter a subject.'] }),
    );
    const draft = service.newEntry();
    draft.body = 'Keep this text';
    expect(await service.save(draft, false)).toContain('Subject: Enter a subject.');
    expect(draft.body).toBe('Keep this text');
  });
  it('sends atomic bulk actions with each selected personal state revision', async () => {
    messages = [entry()];
    await service.getEntry('entry-1');
    request.mockImplementationOnce(async () => ({ company_id: 'north', results: [] }));
    expect(await service.bulkMark(['entry-1'], 'deletedBy', true)).toBeNull();
    const call = request.mock.calls.find(([path]) => path.endsWith('/bulk-state'))!;
    expect(call[1].entries).toEqual([{ id: 'entry-1', etag: '"v1"' }]);
    expect(call[3]['Idempotency-Key']).toBeTruthy();
  });
  it('fetches a fresh authorised page before printing', async () => {
    messages = [entry()];
    await service.setQuery({
      client_id: 'person-1',
      folder: 'Inbox',
      search: '',
      category: '',
      filter: 'All messages',
      order: 'Newest first',
      page: 1,
    });
    messages = [{ ...entry(), subject: 'Fresh print source' }];
    await service.preparePrint();
    expect(request.mock.calls.some(([path]) => path.includes('/journal/print?'))).toBe(true);
    expect(service.entries()[0].subject).toBe('Fresh print source');
    expect(service.printBusy()).toBe(false);
    expect(service.busy()).toBe(false);
  });
  it('does not prepare cached data after a denied print export', async () => {
    messages = [entry()];
    await service.setQuery({
      folder: 'Inbox',
      search: '',
      category: '',
      filter: 'All messages',
      order: 'Newest first',
      page: 1,
    });
    request.mockRejectedValueOnce(
      new ApiError('Export permission is required.', 403, 'permission_denied'),
    );
    await expect(service.preparePrint()).rejects.toThrow('Export permission is required.');
    expect(service.printBusy()).toBe(false);
    expect(service.busy()).toBe(false);
  });
  it('clears the previous chart immediately when changing service users', async () => {
    messages = [entry()];
    await service.setQuery({
      client_id: 'person-1',
      folder: 'Inbox',
      search: '',
      category: '',
      filter: 'All messages',
      order: 'Newest first',
      page: 1,
    });
    service.selectClient('person-2');
    expect(service.entries()).toEqual([]);
    expect(service.detail()).toBeNull();
    expect(service.ready()).toBe(false);
    expect(service.count()).toBe(0);
  });
  it('rejects a response containing another service user in the same company', async () => {
    messages = [{ ...entry(), clientId: 'person-2' }];
    await service.setQuery({
      client_id: 'person-1',
      folder: 'Inbox',
      search: '',
      category: '',
      filter: 'All messages',
      order: 'Newest first',
      page: 1,
    });
    expect(service.entries()).toEqual([]);
    expect(service.error()).toContain('does not match this service user');
  });
  it('sends an unchanged saved draft without requiring a draft edit', async () => {
    messages = [{ ...entry(), state: 'Draft' }];
    const saved = await service.getEntry('entry-1');
    service.capabilities.set({ can_create: true, can_edit: false, can_export: false });
    expect(await service.save(saved, true)).toBeNull();
    expect(request.mock.calls.some(([, , method]) => method === 'PATCH')).toBe(false);
    expect(saved.state).toBe('Sent');
  });
  it('does not persist a new invalid send as an uneditable draft', async () => {
    const draft = service.newEntry();
    draft.subject = 'Incomplete';
    draft.to = ['recipient@example.com'];
    expect(await service.save(draft, true)).toContain('Message:');
    expect(request).not.toHaveBeenCalled();
    expect(draft.etag).toBeUndefined();
  });
  it('preserves the mailbox and rich composer while saving through the API', async () => {
    const fixture = TestBed.createComponent(StaffJournal);
    fixture.componentRef.setInput('clientId', 'person-1');
    fixture.componentRef.setInput('embedded', true);
    await settle(fixture);
    const component = fixture.componentInstance as any;
    component.draft.subject = 'UI care update';
    component.draft.body = 'UI message';
    component.draft.to = ['recipient@example.com'];
    await component.save(false);
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('.journal-workspace')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.folders')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Draft saved');
    expect(component.composing()).toBe(false);
    await vi.waitFor(() => expect(service.entries()[0]?.subject).toBe('UI care update'));
  });
  it('keeps failed compose drafts open and closes stale details on company change', async () => {
    const fixture = TestBed.createComponent(StaffJournal);
    fixture.componentRef.setInput('clientId', 'person-1');
    await settle(fixture);
    const component = fixture.componentInstance as any;
    component.draft.subject = 'Retain subject';
    component.draft.body = 'Retain message';
    request.mockRejectedValueOnce(new ApiError('The record changed.', 412, 'stale_version'));
    await component.save(false);
    await settle(fixture);
    expect(component.composing()).toBe(true);
    expect(component.draft.body).toBe('Retain message');
    expect(fixture.nativeElement.textContent).toContain('The record changed.');
    company.set('south');
    await settle(fixture);
    expect(component.draft.subject).toBe('');
    expect(component.selected()).toBeNull();
  });
});
