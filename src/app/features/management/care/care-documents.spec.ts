import { Component, input, signal } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { CareDocuments } from './care-documents';
import { CareDocumentsApi } from './care-documents-api.service';
import { CareHeader } from './care-header';

@Component({ selector: 'cv-care-header', template: '' })
class HeaderStub {
  client = input<any>();
  active = input('');
}
function documentRow(id = 'document-1'): any {
  return {
    id,
    company_id: 'north',
    service_user_id: 'person-1',
    revision: 2,
    etag: '"v2"',
    name: 'Care instructions',
    category: 'Care Plan',
    version: '1.0',
    status: 'Current',
    issueDate: '2026-01-01',
    reviewDate: '2027-01-01',
    description: 'Recorded supporting instructions',
    visibility: { staff: true, family: false, inspector: false },
    mime: 'application/pdf',
    size: 23,
    state: 'clean',
    at: '2026-11-10T09:00:00Z',
    by: 'Recorded uploader',
    updatedAt: '2026-11-10T09:00:00Z',
    updatedBy: 'Recorded uploader',
  };
}
async function settle(fixture: ComponentFixture<CareDocuments>) {
  for (let round = 0; round < 4; round++) {
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();
  }
  fixture.detectChanges();
}
describe('Connected service-user documents', () => {
  let fixture: ComponentFixture<CareDocuments>,
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
      next: null,
      previous: null,
      results: [documentRow()],
      meta: {},
    };
    request = vi.fn(async (path: string, body?: any, method?: string) => {
      if (path.endsWith('/content'))
        return new Blob(['%PDF-1.4\n%%EOF'], { type: 'application/pdf' });
      if (method === 'DELETE') {
        workspace.results = [];
        workspace.count = 0;
        return {
          company_id: 'north',
          service_user_id: 'person-1',
          id: 'document-1',
          deleted: true,
        };
      }
      if (path.endsWith('/visibility')) {
        const row = {
          ...documentRow(),
          revision: 3,
          etag: '"v3"',
          visibility: { ...documentRow().visibility, [body.audience]: body.value },
        };
        workspace.results = [row];
        return row;
      }
      if (method === 'POST') {
        const metadata = JSON.parse(body.get('metadata'));
        const row = { ...documentRow('server-document'), ...metadata };
        workspace.results = [row];
        return row;
      }
      if (path.endsWith('/document-1')) {
        const row = { ...documentRow(), description: 'Latest server description', ...body };
        if (method === 'PATCH') {
          workspace.results = [row];
          row.revision = 3;
          row.etag = '"v3"';
        }
        return row;
      }
      return structuredClone(workspace);
    });
    const selected = signal<any>(null);
    TestBed.configureTestingModule({
      imports: [CareDocuments],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: params.value, queryParamMap: convertToParamMap({}) },
            paramMap: params,
            queryParamMap: of(convertToParamMap({})),
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
            loading: signal(false),
            detailPending() {
              return this.detailLoading();
            },
            detailLoading: signal(false),
            error: signal(''),
            detail: vi.fn(async (id: string) =>
              selected.set({ id, name: 'Recorded service user' }),
            ),
          },
        },
      ],
    });
    TestBed.overrideComponent(CareDocuments, {
      remove: { imports: [CareHeader] },
      add: { imports: [HeaderStub] },
    });
    fixture = TestBed.createComponent(CareDocuments);
    editor = fixture.componentInstance;
    await settle(fixture);
  });
  afterEach(() => vi.restoreAllMocks());
  it('renders real records, filters, summary counts and pagination without demo records', async () => {
    expect(fixture.nativeElement.textContent).toContain('Care instructions');
    expect(editor.categoryCount('Care Plan')).toBe(1);
    expect(editor.counts().family).toBe(0);
    editor.chooseAudience('family');
    expect(editor.rows()).toEqual([]);
    editor.chooseAudience('');
    editor.chooseGroup('Other');
    expect(editor.rows()).toEqual([]);
    editor.chooseGroup('All Documents');
    expect(editor.rows()).toHaveLength(1);
    const count = request.mock.calls.length;
    await settle(fixture);
    expect(request.mock.calls.length).toBe(count);
  });
  it('opens a fresh prefilled branded editor and sends a versioned update', async () => {
    await editor.open(editor.documents()[0]);
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('[role="dialog"].service-user-popup')).toBeTruthy();
    expect(editor.metadata.description).toBe('Latest server description');
    editor.metadata.description = 'Corrected supporting instructions';
    await editor.save();
    await settle(fixture);
    const call = request.mock.calls.find((c) => c[2] === 'PATCH') as any[];
    expect(call[1].description).toBe('Corrected supporting instructions');
    expect(call[3]['If-Match']).toBe('"v2"');
    expect(editor.editing()).toBe(false);
  });
  it('uploads bytes as multipart and uses server identifiers', async () => {
    await editor.open();
    editor.pendingFile = new File(['%PDF-1.4\n%%EOF'], 'care.pdf', { type: 'application/pdf' });
    editor.pending = { id: 'temporary', name: 'care.pdf' };
    editor.metadata.name = 'Care document';
    await editor.save();
    await settle(fixture);
    const call = request.mock.calls.find((c) => c[2] === 'POST') as any[];
    expect(call[1]).toBeInstanceOf(FormData);
    expect(call[1].get('file').name).toBe('care.pdf');
    expect(JSON.parse(call[1].get('metadata')).name).toBe('Care document');
    expect(call[3]['Idempotency-Key']).toBeTruthy();
    expect(editor.selectedId()).toBe('server-document');
  });
  it('retains form values when saving fails and marks the returned field', async () => {
    await editor.open(editor.documents()[0]);
    editor.metadata.name = 'Keep this draft';
    request.mockImplementationOnce(async () => {
      throw Object.assign(Error('Check review date'), {
        fieldErrors: { reviewDate: ['Review date cannot precede issue date.'] },
      });
    });
    await editor.save();
    await settle(fixture);
    expect(editor.editing()).toBe(true);
    expect(editor.metadata.name).toBe('Keep this draft');
    expect(
      fixture.nativeElement.querySelector('[name="reviewDate"]').getAttribute('aria-invalid'),
    ).toBe('true');
  });
  it('saves visibility through the server and refreshes summary counts', async () => {
    await editor.toggle(editor.documents()[0], 'family');
    await settle(fixture);
    expect(editor.counts().family).toBe(1);
    const call = request.mock.calls.find((c) => c[0].endsWith('/visibility')) as any[];
    expect(call[1]).toMatchObject({ audience: 'family', value: true });
    expect(call[3]['If-Match']).toBe('"v2"');
  });
  it('deletes active documents only after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await editor.remove(editor.documents()[0]);
    expect(request.mock.calls.some((c) => c[2] === 'DELETE')).toBe(false);
    vi.mocked(window.confirm).mockReturnValue(true);
    await editor.remove(editor.documents()[0]);
    await settle(fixture);
    expect(editor.documents()).toEqual([]);
    expect(request.mock.calls.some((c) => c[2] === 'DELETE')).toBe(true);
  });
  it('previews private server bytes and revokes preview URLs', async () => {
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:private-preview');
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    await editor.view(editor.documents()[0]);
    expect(editor.preview()?.url).toBe('blob:private-preview');
    expect(request.mock.calls.some((c) => c[0].endsWith('/content'))).toBe(true);
    editor.closePreview();
    expect(revoke).toHaveBeenCalledWith('blob:private-preview');
    expect(create).toHaveBeenCalledTimes(1);
  });
  it('downloads a server file using its name', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:download');
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await editor.view(editor.documents()[0], true);
    expect(click).toHaveBeenCalledTimes(1);
    expect(editor.preview()).toBeNull();
  });
  it('closes drafts and clears records on workspace change', async () => {
    await editor.open(editor.documents()[0]);
    permissions.clear();
    scope.set('south:actor');
    await settle(fixture);
    expect(editor.editing()).toBe(false);
    expect(editor.documents()).toEqual([]);
    expect(fixture.nativeElement.textContent).not.toContain('Care instructions');
  });
  it('clears cached records on an authorization denial', async () => {
    request.mockImplementationOnce(async () => {
      throw Object.assign(Error('Access revoked'), { status: 403 });
    });
    await editor.open(editor.documents()[0]);
    await settle(fixture);
    expect(editor.documents()).toEqual([]);
    expect(fixture.nativeElement.textContent).not.toContain('Care instructions');
  });
  it('disables file viewing while a mutation is being saved', async () => {
    editor.busy.set(true);
    await settle(fixture);
    const button = [...fixture.nativeElement.querySelectorAll('button')].find(
      (b: any) =>
        b.textContent.includes('View Document') && !b.textContent.includes('View Documents'),
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
  it('clears an open document draft after write access is denied', async () => {
    await editor.open(editor.documents()[0]);
    request.mockImplementationOnce(async () => {
      throw Object.assign(Error('Access revoked'), { status: 403 });
    });
    await editor.save();
    await settle(fixture);
    expect(editor.editing()).toBe(false);
    expect(editor.metadata.name).toBe('');
    expect(editor.documents()).toEqual([]);
  });
  it('cannot leave or dismiss the editor while saving', async () => {
    await editor.open(editor.documents()[0]);
    editor.busy.set(true);
    editor.close();
    expect(editor.editing()).toBe(true);
    expect(editor.canLeave()).toBe(false);
  });
  it('hides write controls and disables disclosure without their exact grants', async () => {
    permissions.delete('create');
    permissions.delete('edit');
    permissions.delete('publish');
    permissions.delete('archive');
    scope.set('north:actor:restricted');
    await settle(fixture);
    expect(fixture.nativeElement.textContent).not.toContain('Upload Document');
    expect(
      [...fixture.nativeElement.querySelectorAll('[role="switch"]')].every((e: any) => e.disabled),
    ).toBe(true);
  });
  it('does not send a prepared upload after the workspace changes', async () => {
    let release!: (value: ArrayBuffer) => void;
    const file = new File(['test bytes'], 'care.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: () => new Promise<ArrayBuffer>((resolve) => (release = resolve)),
    });
    const metadata = {
      name: 'Care document',
      category: 'Other',
      version: '1.0',
      status: 'Current' as const,
      issueDate: '',
      reviewDate: '',
      description: '',
    };
    const saving = editor.api.save(
      'person-1',
      metadata,
      { staff: true, family: false, inspector: false },
      null,
      file,
    );
    const result = expect(saving).rejects.toThrow('workspace');
    scope.set('south:actor');
    release(new ArrayBuffer(10));
    await result;
    expect(request.mock.calls.some((c) => c[2] === 'POST')).toBe(false);
  });
  it('shows unavailable summary values when the backend cannot be reached', async () => {
    request.mockImplementationOnce(async () => {
      throw Error('Connection unavailable');
    });
    await editor.api.load('person-1');
    await settle(fixture);
    expect(editor.categoryCount('All Documents')).toBe('—');
    expect(fixture.nativeElement.textContent).toContain('Connection unavailable');
    expect(editor.visibilityChartLabel()).toContain('unavailable');
  });
  it('rejects mismatched company responses', async () => {
    request.mockImplementationOnce(async () => ({ ...workspace, company_id: 'other' }));
    await editor.api.load('person-1');
    expect(editor.documents()).toEqual([]);
    expect(editor.api.error()).toContain('workspace');
  });
  it('does not let a slower editor replace a newer document', async () => {
    let resolve!: (row: any) => void;
    request.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const first = editor.open(documentRow());
    await editor.open();
    resolve(documentRow());
    await first;
    expect(editor.existingId).toBe('');
    expect(editor.metadata.name).toBe('');
  });
});
