import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { ManagementStore } from '../../shared/management.store';
import { AcademyApi } from './academy-api.service';
import { AcademySettingsApi } from './academy-settings-api.service';
import type { AcademySettingsRead } from './academy.generated';

const record = (version = 1): AcademySettingsRead => ({
  id: 'settings-' + version,
  company_id: 'company',
  version,
  etag: `"v${version}"`,
  updatedAt: '2026-11-12T12:00:00Z',
  passMark: 80,
  maxAttempts: 3,
  timeLimitMinutes: 30,
  validityMonths: 12,
  reminderDays: 30,
  dueSoonDays: 30,
  refresherDays: 30,
  overdueDays: 30,
  shuffleQuestions: true,
  shuffleOptions: true,
  sequentialLessons: true,
  showFeedback: true,
  allowSelfEnrolment: false,
  portalNotifications: true,
  showSignatureDate: true,
  template: 'Standard',
  primary: '#008AFA',
  secondary: '#008D9F',
  issuer: 'Training',
  signatureName: '',
  signatureRole: '',
  logoId: null,
  backgroundId: null,
  signatureId: null,
  notificationTemplates: {
    assigned: '{{course}} {{due}}',
    result: 'Result',
    certificate: 'Certificate',
    expiry: 'Expiry',
  },
});
describe('Persisted academy settings', () => {
  const scope = signal('first'),
    company = signal('company'),
    allowed = signal(true),
    editable = signal(true);
  let api: AcademySettingsApi,
    request: ReturnType<typeof vi.fn>,
    invalidate: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    scope.set('first');
    company.set('company');
    allowed.set(true);
    editable.set(true);
    request = vi.fn(async (_path: string, body?: unknown) => record(body ? 2 : 1));
    invalidate = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { api: request } },
        {
          provide: CompanyAccessService,
          useValue: {
            invalidate,
            can: (_module: string, _feature: string, action: string) =>
              allowed() && (action === 'read' || editable()),
          },
        },
        { provide: ManagementStore, useValue: { companyId: company } },
        { provide: AcademyApi, useValue: { scope } },
      ],
    });
    api = TestBed.inject(AcademySettingsApi);
    TestBed.tick();
  });
  it('prevents reload from clearing a form while its save is in progress', async () => {
    await api.load();
    let finish!: (value: AcademySettingsRead) => void;
    request.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const saving = api.save(api.settings()!, '"v1"');
    const reload = api.load(true);
    const rejected = expect(reload).rejects.toThrow('Wait');
    finish(record(2));
    await saving;
    await rejected;
    expect(api.record()?.version).toBe(2);
    expect(api.loading()).toBe(false);
  });
  it('cancels an older pending read when saving and clears its loading state', async () => {
    await api.load();
    const draft = structuredClone(api.settings()!);
    let finish!: (value: AcademySettingsRead) => void;
    request.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const loading = api.load(true);
    await api.save(draft, '"v1"');
    expect(api.loading()).toBe(false);
    finish(record(1));
    await loading;
    expect(api.record()?.version).toBe(2);
  });
  it('clears settings and access when a protected branding read is denied', async () => {
    request.mockResolvedValueOnce({ ...record(), logoId: 'image' });
    await api.load();
    request.mockRejectedValueOnce(Object.assign(Error('Access revoked'), { status: 403 }));
    await expect(api.brandingBlob('image')).rejects.toThrow('revoked');
    expect(api.record()).toBeNull();
    expect(invalidate).toHaveBeenCalled();
  });
  it('loads and saves only writable settings with server versions', async () => {
    await api.load();
    const draft = structuredClone(api.settings()!);
    draft.passMark = 90;
    await api.save(draft, '"v1"');
    const [path, body, method, headers] = request.mock.calls[1];
    expect(path).toBe('/companies/company/academy/settings');
    expect(method).toBe('PATCH');
    expect(body.passMark).toBe(90);
    expect(body.logoId).toBeNull();
    expect(body.adminRoles).toBeUndefined();
    expect(body.updatedAt).toBeUndefined();
    expect(headers['If-Match']).toBe('"v1"');
    expect(headers['Idempotency-Key']).toBeTruthy();
    expect(api.record()?.etag).toBe('"v2"');
  });
  it('allows readers without edit or course authoring and prevents writes', async () => {
    editable.set(false);
    await api.load();
    expect(api.settings()?.passMark).toBe(80);
    await expect(api.save(api.settings()!, '"v1"')).rejects.toThrow('edit permission');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('preserves the same idempotency key on uncertain retries and changes it for changed intent', async () => {
    await api.load();
    const draft = api.settings()!;
    request.mockRejectedValueOnce(Error('Connection interrupted'));
    await expect(api.save(draft, '"v1"')).rejects.toThrow('interrupted');
    const key = request.mock.calls[1][3]['Idempotency-Key'];
    await api.save(draft, '"v1"');
    expect(request.mock.calls[2][3]['Idempotency-Key']).toBe(key);
    await api.save({ ...draft, passMark: 91 }, '"v2"');
    expect(request.mock.calls[3][3]['Idempotency-Key']).not.toBe(key);
  });
  it('retains saved state and the caller draft on stale or invalid writes', async () => {
    await api.load();
    const draft = structuredClone(api.settings()!);
    draft.passMark = 93;
    request.mockRejectedValueOnce(Object.assign(Error('Reload and retry'), { status: 412 }));
    await expect(api.save(draft, '"v1"')).rejects.toThrow('Reload');
    expect(api.record()?.version).toBe(1);
    expect(draft.passMark).toBe(93);
    expect(invalidate).not.toHaveBeenCalled();
  });
  it('clears saved data and central access after server denial', async () => {
    await api.load();
    request.mockRejectedValueOnce(Object.assign(Error('Access revoked'), { status: 403 }));
    await expect(api.load(true)).rejects.toThrow('revoked');
    expect(api.record()).toBeNull();
    expect(invalidate).toHaveBeenCalled();
  });
  it('ignores a late response from the previous workspace', async () => {
    let finish!: (value: AcademySettingsRead) => void;
    request.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const loading = api.load();
    scope.set('second');
    company.set('other');
    TestBed.tick();
    finish(record());
    await expect(loading).rejects.toThrow('workspace');
    expect(api.record()).toBeNull();
    expect(api.error()).toBe('');
  });
  it('prevents an older overlapping read from replacing a newer version', async () => {
    let finish!: (value: AcademySettingsRead) => void;
    request.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const old = api.load(true);
    request.mockResolvedValueOnce(record(2));
    await api.load(true);
    finish(record(1));
    await old;
    expect(api.record()?.version).toBe(2);
  });
  it('rejects foreign-company settings and clears visibility on revocation', async () => {
    request.mockResolvedValueOnce({ ...record(), company_id: 'foreign' });
    await expect(api.load()).rejects.toThrow('another workspace');
    expect(api.settings()).toBeNull();
    await api.load();
    allowed.set(false);
    expect(api.settings()).toBeNull();
  });
  it('queues actual reminders and prevents simultaneous commands', async () => {
    await api.load();
    let finish!: (value: unknown) => void;
    request.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const saving = api.reminders();
    await expect(api.reminders()).rejects.toThrow('Wait');
    finish({ company_id: 'company', notificationIds: ['one', 'two'] });
    expect(await saving).toBe(2);
    expect(request.mock.calls[1][0]).toBe('/companies/company/academy/settings/reminders');
  });
});
