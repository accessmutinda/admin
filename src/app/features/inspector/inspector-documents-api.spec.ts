import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { CompanyAccessService } from '../../core/access/company-access.service';
import { ManagementStore } from '../management/shared/management.store';
import { InspectorDocumentsApi } from './inspector-documents-api.service';
import { InspectorDocumentsService } from './inspector-documents.service';
import { InspectorService } from './inspector.service';
import { InspectorPage } from './inspector-page';
import { InspectorDocumentPage } from './inspector-provider.generated';

function response(): InspectorDocumentPage {
  return {
    count: 1,
    next: null,
    previous: null,
    results: [
      {
        id: 'inspection:one',
        source_version: 2,
        version: '1',
        name: 'Source evidence',
        filename: 'original.txt',
        category: 'Policies',
        questions: ['Safe'],
        owner: 'Source reviewer',
        updated: '2026-11-14T12:00:00Z',
        expiry: null,
        status: 'Pending review',
        source: 'Inspection upload',
        state: 'clean',
        content_type: 'text/plain',
        size: 20,
        downloadable: true,
      },
    ],
    company: {
      id: 'one',
      name: 'Source Provider',
      code: 'SOURCE',
      active: true,
      sector: null,
      registered_places: 0,
      updated_at: '2026-11-14T12:00:00Z',
      head_office_address: null,
      postcode: null,
      logo_available: false,
    },
    inspection: {
      id: null,
      version: 0,
      etag: '"v0"',
      type: null,
      start: null,
      end: null,
      updated: null,
      by: null,
    },
    capabilities: { upload: true, download: true, view_provider: true },
    meta: {
      company_id: 'one',
      as_of: '2026-11-14T12:00:00Z',
      timezone: 'Europe/London',
      filters: { page: 1, page_size: 100 },
      request_id: 'test',
      revision: 'a'.repeat(64),
      disclosure: 'Current source evidence',
    },
  };
}
describe('Inspector documents and evidence integration', () => {
  const companyId = signal('one'),
    actor = signal({ id: 'reviewer' }),
    context = signal({ revision: 1, permissions: ['inspector_portal.quality.read'] });
  let api: InspectorDocumentsApi,
    request: ReturnType<typeof vi.fn>,
    click: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    companyId.set('one');
    actor.set({ id: 'reviewer' });
    context.set({ revision: 1, permissions: ['inspector_portal.quality.read'] });
    request = vi.fn().mockResolvedValue(response());
    click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:evidence');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    TestBed.configureTestingModule({
      imports: [InspectorPage],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { api: request, profile: actor, isAuthenticated: () => true },
        },
        { provide: CompanyAccessService, useValue: { companyId, context } },
        { provide: InspectorService, useClass: InspectorDocumentsService },
        {
          provide: ManagementStore,
          useFactory: () => {
            throw Error('Documents must not use the browser workspace');
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ page: 'documents' }),
            queryParamMap: of(convertToParamMap({})),
            snapshot: { data: { page: 'documents' }, queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    });
    api = TestBed.inject(InspectorDocumentsApi);
  });
  afterEach(() => {
    api.stop();
    vi.restoreAllMocks();
  });
  async function page() {
    const f = TestBed.createComponent(InspectorPage);
    f.detectChanges();
    await api.load();
    f.detectChanges();
    return f;
  }
  async function load() {
    api.start();
    await api.load();
    TestBed.tick();
  }
  it('renders source metadata with the existing filters and original-file actions', async () => {
    const f = await page(),
      p = f.componentInstance;
    expect(f.nativeElement.textContent).toContain('Source evidence');
    expect(p.documents()).toHaveLength(1);
    expect(p.categoryCount('Policies')).toBe(1);
    p.search.set(' reviewer ');
    expect(p.documents()).toHaveLength(1);
    p.category.set('Audits');
    expect(p.documents()).toHaveLength(0);
    p.clearFilters();
    p.setQuestion('Safe', true);
    expect(p.documents()).toHaveLength(1);
    p.owner.set('Someone else');
    expect(p.documents()).toHaveLength(0);
  });
  it('downloads the original file using its current source version', async () => {
    await load();
    request.mockResolvedValueOnce(new Blob(['original bytes']));
    await api.download('inspection:one');
    expect(request.mock.lastCall![0]).toContain(
      '/documents/inspection%3Aone/content?source_version=2',
    );
    expect((click.mock.instances[0] as HTMLAnchorElement).download).toBe('original.txt');
  });
  it('builds a backend ZIP with current references instead of browser file blobs', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.toggleDocument('inspection:one', true);
    f.detectChanges();
    request.mockResolvedValueOnce(new Blob(['zip']));
    p.pack();
    await Promise.resolve();
    expect(request.mock.lastCall![0]).toContain('/documents/pack');
    expect(request.mock.lastCall![1]).toEqual({
      documents: [{ id: 'inspection:one', source_version: 2 }],
    });
    expect(request.mock.lastCall![2]).toBe('POST');
    expect(click).toHaveBeenCalledOnce();
  });
  it('removes changed versions from the pack instead of silently exporting replacements', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.toggleDocument('inspection:one', true);
    f.detectChanges();
    const value = response();
    value.results[0].source_version = 3;
    value.meta.revision = 'b'.repeat(64);
    request.mockResolvedValueOnce(value);
    await api.load();
    f.detectChanges();
    expect(p.selected()).toEqual([]);
    expect(p.message()).toContain('reselect');
  });
  it('refuses a refreshed file version before selection effects have run', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.toggleDocument('inspection:one', true);
    const value = response();
    value.results[0].source_version = 3;
    value.meta.revision = 'b'.repeat(64);
    request.mockResolvedValueOnce(value);
    await api.load();
    request.mockClear();
    // Download immediately, before the next render can remove stale selections.
    p.pack();
    await Promise.resolve();
    await Promise.resolve();
    expect(request).not.toHaveBeenCalled();
    expect(click).not.toHaveBeenCalled();
    expect(p.error()).toContain('reselect');
  });
  it('shows failed security scans distinctly and filters them without enabling file actions', async () => {
    const value = response();
    value.results[0].state = 'rejected';
    value.results[0].status = 'Security check failed';
    value.results[0].downloadable = false;
    request.mockResolvedValue(value);
    const f = await page(),
      p = f.componentInstance;
    p.statusFilter.set('Security check failed');
    f.detectChanges();
    expect(p.documents()).toHaveLength(1);
    const button = f.nativeElement.querySelector('[aria-label="Download Source evidence"]');
    expect(button.disabled).toBe(true);
    expect(button.title).toContain('Security check failed');
    p.statusFilter.set('Pending review');
    expect(p.documents()).toHaveLength(0);
  });
  it('ignores late upload acknowledgements after leaving the module', async () => {
    await load();
    let resolve!: (v: unknown) => void;
    request.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const pending = api.upload(
      new File(['x'], 'x.txt', { type: 'text/plain' }),
      { name: 'x', category: 'Policies', question: 'Safe', expiry: null },
      'late-upload',
    );
    api.stop();
    request.mockClear();
    resolve({ id: 'inspection:late', version: 1, state: 'quarantined' });
    expect(await pending).toBe(false);
    expect(request).not.toHaveBeenCalled();
    expect(api.records()).toEqual([]);
    expect(api.saving()).toBe(false);
  });
  it('keeps quarantined and metadata-only records visible without pack or download actions', async () => {
    const value = response();
    value.results[0].state = 'quarantined';
    value.results[0].downloadable = false;
    request.mockResolvedValue(value);
    const f = await page(),
      p = f.componentInstance;
    p.toggleVisible(true);
    expect(p.selected()).toEqual([]);
    expect(f.nativeElement.querySelector('[aria-label="Download Source evidence"]').disabled).toBe(
      true,
    );
    await expect(api.download('inspection:one')).rejects.toThrow('clean file');
    expect(click).not.toHaveBeenCalled();
  });
  it('uploads multipart source metadata and reloads server records', async () => {
    await load();
    const file = new File(['original'], 'original.txt', { type: 'text/plain' });
    request
      .mockResolvedValueOnce({ id: 'inspection:two', version: 1, state: 'quarantined' })
      .mockResolvedValueOnce(response());
    expect(
      await api.upload(
        file,
        { name: 'Evidence', category: 'Policies', question: 'Safe', expiry: null },
        'same-retry-key',
      ),
    ).toBe(true);
    const upload = request.mock.calls.find((call) => call[2] === 'POST')!;
    expect(upload[1]).toBeInstanceOf(FormData);
    expect((upload[1] as FormData).get('file')).toBe(file);
    expect(JSON.parse(String((upload[1] as FormData).get('metadata'))).name).toBe('Evidence');
    expect(upload[3]).toEqual({ 'Idempotency-Key': 'same-retry-key' });
    expect(request.mock.lastCall![0]).toContain('page=1');
  });
  it('reuses the upload operation key on retry and preserves the selected file', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.openUpload();
    p.uploadFile.set(new File(['bytes'], 'file.txt', { type: 'text/plain' }));
    p.uploadName.set('Evidence');
    request.mockRejectedValueOnce(Error('Network unavailable'));
    await p.upload();
    f.detectChanges();
    expect(p.modalOpen()).toBe(true);
    expect(p.uploadFile()).not.toBeNull();
    const key = request.mock.lastCall![3]['Idempotency-Key'];
    request.mockRejectedValueOnce(Error('Network unavailable'));
    await p.upload();
    expect(request.mock.lastCall![3]['Idempotency-Key']).toBe(key);
  });
  it('enforces independent upload/download capabilities', async () => {
    const value = response();
    value.capabilities = { upload: false, download: false, view_provider: false };
    value.results[0].downloadable = false;
    request.mockResolvedValue(value);
    const f = await page();
    expect(f.nativeElement.querySelector('button.primary').disabled).toBe(true);
    await expect(
      api.upload(
        new File(['x'], 'x.txt'),
        { name: 'x', category: 'Policies', question: 'Safe', expiry: null },
        'key',
      ),
    ).rejects.toThrow('not permitted');
    await expect(api.pack(['inspection:one'])).rejects.toThrow('not permitted');
    expect(click).not.toHaveBeenCalled();
  });
  it('clears records, selections and an upload editor on revoked access and supports retry', async () => {
    const f = await page(),
      p = f.componentInstance;
    p.toggleDocument('inspection:one', true);
    p.openUpload();
    p.uploadFile.set(new File(['x'], 'x.txt'));
    request.mockRejectedValueOnce(Object.assign(Error('Inspection revoked'), { status: 403 }));
    await api.load();
    f.detectChanges();
    expect(p.modalOpen()).toBe(false);
    expect(p.uploadFile()).toBeNull();
    expect(p.selected()).toEqual([]);
    expect(api.documents()).toEqual([]);
    expect(f.nativeElement.textContent).toContain('Documents and evidence unavailable');
    request.mockResolvedValueOnce(response());
    await api.load();
    f.detectChanges();
    expect(api.ready()).toBe(true);
  });
  it('rejects a mixed revision across pages and recovers on retry', async () => {
    const a = response(),
      b = response();
    a.count = 2;
    b.count = 2;
    b.results[0].id = 'care:two';
    b.meta.revision = 'b'.repeat(64);
    request.mockResolvedValueOnce(a).mockResolvedValueOnce(b);
    await load();
    expect(api.ready()).toBe(false);
    expect(api.error()).toContain('changed while loading');
    request.mockResolvedValueOnce(response());
    await api.load();
    expect(api.ready()).toBe(true);
  });
  it('rejects foreign responses and duplicate pages', async () => {
    const value = response();
    value.meta.company_id = 'other';
    request.mockResolvedValueOnce(value);
    await load();
    expect(api.ready()).toBe(false);
    const a = response();
    a.count = 2;
    request.mockResolvedValueOnce(a).mockResolvedValueOnce(a);
    await api.load();
    expect(api.ready()).toBe(false);
  });
  it('loads all current authorised pages', async () => {
    const a = response(),
      b = response();
    a.count = 2;
    b.count = 2;
    b.results[0].id = 'care:two';
    request.mockResolvedValueOnce(a).mockResolvedValueOnce(b);
    await load();
    expect(api.records()).toHaveLength(2);
  });
  it('ignores late downloads after leaving the module', async () => {
    await load();
    let resolve!: (b: Blob) => void;
    request.mockReturnValueOnce(new Promise<Blob>((r) => (resolve = r)));
    const pending = api.download('inspection:one');
    api.stop();
    resolve(new Blob(['x']));
    await pending;
    expect(click).not.toHaveBeenCalled();
    expect(api.records()).toEqual([]);
  });
  it('clears immediately on actor and company changes', async () => {
    await load();
    actor.set({ id: 'other' });
    expect(api.value()).toBeNull();
    companyId.set('other');
    expect(api.documents()).toEqual([]);
  });
  it('renders a legitimate empty register', async () => {
    const value = response();
    value.count = 0;
    value.results = [];
    request.mockResolvedValue(value);
    const f = await page();
    expect(api.ready()).toBe(true);
    expect(f.nativeElement.textContent).toContain('No documents match these filters');
  });
  it.each(['download', 'pack'] as const)(
    'blocks a delayed %s after the selected file version changes',
    async (action) => {
      await load();
      let resolve!: (value: Blob) => void;
      request.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
      const pending =
        action === 'download' ? api.download('inspection:one') : api.pack(['inspection:one']);
      const newer = response();
      newer.results[0].source_version = 3;
      request.mockResolvedValue(newer);
      await api.load();
      resolve(new Blob(['old source bytes']));
      await expect(pending).rejects.toThrow('Selected evidence changed');
      expect(click).not.toHaveBeenCalled();
    },
  );
  it('keeps a reopened upload busy when the previous upload completes late', async () => {
    await load();
    let oldDone!: (value: unknown) => void, newDone!: (value: unknown) => void;
    const file = new File(['x'], 'x.txt', { type: 'text/plain' }),
      metadata = { name: 'x', category: 'Policies' as const, question: 'Safe' as const, expiry: null };
    request.mockImplementationOnce(() => new Promise((r) => (oldDone = r)));
    const old = api.upload(file, metadata, 'old');
    api.stop();
    api.start();
    await api.load();
    request.mockImplementationOnce(() => new Promise((r) => (newDone = r)));
    const current = api.upload(file, metadata, 'new');
    oldDone({ id: 'inspection:old', version: 1, state: 'quarantined' });
    await old;
    expect(api.saving()).toBe(true);
    newDone({ id: 'inspection:new', version: 1, state: 'quarantined' });
    await current;
    expect(api.saving()).toBe(false);
  });
});
