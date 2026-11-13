import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { CareDocumentsApi } from './care-documents-api.service';
import { CarePlanApi } from './care-plan-api.service';
import { CarePlanService } from './care-plan.service';
import { CareService } from './care.service';
import { CARE_PLAN_PROVIDERS } from './care-plan.providers';

describe('Connected care plans', () => {
  let api: CarePlanApi,
    request: ReturnType<typeof vi.fn>,
    scope: ReturnType<typeof signal<string>>,
    company: ReturnType<typeof signal<string>>,
    permissions: Set<string>;
  const workspace = (revision = 1): any => ({
    company_id: 'north',
    id: 'patient',
    etag: `"v${revision}"`,
    source_token: 'source-1',
    record: { revision, versions: [], packageHandoffs: [] },
    source: {
      overview: { record: { id: 'patient', company_id: 'north', version: revision } },
      contacts: [],
    },
    calls: [],
    unavailable: [],
    as_of: '2026-11-13T00:00:00Z',
  });
  const page = (results: any[], changes: any = {}): any => ({
    company_id: 'north',
    count: results.length,
    next: null,
    previous: null,
    results,
    meta: {
      revision: 'register-1',
      metrics: { users: results.length, approved: 0, awaiting: 0, overdue: 0 },
    },
    ...changes,
  });
  beforeEach(() => {
    scope = signal('north:actor:1');
    company = signal('north');
    permissions = new Set(['read', 'create', 'edit', 'approve', 'export']);
    request = vi.fn(async () => workspace());
    TestBed.configureTestingModule({
      providers: [
        ...CARE_PLAN_PROVIDERS,
        { provide: AuthService, useValue: { api: request } },
        {
          provide: ServiceUsersApi,
          useValue: {
            scope,
            companyId: company,
            allowed: () => permissions.has('read'),
            access: {
              can: (_m: string, s: string, a: string) => s !== 'documents' && permissions.has(a),
            },
            projectOverview: (o: any) => ({ id: o.record.id, name: 'Recorded patient', file: {} }),
          },
        },
      ],
    });
    api = TestBed.inject(CarePlanApi);
    TestBed.tick();
  });
  it('provides the complete connected service graph used by both main-menu routes', () => {
    expect(TestBed.inject(CarePlanService)).toBe(api);
    expect(TestBed.inject(CareService)).toBe(api.care);
    expect(TestBed.inject(CareDocumentsApi)).toBeTruthy();
  });
  it('reuses the recorded service user and server revision without browser storage', async () => {
    await api.load('patient');
    expect(api.care.client('patient')?.name).toBe('Recorded patient');
    expect(api.read('patient')?.revision).toBe(1);
    expect(api.care.client('other')).toBeUndefined();
    expect(api.read('other')).toBeUndefined();
  });
  it('loads all stable register pages and the server totals', async () => {
    request.mockResolvedValueOnce(
      page([{ client: { id: 'a' } }], { count: 2, next: '/companies/north/care-plans?page=2' }),
    );
    request.mockResolvedValueOnce(page([{ client: { id: 'b' } }], { count: 2 }));
    await api.load('');
    expect(api.registerRows().map((r) => r.client.id)).toEqual(['a', 'b']);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it('discards an incomplete, changed or foreign register', async () => {
    for (const next of [
      page([{ client: { id: 'b' } }], { count: 2, company_id: 'south' }),
      page([{ client: { id: 'b' } }], { count: 2, meta: { revision: 'changed' } }),
    ]) {
      request.mockResolvedValueOnce(
        page([{ client: { id: 'a' } }], { count: 2, next: '/companies/north/care-plans?page=2' }),
      );
      request.mockResolvedValueOnce(next);
      await api.load('');
      expect(api.registerRows()).toEqual([]);
      expect(api.error()).toBeTruthy();
    }
  });
  it('clears records and ignores a response arriving after a company change', async () => {
    let resolve!: (v: any) => void;
    request.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const pending = api.load('patient');
    company.set('south');
    scope.set('south:actor:1');
    TestBed.tick();
    resolve(workspace());
    await pending;
    expect(api.read('patient')).toBeUndefined();
    expect(api.care.clients()).toEqual([]);
  });
  it('clears visible records when permission is revoked by the server', async () => {
    await api.load('patient');
    request.mockRejectedValueOnce(Object.assign(new Error('Read revoked'), { status: 403 }));
    await api.load('patient');
    expect(api.canRead()).toBe(false);
    expect(api.read('patient')).toBeUndefined();
    expect(api.care.clients()).toEqual([]);
  });
  it('rejects inconsistent patient identity and version responses', async () => {
    const bad = workspace();
    bad.source.overview.record.version = 9;
    request.mockResolvedValue(bad);
    await api.load('patient');
    expect(api.read('patient')).toBeUndefined();
    expect(api.error()).toBeTruthy();
  });
  it('retains the idempotency key on a failed create and sends the reviewed ETag', async () => {
    await api.load('patient');
    request.mockRejectedValueOnce(new Error('Response interrupted'));
    expect(await api.initialise('patient', 'north')).toContain('interrupted');
    request.mockResolvedValueOnce(workspace(2));
    expect(await api.initialise('patient', 'north')).toBeNull();
    const a = request.mock.calls[1] as any[],
      b = request.mock.calls[2] as any[];
    expect(a[3]['Idempotency-Key']).toBe(b[3]['Idempotency-Key']);
    expect(a[3]['If-Match']).toBe('"v1"');
    expect(api.read('patient')?.revision).toBe(2);
  });
  it('prevents creation and export without their separate permissions', async () => {
    await api.load('patient');
    permissions.delete('create');
    permissions.delete('export');
    request.mockClear();
    expect(await api.initialise('patient', 'north')).toContain('permission');
    await expect(api.download('patient', 'version')).rejects.toThrow('export permission');
    expect(request).not.toHaveBeenCalled();
  });
  it('sends entered draft inputs without client-supplied status, authors or history', async () => {
    await api.load('patient');
    const draft: any = {
      id: 'version',
      status: 'Approved',
      author: 'Forged',
      details: {
        name: 'Recorded patient',
        aboutIntroductionText: 'Entered introduction',
        aboutIntroductionHtml: '<p>Entered introduction</p>',
        aboutPhoto: 'blob:preview',
      },
      review: '',
      confirmed: false,
      participation: {},
      capacity: {},
      packageDecision: 'Not reviewed',
      packageProposal: '',
      qualityReview: '',
      sections: [],
      assessments: [],
      body: [],
      events: [{ by: 'Forged' }],
    };
    request.mockResolvedValueOnce(workspace(2));
    expect(await api.commit('patient', 'north', draft, 1, 'save')).toBeNull();
    const call = request.mock.calls.at(-1) as any[];
    expect(call[0]).toContain('/versions/version');
    expect(call[2]).toBe('PATCH');
    expect(call[1].status).toBeUndefined();
    expect(call[1].author).toBeUndefined();
    expect(call[1].events).toBeUndefined();
    expect(call[1].details.aboutIntroductionText).toBe('Entered introduction');
    expect(call[1].details.aboutPhoto).toBeUndefined();
    expect(call[1].review).toBeNull();
    expect(call[1].source_token).toBe('source-1');
  });
  it('loads observation and About Me photographs from the shared document owner', async () => {
    const records = TestBed.inject(ServiceUsersApi),
      documents = TestBed.inject(CareDocumentsApi);
    vi.spyOn(records.access, 'can').mockReturnValue(true);
    vi.spyOn(documents, 'load').mockResolvedValue();
    vi.spyOn(documents, 'content').mockResolvedValue(new Blob(['image'], { type: 'image/png' }));
    documents.documents.set([{ id: 'photo', name: 'Recorded photograph' } as any]);
    const value = workspace();
    value.record.versions = [
      { id: 'version', details: { aboutPhotoId: 'photo' }, body: [{ photoId: 'photo' }] },
    ];
    request.mockResolvedValue(value);
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:recorded-photo');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    await api.load('patient');
    expect(api.read('patient')!.versions[0].details['aboutPhoto']).toBe('blob:recorded-photo');
    expect(api.read('patient')!.versions[0].body[0].photo).toBe('blob:recorded-photo');
    expect(documents.content).toHaveBeenCalledWith(
      'patient',
      expect.objectContaining({ id: 'photo' }),
    );
    company.set('south');
    scope.set('south:actor:1');
    TestBed.tick();
    expect(revoke).toHaveBeenCalledWith('blob:recorded-photo');
    create.mockRestore();
    revoke.mockRestore();
  });
  it('refreshes the register when returning from a care-plan workspace', async () => {
    request.mockResolvedValue(page([{ client: { id: 'a' }, current: null }]));
    api.connect('');
    TestBed.tick();
    await vi.waitFor(() => expect(api.registerRows()).toHaveLength(1));
    request.mockResolvedValue(page([{ client: { id: 'a' }, current: { status: 'Draft' } }]));
    api.connect('');
    await vi.waitFor(() => expect(api.registerRows()[0].current.status).toBe('Draft'));
    expect(request).toHaveBeenCalledTimes(2);
  });
  it('does not replace another open person with a late save response', async () => {
    await api.load('patient');
    let resolve!: (value: any) => void;
    request.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const pending = api.initialise('patient', 'north');
    const other = workspace();
    other.id = 'other';
    other.source.overview.record.id = 'other';
    request.mockResolvedValueOnce(other);
    await api.load('other');
    resolve(workspace(2));
    expect(await pending).toContain('view changed');
    expect(api.read('patient')).toBeUndefined();
    expect(api.read('other')).toBeTruthy();
  });
  it('clears care-plan data when export access is rejected by the server', async () => {
    await api.load('patient');
    request.mockRejectedValueOnce(Object.assign(new Error('Access revoked'), { status: 403 }));
    await expect(api.download('patient', 'version')).rejects.toThrow('Access revoked');
    expect(api.read('patient')).toBeUndefined();
    expect(api.care.clients()).toEqual([]);
  });
  it('requires an entered completion note before advancing a queued handoff', async () => {
    const value = workspace();
    value.record.packageHandoffs = [{ id: 'handoff', status: 'Awaiting rota update' }];
    request.mockResolvedValueOnce(value);
    await api.load('patient');
    request.mockClear();
    expect(await api.advancePackageHandoff('patient', 'north', 'handoff', 1, '')).toContain(
      'completion note',
    );
    expect(request).not.toHaveBeenCalled();
  });
  it('rejects an upload for a different open person before creating any document', async () => {
    await api.load('patient');
    const save = vi.spyOn(TestBed.inject(CareDocumentsApi), 'save');
    await expect(
      api.uploadPhoto('other', new File(['image'], 'photo.png', { type: 'image/png' })),
    ).rejects.toThrow('workspace changed');
    expect(save).not.toHaveBeenCalled();
  });
  it('waits for the document owner to confirm a clean scan before attaching a photograph', async () => {
    await api.load('patient');
    const documents = TestBed.inject(CareDocumentsApi);
    vi.spyOn(TestBed.inject(ServiceUsersApi).access, 'can').mockReturnValue(true);
    vi.spyOn(documents, 'save').mockResolvedValue({ id: 'photo', state: 'quarantined' } as any);
    vi.spyOn(documents, 'detail').mockResolvedValue({ id: 'photo', state: 'clean' } as any);
    vi.spyOn(documents, 'content').mockResolvedValue(new Blob(['image']));
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:clean-photo');
    vi.useFakeTimers();
    try {
      const pending = api.uploadPhoto(
        'patient',
        new File(['image'], 'photo.png', { type: 'image/png' }),
      );
      expect(api.uploading()).toBe(true);
      expect(documents.content).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1000);
      expect(await pending).toEqual({ photo: 'blob:clean-photo', photoId: 'photo' });
      expect(documents.detail).toHaveBeenCalledWith('patient', 'photo');
      expect(api.uploading()).toBe(false);
    } finally {
      vi.useRealTimers();
      create.mockRestore();
    }
  });
  it('shows an unavailable state when planning or record read access is missing', () => {
    permissions.delete('read');
    api.connect('patient');
    TestBed.tick();
    expect(api.error()).toContain('read permissions are required');
    expect(request).not.toHaveBeenCalled();
  });
  it('rechecks read access when a person explicitly reopens a previously denied workspace', async () => {
    api.connect('patient');
    TestBed.tick();
    await vi.waitFor(() => expect(api.read('patient')).toBeTruthy());
    request.mockRejectedValueOnce(Object.assign(new Error('Export denied'), { status: 403 }));
    await expect(api.download('patient', 'version')).rejects.toThrow('Export denied');
    request.mockResolvedValue(workspace());
    api.connect('patient');
    await vi.waitFor(() => expect(api.read('patient')).toBeTruthy());
  });
});
