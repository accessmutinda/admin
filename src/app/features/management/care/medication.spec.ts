import { Component, input, output, signal } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { Medication } from './medication';
import { MedicationApi } from './medication-api.service';
import { CareHeader } from './care-header';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiError } from '../../../core/auth/auth-api';
import { blankPrescription } from './care.models';

@Component({ selector: 'cv-care-header', template: '' })
class HeaderStub {
  client = input<unknown>();
  active = input('');
  printManaged = input(false);
  printBusy = input(false);
  printRequested = output<void>();
}
function prescription() {
  const row = blankPrescription();
  return {
    ...row,
    id: 'med-1',
    name: 'Recorded medicine',
    strength: '10 mg',
    dose: 'One tablet',
    prescriber: 'Clinician',
    pharmacy: 'Pharmacy',
    indication: 'Recorded indication',
    start: '2026-01-01',
    stock: '20.000',
    lowStock: '5.000',
    prnMax: null,
    prnInterval: null,
    company_id: 'north',
    service_user_id: 'client',
    version: 1,
    etag: '"v1"',
    deleted: false,
    request_id: 'request-detail',
  };
}
async function settle(fixture: ComponentFixture<Medication>) {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}
describe('Medication backend workflow', () => {
  let fixture: ComponentFixture<Medication>,
    editor: any,
    api: ReturnType<typeof vi.fn>,
    scope: ReturnType<typeof signal<string>>,
    permissions: Set<string>,
    workspace: any,
    params: BehaviorSubject<any>,
    records: any;
  beforeEach(() => {
    scope = signal('north:actor:1');
    permissions = new Set(['read', 'create', 'edit', 'archive', 'export']);
    workspace = {
      company_id: 'north',
      service_user_id: 'client',
      today: '2026-11-11',
      timezone: 'Europe/London',
      prescriptions: [prescription()],
      administrations: [],
      audit: [],
    };
    params = new BehaviorSubject(convertToParamMap({ id: 'client' }));
    records = {
      scope,
      companyId: signal('north'),
      allowed: signal(true),
      selected: signal({ id: 'client', name: 'Alex', file: {} }),
      detailPending() {
        return this.detailLoading();
      },
      detailLoading: signal(false),
      error: signal(''),
      detail: vi.fn().mockResolvedValue(undefined),
      access: { can: vi.fn((_m: string, _s: string, a: string) => permissions.has(a)) },
    };
    api = vi.fn(async (path: string, body?: any, method?: string) => {
      if (path.endsWith('/export'))
        return new Blob(['Medication,Outcome\nRecorded medicine,Given'], { type: 'text/csv' });
      if (path.endsWith('/administrations')) return { company_id: 'north', id: 'dose-1' };
      if (path.endsWith('/medications') && method === 'POST') return { ...prescription(), ...body };
      if (path.endsWith('/medications')) return structuredClone(workspace);
      return { ...prescription(), ...body };
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { api } },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: params, snapshot: { paramMap: params.value } },
        },
      ],
    });
    TestBed.overrideComponent(Medication, {
      remove: { imports: [CareHeader], providers: [MedicationApi, ServiceUsersApi] },
      add: {
        imports: [HeaderStub],
        providers: [MedicationApi, { provide: ServiceUsersApi, useValue: records }],
      },
    });
    fixture = TestBed.createComponent(Medication);
    editor = fixture.componentInstance;
  });
  afterEach(() => vi.restoreAllMocks());
  it('loads real records and renders the existing register and schedule preview', async () => {
    await settle(fixture);
    expect(api).toHaveBeenCalledWith('/companies/north/service-users/client/medications');
    expect(
      fixture.nativeElement.querySelector('[aria-label="Medication register"]').textContent,
    ).toContain('Recorded medicine');
    expect(fixture.nativeElement.querySelectorAll('[aria-label="Scheduled dose"]')).toHaveLength(4);
    expect(editor.lowStock()).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('.mar-table')).toBeNull();
  });
  it('fetches current details before opening a prefilled branded editor and sends its ETag', async () => {
    await settle(fixture);
    await editor.open('medication', editor.prescriptions()[0]);
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('[role="dialog"].service-user-popup')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[name="name"]').value).toBe('Recorded medicine');
    editor.draft.name = 'Updated medicine';
    await editor.save();
    await settle(fixture);
    const call = api.mock.calls.find((c: any[]) => c[2] === 'PATCH')!;
    expect(call[0]).toBe('/companies/north/service-users/client/medications/med-1');
    expect(call[1]).toMatchObject({ name: 'Updated medicine', stock: '20', end: null });
    expect(call[1]).not.toHaveProperty('etag');
    expect(call[1]).not.toHaveProperty('id');
    expect(call[1]).not.toHaveProperty('request_id');
    expect(call[3]).toEqual({ 'If-Match': '"v1"' });
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });
  it('opens Record dose and submits an attributed administration without client supplied actor fields', async () => {
    await settle(fixture);
    const button = [...fixture.nativeElement.querySelectorAll('button')].find(
      (b: any) => b.textContent.trim() === 'Record dose',
    ) as HTMLButtonElement;
    button.click();
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('[name="recordMedication"]')).toBeTruthy();
    editor.record.date = '2026-11-10';
    await editor.save();
    await settle(fixture);
    const call = api.mock.calls.find(
      (c: any[]) => c[0].endsWith('/administrations') && c[2] === 'POST',
    )!;
    expect(call[1]).toMatchObject({
      date: '2026-11-10',
      time: '08:00',
      doseUnits: '1',
      outcome: 'Given',
    });
    expect(call[1]).not.toHaveProperty('by');
    expect(call[3]['Idempotency-Key']).toBeTruthy();
  });
  it('sends stock adjustments and discontinuation to their backend commands', async () => {
    await settle(fixture);
    await editor.open('stock', editor.prescriptions()[0]);
    editor.stockChange = 4;
    editor.reason = 'Delivery';
    await editor.save();
    expect(
      api.mock.calls.some(
        (c: any[]) => c[0].endsWith('/stock') && c[1].amount === '4' && c[1].reason === 'Delivery',
      ),
    ).toBe(true);
    await editor.open('discontinue', editor.prescriptions()[0]);
    editor.reason = 'Clinician stopped';
    await editor.save();
    expect(
      api.mock.calls.some(
        (c: any[]) => c[0].endsWith('/discontinue') && c[1].reason === 'Clinician stopped',
      ),
    ).toBe(true);
  });
  it('keeps an invalid draft and marks the named field red', async () => {
    await settle(fixture);
    await editor.open('medication', editor.prescriptions()[0]);
    api.mockImplementation(async (_p: string, _b: unknown, method?: string) => {
      if (method === 'PATCH')
        throw new ApiError('Enter a medication name.', 400, 'validation_error', {
          name: ['Enter a medication name.'],
        });
      return prescription();
    });
    editor.draft.name = 'Rejected draft';
    await editor.save();
    await settle(fixture);
    expect(editor.modal()).toBe('medication');
    expect(editor.draft.name).toBe('Rejected draft');
    expect(fixture.nativeElement.querySelector('[name="name"]').getAttribute('aria-invalid')).toBe(
      'true',
    );
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'medication name',
    );
  });
  it('retains an idempotency key for retrying the same stock request', async () => {
    await settle(fixture);
    await editor.open('stock', editor.prescriptions()[0]);
    editor.reason = 'Delivery';
    editor.stockChange = 4;
    api.mockRejectedValue(new Error('Connection lost'));
    await editor.save();
    await editor.save();
    const calls = api.mock.calls.filter((c: any[]) => c[0].endsWith('/stock'));
    expect(calls[0][3]['Idempotency-Key']).toBe(calls[1][3]['Idempotency-Key']);
    editor.stockChange = 5;
    await editor.save();
    expect(api.mock.calls.at(-1)![3]['Idempotency-Key']).not.toBe(calls[0][3]['Idempotency-Key']);
  });
  it('closes the editor and rejects late details after a workspace change', async () => {
    await settle(fixture);
    let resolve!: (row: any) => void;
    api.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const opening = editor.open('medication', editor.prescriptions()[0]);
    scope.set('south:actor:2');
    await settle(fixture);
    resolve(prescription());
    await opening;
    await settle(fixture);
    expect(editor.modal()).toBe('');
    expect(editor.fetching()).toBe(false);
  });
  it('rejects a workspace response for another service user', async () => {
    workspace.service_user_id = 'foreign';
    await settle(fixture);
    expect(editor.data()).toBeNull();
    expect(editor.error()).toContain('another service user');
  });
  it('hides editing and export independently when actions are revoked', async () => {
    permissions.delete('edit');
    permissions.delete('export');
    await settle(fixture);
    expect(fixture.nativeElement.textContent).not.toContain('Export MAR');
    expect(fixture.nativeElement.textContent).toContain('Add Medication');
    await editor.open('medication', editor.prescriptions()[0]);
    expect(editor.modal()).toBe('');
  });
  it('downloads the backend export and revalidates printing through the same permission gate', async () => {
    await settle(fixture);
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:export');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    await editor.export();
    expect(create).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    await editor.print();
    expect(print).toHaveBeenCalledTimes(1);
    expect(api.mock.calls.filter((c: any[]) => c[0].endsWith('/export'))).toHaveLength(2);
    permissions.delete('export');
    await editor.print();
    expect(print).toHaveBeenCalledTimes(1);
  });
  it('prefills corrections and submits the current MAR record reference', async () => {
    workspace.administrations = [
      {
        id: 'dose-1',
        company_id: 'north',
        medicationId: 'med-1',
        date: '2026-11-10',
        time: '08:00',
        outcome: 'Given',
        doseUnits: '1',
        reason: '',
        response: 'Recorded observation',
        witness: '',
        correctionOf: null,
        at: '2026-11-10T08:01:00Z',
        by: 'Recorder',
        userId: 'actor',
        version: 1,
        etag: '"v1"',
      },
    ];
    await settle(fixture);
    await editor.startRecord();
    editor.selectRecord('dose-1');
    await settle(fixture);
    expect(editor.record.response).toBe('Recorded observation');
    expect(fixture.nativeElement.querySelector('[name="date"]').readOnly).toBe(true);
    editor.record.outcome = 'Refused';
    editor.record.reason = 'Correction reason';
    await editor.save();
    expect(
      api.mock.calls.some(
        (c: any[]) =>
          c[0].endsWith('/administrations/dose-1') &&
          c[2] === 'PATCH' &&
          c[1].reason === 'Correction reason',
      ),
    ).toBe(true);
  });
  it('allows a controlled-drug refusal with its reason without requiring an administration witness', async () => {
    await settle(fixture);
    api.mockResolvedValueOnce({ ...prescription(), controlled: true });
    await editor.startRecord();
    editor.record.outcome = 'Refused';
    editor.record.reason = 'Declined the scheduled dose';
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('[name="witness"]')).toBeNull();
    await editor.save();
    expect(
      api.mock.calls.some(
        (c: any[]) =>
          c[0].endsWith('/administrations') && c[1].outcome === 'Refused' && c[1].witness === '',
      ),
    ).toBe(true);
  });
  it('keeps historical MAR entry available after the last prescription is discontinued', async () => {
    workspace.prescriptions[0].discontinuedAt = '2026-11-11T07:00:00Z';
    await settle(fixture);
    expect(editor.active()).toHaveLength(0);
    expect(
      [...fixture.nativeElement.querySelectorAll('button')].some(
        (b: any) => b.textContent.trim() === 'Record dose',
      ),
    ).toBe(true);
    api.mockResolvedValueOnce(workspace.prescriptions[0]);
    await editor.startRecord();
    await settle(fixture);
    expect(editor.modal()).toBe('record');
    expect(fixture.nativeElement.querySelector('[name="existingRecord"]')).toBeTruthy();
  });
  it('allows edit-only staff to correct existing MAR entries without creating new doses', async () => {
    permissions.delete('create');
    workspace.administrations = [
      {
        id: 'dose-1',
        company_id: 'north',
        medicationId: 'med-1',
        date: '2026-11-10',
        time: '08:00',
        outcome: 'Given',
        doseUnits: '1',
        reason: '',
        response: '',
        witness: '',
        correctionOf: null,
        at: '2026-11-10T08:01:00Z',
        by: 'Recorder',
        userId: 'actor',
        version: 1,
        etag: '"v1"',
      },
    ];
    await settle(fixture);
    expect(
      [...fixture.nativeElement.querySelectorAll('button')].some(
        (b: any) => b.textContent.trim() === 'Record dose',
      ),
    ).toBe(true);
    await editor.startRecord();
    await settle(fixture);
    expect(editor.record.correctionOf).toBe('dose-1');
    editor.selectRecord('');
    expect(editor.record.correctionOf).toBe('dose-1');
    editor.record.reason = 'Correction after review';
    await editor.save();
    expect(
      api.mock.calls.some(
        (c: any[]) => c[0].endsWith('/administrations/dose-1') && c[2] === 'PATCH',
      ),
    ).toBe(true);
    expect(
      api.mock.calls.some((c: any[]) => c[0].endsWith('/administrations') && c[2] === 'POST'),
    ).toBe(false);
  });
});
