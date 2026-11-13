import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { PortalTasks } from './portal-tasks';
import { PortalService } from './portal.service';

function task(clientId = '', id: string = crypto.randomUUID()) {
  return {
    id,
    clientId,
    owner: 'worker@example.com',
    title: 'Recorded task',
    due: '2026-11-12',
    priority: 'Normal',
    status: 'Open',
    attachments: [],
    notes: '',
    actions: '',
  };
}
describe('Client journal task scope', () => {
  let fixture: any,
    editor: any,
    portal: any,
    journal: any,
    params: BehaviorSubject<any>,
    query: BehaviorSubject<any>,
    route: any;
  async function flush() {
    fixture.detectChanges();
    for (let i = 0; i < 8; i++) await Promise.resolve();
    fixture.detectChanges();
  }
  function navigate(clientId: string, taskId = '') {
    const p = convertToParamMap({ id: clientId }),
      q = convertToParamMap(taskId ? { task: taskId } : {});
    route.snapshot.paramMap = p;
    route.snapshot.queryParamMap = q;
    params.next(p);
    query.next(q);
  }
  beforeEach(() => {
    params = new BehaviorSubject(convertToParamMap({ id: 'client-a' }));
    query = new BehaviorSubject(convertToParamMap({}));
    route = {
      paramMap: params,
      queryParamMap: query,
      snapshot: {
        paramMap: params.value,
        queryParamMap: query.value,
        data: { careJournalTasks: true },
      },
    };
    journal = {
      scope: signal('north:worker'),
      loading: signal(false),
      allowed: () => true,
      email: () => 'worker@example.com',
      activate: () => () => {},
      selectClient: vi.fn(),
      loadOptions: vi.fn().mockResolvedValue(undefined),
      setQuery: vi.fn().mockResolvedValue(undefined),
      getTask: vi.fn(),
      busy: () => false,
      checkFile: vi.fn(),
    };
    portal = {
      journal,
      newTask: vi.fn((clientId = '') => task(clientId)),
      contacts: signal([]),
      tasks: signal([]),
      saveTask: vi.fn().mockResolvedValue(null),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: route },
        { provide: PortalService, useValue: portal },
      ],
    });
    TestBed.overrideComponent(PortalTasks, { set: { template: '' } });
    fixture = TestBed.createComponent(PortalTasks);
    editor = fixture.componentInstance;
  });
  it('does not let late client options reset the journal to the previous client', async () => {
    let finish!: (value?: unknown) => void;
    journal.loadOptions.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    await flush();
    navigate('client-b');
    await flush();
    finish();
    await flush();
    expect(journal.setQuery.mock.calls.map((c: any[]) => c[0].client_id)).toEqual(['client-b']);
  });
  it('does not reopen a previous client task after navigation', async () => {
    let finish!: (value: unknown) => void;
    journal.getTask
      .mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)))
      .mockResolvedValue(task('client-b', 'task-b'));
    navigate('client-a', 'task-a');
    await flush();
    expect(journal.getTask).toHaveBeenCalledWith('task-a');
    navigate('client-b', 'task-b');
    await flush();
    finish(task('client-a', 'task-a'));
    await flush();
    expect(editor.task.id).toBe('task-b');
    expect(editor.task.clientId).toBe('client-b');
  });
  it('cancels a save when attachment checks finish after changing clients', async () => {
    await flush();
    editor.edit();
    editor.task.attachments = [{ id: 'file-a' }];
    let finish!: (value: unknown) => void;
    journal.checkFile.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const saving = editor.save();
    navigate('client-b');
    await flush();
    finish({ id: 'file-a', state: 'clean' });
    await saving;
    expect(portal.saveTask).not.toHaveBeenCalled();
  });
  it('rejects editing or saving a task outside the locked client', async () => {
    await flush();
    editor.edit(task('client-b', 'task-b'));
    expect(editor.editing()).toBe(false);
    editor.task = task('client-b', 'task-b');
    await editor.save();
    expect(portal.saveTask).not.toHaveBeenCalled();
    expect(editor.error()).toContain('different service user');
  });
  it('waits for staff verification and ignores a different staff query parameter', async () => {
    route.snapshot.data = {};
    query.next(convertToParamMap({ staff: 'other@example.com' }));
    journal.staffPortal = true;
    journal.staffTasks = true;
    journal.staffReady = signal(false);
    await flush();
    expect(journal.loadOptions).not.toHaveBeenCalled();
    journal.staffReady.set(true);
    await flush();
    expect(editor.staff()).toBe('worker@example.com');
    expect(journal.loadOptions).toHaveBeenCalled();
    editor.changeStaff('other@example.com');
    expect(editor.staff()).toBe('worker@example.com');
  });
  it('clears the editor when staff access is revoked', async () => {
    journal.staffPortal = true;
    journal.staffTasks = true;
    journal.staffReady = signal(true);
    await flush();
    editor.edit();
    editor.task.title = 'Unsaved private task';
    journal.staffReady.set(false);
    await flush();
    expect(editor.editing()).toBe(false);
    expect(editor.task.title).not.toBe('Unsaved private task');
  });
  it('rejects opening another staff member task in staff mode', async () => {
    journal.staffTasks = true;
    await flush();
    editor.edit({ ...task('client-a'), owner: 'other@example.com' });
    expect(editor.editing()).toBe(false);
    expect(editor.error()).toContain('does not belong');
  });
  it('keeps task details read-only when edit access is unavailable', async () => {
    journal.capabilities = signal({ can_create: true, can_edit: false, can_export: false });
    await flush();
    editor.edit({ ...task('client-a'), etag: '"v1"' });
    expect(editor.canWriteTask()).toBe(false);
    editor.cancel();
    expect(editor.editing()).toBe(false);
    editor.edit();
    expect(editor.canWriteTask()).toBe(true);
  });

  it('loads related visit choices when opening an existing client task', async () => {
    await flush();
    journal.loadOptions.mockClear();
    editor.edit({ ...task('client-a'), visitId: 'visit-a' });
    expect(journal.loadOptions).toHaveBeenLastCalledWith('client-a');
  });
  it('prevents switching tasks while evidence is uploading', async () => {
    await flush();
    editor.edit(task('client-a', 'first-task'));
    editor.uploading.set(true);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    editor.edit(task('client-a', 'second-task'));
    expect(editor.task.id).toBe('first-task');
    expect(editor.canLeave()).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
});
