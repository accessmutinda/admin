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
function record(id = 'record-1', kind = 'feedback'): any {
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
    feedbackType: 'Review',
    rating: 4,
    receivedFrom: 'Family representative',
    changeReason: 'Record feedback',
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
describe('Connected service user reviews and feedback', () => {
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
              data: { careEventSection: 'feedback' },
            },
            paramMap: new BehaviorSubject(convertToParamMap({ id: 'person-1' })),
            queryParamMap: query,
            data: new BehaviorSubject({ careEventSection: 'feedback' }),
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
  it('renders the feedback register with genuine review ratings and no risk controls', async () => {
    expect(fixture.nativeElement.textContent).toContain('Reviews & Feedback');
    expect(fixture.nativeElement.textContent).toContain('4 / 5');
    expect(fixture.nativeElement.textContent).not.toContain('Risk level');
    expect(editor.metrics().find((m: any) => m.label === 'Average review rating').value).toBe(
      '4.0 / 5',
    );
    expect(request.mock.calls[0][0]).toContain('/feedback?');
  });
  it('creates a compliment with an explicit source and no invented rating', async () => {
    await editor.open();
    editor.draft.name = 'Thank you';
    editor.draft.detail = 'Feedback about helpful support';
    editor.draft.date = '2026-11-10';
    editor.chooseFeedbackType('Compliment');
    editor.draft.receivedFrom = 'Service user';
    await editor.save();
    await settle(fixture);
    const call = request.mock.calls.find((c) => c[2] === 'POST') as any[];
    expect(call[0]).toBe('/companies/north/service-users/person-1/feedback');
    expect(call[1]).toMatchObject({
      feedbackType: 'Compliment',
      rating: null,
      receivedFrom: 'Service user',
    });
    expect(editor.metrics().find((m: any) => m.label === 'Compliments').value).toBe(1);
  });
  it('prefills review details from a fresh API read and saves a versioned correction', async () => {
    await editor.open(editor.entries()[0]);
    await settle(fixture);
    expect(editor.draft.rating).toBe(4);
    expect(editor.draft.receivedFrom).toBe('Family representative');
    expect(fixture.nativeElement.querySelector('[role="dialog"].service-user-popup')).toBeTruthy();
    editor.draft.rating = 5;
    editor.reason = 'Correct rating provided';
    await editor.save();
    const call = request.mock.calls.find((c) => c[2] === 'PATCH') as any[];
    expect(call[1].rating).toBe(5);
    expect(call[3]['If-Match']).toBe('"v1"');
  });
  it('clears a review rating when the feedback type changes', async () => {
    await editor.open(editor.entries()[0]);
    editor.chooseFeedbackType('Concern');
    expect(editor.draft.rating).toBeNull();
  });
  it('keeps unrated historical feedback unknown rather than reporting zero', async () => {
    records = [{ ...record(), feedbackType: '', rating: null, receivedFrom: '' }];
    await editor.api.load('person-1', 'feedback');
    await settle(fixture);
    expect(editor.metrics().find((m: any) => m.label === 'Average review rating').value).toBe('—');
    expect(fixture.nativeElement.textContent).toContain('Not rated');
    expect(fixture.nativeElement.textContent).toContain('Not recorded');
    request.mockImplementationOnce(async () => records[0]);
    await editor.open(editor.entries()[0]);
    expect(editor.draft.feedbackType).toBe('');
    expect(editor.draft.rating).toBeNull();
  });
  it('filters by feedback type and search, and clear filters restores results', async () => {
    records = [
      record(),
      { ...record('compliment'), name: 'Helpful team', feedbackType: 'Compliment', rating: null },
    ];
    await editor.api.load('person-1', 'feedback');
    editor.feedbackType.set('Compliment');
    expect(editor.filtered()).toHaveLength(1);
    editor.search.set('missing');
    expect(editor.filtered()).toEqual([]);
    editor.clearFilters();
    expect(editor.filtered()).toHaveLength(2);
  });
  it('removes feedback through a reasoned branded confirmation', async () => {
    await editor.open(editor.entries()[0], 'remove');
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('[role="dialog"].service-user-popup')).toBeTruthy();
    await editor.save();
    expect(editor.fieldErrors().reason).toBeTruthy();
    editor.reason = 'Duplicate feedback';
    await editor.save();
    expect(editor.entries()).toEqual([]);
    const call = request.mock.calls.find((c) => c[2] === 'DELETE') as any[];
    expect(call[0]).toContain('/feedback/record-1');
    expect(call[1].reason).toBe('Duplicate feedback');
  });
  it('opens compliment creation with its correct category', async () => {
    query.next(convertToParamMap({ create: 'compliment' }));
    await settle(fixture);
    expect(editor.mode()).toBe('edit');
    expect(editor.draft.feedbackType).toBe('Compliment');
  });
  it('prints through the scoped feedback export endpoint', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    await editor.print();
    expect(print).toHaveBeenCalledOnce();
    expect(request.mock.calls.some((c) => c[0].includes('/feedback/print?'))).toBe(true);
  });
  it('retains the feedback draft after server validation errors', async () => {
    await editor.open(editor.entries()[0]);
    editor.reason = 'Correct source';
    editor.draft.receivedFrom = 'Keep this value';
    request.mockImplementationOnce(async () => {
      throw Object.assign(Error('Check feedback source'), {
        fieldErrors: { receivedFrom: ['Invalid source'] },
      });
    });
    await editor.save();
    await settle(fixture);
    expect(editor.mode()).toBe('edit');
    expect(editor.draft.receivedFrom).toBe('Keep this value');
    expect(
      fixture.nativeElement.querySelector('[name="receivedFrom"]').getAttribute('aria-invalid'),
    ).toBe('true');
  });
  it('clears feedback and open drafts after permission denial', async () => {
    await editor.open(editor.entries()[0]);
    editor.reason = 'Correct entry';
    request.mockImplementationOnce(async () => {
      throw Object.assign(Error('Access revoked'), { status: 403 });
    });
    await editor.save();
    await settle(fixture);
    expect(editor.mode()).toBe('');
    expect(editor.entries()).toEqual([]);
  });
  it('shows read-only feedback without edit or delete controls', async () => {
    permissions.delete('edit');
    permissions.delete('create');
    permissions.delete('archive');
    scope.set('north:reader');
    await settle(fixture);
    expect(fixture.nativeElement.textContent).not.toContain('Add feedback');
    expect(fixture.nativeElement.querySelector('[aria-label="Edit Skin observation"]')).toBeNull();
    await editor.open(editor.entries()[0], 'view');
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('Family representative');
  });
  it('uses a new creation intent after a successful save, while retries retain theirs', async () => {
    const draft = {
      name: 'Feedback',
      detail: 'Reported feedback',
      date: '2026-11-10',
      level: 'Low',
      status: 'Active',
      kind: 'feedback',
      feedbackType: 'Feedback',
      rating: null,
      receivedFrom: 'Service user',
      reason: 'Record feedback',
    };
    await editor.api.save('person-1', draft, null);
    await editor.api.save('person-1', draft, null);
    const posts = request.mock.calls.filter((c) => c[2] === 'POST') as any[][];
    expect(posts[0][3]['Idempotency-Key']).not.toBe(posts[1][3]['Idempotency-Key']);
    request.mockImplementationOnce(async () => {
      throw Error('Connection interrupted');
    });
    await expect(editor.api.save('person-1', draft, null)).rejects.toThrow(
      'Connection interrupted',
    );
    await editor.api.save('person-1', draft, null);
    const retried = request.mock.calls.filter((c) => c[2] === 'POST') as any[][];
    expect(retried[2][3]['Idempotency-Key']).toBe(retried[3][3]['Idempotency-Key']);
  });
  it('locks feedback fields while a save is pending', async () => {
    await editor.open(editor.entries()[0]);
    editor.busy.set(true);
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('[name="name"]').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('[name="detail"]').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('[name="receivedFrom"]').disabled).toBe(true);
  });
  it('does not print a new page after its own screen has been destroyed', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    let release!: (value: any) => void;
    vi.spyOn(editor.api, 'load').mockImplementation(
      () => new Promise((resolve) => (release = resolve)),
    );
    const pending = editor.print();
    fixture.destroy();
    release([record()]);
    await pending;
    expect(print).not.toHaveBeenCalled();
  });
  it('rejects a response from a different record category instead of reporting an empty register', async () => {
    request.mockImplementationOnce(async () => ({
      company_id: 'north',
      service_user_id: 'person-1',
      results: [record('wrong', 'incidents')],
      count: 1,
      next: null,
      previous: null,
      meta: {},
    }));
    await editor.api.load('person-1', 'feedback');
    expect(editor.entries()).toEqual([]);
    expect(editor.api.error()).toContain('category');
  });
});
