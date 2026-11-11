import { Component, input, output, signal } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiError } from '../../../core/auth/auth-api';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { VisitNotes } from './visit-notes';
import { VisitNotesApi } from './visit-notes-api.service';
import { CareHeader } from './care-header';

@Component({ selector: 'cv-care-header', template: '' })
class HeaderStub {
  client = input<any>();
  active = input('');
  printManaged = input(false);
  printBusy = input(false);
  printRequested = output<void>();
}
function note(): any {
  return {
    id: 'note-1',
    company_id: 'north',
    service_user_id: 'person-1',
    version: 1,
    etag: '"v1"',
    visitId: null,
    date: '2026-11-10',
    start: '08:00',
    end: '08:30',
    carerId: 'carer-1',
    carerName: 'Recorded carer',
    visitType: 'Personal Care',
    body: 'Recorded visit observations',
    status: 'Completed',
    visibility: { staff: true, family: false, inspector: false },
    attachments: [],
    createdAt: '2026-11-10T09:00:00Z',
    createdById: 'recorder-1',
    createdBy: 'Recording coordinator',
    updatedAt: '2026-11-10T09:00:00Z',
    updatedBy: 'Recording coordinator',
    deleted: false,
  };
}
async function settle(fixture: ComponentFixture<VisitNotes>) {
  for (let round = 0; round < 4; round++) {
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();
  }
  fixture.detectChanges();
}
describe('Connected visit notes', () => {
  let fixture: ComponentFixture<VisitNotes>,
    editor: any,
    request: ReturnType<typeof vi.fn>,
    scope: ReturnType<typeof signal<string>>,
    permissions: Set<string>,
    workspace: any,
    params: BehaviorSubject<any>;
  beforeEach(async () => {
    scope = signal('north:actor');
    permissions = new Set(['read', 'create', 'edit', 'publish', 'archive', 'export']);
    params = new BehaviorSubject(convertToParamMap({ id: 'person-1' }));
    workspace = {
      company_id: 'north',
      service_user_id: 'person-1',
      count: 1,
      total: 1,
      page: 1,
      page_size: 8,
      next: null,
      previous: null,
      results: [note()],
    };
    request = vi.fn(async (path: string, body?: any, method?: string) => {
      if (path.includes('/options'))
        return {
          company_id: 'north',
          service_user_id: 'person-1',
          timezone: 'Europe/London',
          today: '2026-11-11',
          staff: [{ id: 'carer-1', name: 'Recorded carer' }],
          carers: [{ id: 'carer-1', name: 'Recorded carer' }],
          types: ['Personal Care'],
          visits: [
            {
              id: 'visit-1',
              date: '2026-11-10',
              start: '07:00',
              end: '07:30',
              callName: 'Morning care',
              staffIds: ['carer-1'],
            },
          ],
          visits_available: true,
        };
      if (path.endsWith('/visibility')) {
        const row = {
          ...note(),
          version: 2,
          etag: '"v2"',
          visibility: { ...note().visibility, [body.audience]: body.value },
        };
        workspace.results = [row];
        return row;
      }
      if (path.endsWith('/files') && method === 'POST')
        return {
          id: 'file-1',
          company_id: 'north',
          service_user_id: 'person-1',
          name: 'evidence.pdf',
          mime: 'application/pdf',
          size: 20,
          state: 'clean',
          version: 2,
          etag: '"v2"',
          uploadedAt: '2026-11-10T09:00:00Z',
          uploadedBy: 'Recorder',
        };
      if (path.includes('/files/file-1') && method === 'DELETE')
        return { company_id: 'north', service_user_id: 'person-1', id: 'file-1', deleted: true };
      if (path.endsWith('/note-1'))
        return {
          ...note(),
          body: 'Latest saved visit observations',
          ...body,
          version: method === 'PATCH' ? 2 : 1,
          etag: method === 'PATCH' ? '"v2"' : '"v1"',
        };
      if (method === 'POST') {
        const row = { ...note(), ...body, id: 'server-note', version: 1, etag: '"v1"' };
        workspace.results = [row];
        return row;
      }
      return structuredClone(workspace);
    });
    const selected = signal<any>(null);
    TestBed.configureTestingModule({
      imports: [VisitNotes],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: params, snapshot: { paramMap: params.value } },
        },
        { provide: AuthService, useValue: { api: request } },
        {
          provide: ServiceUsersApi,
          useValue: {
            scope,
            companyId: signal('north'),
            allowed: () => permissions.has('read'),
            access: { can: (_m: string, _s: string, a: string) => permissions.has(a) },
            selected,
            detailPending() {
              return this.detailLoading();
            },
            detailLoading: signal(false),
            error: signal(''),
            detail: vi.fn(async (id: string) =>
              selected.set({
                id,
                name: 'Recorded service user',
                reference: 'SU-1',
                address: 'Recorded address',
                postcode: 'AB1 2CD',
                active: true,
                funding: 'Private',
                priority: 'Standard',
              }),
            ),
          },
        },
      ],
    });
    TestBed.overrideComponent(VisitNotes, {
      remove: { imports: [CareHeader] },
      add: { imports: [HeaderStub] },
    });
    fixture = TestBed.createComponent(VisitNotes);
    editor = fixture.componentInstance;
    await settle(fixture);
  });
  it('retains the content skeleton while visit-note options are still loading', async () => {
    const options = editor.api.options();
    let finish!: (value: unknown) => void;
    request.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const pending = editor.api.loadOptions('person-1');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('cv-care-header')).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('[aria-label="Loading service user"]'),
    ).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Service user unavailable');
    finish(options);
    await pending;
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('[aria-label="Loading service user"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Care Visit Notes');
  });

  it('renders backend records without browser data or repeated profile reloads', async () => {
    expect(fixture.nativeElement.textContent).toContain('Recorded visit observations');
    expect(fixture.nativeElement.textContent).toContain('Recorded carer');
    const count = request.mock.calls.length;
    await settle(fixture);
    expect(request.mock.calls.length).toBe(count);
    expect(TestBed.inject(ServiceUsersApi).detail).toHaveBeenCalledTimes(1);
  });
  it('opens a fresh prefilled note in the branded popup', async () => {
    await editor.open(editor.notes()[0]);
    await settle(fixture);
    expect(editor.draft.body).toBe('Latest saved visit observations');
    expect(
      fixture.nativeElement.querySelector('[role="dialog"].service-user-popup'),
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelector('textarea[name="body"]').value).toBe(
      'Latest saved visit observations',
    );
  });
  it('saves a new note and uses its server assigned ID', async () => {
    await editor.open();
    Object.assign(editor.draft, {
      date: '2026-11-10',
      start: '08:00',
      end: '08:30',
      carerId: 'carer-1',
      body: 'New factual note',
    });
    await editor.save();
    await settle(fixture);
    const saved = request.mock.calls.find((c) => c[2] === 'POST' && c[0].endsWith('/visit-notes'))!;
    expect(saved[1]).toMatchObject({
      body: 'New factual note',
      carerId: 'carer-1',
      attachment_ids: [],
    });
    expect(saved[1]).not.toHaveProperty('id');
    expect(editor.editing()).toBe(false);
    expect(editor.selectedId()).toBe('server-note');
  });
  it('uses the fresh etag on edit and retains corrections after a rejected save', async () => {
    await editor.open(editor.notes()[0]);
    editor.draft.body = 'Unsaved correction';
    request.mockImplementationOnce(async () => {
      throw new ApiError('This note changed. Reopen it.', 412, 'stale_version');
    });
    await editor.save();
    await settle(fixture);
    expect(editor.editing()).toBe(true);
    expect(editor.draft.body).toBe('Unsaved correction');
    expect(editor.error()).toContain('note changed');
    const call = request.mock.calls.find((c) => c[2] === 'PATCH')!;
    expect((call as any)[3]['If-Match']).toBe('"v1"');
  });
  it('sends filters and page changes to the backend', async () => {
    editor.filters = {
      from: '2026-11-01',
      to: '2026-11-11',
      carer: 'carer-1',
      type: 'Personal Care',
    };
    editor.search();
    await settle(fixture);
    expect(
      request.mock.calls.some(
        (c) => c[0].includes('from_date=2026-11-01') && c[0].includes('carer=carer-1'),
      ),
    ).toBe(true);
    workspace.count = 20;
    editor.api.page.set({ ...workspace, count: 20 });
    editor.page.set(2);
    await settle(fixture);
    expect(request.mock.calls.some((c) => c[0].includes('page=2'))).toBe(true);
  });
  it('validates reversed dates without requesting another page', () => {
    const count = request.mock.calls.length;
    editor.filters = { from: '2026-11-11', to: '2026-11-01', carer: '', type: '' };
    editor.search();
    expect(editor.error()).toContain('end date');
    expect(request.mock.calls.length).toBe(count);
  });
  it('prefills linked visit fields using the existing allocation', async () => {
    await editor.open();
    editor.draft.visitId = 'visit-1';
    editor.chooseVisit();
    expect(editor.draft).toMatchObject({
      date: '2026-11-10',
      start: '07:00',
      end: '07:30',
      carerId: 'carer-1',
      visitType: 'Morning care',
    });
  });
  it('updates sharing through its versioned command', async () => {
    await editor.toggle(editor.notes()[0], 'family');
    await settle(fixture);
    const call = request.mock.calls.find((c) => c[0].endsWith('/visibility'))!;
    expect(call[1]).toMatchObject({ audience: 'family', value: true });
    expect((call as any)[3]['If-Match']).toBe('"v1"');
    expect(editor.selected().visibility.family).toBe(true);
  });
  it('honours create edit publish and export grants independently', async () => {
    permissions.delete('publish');
    permissions.delete('edit');
    permissions.delete('export');
    scope.set('north:actor:limited');
    await settle(fixture);
    expect(editor.api.can('create')).toBe(true);
    expect(editor.api.can('publish')).toBe(false);
    expect(editor.api.can('export')).toBe(false);
    await editor.open(editor.notes()[0]);
    expect(editor.editing()).toBe(false);
  });
  it('uploads through multipart transport and removes unused attachments', async () => {
    await editor.open();
    const file = new File(['%PDF-1.4\n%%EOF'], 'evidence.pdf', { type: 'application/pdf' });
    const event = { target: { files: [file], value: 'chosen' } } as unknown as Event;
    await editor.upload(event);
    expect(editor.draft.attachments).toHaveLength(1);
    expect(editor.draft.attachments[0].data).toBe('');
    const upload = request.mock.calls.find((c) => c[0].endsWith('/files'))!;
    expect(upload[1]).toBeInstanceOf(FormData);
    await editor.removeAttachment('file-1');
    expect(editor.draft.attachments).toEqual([]);
    expect(request.mock.calls.some((c) => c[2] === 'DELETE')).toBe(true);
  });
  it('clears cached notes and closes the visible editor after backend access denial', async () => {
    await editor.open(editor.notes()[0]);
    request.mockImplementationOnce(async () => {
      throw new ApiError('Recording access revoked', 403, 'forbidden');
    });
    await editor.save();
    await settle(fixture);
    expect(editor.api.notes()).toEqual([]);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Recorded visit observations');
  });
  it('does not apply an old note response after switching service users', async () => {
    let resolve!: (value: any) => void;
    request.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const pending = editor.open(editor.notes()[0]);
    params.next(convertToParamMap({ id: 'person-2' }));
    await settle(fixture);
    resolve(note());
    await pending;
    await settle(fixture);
    expect(editor.editing()).toBe(false);
    expect(editor.id()).toBe('person-2');
  });
  it('clears data and drafts when the access context changes', async () => {
    await editor.open(editor.notes()[0]);
    editor.draft.body = 'Private draft';
    permissions.delete('read');
    scope.set('north:revoked');
    await settle(fixture);
    expect(editor.api.notes()).toEqual([]);
    expect(editor.editing()).toBe(false);
    expect(editor.draft.body).toBe('');
  });
  it('requests the authorised filtered print dataset', async () => {
    const api = fixture.debugElement.injector.get(VisitNotesApi);
    const rows = await api.print('person-1', 'type=Personal+Care');
    expect(rows).toHaveLength(1);
    expect(request.mock.calls.at(-1)![0]).toContain('/print?type=Personal+Care');
  });
  it('marks the rejected field and retains its entered value', async () => {
    await editor.open(editor.notes()[0]);
    editor.draft.body = 'Entered care observation';
    request.mockImplementationOnce(async () => {
      throw new ApiError('Check the visit note.', 400, 'validation_error', {
        body: ['Enter the recorded care outcome.'],
      });
    });
    await editor.save();
    await settle(fixture);
    expect(
      fixture.nativeElement.querySelector('textarea[name="body"]').getAttribute('aria-invalid'),
    ).toBe('true');
    expect(editor.draft.body).toBe('Entered care observation');
    expect(editor.editing()).toBe(true);
  });
  it('discards unused uploads when a changed note is cancelled', async () => {
    await editor.open();
    const file = new File(['%PDF-1.4\n%%EOF'], 'evidence.pdf', { type: 'application/pdf' });
    await editor.upload({ target: { files: [file], value: 'chosen' } } as unknown as Event);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    try {
      await editor.close();
      expect(editor.editing()).toBe(false);
      expect(
        request.mock.calls.some((c) => c[2] === 'DELETE' && c[0].endsWith('/files/file-1')),
      ).toBe(true);
    } finally {
      confirm.mockRestore();
    }
  });
  it('ignores a slower earlier popup request when another note has been opened', async () => {
    let resolve!: (value: any) => void;
    request.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const pending = editor.open(editor.notes()[0]);
    await editor.open();
    editor.draft.body = 'New note draft';
    resolve(note());
    await pending;
    await settle(fixture);
    expect(editor.draft.body).toBe('New note draft');
    expect(editor.isEditingExisting()).toBe(false);
  });
});
