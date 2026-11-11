import { Component, input, output, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { FamilySharing } from './family-sharing';
import { CareHeader } from './care-header';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';

@Component({ selector: 'cv-care-header', template: '' })
class HeaderStub {
  client = input<any>();
  active = input('');
  printManaged = input(false);
  printBusy = input(false);
  printRequested = output<void>();
}
const access = () => ({
  id: 'access-1',
  company_id: 'north',
  service_user_id: 'person-1',
  version: 1,
  etag: '"v1"',
  name: 'Family member',
  email: 'family@example.com',
  relationship: 'Sibling',
  status: 'Active',
  scopes: ['Notes', 'Messages'],
  at: '2026-11-11T10:00:00Z',
});
async function settle(f: ComponentFixture<any>) {
  for (let i = 0; i < 15; i++) {
    f.detectChanges();
    await f.whenStable();
    await Promise.resolve();
  }
  f.detectChanges();
}
describe('Connected family sharing administration', () => {
  let fixture: ComponentFixture<FamilySharing>,
    editor: any,
    request: ReturnType<typeof vi.fn>,
    scope: ReturnType<typeof signal<string>>,
    rows: any[],
    permissions: Set<string>;
  beforeEach(async () => {
    scope = signal('north:user');
    rows = [access()];
    permissions = new Set(['read', 'create', 'edit', 'archive', 'export']);
    request = vi.fn(async (path: string, body?: any, method?: string) => {
      if (method === 'PATCH') {
        const row = {
          ...rows[0],
          version: 2,
          etag: '"v2"',
          ...(path.endsWith('/permissions')
            ? {
                scopes: body.enabled
                  ? [...rows[0].scopes, body.scope]
                  : rows[0].scopes.filter((s: string) => s !== body.scope),
              }
            : body),
        };
        rows = [row];
        return row;
      }
      if (method === 'POST') return { ...access(), ...body };
      if (path.endsWith('/family-sharing'))
        return {
          company_id: 'north',
          service_user_id: 'person-1',
          today: '2026-11-11',
          consent: 'Agreed',
        };
      if (path.endsWith('/access/access-1')) return rows[0];
      return {
        company_id: 'north',
        service_user_id: 'person-1',
        count: path.includes('/access') ? rows.length : 0,
        next: null,
        previous: null,
        results: path.includes('/access') ? rows : [],
        meta: {},
      };
    });
    const selected = signal<any>(null);
    TestBed.configureTestingModule({
      imports: [FamilySharing],
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
            detailPending() {
              return this.detailLoading();
            },
            detailLoading: signal(false),
            error: signal(''),
            detail: vi.fn(async (id: string) => selected.set({ id, name: 'Service user' })),
          },
        },
      ],
    });
    TestBed.overrideComponent(FamilySharing, {
      remove: { imports: [CareHeader] },
      add: { imports: [HeaderStub] },
    });
    fixture = TestBed.createComponent(FamilySharing);
    editor = fixture.componentInstance;
    await settle(fixture);
  });
  afterEach(() => vi.restoreAllMocks());
  it('loads persisted access and removes the actions column', () => {
    expect(fixture.nativeElement.textContent).toContain('Family member');
    expect(
      [...fixture.nativeElement.querySelectorAll('th')].map((n: any) => n.textContent.trim()),
    ).not.toContain('Actions');
    expect(fixture.nativeElement.querySelectorAll('[role=switch]')).toHaveLength(8);
  });
  it('saves a toggle immediately using the record version', async () => {
    await editor.toggle(rows[0], 'Notes');
    await settle(fixture);
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('/permissions'),
      { scope: 'Notes', enabled: false },
      'PATCH',
      { 'If-Match': '"v1"' },
      'json',
    );
    expect(editor.api.access()[0].scopes).not.toContain('Notes');
  });
  it('keeps the prior switch value while saving and disables conflicting actions', async () => {
    let resolve: any;
    const pending = new Promise((r) => (resolve = r));
    request.mockImplementationOnce(() => pending);
    const saved = editor.toggle(rows[0], 'Notes');
    fixture.detectChanges();
    expect(editor.api.access()[0].scopes).toContain('Notes');
    expect(fixture.nativeElement.querySelector('[role=switch]').disabled).toBe(true);
    resolve({ ...rows[0], scopes: ['Messages'], version: 2, etag: '"v2"' });
    await saved;
  });
  it('reloads actual permissions after a stale toggle failure', async () => {
    request.mockRejectedValueOnce(Object.assign(Error('Record changed'), { status: 412 }));
    await editor.toggle(rows[0], 'Notes');
    expect(editor.error()).toContain('Record changed');
    expect(editor.api.access()[0].scopes).toContain('Notes');
  });
  it('opens a fresh prefilled edit popup when the member name is selected', async () => {
    await editor.open(rows[0]);
    await settle(fixture);
    expect(editor.access.email).toBe('family@example.com');
    expect(fixture.nativeElement.querySelector('[role=dialog]')).not.toBeNull();
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('/access/access-1'),
      undefined,
      undefined,
      undefined,
      'json',
    );
  });
  it('saves edited access through PATCH', async () => {
    await editor.open(rows[0]);
    editor.access.name = 'Updated member';
    await editor.save();
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('/access/access-1'),
      expect.objectContaining({ name: 'Updated member' }),
      'PATCH',
      { 'If-Match': '"v1"' },
      'json',
    );
    expect(editor.editing()).toBe(false);
  });
  it('locks popup fields during a pending save', async () => {
    await editor.open(rows[0]);
    await settle(fixture);
    let resolve: any;
    request.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const pending = editor.save();
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('[role=dialog] input').disabled).toBe(true);
    resolve({ ...access(), version: 2 });
    await pending;
  });
  it('preserves the popup and field errors after a failed save', async () => {
    await editor.open(rows[0]);
    request.mockRejectedValueOnce(
      Object.assign(Error('Duplicate email'), {
        status: 400,
        field_errors: { email: ['Already exists'] },
      }),
    );
    await editor.save();
    await settle(fixture);
    expect(editor.editing()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Already exists');
    expect(fixture.nativeElement.querySelector('[aria-invalid=true]')).not.toBeNull();
  });
  it('persists approved updates and care team messages', async () => {
    editor.updateText = 'Approved wellbeing update';
    await editor.shareUpdate();
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('/updates'),
      expect.objectContaining({ text: 'Approved wellbeing update' }),
      'POST',
      expect.objectContaining({ 'Idempotency-Key': expect.any(String) }),
      'json',
    );
    editor.messageAccess = 'access-1';
    editor.messageText = 'Care team message';
    await editor.sendMessage();
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('/messages'),
      { accessId: 'access-1', text: 'Care team message' },
      'POST',
      expect.any(Object),
      'json',
    );
    expect(editor.messageText).toBe('');
  });
  it('clears records and closes a popup when access is revoked', async () => {
    await editor.open(rows[0]);
    request.mockRejectedValueOnce(Object.assign(Error('Access revoked'), { status: 403 }));
    await editor.api.load('person-1');
    await settle(fixture);
    expect(editor.api.access()).toEqual([]);
    expect(editor.editing()).toBe(false);
  });
  it('clears stale drafts when the workspace changes', async () => {
    await editor.open(rows[0]);
    editor.updateText = 'Unsent';
    permissions.clear();
    scope.set('south:user');
    await settle(fixture);
    expect(editor.editing()).toBe(false);
    expect(editor.updateText).toBe('');
    expect(editor.api.access()).toEqual([]);
  });
  it('prints only after the authorised export completes', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    await editor.print();
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('/access/print?'),
      undefined,
      undefined,
      undefined,
      'json',
    );
    expect(print).toHaveBeenCalledOnce();
  });
  it('does not print after the screen is destroyed', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    let resolve: any;
    request.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const pending = editor.print();
    fixture.destroy();
    resolve({
      company_id: 'north',
      service_user_id: 'person-1',
      results: [],
      count: 0,
      next: null,
    });
    await pending;
    expect(print).not.toHaveBeenCalled();
  });
  function options(): any {
    return {
      company_id: 'north',
      service_user_id: 'person-1',
      plan: {
        kind: 'plan',
        invoiceId: null,
        name: 'Existing plan',
        sourceDigest: 'a'.repeat(64),
        eligible: true,
        data: {
          details: {
            name: 'Existing plan',
            status: 'Active',
            needs: 'Existing needs',
            support: 'Existing support',
            start: null,
            review: null,
          },
          goals: [],
        },
      },
      invoices: [
        {
          kind: 'invoice',
          invoiceId: 'invoice-1',
          name: 'INV-001',
          customer: 'Existing customer',
          sourceDigest: 'b'.repeat(64),
          eligible: true,
          data: {
            id: 'invoice-1',
            number: 'INV-001',
            date: '2026-01-01',
            dueDate: '2026-02-01',
            currency: 'GBP',
            total: '20.00',
            balance: '20.00',
            state: 'Sent',
            paid: '0.00',
            lines: [],
          },
        },
      ],
      publications: [],
      canPublishPlan: true,
      canPublishInvoices: true,
    };
  }
  it('reviews the existing plan before publishing its current digest', async () => {
    permissions.add('publish');
    permissions.add('approve');
    vi.spyOn(editor.api, 'publicationOptions').mockResolvedValue(options());
    await editor.openPublication('plan');
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('Existing needs');
    expect(editor.publicationOpen()).toBe(true);
    editor.publicationConfirmed = true;
    editor.publicationReason = 'Reviewed';
    await editor.publish();
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('/publications'),
      { kind: 'plan', invoiceId: null, sourceDigest: 'a'.repeat(64), reason: 'Reviewed' },
      'POST',
      expect.objectContaining({ 'Idempotency-Key': expect.any(String) }),
      'json',
    );
    expect(editor.publicationOpen()).toBe(false);
  });
  it('uses the selected existing invoice and requires confirmation before publishing', async () => {
    permissions.add('publish');
    permissions.add('approve');
    vi.spyOn(editor.api, 'publicationOptions').mockResolvedValue(options());
    await editor.openPublication('invoice');
    const before = request.mock.calls.length;
    editor.publicationReason = 'Reviewed';
    await editor.publish();
    expect(request.mock.calls.length).toBe(before);
    editor.publicationConfirmed = true;
    await editor.publish();
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('/publications'),
      expect.objectContaining({
        kind: 'invoice',
        invoiceId: 'invoice-1',
        sourceDigest: 'b'.repeat(64),
      }),
      'POST',
      expect.any(Object),
      'json',
    );
  });
  it('retains the review popup when the source changed before publication', async () => {
    permissions.add('publish');
    permissions.add('approve');
    vi.spyOn(editor.api, 'publicationOptions').mockResolvedValue(options());
    await editor.openPublication('plan');
    editor.publicationConfirmed = true;
    editor.publicationReason = 'Reviewed';
    request.mockRejectedValueOnce(Object.assign(Error('The source changed'), { status: 409 }));
    await editor.publish();
    expect(editor.publicationOpen()).toBe(true);
    expect(editor.publicationReason).toBe('Reviewed');
    expect(editor.error()).toContain('source changed');
  });
  it('stops sharing a publication using its version and a required reason', async () => {
    permissions.add('publish');
    permissions.add('approve');
    const value = options();
    value.publications = [
      {
        id: 'published-1',
        kind: 'plan',
        invoiceId: null,
        sourceDigest: 'a'.repeat(64),
        etag: '"v3"',
      },
    ];
    vi.spyOn(editor.api, 'publicationOptions').mockResolvedValue(value);
    await editor.openPublication('plan');
    editor.publicationReason = 'Consent reviewed';
    request.mockResolvedValueOnce({
      company_id: 'north',
      service_user_id: 'person-1',
      id: 'published-1',
      deleted: true,
    });
    await editor.unpublish();
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('/publications/published-1'),
      { reason: 'Consent reviewed' },
      'DELETE',
      expect.objectContaining({ 'If-Match': '"v3"', 'Idempotency-Key': expect.any(String) }),
      'json',
    );
    expect(editor.publicationOpen()).toBe(false);
  });
  it('keeps actions locked until the saved access has been reloaded', async () => {
    await editor.open(rows[0]);
    let resolve: any;
    vi.spyOn(editor.api, 'load').mockImplementation(() => new Promise<void>((r) => (resolve = r)));
    const pending = editor.save();
    for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(editor.editing()).toBe(false);
    expect(editor.busy()).toBe(true);
    resolve();
    await pending;
    expect(editor.busy()).toBe(false);
  });
  it('keeps the publication editor usable when a selected invoice is no longer available', async () => {
    permissions.add('publish');
    permissions.add('approve');
    vi.spyOn(editor.api, 'publicationOptions').mockResolvedValue(options());
    await editor.openPublication('invoice');
    editor.publicationConfirmed = true;
    editor.publicationReason = 'Reviewed';
    request.mockRejectedValueOnce(
      Object.assign(Error('The invoice is unavailable'), { status: 404 }),
    );
    await editor.publish();
    await settle(fixture);
    expect(editor.publicationOpen()).toBe(true);
    expect(editor.api.denied()).toBe(false);
    expect(editor.error()).toContain('invoice is unavailable');
  });
});
