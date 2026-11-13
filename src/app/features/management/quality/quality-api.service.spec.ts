import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { signal } from '@angular/core';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { QualityApi } from './quality-api.service';
import { QualityService } from './quality.service';
import { QUALITY_PROVIDERS } from './quality.providers';
import { Quality } from './quality';
import { AssessmentEditor } from './assessment-editor';

const template = {
  id: 'visit',
  title: 'Quality visit form',
  category: 'Quality assurance',
  subject: 'service',
  icon: 'fact_check',
  tone: 'teal',
  description: 'Review the recorded service.',
  fields: [{ id: 'feedback', label: 'Observations' }],
};
const record = (revision = 1): any => ({
  id: 'assessment',
  templateId: 'visit',
  template,
  subjectId: 'north',
  subjectName: 'North Care',
  assessorId: '12',
  assessorName: 'Recorded reviewer',
  date: '2026-11-13',
  reviewDate: '',
  context: 'Recorded review',
  answers: { feedback: 'Recorded observation' },
  outcome: 'Reviewed',
  recommendations: 'Continue agreed support',
  evidence: [],
  status: 'Draft',
  revision,
  audit: [],
});
const page = (changes: any = {}): any => ({
  company_id: 'north',
  count: 1,
  next: null,
  previous: null,
  results: [record()],
  context: {
    company: { id: 'north', name: 'North Care', code: 'NORTH' },
    templates: [template],
    actions: [],
    reviews: [
      {
        id: 'review',
        person: 'Recorded worker',
        date: '2026-11-13',
        type: 'Supervision',
        status: 'Scheduled',
      },
    ],
    clients: [{ id: 'patient', name: 'Recorded person' }],
    staff: [{ id: 'worker', name: 'Recorded worker' }],
    members: [{ id: '12', name: 'Recorded reviewer', status: 'Active' }],
    assessors: ['12'],
    owners: ['12'],
    unavailable: [],
  },
  meta: {
    revision: 'source-1',
    local_date: '2026-11-13',
    metrics: { open_assessments: 1, open_actions: 0, pending_sign_off: 0, reviews: 1 },
  },
  ...changes,
});

