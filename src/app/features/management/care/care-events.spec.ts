import { Component, input, output, signal } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { CareEvents } from './care-events';
import { CareHeader } from './care-header';
@Component({ selector: 'cv-care-header', template: '' })
class HeaderStub {
  client = input<any>();
  active = input('');
  printManaged = input(false);
  printBusy = input(false);
  printRequested = output<void>();
}
function record(id = 'record-1', kind = 'incidents'): any {
  return {
    id,
    company_id: 'north',
    service_user_id: 'person-1',
    kind,
    version: 1,
    etag: '"v1"',
    name: 'Skin observation',
    detail: 'Recorded observation and follow-up',
    date: '2026-11-10',
    level: 'Medium',
    status: 'Active',
    changeReason: 'Record incident',
    createdAt: '2026-11-10T09:00:00Z',
    createdBy: 'Recorded coordinator',
    updatedAt: '2026-11-10T09:00:00Z',
    updatedBy: 'Recorded coordinator',
  };
}
async function settle(fixture: ComponentFixture<CareEvents>) {
  for (let round = 0; round < 4; round++) {
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();
  }
  fixture.detectChanges();
}
describe('Connected incidents and complaints', () => {
  let fixture: ComponentFixture<CareEvents>,
    editor: any,
    request: ReturnType<typeof vi.fn>,
    scope: ReturnType<typeof signal<string>>,
    permissions: Set<string>,
    records: any[],
    query: BehaviorSubject<any>;
  beforeEach(async () => {
    scope = signal('north:actor');
    permissions = new Set(['read', 'create', 'edit', 'archive', 'export']);
    records = [record()];
    query = new BehaviorSubject(convertToParamMap({}));
    const selected = signal<any>(null);
    request = vi.fn(async (path: string, body?: any, method?: string) => {
      if (path.endsWith('/history'))
        return { company_id: 'north', service_user_id: 'person-1', revisions: [record()] };
      if (method === 'POST') {
        const row = { ...record('server-record', body.kind), ...body };
        records.push(row);
        return row;
      }
      if (method === 'PATCH') {
        const row = { ...record(), ...body, version: 2, etag: '"v2"' };
        records = records.map((r) => (r.id === row.id ? row : r));
        return row;
      }
      if (method === 'DELETE') {
        records = [];
        return { company_id: 'north', service_user_id: 'person-1', id: 'record-1', deleted: true };
      }
      if (path.endsWith('/record-1')) return { ...record(), detail: 'Latest server observations' };
      const kind = new URL(path, 'https://local.invalid').searchParams.get('kind');
      const results = records.filter((r) => r.kind === kind);
      return {
        company_id: 'north',
        service_user_id: 'person-1',
        count: results.length,
        next: null,
        previous: null,
        results: structuredClone(results),
        meta: { today: '2026-11-11' },
      };
    });
    TestBed.configureTestingModule({
      imports: [CareEvents],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: 'person-1' }),
              queryParamMap: query.value,
              data: { careEventSection: 'incidents' },
            },
            paramMap: new BehaviorSubject(convertToParamMap({ id: 'person-1' })),
            queryParamMap: query,
            data: new BehaviorSubject({ careEventSection: 'incidents' }),
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
    TestBed.overrideComponent(CareEvents, {
      remove: { imports: [CareHeader] },
      add: { imports: [HeaderStub] },
    });
    fixture = TestBed.createComponent(CareEvents);
    editor = fixture.componentInstance;
    await settle(fixture);
  });
  afterEach(() => vi.restoreAllMocks());
  it('keeps calendar dates on the recorded day across browser timezones', () => {
    expect(editor.calendarDate('2026-11-10')).toBe('10 Nov 2026');
  });
  it('renders backend records and summary metrics without repeated loads', async () => {
    expect(fixture.nativeElement.textContent).toContain('Skin observation');
    expect(editor.metrics()[1].value).toBe(1);
    const count = request.mock.calls.length;
    await settle(fixture);
    expect(request.mock.calls.length).toBe(count);
  });
  it('creates a complaint with a server-assigned identity', async () => {
    editor.choose('complaints');
    await settle(fixture);
    await editor.open();
    editor.draft = {
      name: 'Late call',
      detail: 'Caller reported a late arrival. Follow-up recorded.',
      date: '2026-11-10',
      level: 'High',
      status: 'Active',
    };
    await editor.save();
    await settle(fixture);
    expect(request.mock.calls.find((c) => c[2] === 'POST')?.[1]).toMatchObject({
      kind: 'complaints',
      name: 'Late call',
    });
    expect(editor.entries()[0].id).toBe('server-record');
    expect(editor.metrics()[2].value).toBe(1);
  });
  it('opens a fresh prefilled branded popup and sends an optimistic update', async () => {
    await editor.open(editor.entries()[0]);
    await settle(fixture);
    expect(editor.draft.detail).toBe('Latest server observations');
    expect(fixture.nativeElement.querySelector('[role="dialog"].service-user-popup')).toBeTruthy();
    editor.draft.detail = 'Corrected observation';
    editor.reason = 'Add follow-up outcome';
    await editor.save();
    await settle(fixture);
    const call = request.mock.calls.find((c) => c[2] === 'PATCH') as any[];
    expect(call[1].detail).toBe('Corrected observation');
    expect(call[3]['If-Match']).toBe('"v1"');
    expect(editor.mode()).toBe('');
  });
  it('views full details without edit permission', async () => {
    permissions.delete('edit');
    await editor.open(editor.entries()[0], 'view');
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('Latest server observations');
    expect(fixture.nativeElement.querySelector('[name="detail"]')).toBeNull();
  });
  it('loads immutable record history from the API', async () => {
    await editor.open(editor.entries()[0], 'history');
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('Revision 1');
    expect(request.mock.calls.some((c) => c[0].endsWith('/history'))).toBe(true);
  });
  it('requires a removal reason and uses the exact version for deletion', async () => {
    await editor.open(editor.entries()[0], 'remove');
    await editor.save();
    expect(editor.fieldErrors().reason).toBeTruthy();
    editor.reason = 'Duplicate report';
    await editor.save();
    await settle(fixture);
    const call = request.mock.calls.find((c) => c[2] === 'DELETE') as any[];
    expect(call[1].reason).toBe('Duplicate report');
    expect(call[3]['If-Match']).toBe('"v1"');
    expect(editor.entries()).toEqual([]);
  });
  it('retains the draft and marks a rejected field when validation fails', async () => {
    await editor.open(editor.entries()[0]);
    editor.reason = 'Correct entry';
    editor.draft.name = 'Keep this draft';
    request.mockImplementationOnce(async () => {
      throw Object.assign(Error('Check date'), {
        fieldErrors: { date: ['Date cannot be in the future'] },
      });
    });
    await editor.save();
    await settle(fixture);
    expect(editor.mode()).toBe('edit');
    expect(editor.draft.name).toBe('Keep this draft');
    expect(fixture.nativeElement.querySelector('[name="date"]').getAttribute('aria-invalid')).toBe(
      'true',
    );
  });
  it('filters and pages the complete authorised category', async () => {
    records = Array.from({ length: 10 }, (_, n) => ({
      ...record('record-' + n),
      name: 'Incident ' + n,
      level: n === 9 ? 'High' : 'Low',
    }));
    await editor.api.load('person-1', 'incidents');
    await settle(fixture);
    expect(editor.rows()).toHaveLength(8);
    editor.pageNumber.set(2);
    expect(editor.rows()).toHaveLength(2);
    editor.level.set('High');
    expect(editor.rows()).toHaveLength(1);
    editor.search.set('missing');
    expect(editor.rows()).toEqual([]);
    editor.clearFilters();
    expect(editor.filtered()).toHaveLength(10);
  });
  it('keeps incidents and complaints separate and preserves dirty drafts on cancelled switching', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await editor.open();
    editor.draft.name = 'Unsaved';
    editor.choose('complaints');
    expect(editor.collection()).toBe('incidents');
    expect(editor.mode()).toBe('edit');
  });
  it('does not close or navigate while saving', async () => {
    await editor.open();
    editor.busy.set(true);
    editor.close();
    expect(editor.mode()).toBe('edit');
    expect(editor.canLeave()).toBe(false);
  });
  it('clears source data and drafts on an authorization denial', async () => {
    await editor.open(editor.entries()[0]);
    editor.reason = 'Correction';
    request.mockImplementationOnce(async () => {
      throw Object.assign(Error('Access revoked'), { status: 403 });
    });
    await editor.save();
    await settle(fixture);
    expect(editor.mode()).toBe('');
    expect(editor.draft.name).toBe('');
    expect(editor.entries()).toEqual([]);
  });
  it('opens complaint creation from a deep link once after initial loading', async () => {
    query.next(convertToParamMap({ create: 'complaint' }));
    await settle(fixture);
    expect(editor.collection()).toBe('complaints');
    expect(editor.mode()).toBe('edit');
    editor.close();
    await settle(fixture);
    expect(editor.mode()).toBe('');
  });
  it('opens the source entry from a deep link after records arrive', async () => {
    query.next(convertToParamMap({ entry: 'record-1' }));
    await settle(fixture);
    expect(editor.selected().id).toBe('record-1');
    expect(editor.mode()).toBe('view');
  });
  it('prints only after the server export check succeeds', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    await editor.print();
    expect(print).toHaveBeenCalledTimes(1);
    expect(request.mock.calls.some((c) => c[0].includes('/print?'))).toBe(true);
    expect(editor.api.entries()).toHaveLength(1);
  });
  it('does not print when the backend denies export', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    request.mockImplementationOnce(async () => {
      throw Object.assign(Error('Export revoked'), { status: 403 });
    });
    await editor.print();
    expect(print).not.toHaveBeenCalled();
  });
  it('does not let a stale edit request overwrite a newer draft', async () => {
    let release!: (row: any) => void;
    request.mockImplementationOnce(() => new Promise((r) => (release = r)));
    const old = editor.open(editor.entries()[0]);
    await editor.open();
    release(record());
    await old;
    expect(editor.selected()).toBeNull();
    expect(editor.draft.name).toBe('');
  });
  it('shows unavailable summary values when loading fails', async () => {
    request.mockImplementationOnce(async () => {
      throw Error('Connection unavailable');
    });
    await editor.api.load('person-1', 'incidents');
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('Connection unavailable');
    expect(fixture.nativeElement.querySelector('.event-metric strong').textContent).toBe('—');
  });
  it('clears the popup and records on a workspace change', async () => {
    await editor.open(editor.entries()[0]);
    permissions.clear();
    scope.set('south:actor');
    await settle(fixture);
    expect(editor.mode()).toBe('');
    expect(editor.entries()).toEqual([]);
  });
});
