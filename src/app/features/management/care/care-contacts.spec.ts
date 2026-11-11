import { Component, input, output, signal } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { CareContacts } from './care-contacts';
import { CareHeader } from './care-header';
@Component({ selector: 'cv-care-header', template: '' })
class HeaderStub {
  client = input<any>();
  active = input('');
  printManaged = input(false);
  printBusy = input(false);
  printRequested = output<void>();
}
function contact(id = 'contact-1', source = 'contact'): any {
  return {
    id,
    company_id: 'north',
    service_user_id: 'person-1',
    name: source === 'representative' ? 'Primary representative' : 'Community pharmacist',
    relationship: 'Practice team',
    phone: '02000000000',
    email: 'contact@example.com',
    type: source === 'representative' ? 'Family' : 'Pharmacy',
    nextOfKin: source === 'representative',
    source,
    version: 1,
    etag: '"v1"',
    lastContact: null,
    nextFollowUp: null,
  };
}
async function settle(fixture: ComponentFixture<CareContacts>) {
  for (let round = 0; round < 4; round++) {
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();
  }
  fixture.detectChanges();
}
describe('Connected Service User Contacts', () => {
  let fixture: ComponentFixture<CareContacts>,
    editor: any,
    request: ReturnType<typeof vi.fn>,
    scope: ReturnType<typeof signal<string>>,
    permissions: Set<string>,
    rows: any[];
  beforeEach(async () => {
    scope = signal('north:actor');
    permissions = new Set(['read', 'create', 'edit', 'archive', 'export']);
    rows = [contact('person-1', 'representative'), contact()];
    const selected = signal<any>(null);
    request = vi.fn(async (path: string, body?: any, method?: string) => {
      if (method === 'POST') {
        const row = { ...contact('server-contact'), ...body };
        rows.push(row);
        return row;
      }
      if (method === 'PATCH') {
        const row = { ...contact(), ...body, version: 2, etag: '"v2"' };
        rows = rows.map((r) => (r.id === row.id ? row : r));
        return row;
      }
      if (path.endsWith('/contact-1'))
        return { ...contact(), relationship: 'Latest saved relationship' };
      return {
        company_id: 'north',
        service_user_id: 'person-1',
        contacts: structuredClone(rows),
        count: rows.length,
        next: null,
        previous: null,
        meta: {},
      };
    });
    TestBed.configureTestingModule({
      imports: [CareContacts],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ id: 'person-1' }) },
            paramMap: new BehaviorSubject(convertToParamMap({ id: 'person-1' })),
          },
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
            detailLoading: signal(false),
            error: signal(''),
            detail: vi.fn(async (id: string) =>
              selected.set({ id, name: 'Recorded service user' }),
            ),
          },
        },
      ],
    });
    TestBed.overrideComponent(CareContacts, {
      remove: { imports: [CareHeader] },
      add: { imports: [HeaderStub] },
    });
    fixture = TestBed.createComponent(CareContacts);
    editor = fixture.componentInstance;
    await settle(fixture);
  });
  afterEach(() => vi.restoreAllMocks());
  it('uses the shared representative and contact records without duplicating them', async () => {
    expect(editor.representative().name).toBe('Primary representative');
    expect(editor.contacts()).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Community pharmacist');
    const count = request.mock.calls.length;
    await settle(fixture);
    expect(request.mock.calls.length).toBe(count);
  });
  it('creates a contact with a server-generated ID and all entered fields', async () => {
    await editor.open();
    editor.contact = {
      name: 'Emergency contact',
      relationship: 'Neighbour',
      phone: '07000000000',
      email: 'neighbour@example.com',
      type: 'Emergency',
      nextOfKin: true,
    };
    await editor.save();
    await settle(fixture);
    const call = request.mock.calls.find((c) => c[2] === 'POST') as any[];
    expect(call[1]).toMatchObject({
      name: 'Emergency contact',
      type: 'Emergency',
      nextOfKin: true,
    });
    expect(call[3]['Idempotency-Key']).toBeTruthy();
    expect(editor.contacts().some((c: any) => c.id === 'server-contact')).toBe(true);
    expect(editor.editing()).toBe(false);
  });
  it('loads fresh contact values into the branded popup and uses its ETag', async () => {
    await editor.open(editor.contacts()[0]);
    await settle(fixture);
    expect(editor.contact.relationship).toBe('Latest saved relationship');
    expect(fixture.nativeElement.querySelector('[role="dialog"].service-user-popup')).toBeTruthy();
    editor.contact.email = 'corrected@example.com';
    await editor.save();
    const call = request.mock.calls.find((c) => c[2] === 'PATCH') as any[];
    expect(call[1].email).toBe('corrected@example.com');
    expect(call[3]['If-Match']).toBe('"v1"');
  });
  it('does not require an invented relationship for a valid contact', async () => {
    await editor.open();
    editor.contact.name = 'GP practice';
    editor.contact.phone = '02000000000';
    editor.contact.relationship = '';
    await editor.save();
    expect(request.mock.calls.find((c) => c[2] === 'POST')?.[1].relationship).toBe('');
  });
  it('marks required name and contact-channel fields and keeps the editor open', async () => {
    await editor.open();
    await editor.save();
    expect(editor.fieldErrors().name).toBeTruthy();
    editor.contact.name = 'Known contact';
    await editor.save();
    await settle(fixture);
    expect(editor.fieldErrors().phone).toBeTruthy();
    expect(editor.fieldErrors().email).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[name="phone"]').getAttribute('aria-invalid')).toBe(
      'true',
    );
    expect(request.mock.calls.some((c) => c[2] === 'POST')).toBe(false);
  });
  it('retains the draft and shows rejected email fields', async () => {
    await editor.open(editor.contacts()[0]);
    editor.contact.email = 'keep@example.com';
    request.mockImplementationOnce(async () => {
      throw Object.assign(Error('Check email'), {
        fieldErrors: { email: ['Check the email address'] },
      });
    });
    await editor.save();
    await settle(fixture);
    expect(editor.editing()).toBe(true);
    expect(editor.contact.email).toBe('keep@example.com');
    expect(fixture.nativeElement.querySelector('[name="email"]').getAttribute('aria-invalid')).toBe(
      'true',
    );
  });
  it('renders usable phone and email links only when recorded', async () => {
    expect(fixture.nativeElement.querySelector('a[href="tel:02000000000"]')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('a[href="mailto:contact@example.com"]'),
    ).toBeTruthy();
    rows = [{ ...contact(), phone: '', email: 'only@example.com' }];
    await editor.api.load('person-1');
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('a[href="tel:"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Not recorded');
  });
  it('prints a fresh export-authorised contact list', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    await editor.print();
    expect(print).toHaveBeenCalledOnce();
    expect(request.mock.calls.some((c) => c[0].includes('/contacts/print?'))).toBe(true);
    expect(editor.contacts()).toHaveLength(1);
  });
  it('does not print when export is rejected', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    request.mockImplementationOnce(async () => {
      throw Object.assign(Error('Export revoked'), { status: 403 });
    });
    await editor.print();
    expect(print).not.toHaveBeenCalled();
  });
  it('clears the open editor and contact data after authorization is revoked', async () => {
    await editor.open(editor.contacts()[0]);
    request.mockImplementationOnce(async () => {
      throw Object.assign(Error('Access revoked'), { status: 403 });
    });
    await editor.save();
    await settle(fixture);
    expect(editor.editing()).toBe(false);
    expect(editor.contact.name).toBe('');
    expect(editor.contacts()).toEqual([]);
    expect(editor.representative()).toBeUndefined();
  });
  it('guards dirty navigation and disallows leaving during a save', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await editor.open();
    editor.contact.name = 'Unsaved';
    editor.close();
    expect(editor.editing()).toBe(true);
    editor.busy.set(true);
    expect(editor.canLeave()).toBe(false);
  });
  it('hides mutations from readers without exact action grants', async () => {
    permissions.delete('edit');
    permissions.delete('create');
    scope.set('north:reader');
    await settle(fixture);
    expect(fixture.nativeElement.textContent).not.toContain('Add contact');
    expect(fixture.nativeElement.textContent).not.toContain('Edit contact');
    expect(editor.contacts()).toHaveLength(1);
  });
  it('clears records and drafts on workspace changes', async () => {
    await editor.open(editor.contacts()[0]);
    permissions.clear();
    scope.set('south:actor');
    await settle(fixture);
    expect(editor.editing()).toBe(false);
    expect(editor.contacts()).toEqual([]);
  });
  it('rejects mismatched company responses', async () => {
    request.mockImplementationOnce(async () => ({
      company_id: 'other',
      service_user_id: 'person-1',
      contacts: [],
      next: null,
    }));
    await editor.api.load('person-1');
    expect(editor.contacts()).toEqual([]);
    expect(editor.api.error()).toContain('workspace');
  });
  it('uses new keys for new successful submissions and retains keys for retries', async () => {
    const draft = {
      name: 'Contact',
      relationship: '',
      phone: '02000000000',
      email: '',
      type: 'Professional',
      nextOfKin: false,
    };
    await editor.api.save('person-1', draft, null);
    await editor.api.save('person-1', draft, null);
    const calls = request.mock.calls.filter((c) => c[2] === 'POST') as any[][];
    expect(calls[0][3]['Idempotency-Key']).not.toBe(calls[1][3]['Idempotency-Key']);
  });
  it('ignores a stale detail response after a newer editor is opened', async () => {
    let release!: (row: any) => void;
    request.mockImplementationOnce(() => new Promise((r) => (release = r)));
    const old = editor.open(editor.contacts()[0]);
    await editor.open();
    release(contact());
    await old;
    expect(editor.contact.name).toBe('');
  });
  it('loads every authorised page without duplicating the representative', async () => {
    request.mockImplementationOnce(async () => ({
      company_id: 'north',
      service_user_id: 'person-1',
      contacts: [contact('person-1', 'representative')],
      count: 2,
      next: 2,
      previous: null,
      meta: {},
    }));
    request.mockImplementationOnce(async () => ({
      company_id: 'north',
      service_user_id: 'person-1',
      contacts: [contact()],
      count: 2,
      next: null,
      previous: 1,
      meta: {},
    }));
    await editor.api.load('person-1');
    expect(editor.contacts()).toHaveLength(1);
    expect(editor.representative()?.id).toBe('person-1');
  });
  it('shows unknown representative information as unavailable after a failed read', async () => {
    request.mockImplementationOnce(async () => {
      throw Error('Connection unavailable');
    });
    await editor.api.load('person-1');
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('Connection unavailable');
    expect(fixture.nativeElement.querySelector('.care-dl').textContent).toContain('Unavailable');
  });
  it('locks contact fields while a save is pending', async () => {
    await editor.open(editor.contacts()[0]);
    editor.busy.set(true);
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('[name="name"]').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('[name="email"]').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('[name="kin"]').disabled).toBe(true);
  });
  it('does not print a cached representative omitted from the fresh export', async () => {
    request.mockImplementationOnce(async () => ({
      company_id: 'north',
      service_user_id: 'person-1',
      contacts: [contact()],
      results: [contact()],
      count: 1,
      next: null,
      previous: null,
      meta: {},
    }));
    const print = vi.spyOn(window, 'print').mockImplementation(() => {
      expect(editor.representative()).toBeUndefined();
    });
    await editor.print();
    expect(print).toHaveBeenCalledOnce();
  });
});
