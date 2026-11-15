import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { ApiError } from '../../../../core/auth/auth-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { InspectionAccessDialog } from './inspection-access-dialog';

const windowRecord = (changes: Record<string, unknown> = {}) => ({
  id: 'window-1',
  company_id: 'north',
  membership_id: 'member-1',
  starts_at: '2026-11-14T08:00:00Z',
  ends_at: '2026-11-17T08:00:00Z',
  revoked_at: null,
  reason: 'Authorised review',
  version: 1,
  etag: '"v1"',
  ...changes,
});

describe('Company inspection access management', () => {
  let fixture: ComponentFixture<InspectionAccessDialog>;
  let component: InspectionAccessDialog;
  let company: ReturnType<typeof signal<string>>;
  let permitted: ReturnType<typeof signal<boolean>>;
  let request: ReturnType<typeof vi.fn>;
  let close: ReturnType<typeof vi.fn>;
  let rows: ReturnType<typeof windowRecord>[];
  beforeEach(() => {
    company = signal('north');
    permitted = signal(true);
    close = vi.fn();
    rows = [
      windowRecord(),
      windowRecord({ id: 'other', membership_id: 'member-2', reason: 'Other member window' }),
    ];
    request = vi.fn(async (path: string, body?: any, method?: string) => {
      if (method === 'POST') {
        if (path.endsWith('/revoke')) {
          rows[0] = windowRecord({ revoked_at: '2026-11-15T09:00:00Z', version: 2, etag: '"v2"' });
          return rows[0];
        }
        const row = windowRecord({ ...body, id: 'created' });
        rows.unshift(row);
        return row;
      }
      return {
        count: rows.length,
        results: structuredClone(rows),
        next: null,
        previous: null,
        meta: { company_id: 'north' },
      };
    });
    TestBed.configureTestingModule({
      imports: [InspectionAccessDialog],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: { companyId: 'north', membershipId: 'member-1', name: 'Review user' },
        },
        { provide: MatDialogRef, useValue: { close, disableClose: false } },
        { provide: AuthService, useValue: { currentUser: () => ({ id: 'admin' }), api: request } },
        {
          provide: CompanyAccessService,
          useValue: { companyId: company, core: () => permitted() },
        },
      ],
    });
  });
  afterEach(() => {
    fixture?.destroy();
    TestBed.resetTestingModule();
  });
  async function open() {
    fixture = TestBed.createComponent(InspectionAccessDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await vi.waitFor(() => expect(component.loading()).toBe(false));
    fixture.detectChanges();
  }
  it('shows only the selected member’s current company windows', async () => {
    await open();
    expect(component.records()).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Authorised review');
    expect(fixture.nativeElement.textContent).not.toContain('Other member window');
  });
  it('marks missing reasons and reversed dates without saving', async () => {
    await open();
    component.starts = '2026-11-15T10:00';
    component.ends = '2026-11-15T09:00';
    await component.create();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('[aria-invalid=true]')).toHaveLength(2);
    expect(request.mock.calls.some((call) => call[2] === 'POST')).toBe(false);
  });
  it('keeps the idempotency key when retrying an unchanged authorisation after a network failure', async () => {
    await open();
    component.starts = '2026-11-15T10:00';
    component.ends = '2026-11-16T10:00';
    component.reason = 'Authorised inspection';
    request.mockRejectedValueOnce(Error('Connection interrupted'));
    await component.create();
    await component.create();
    const posts = request.mock.calls.filter((call) => call[2] === 'POST');
    expect(posts).toHaveLength(2);
    expect(posts[0][3]).toEqual(posts[1][3]);
    expect(posts[1][1]).toEqual({
      membership_id: 'member-1',
      starts_at: new Date(component.starts).toISOString(),
      ends_at: new Date(component.ends).toISOString(),
      reason: 'Authorised inspection',
    });
    expect(component.notice()).toBe('Inspection access saved.');
  });
  it('requires a revocation reason and sends the saved version', async () => {
    await open();
    component.chooseRevoke(component.records()[0]);
    await component.revoke();
    expect(component.fields()['reason']).toBeDefined();
    component.revokeReason = 'Review completed';
    await component.revoke();
    expect(request).toHaveBeenCalledWith(
      '/companies/north/inspector/engagements/window-1/revoke',
      { reason: 'Review completed' },
      'POST',
      { 'If-Match': '"v1"' },
    );
    expect(component.state(component.records()[0])).toBe('Revoked');
  });
  it('retains a stale revocation failure without reporting success', async () => {
    await open();
    component.chooseRevoke(component.records()[0]);
    component.revokeReason = 'Review completed';
    request.mockRejectedValueOnce(
      new ApiError('Access changed. Reload it.', 412, 'precondition_failed'),
    );
    await component.revoke();
    expect(component.error()).toContain('Access changed');
    expect(component.notice()).toBe('');
    expect(component.records()[0].revoked_at).toBeNull();
  });
  it('clears windows and closes when the administrator changes company', async () => {
    await open();
    company.set('south');
    TestBed.tick();
    expect(component.records()).toEqual([]);
    expect(close).toHaveBeenCalled();
    const count = request.mock.calls.length;
    await component.create();
    expect(request).toHaveBeenCalledTimes(count);
  });
  it('does not load inspection records without membership administration authority', async () => {
    permitted.set(false);
    await open();
    expect(request).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });
});
