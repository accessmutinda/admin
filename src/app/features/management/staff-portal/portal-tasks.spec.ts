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
});
