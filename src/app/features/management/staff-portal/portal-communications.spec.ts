import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { MatDialog, MAT_DIALOG_DEFAULT_OPTIONS } from '@angular/material/dialog';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiError } from '../../../core/auth/auth-api';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { PortalCommunications } from './portal-communications';
import { ProfessionalApi } from './professional-api.service';

function contact() {
  return {
    id: 'person-1',
    company_id: 'north',
    service_user_id: 'person-1',
    name: 'Sam Citizen',
    relationship: 'Sibling',
    phone: '070000001',
    email: 'sam@example.com',
    type: 'Family',
    nextOfKin: true,
    source: 'representative',
    version: 3,
    etag: '"v3"',
    lastContact: '2026-11-10T08:00:00Z',
    nextFollowUp: '2026-11-12',
  };
}
function record() {
  return {
    id: 'record-1',
    company_id: 'north',
    clientId: 'person-1',
    version: 1,
    etag: '"v1"',
    contactId: 'person-1',
    contactSource: 'representative',
    type: 'Phone call',
    subject: 'Recorded update',
    details: 'Recorded discussion and actions',
    at: '2026-11-10T08:00:00Z',
    loggedBy: 'Recording worker',
    loggedByEmail: 'worker@example.com',
    createdAt: '2026-11-10T08:01:00Z',
    updatedAt: '2026-11-10T08:01:00Z',
    updatedBy: 'Recording worker',
    followUp: '2026-11-12',
    status: 'Open',
    direction: 'Received',
    responseRequired: false,
    responseStatus: '',
    attachments: [],
    request_id: 'detail-request',
  };
}
async function settle(fixture: ComponentFixture<PortalCommunications>) {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}
describe('Professional communications backend workflow', () => {
  let fixture: ComponentFixture<PortalCommunications>,
    editor: any,
    request: ReturnType<typeof vi.fn>,
    scope: ReturnType<typeof signal<string>>,
    permissions: Set<string>,
    workspace: any,
    params: BehaviorSubject<any>;
  beforeEach(() => {
    scope = signal('north:actor:1');
    permissions = new Set(['read', 'create', 'edit', 'archive', 'export']);
    params = new BehaviorSubject(convertToParamMap({ id: 'person-1' }));
    workspace = {
      company_id: 'north',
      clientId: 'person-1',
      timezone: 'Europe/London',
      today: '2026-11-11',
      total: 1,
      records: [record()],
      contacts: [contact()],
    };
    request = vi.fn(async (path: string, body?: any, method?: string) => {
      if (
        path.includes('/professional-communications?') ||
        path.includes('/professional-communications/print?')
      )
        return structuredClone(workspace);
      if (path.endsWith('/professional-communications/record-1')) return { ...record(), ...body };
      if (path.endsWith('/professional-communications') && method === 'POST')
        return { ...record(), ...body };
      if (path.endsWith('/contacts/person-1')) return { ...contact(), ...body };
      if (path.endsWith('/contacts') && method === 'POST') return { ...contact(), ...body };
      if (path.includes('/files/file-1'))
        return {
          id: 'file-1',
          company_id: 'north',
          name: 'evidence.txt',
          size: 5,
          state: 'clean',
          content_type: 'text/plain',
          etag: '"v2"',
        };
      throw Error('Unexpected request ' + path);
    });
    const records = {
      scope,
      detail: vi.fn().mockResolvedValue(undefined),
      allowed: signal(true),
      companyId: signal('north'),
      access: { can: (_m: string, _s: string, a: string) => permissions.has(a) },
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { api: request } },
        { provide: ServiceUsersApi, useValue: records },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: params,
            queryParamMap: new BehaviorSubject(convertToParamMap({})),
            snapshot: { paramMap: params.value, queryParamMap: convertToParamMap({}) },
          },
        },
        {
          provide: MAT_DIALOG_DEFAULT_OPTIONS,
          useValue: { enterAnimationDuration: 0, exitAnimationDuration: 0 },
        },
      ],
    });
    fixture = TestBed.createComponent(PortalCommunications);
    editor = fixture.componentInstance;
  });
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    vi.restoreAllMocks();
  });
  it('loads canonical contacts and communication records without browser storage', async () => {
    const storage = vi.spyOn(Storage.prototype, 'getItem');
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('Sam Citizen');
    expect(fixture.nativeElement.textContent).toContain('Recorded update');
    expect(fixture.nativeElement.textContent).toContain('Showing 1 of 1 communications');
    expect(storage).not.toHaveBeenCalled();
  });
  it('saves the existing inline creation form using the scoped API and server attribution', async () => {
    await settle(fixture);
    editor.selectContact('person-1');
    editor.record.subject = 'New discussion';
    editor.record.details = 'Recorded new actions';
    editor.record.at = '2026-11-10T09:00';
    await editor.save();
    const call = request.mock.calls.find(
      (c: any[]) => c[0].endsWith('/professional-communications') && c[2] === 'POST',
    )!;
    expect(call[0]).toBe('/companies/north/service-users/person-1/professional-communications');
    expect(call[1]).toMatchObject({
      subject: 'New discussion',
      contactId: 'person-1',
      contactSource: 'representative',
      at: '2026-11-10T09:00',
    });
    expect(call[1]).not.toHaveProperty('loggedBy');
    expect(call[1]).not.toHaveProperty('attachments');
    expect(call[3]['Idempotency-Key']).toBeTruthy();
  });
  it('opens a branded prefilled edit popup and submits only write fields with its ETag', async () => {
    await settle(fixture);
    await editor.edit(workspace.records[0]);
    await settle(fixture);
    const popup = document.querySelector('.service-user-dialog .service-user-popup')!;
    expect(popup).toBeTruthy();
    expect(popup.querySelector<HTMLInputElement>('[name="subject"]')!.value).toBe(
      'Recorded update',
    );
    expect(editor.record.at).toBe('2026-11-10T08:00');
    editor.record.subject = 'Updated discussion';
    const closed = firstValueFrom(TestBed.inject(MatDialog).openDialogs[0].afterClosed());
    await editor.save();
    await closed;
    await settle(fixture);
    const call = request.mock.calls.find((c: any[]) => c[2] === 'PATCH')!;
    expect(call[3]).toEqual({ 'If-Match': '"v1"' });
    expect(call[1]).not.toHaveProperty('request_id');
    expect(call[1]).not.toHaveProperty('id');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
  it('edits the existing representative through its shared contact identity', async () => {
    await settle(fixture);
    await editor.openContact(workspace.contacts[0]);
    await settle(fixture);
    expect(document.querySelector<HTMLInputElement>('[role="dialog"] [name="name"]')!.value).toBe(
      'Sam Citizen',
    );
    editor.contact.phone = '070000003';
    await editor.saveContact();
    const call = request.mock.calls.find(
      (c: any[]) => c[0].endsWith('/contacts/person-1') && c[2] === 'PATCH',
    )!;
    expect(call[1]).toMatchObject({ type: 'Family', nextOfKin: true, phone: '070000003' });
    expect(call[3]).toEqual({ 'If-Match': '"v3"' });
  });
  it('retains rejected edits and highlights the named field in the popup', async () => {
    await settle(fixture);
    await editor.edit(workspace.records[0]);
    request.mockImplementation(async (_path: string, _body: unknown, method?: string) => {
      if (method === 'PATCH')
        throw new ApiError('Enter a subject.', 400, 'validation_error', {
          subject: ['Enter a subject.'],
        });
      return workspace;
    });
    editor.record.subject = 'Retained draft';
    await editor.save();
    await settle(fixture);
    expect(editor.record.subject).toBe('Retained draft');
    expect(editor.recordDialogOpen()).toBe(true);
    expect(
      document.querySelector('[role="dialog"] [name="subject"]')!.getAttribute('aria-invalid'),
    ).toBe('true');
  });
  it('sends search, type and date-period filters to the backend', async () => {
    await settle(fixture);
    editor.query.set('district');
    editor.type.set('Phone call');
    editor.period.set('Last 7 days');
    await editor.reload();
    const path = request.mock.calls
      .filter((c: any[]) => c[0].includes('/professional-communications?'))
      .at(-1)![0];
    const query = new URLSearchParams(path.split('?')[1]);
    expect(query.get('search')).toBe('district');
    expect(query.get('type')).toBe('Phone call');
    expect(query.get('period')).toBe('Last 7 days');
  });
  it('blocks saving quarantined files and retains the source inputs', async () => {
    await settle(fixture);
    editor.selectContact('person-1');
    editor.record.subject = 'Keep note';
    editor.record.details = 'Note body';
    editor.record.attachments = [
      { id: 'file-1', name: 'evidence.txt', size: 5, content: '', state: 'quarantined' },
    ];
    request.mockResolvedValueOnce({ id: 'file-1', company_id: 'north', state: 'quarantined' });
    await editor.save();
    expect(editor.error()).toContain('scanning');
    expect(editor.record.subject).toBe('Keep note');
    expect(request.mock.calls.some((c: any[]) => c[2] === 'POST')).toBe(false);
  });
  it('rejects late detail responses after switching workspaces', async () => {
    await settle(fixture);
    let finish!: (value: any) => void;
    request.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    const opening = editor.edit(workspace.records[0]);
    scope.set('north:another-actor');
    fixture.detectChanges();
    await Promise.resolve();
    finish(record());
    await opening;
    await settle(fixture);
    expect(editor.recordDialogOpen()).toBe(false);
    expect(editor.fetching()).toBe(false);
  });
  it('allows read-only users to view details without enabling save controls', async () => {
    permissions.delete('edit');
    permissions.delete('create');
    await settle(fixture);
    await editor.edit(workspace.records[0]);
    await settle(fixture);
    expect(document.querySelector('[role="dialog"] h2')!.textContent).toContain(
      'View communication',
    );
    const save = [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(
      (b) => b.textContent!.includes('Save communication'),
    )!;
    expect(save.disabled).toBe(true);
  });
  it('validates print authority with the backend and prints the selected filters', async () => {
    await settle(fixture);
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    editor.query.set('review');
    await editor.print();
    expect(
      request.mock.calls.some((c: any[]) =>
        c[0].includes('/professional-communications/print?search=review'),
      ),
    ).toBe(true);
    expect(print).toHaveBeenCalledTimes(1);
    permissions.delete('export');
    await editor.print();
    expect(print).toHaveBeenCalledTimes(1);
  });
  it('shows unavailable state rather than seeded data after a backend failure', async () => {
    request.mockRejectedValue(new Error('Backend unavailable'));
    await settle(fixture);
    expect(editor.data()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Backend unavailable');
    expect(fixture.nativeElement.querySelector('[name="subject"]')).toBeNull();
  });
  it('does not print an older filter response after the selected filters change', async () => {
    await settle(fixture);
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    let finish!: (value: any) => void;
    request.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    const printing = editor.print();
    editor.query.set('changed');
    finish(workspace);
    await printing;
    expect(print).not.toHaveBeenCalled();
    expect(editor.error()).toContain('filters changed');
    expect(editor.printBusy()).toBe(false);
  });
  it('clears pending print state when workspace authority changes', async () => {
    await settle(fixture);
    let finish!: (value: any) => void;
    request.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    const printing = editor.print();
    expect(editor.printBusy()).toBe(true);
    scope.set('north:another-actor');
    fixture.detectChanges();
    await Promise.resolve();
    expect(editor.printBusy()).toBe(false);
    finish(workspace);
    await printing;
  });
  it('keeps attachment downloads available to read-only users with export permission', async () => {
    permissions = new Set(['read', 'export']);
    const value = {
      ...record(),
      attachments: [
        {
          id: 'file-1',
          company_id: 'north',
          name: 'evidence.txt',
          size: 8,
          state: 'clean',
          content_type: 'text/plain',
          etag: '"v1"',
        },
      ],
    };
    workspace.records = [value];
    await settle(fixture);
    request.mockResolvedValueOnce(value);
    await editor.edit(value);
    await settle(fixture);
    const api = fixture.debugElement.injector.get(ProfessionalApi),
      download = vi.spyOn(api, 'download').mockResolvedValue();
    const button = document.querySelector<HTMLButtonElement>(
      '[role="dialog"] cv-portal-evidence button',
    )!;
    expect(button).toBeTruthy();
    expect(button.matches(':disabled')).toBe(false);
    button.click();
    await settle(fixture);
    expect(download).toHaveBeenCalledWith('person-1', expect.objectContaining({ id: 'file-1' }));
    expect(
      document
        .querySelector<HTMLInputElement>('[role="dialog"] [name="subject"]')!
        .matches(':disabled'),
    ).toBe(true);
  });
});
