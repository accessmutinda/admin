import { signal } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { FamilyPortal } from './family-portal';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { AuthService } from '../../../core/auth/auth.service';
const record = () => ({
  company_id: 'north',
  service_user_id: 'person-1',
  name: 'Alex Citizen',
  profile: { dob: '1950-01-01', postcode: 'AB1', photo: '' },
  access: {
    id: 'family-1',
    company_id: 'north',
    service_user_id: 'person-1',
    name: 'Family member',
    relationship: 'Sibling',
    email: 'family@example.com',
    status: 'Active',
    scopes: ['Notes', 'Messages', 'Documents', 'Visits'],
    at: '2026-11-11T10:00:00Z',
    version: 1,
    etag: '"v1"',
  },
  photoConsent: false,
  notes: 'Approved summary',
  plan: null,
  visits: [],
  medication: null,
  administrations: null,
  allergies: null,
  updates: [
    {
      id: 'update-1',
      date: '2026-11-10',
      at: '2026-11-10T10:00:00Z',
      by: 'Care team',
      category: 'General',
      text: 'Approved wellbeing update',
    },
  ],
  visitNotes: [],
  documents: [
    {
      id: 'doc-1',
      name: 'Approved.pdf',
      category: 'Care plan',
      version: '1',
      size: 100,
      at: '2026-11-11T10:00:00Z',
      data: '',
      mime: 'application/pdf',
    },
  ],
  photos: null,
  invoices: null,
  messages: [
    {
      id: 'message-1',
      accessId: 'family-1',
      text: 'Care team message',
      by: 'Care team',
      fromFamily: false,
      at: '2026-11-11T10:00:00Z',
    },
  ],
  unavailable: {},
});
async function settle(f: ComponentFixture<any>) {
  for (let i = 0; i < 5; i++) {
    f.detectChanges();
    await f.whenStable();
    await Promise.resolve();
  }
  f.detectChanges();
}
describe('Connected family-facing portal', () => {
  let fixture: ComponentFixture<FamilyPortal>,
    portal: any,
    request: ReturnType<typeof vi.fn>,
    params: BehaviorSubject<any>,
    query: BehaviorSubject<any>,
    scope: ReturnType<typeof signal<string>>,
    shared: any;
  beforeEach(async () => {
    shared = record();
    scope = signal('north:family');
    params = new BehaviorSubject(
      convertToParamMap({ clientId: 'person-1', accessId: 'family-1', page: 'overview' }),
    );
    query = new BehaviorSubject(convertToParamMap({}));
    request = vi.fn(async (path: string, body?: any, method?: string) => {
      if (method === 'POST')
        return {
          company_id: 'north',
          service_user_id: 'person-1',
          id: 'reply-1',
          accessId: 'family-1',
          text: body.text,
          fromFamily: true,
          by: 'Family member',
          at: '2026-11-11T11:00:00Z',
          version: 1,
          etag: '"v1"',
        };
      if (path.includes('/content?')) return new Blob(['Shared file'], { type: 'application/pdf' });
      if (/family-portal\?/.test(path))
        return {
          company_id: 'north',
          companyName: 'North provider',
          results: [
            {
              clientId: 'person-1',
              accessId: 'family-1',
              name: 'Alex Citizen',
              contact: 'Family member',
              preview: false,
            },
          ],
        };
      return structuredClone(shared);
    });
    TestBed.configureTestingModule({
      imports: [FamilyPortal],
      providers: [
        provideRouter([]),
        {
          provide: BreakpointObserver,
          useValue: { observe: () => new BehaviorSubject({ matches: false, breakpoints: {} }) },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: params,
            queryParamMap: query,
            snapshot: { paramMap: params.value, queryParamMap: query.value },
          },
        },
        { provide: CompanyAccessService, useValue: { canPath: () => true } },
        {
          provide: AuthService,
          useValue: {
            api: request,
            profile: signal({ id: 'family-user' }),
            currentUser: signal({
              id: 'family-user',
              name: 'Family member',
              initials: 'FM',
              email: 'family@example.com',
            }),
            signOut: vi.fn(),
          },
        },
        {
          provide: ServiceUsersApi,
          useValue: {
            scope,
            companyId: signal('north'),
            allowed: () => false,
            access: { can: () => false },
          },
        },
      ],
    });
    fixture = TestBed.createComponent(FamilyPortal);
    portal = fixture.componentInstance;
    await settle(fixture);
  });
  afterEach(() => vi.restoreAllMocks());
  async function page(value: string) {
    params.next(convertToParamMap({ clientId: 'person-1', accessId: 'family-1', page: value }));
    await settle(fixture);
  }
  it('loads server-owned choices and the permitted shared record', () => {
    expect(fixture.nativeElement.textContent).toContain('Alex Citizen');
    expect(fixture.nativeElement.textContent).toContain('North provider');
    expect(portal.record().notes).toBe('Approved summary');
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('/family-portal/person-1/family-1?preview=0&page=overview'),
      undefined,
      undefined,
      undefined,
      'json',
    );
  });
  it('loads each page through the permission-checked endpoint', async () => {
    await page('notes');
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('page=notes'),
      undefined,
      undefined,
      undefined,
      'json',
    );
    expect(fixture.nativeElement.textContent).toContain('Approved wellbeing update');
  });
  it('sends a family reply inside CareVerity with an idempotency key', async () => {
    await page('messages');
    portal.message = 'Family reply';
    await portal.send();
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('/family-1/messages'),
      { accessId: 'family-1', text: 'Family reply' },
      'POST',
      expect.objectContaining({ 'Idempotency-Key': expect.any(String) }),
      'json',
    );
    expect(portal.message).toBe('');
    expect(portal.notice()).toContain('sent inside CareVerity');
  });
  it('blocks duplicate message sends while the first request is pending', async () => {
    await page('messages');
    portal.message = 'One reply';
    let resolve: any;
    request.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const pending = portal.send();
    await portal.send();
    expect(portal.sending()).toBe(true);
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('#family-message').disabled).toBe(true);
    resolve({ ...record().messages[0], company_id: 'north', service_user_id: 'person-1' });
    await pending;
    expect(request.mock.calls.filter((c) => c[2] === 'POST')).toHaveLength(1);
  });
  it('retains a failed message for retry with the same idempotency key', async () => {
    await page('messages');
    portal.message = 'Retry me';
    request.mockRejectedValueOnce(Error('Connection unavailable'));
    await portal.send();
    expect(portal.message).toBe('Retry me');
    await portal.send();
    const writes = request.mock.calls.filter((c) => c[2] === 'POST');
    expect(writes[0][3]).toEqual(writes[1][3]);
  });
  it('uses the protected file endpoint for downloads', async () => {
    await page('documents');
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:shared');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await portal.downloadDocument('doc-1');
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('/documents/doc-1/content?preview=0'),
      undefined,
      undefined,
      undefined,
      'blob',
    );
  });
  it('clears previously loaded information after access is revoked', async () => {
    request.mockRejectedValueOnce(Object.assign(Error('Access revoked'), { status: 403 }));
    await portal.api.loadShared('person-1', 'family-1', 'overview', false);
    await settle(fixture);
    expect(portal.record()).toBeNull();
    expect(portal.choices()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Access revoked');
  });
  it('does not allow messages in administrator preview', async () => {
    query.next(convertToParamMap({ preview: '1' }));
    await settle(fixture);
    portal.message = 'Cannot send from preview';
    await portal.send();
    expect(request.mock.calls.some((c) => c[2] === 'POST')).toBe(false);
  });
  it('shows unavailable state instead of cached data after a failed load', async () => {
    request.mockRejectedValueOnce(Error('Backend unavailable'));
    await portal.api.loadShared('person-1', 'family-1', 'notes', false);
    await settle(fixture);
    expect(portal.record()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Backend unavailable');
  });
  it('keeps unsent drafts out of browser storage', () => {
    const set = vi.spyOn(Storage.prototype, 'setItem');
    portal.updateDraft('Private unsent message');
    expect(set).not.toHaveBeenCalled();
  });
  it('loads shared photos through the protected inline endpoint and revokes their object URLs', async () => {
    shared.photoConsent = true;
    shared.access.scopes.push('Photos');
    shared.photos = [
      {
        id: 'photo-1',
        name: 'Approved photo',
        mime: 'image/png',
        data: '',
        category: 'Wellbeing',
        at: '2026-11-11T10:00:00Z',
        size: 100,
        version: '1',
      },
    ];
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:photo');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    await page('photos');
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('/photos/photo-1/content?preview=0'),
      undefined,
      undefined,
      undefined,
      'blob',
    );
    expect(portal.record().photos[0].data).toBe('blob:photo');
    fixture.destroy();
    expect(revoke).toHaveBeenCalledWith('blob:photo');
  });
  it('rechecks export permission on the server before exporting visit data', async () => {
    await page('visits');
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:visits');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await portal.exportVisits();
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining('/visits/export?preview=0'),
      undefined,
      undefined,
      undefined,
      'json',
    );
  });
  it('refreshes incoming messages without discarding the current shared view', async () => {
    await page('messages');
    shared.messages.push({ ...shared.messages[0], id: 'incoming-2', text: 'New care team update' });
    await portal.api.refreshMessages('person-1', 'family-1', false);
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('New care team update');
    expect(portal.record().name).toBe('Alex Citizen');
  });
  for (const status of [undefined, 403]) {
    it(`ignores an obsolete message refresh failure after navigation (${status ?? 'network'})`, async () => {
      let reject: any;
      request.mockImplementationOnce(() => new Promise((_resolve, r) => (reject = r)));
      const pending = portal.api.refreshMessages('person-1', 'family-1', false);
      await portal.api.loadShared('person-1', 'family-1', 'notes', false);
      reject(Object.assign(Error('Obsolete conversation request'), { status }));
      await pending;
      expect(portal.record()?.name).toBe('Alex Citizen');
      expect(portal.api.denied()).toBe(false);
      expect(portal.api.error()).toBe('');
    });
  }
  it('does not replace fresh messages with an older background response', async () => {
    const old = structuredClone(shared);
    let resolve: any;
    request.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const pending = portal.api.refreshMessages('person-1', 'family-1', false);
    shared.messages = [{ ...shared.messages[0], text: 'Latest conversation' }];
    await portal.api.loadShared('person-1', 'family-1', 'messages', false);
    resolve(old);
    await pending;
    expect(portal.record().messages[0].text).toBe('Latest conversation');
  });
  it('can open an allowed section after another section is denied', async () => {
    request.mockRejectedValueOnce(
      Object.assign(Error('Documents are restricted'), { status: 403 }),
    );
    await portal.api.loadShared('person-1', 'family-1', 'documents', false);
    expect(portal.record()).toBeNull();
    await portal.api.loadShared('person-1', 'family-1', 'notes', false);
    expect(portal.record()?.notes).toBe('Approved summary');
    expect(portal.api.denied()).toBe(false);
    request.mockRejectedValueOnce(Object.assign(Error('All access was revoked'), { status: 403 }));
    await portal.api.loadShared('person-1', 'family-1', 'notes', false);
    expect(portal.record()).toBeNull();
  });
});