describe('Connected supervisor and assessment workflows', () => {
  let api: QualityApi,
    request: ReturnType<typeof vi.fn>,
    scope: ReturnType<typeof signal<string>>,
    company: ReturnType<typeof signal<string>>,
    allowed: ReturnType<typeof signal<boolean>>,
    permissions: Set<string>;
  beforeEach(() => {
    scope = signal('north:actor');
    company = signal('north');
    allowed = signal(true);
    permissions = new Set(['read', 'create', 'edit', 'approve', 'export']);
    request = vi.fn(async () => page());
    const access = {
      can: (_m: string, _s: string, a = 'read') => allowed() && permissions.has(a),
      canPath: () => allowed(),
    };
    TestBed.configureTestingModule({
      imports: [Quality, AssessmentEditor],
      providers: [
        provideRouter([]),
        ...QUALITY_PROVIDERS,
        {
          provide: AuthService,
          useValue: {
            api: request,
            currentUser: () => ({ id: '12', name: 'Recorded reviewer', roleCode: 'CA' }),
          },
        },
        { provide: CompanyAccessService, useValue: access },
        { provide: ServiceUsersApi, useValue: { scope, companyId: company, access } },
      ],
    });
    TestBed.inject(ActivatedRoute).snapshot.data = { supervisor: true };
    api = TestBed.inject(QualityApi);
    TestBed.tick();
  });
  afterEach(() => TestBed.resetTestingModule());
  it('provides connected records without constructing the browser store', () => {
    expect(TestBed.inject(QualityService)).toBe(api);
    expect(api.data().assessments).toEqual([]);
    expect(api.templates()).toEqual([]);
  });
  it('loads existing subject identities, database templates and staff review IDs', async () => {
    expect(await api.load()).toBe(true);
    expect(api.subjects('visit')[0].id).toBe('north');
    expect(api.store.staff()[0].id).toBe('worker');
    expect(api.store.data().reviews[0].id).toBe('review');
    expect(api.metrics()['open_assessments']).toBe(1);
  });
  it('keeps company-local dates during background refreshes', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-11-13T20:30:00Z'));
      const clockApi = TestBed.runInInjectionContext(() => new QualityApi());
      request.mockResolvedValue(
        page({
          meta: {
            revision: 'source-1',
            local_date: '2026-11-13',
            timezone: 'Africa/Nairobi',
            metrics: {},
          },
        }),
      );
      await clockApi.load();
      expect(clockApi.today()).toBe('2026-11-13');
      vi.setSystemTime(new Date('2026-11-13T23:30:00Z'));
      await vi.advanceTimersByTimeAsync(30000);
      expect(clockApi.today()).toBe('2026-11-14');
      expect(clockApi.newAssessment('visit').date).toBe('2026-11-14');
    } finally {
      vi.useRealTimers();
    }
  });
  it('updates the dashboard when browser navigation changes its query tab', async () => {
    const params = new BehaviorSubject(convertToParamMap({}));
    Object.defineProperty(TestBed.inject(ActivatedRoute), 'queryParamMap', {
      value: params.asObservable(),
      configurable: true,
    });
    const fixture = TestBed.createComponent(Quality);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance as any;
    component.search.set('previous filter');
    params.next(convertToParamMap({ tab: 'Reports' }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.tab()).toBe('Reports');
    expect(component.search()).toBe('');
    expect(fixture.nativeElement.textContent).toContain('Quality reports');
    expect((request.mock.calls.at(-1) as any[])[0]).toContain('view=Reports');
    params.next(convertToParamMap({}));
    expect(component.tab()).toBe('Overview');
    fixture.destroy();
  });
  it('keeps assessment creation separate from action creation on every tab', async () => {
    const specific = new Set([
      'assessments.read',
      'actions.read',
      'actions.create',
      'supervision.read',
    ]);
    vi.spyOn(api.access, 'can').mockImplementation((_m: string, sub?: string, action = 'read') =>
      specific.has(`${sub}.${action}`),
    );
    api.connect('Corrective actions');
    await vi.waitFor(() => expect(api.loading()).toBe(false));
    expect(api.canAction('create')).toBe(true);
    expect(api.canCreateAssessment()).toBe(false);
    specific.add('assessments.create');
    expect(api.canCreateAssessment()).toBe(true);
  });
  it('rejects mixed-company and mixed-revision pagination', async () => {
    request.mockResolvedValueOnce(page({ count: 2, next: '/companies/north/supervisor?page=2' }));
    request.mockResolvedValueOnce(
      page({ count: 2, meta: { revision: 'source-2' }, results: [record(2)] }),
    );
    expect(await api.load()).toBe(false);
    expect(api.data().assessments).toEqual([]);
    request.mockResolvedValueOnce(page({ company_id: 'south' }));
    expect(await api.load()).toBe(false);
  });
  it('retains complete source totals while collecting every assessment page', async () => {
    request.mockResolvedValueOnce(
      page({
        count: 2,
        next: '/companies/north/supervisor?page=2',
        meta: { revision: 'source-1', local_date: '2026-11-13', metrics: { open_assessments: 2 } },
      }),
    );
    request.mockResolvedValueOnce(
      page({ count: 2, context: null, results: [{ ...record(), id: 'second-assessment' }] }),
    );
    expect(await api.load()).toBe(true);
    expect(api.data().assessments.map((a) => a.id)).toEqual(['assessment', 'second-assessment']);
    expect(api.metrics()['open_assessments']).toBe(2);
    expect(api.store.data().reviews[0].id).toBe('review');
  });
  it('opens the calendar in the company month and preserves a selected month on refresh', async () => {
    const fixture = TestBed.createComponent(Quality);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance as any;
    company.set('south');
    scope.set('south:actor');
    request.mockResolvedValue(
      page({
        company_id: 'south',
        meta: {
          revision: 'source-2',
          local_date: '2026-12-01',
          timezone: 'Africa/Nairobi',
          metrics: {},
        },
      }),
    );
    TestBed.tick();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(api.today()).toBe('2026-12-01');
      expect(component.month()).toBe('2026-12');
    });
    component.moveMonth(1);
    await api.load();
    fixture.detectChanges();
    expect(component.month()).toBe('2027-01');
    fixture.destroy();
  });
  it('discards a late response after the workspace changes', async () => {
    let finish!: (v: any) => void;
    request.mockImplementationOnce(() => new Promise((r) => (finish = r)));
    const pending = api.load();
    company.set('south');
    scope.set('south:actor');
    TestBed.tick();
    finish(page());
    await pending;
    expect(api.data().assessments).toEqual([]);
  });
  it('immediately hides records and metrics when access is revoked', async () => {
    await api.load();
    allowed.set(false);
    expect(api.data().assessments).toEqual([]);
    expect(api.metrics()).toEqual({});
    expect(api.subjects('visit')).toEqual([]);
  });
  it('hides the previous company data before scope-change effects run', async () => {
    await api.load();
    company.set('south');
    scope.set('south:actor');
    expect(api.data().assessments).toEqual([]);
    expect(api.metrics()).toEqual({});
    expect(api.store.company()).toBeNull();
    expect(api.store.staff()).toEqual([]);
    expect(api.store.data().reviews).toEqual([]);
    expect(api.members()).toEqual([]);
  });
  it('sends the edited input version rather than a newer background version', async () => {
    await api.load();
    const draft = record(1);
    request.mockResolvedValueOnce(page({ results: [record(2)] }));
    await api.load();
    request.mockRejectedValueOnce(
      Object.assign(new Error('Record changed. Reload.'), { status: 412 }),
    );
    expect(await api.saveAssessment(draft, 'draft')).toContain('Record changed');
    const call = request.mock.calls[2] as any[];
    expect(call[3]['If-Match']).toBe('"v1"');
    expect(call[3]['Idempotency-Key']).toBeTruthy();
    expect(call[1].revision).toBeUndefined();
  });
  it('creates records with server identifiers and reloads only after acknowledgement', async () => {
    await api.load();
    const draft = api.newAssessment('visit');
    request.mockResolvedValueOnce({
      company_id: 'north',
      id: 'server-assessment',
      version: 1,
      etag: '"v1"',
    });
    request.mockResolvedValueOnce(page({ results: [{ ...record(), id: 'server-assessment' }] }));
    expect(await api.saveAssessment(draft, 'draft')).toBeNull();
    expect(api.savedId(draft.id)).toBe('server-assessment');
    const call = request.mock.calls[1] as any[];
    expect(call[1].id).toBeUndefined();
    expect(call[1].assessorId).toBe('12');
  });
  it('exports from the authenticated endpoint and excludes file bytes from local report construction', async () => {
    await api.load();
    const download = vi.spyOn(api as any, 'saveBlob').mockImplementation(() => undefined);
    request.mockResolvedValueOnce(new Blob(['{}']));
    await api.exportReport();
    expect((request.mock.calls[1] as any[])[0]).toContain('/supervisor/export?');
    expect(download).toHaveBeenCalled();
  });
  it('keeps read, edit and sign-off actions separate', async () => {
    await api.load();
    permissions.delete('approve');
    expect(api.canSource('assessments', 'approve')).toBe(false);
    expect(api.can('edit')).toBe(true);
    permissions.delete('export');
    expect(api.can('export')).toBe(false);
  });
  it('renders the supervisor dashboard with real records and clears an open action on scope change', async () => {
    const fixture = TestBed.createComponent(Quality);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance as any;
    expect(fixture.nativeElement.textContent).toContain('Supervisor dashboard');
    expect(fixture.nativeElement.textContent).toContain('Staff supervision');
    component.editAction();
    component.action.title = 'Private draft';
    company.set('south');
    scope.set('south:actor');
    TestBed.tick();
    expect(component.actionModal()).toBe(false);
    expect(component.action).toBeUndefined();
    fixture.destroy();
  });
  it('opens an existing assessment after the metadata request completes', async () => {
    const route = TestBed.inject(ActivatedRoute);
    route.snapshot.data = {};
    Object.defineProperty(route.snapshot, 'paramMap', {
      value: convertToParamMap({ id: 'assessment' }),
      configurable: true,
    });
    request.mockImplementation(async (path: string) =>
      path.endsWith('/quality/assessments/assessment')
        ? { company_id: 'north', record: record() }
        : page(),
    );
    const fixture = TestBed.createComponent(AssessmentEditor);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const editor = fixture.componentInstance as any;
    await vi.waitFor(() => expect(editor.record.id).toBe('assessment'));
    expect(editor.found).toBe(true);
    expect(editor.record.id).toBe('assessment');
    expect(fixture.nativeElement.textContent).toContain('Quality visit form');
    fixture.destroy();
  });
  it('preserves a draft when the server rejects its submission', async () => {
    Object.defineProperty(TestBed.inject(ActivatedRoute).snapshot, 'paramMap', {
      value: convertToParamMap({ type: 'visit' }),
      configurable: true,
    });
    const fixture = TestBed.createComponent(AssessmentEditor);
    fixture.detectChanges();
    await fixture.whenStable();
    const editor = fixture.componentInstance as any;
    editor.record.context = 'Unsaved entered facts';
    vi.spyOn(api, 'saveAssessment').mockResolvedValue('Complete the assessment questions.');
    await editor.save('submit');
    expect(editor.record.context).toBe('Unsaved entered facts');
    expect(editor.busy()).toBe(false);
    expect(editor.error()).toContain('Complete');
    fixture.destroy();
  });
  it('does not acknowledge a save in a workspace that changed during refresh', async () => {
    await api.load();
    request.mockResolvedValueOnce({ company_id: 'north', id: 'action', version: 2, etag: '"v2"' });
    let finish!: (value: any) => void;
    request.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const pending = api.saveAction({
      id: 'action',
      assessmentId: '',
      title: 'Review entered facts',
      ownerId: '12',
      due: '2026-11-13',
      priority: 'Standard',
      status: 'Open',
      resolution: '',
      revision: 1,
      audit: [],
    });
    await vi.waitFor(() => expect(request.mock.calls).toHaveLength(3));
    company.set('south');
    scope.set('south:actor');
    TestBed.tick();
    finish(page());
    expect(await pending).toContain('workspace changed');
    expect(api.data().actions).toEqual([]);
  });
  it('discards a local attachment if its workspace changes while the file is read', async () => {
    Object.defineProperty(TestBed.inject(ActivatedRoute).snapshot, 'paramMap', {
      value: convertToParamMap({ type: 'visit' }),
      configurable: true,
    });
    const fixture = TestBed.createComponent(AssessmentEditor);
    fixture.detectChanges();
    const editor = fixture.componentInstance as any;
    await vi.waitFor(() => expect(editor.ready()).toBe(true));
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', {
      value: [new File(['verification bytes'], 'observation.png', { type: 'image/png' })],
    });
    const pending = editor.attach({ target: input });
    company.set('south');
    scope.set('south:actor');
    TestBed.tick();
    await pending;
    expect(editor.record.evidence).toEqual([]);
    fixture.destroy();
  });
  it('keeps the unsaved-change warning active during a background refresh', async () => {
    Object.defineProperty(TestBed.inject(ActivatedRoute).snapshot, 'paramMap', {
      value: convertToParamMap({ type: 'visit' }),
      configurable: true,
    });
    const fixture = TestBed.createComponent(AssessmentEditor);
    fixture.detectChanges();
    const editor = fixture.componentInstance as any;
    await vi.waitFor(() => expect(editor.ready()).toBe(true));
    editor.record.context = 'Unsaved observation';
    api.loading.set(true);
    expect(editor.isDirty()).toBe(true);
    expect(editor.canEdit()).toBe(true);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector(
        'textarea[placeholder="Purpose, location and people involved"]',
      ),
    ).not.toBeNull();
    api.loading.set(false);
    fixture.destroy();
  });
  it('stops page refreshes and rejects pending responses when the view is left', async () => {
    let finish!: (value: any) => void;
    request.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    api.connect('Overview');
    expect(request).toHaveBeenCalledTimes(1);
    api.disconnect();
    finish(page());
    await Promise.resolve();
    await Promise.resolve();
    expect(api.can('view')).toBe(false);
    expect(api.data().assessments).toEqual([]);
    request.mockResolvedValue(page());
    api.connect('Overview');
    await vi.waitFor(() => expect(api.data().assessments).toHaveLength(1));
  });
});
