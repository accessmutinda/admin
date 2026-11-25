import { Component, input, output, signal } from '@angular/core';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatMenuHarness } from '@angular/material/menu/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { Medication } from './medication';
import { MedicationApi } from './medication-api.service';
import { CareHeader } from './care-header';
import { CARE_ROUTES } from './care.routes';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiError } from '../../../core/auth/auth-api';
import { blankPrescription } from './care.models';
import { CovertAuthorityRead, MarRead, MedicationWitnessRead } from './medication.generated';

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
    queryParams: BehaviorSubject<ReturnType<typeof convertToParamMap>>,
    reportWitness: MedicationWitnessRead['witnessEvidence'],
    reportAuthority: MarRead['covertAuthorityRecord'],
    authorityRecords: CovertAuthorityRead[] | null,
    records: any;
  beforeEach(() => {
    scope = signal('north:actor:1');
    permissions = new Set(['read', 'create', 'edit', 'archive', 'export']);
    workspace = {
      company_id: 'north',
      service_user_id: 'client',
      today: '2026-11-11',
      timezone: 'Europe/London',
      outcomes: [
        ['Given', 'G'],
        ['Refused', 'R'],
        ['Omitted', 'O'],
        ['Absent', 'A'],
        ['Not available', 'N'],
        ['Not required', 'NR'],
      ].map(([outcome, code]) => ({ outcome, code, label: outcome, description: outcome })),
      prescriptions: [prescription()],
      administrations: [],
      audit: [],
    };
    params = new BehaviorSubject(convertToParamMap({ id: 'client' }));
    queryParams = new BehaviorSubject(convertToParamMap({}));
    reportWitness = null;
    reportAuthority = null;
    authorityRecords = null;
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
      if (path.includes('/medications/mar?')) {
        const query = new URLSearchParams(path.split('?')[1]);
        const month = query.get('month')!;
        const [year, monthNumber] = month.split('-').map(Number);
        const dates = Array.from(
          { length: new Date(Date.UTC(year, monthNumber, 0)).getUTCDate() },
          (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`,
        );
        const entry = {
          id: 'dose-1',
          outcome: 'Given',
          code: 'G',
          actualAt: `${dates[1]}T08:05:00Z`,
          actualTime: '08:05',
          staffId: 'staff-1',
          staffInitials: 'BK',
          staffName: 'Saved staff member',
          doseUnits: '1.000',
          reason: '',
          response: '',
          witnessEvidence: reportWitness,
          covertAuthorityRecord: reportAuthority,
        };
        const medicine = {
          ...prescription(),
          name: 'Monthly prescription',
          notes: 'Saved instructions',
          discontinuedAt: null,
          prnAdministrations: [],
        };
        return {
          company_id: 'north',
          service_user_id: 'client',
          month,
          sheet: query.get('sheet'),
          timezone: 'Europe/London',
          dates,
          prescriptions: [
            {
              ...medicine,
              slots: [
                {
                  scheduledTime: '08:00',
                  cells: dates.map((date, index) => ({
                    date,
                    state: index === 0 ? 'recorded' : 'unrecorded',
                    administration: index === 0 ? entry : null,
                  })),
                },
              ],
            },
            {
              ...medicine,
              id: 'med-2',
              name: 'As-required prescription',
              frequency: 'PRN',
              slots: [],
              prnAdministrations: [
                {
                  ...entry,
                  id: 'dose-2',
                  date: dates[0],
                  time: '14:30',
                  actualAt: `${dates[0]}T14:30:00Z`,
                  actualTime: '14:30',
                  staffId: '2',
                  staffInitials: 'ID-2',
                  staffName: 'management@example.com',
                  response: 'Saved effectiveness',
                },
              ],
            },
          ],
          codes: [
            {
              code: 'R',
              label: 'Refused',
              outcome: 'Refused',
              description: 'Backend reason for this code.',
            },
          ],
          staff: [
            { id: 'staff-1', initials: 'BK', name: 'Saved staff member', role: 'Care Worker' },
            { id: '2', initials: 'ID-2', name: 'management@example.com', role: null },
          ],
          summary: {
            scheduled: 10,
            due: 5,
            requiredDue: 5,
            pending: 5,
            unrecorded: 1,
            complianceRate: '60.0',
            outcomes: [{ outcome: 'Refused', count: 1 }],
          },
          notes: [
            {
              id: 'saved-note',
              medicationName: 'Recorded medicine',
              kind: 'prescription',
              date: null,
              text: 'Saved note from the backend.',
            },
          ],
        };
      }
      if (path.endsWith('/export') || path.includes('/mar/export?'))
        return new Blob(['Medication,Outcome\nRecorded medicine,Given'], { type: 'text/csv' });
      if (path.endsWith('/administrations')) return { company_id: 'north', id: 'dose-1' };
      if (authorityRecords && path.endsWith('/med-1')) return workspace.prescriptions[0];
      if (authorityRecords && path.includes('/covert-authorities'))
        return { company_id: 'north', medicationId: 'med-1', records: authorityRecords };
      if (path.endsWith('/medications') && method === 'POST') return { ...prescription(), ...body };
      if (path.endsWith('/medications')) return structuredClone(workspace);
      return { ...prescription(), ...body };
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { api } },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: params,
            queryParamMap: queryParams,
            snapshot: { paramMap: params.value },
          },
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
  it('keeps the audit trail below the MAR after removing the old cards', async () => {
    await settle(fixture);
    expect(api).toHaveBeenCalledWith('/companies/north/service-users/client/medications');
    const page = fixture.nativeElement as HTMLElement;
    const audit = page.querySelector('cv-mar-report + .medication-audit-panel');
    expect(audit?.textContent).toContain('Medication audit trail');
    expect(audit?.textContent).toContain('No medication changes recorded.');
    expect(page.querySelector('.medication-register-panel')).toBeNull();
    expect(page.querySelector('.mar-settings-preview')).toBeNull();
    expect(editor.lowStock()).toHaveLength(0);
  });
  it('renders saved scheduled and PRN entries and expands the reported month locally', async () => {
    await settle(fixture);
    await fixture.whenStable();
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    const preview = page.querySelector('cv-mar-report')!;
    expect(preview.querySelector('.chart')?.textContent).toContain('Monthly prescription');
    expect(preview.querySelector('.chart')?.textContent).toContain('08:05');
    expect(preview.querySelector('.entry .outcome')?.parentElement?.textContent).toContain(
      '02/11/2026',
    );
    expect(preview.querySelector('.prn-table')?.textContent).toContain('Saved effectiveness');
    expect(preview.querySelector('.prn-table tbody td:last-child')?.textContent).toContain('ID-2');
    const signatures = preview.querySelector('table[aria-labelledby="mar-staff-key"]')!;
    expect(signatures.textContent).toContain('ID-2');
    expect(signatures.textContent).toContain('management@example.com');
    expect(preview.querySelectorAll('.day')).toHaveLength(12);
    expect(preview.querySelector('.summary')?.textContent).toContain('60.0%');

    const requestCount = api.mock.calls.length;
    const toggle = preview.querySelector<HTMLButtonElement>(
      'button[aria-controls="mar-report-grid"]',
    )!;
    const actions = toggle.nextElementSibling!;
    const controls = actions.querySelectorAll('mat-select, button');
    expect(controls).toHaveLength(4);
    expect(controls[0].getAttribute('aria-label')).toBe('MAR sheet type');
    expect(controls[1].getAttribute('aria-label')).toBe('Medication status');
    expect(controls[2].textContent).toContain('Manage medications');
    expect(controls[3].textContent).toContain('Add Medication');
    toggle.click();
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(preview.querySelectorAll('.day')).toHaveLength(30);
    expect(preview.querySelectorAll('.entry .outcome')).toHaveLength(1);
    expect(api).toHaveBeenCalledTimes(requestCount);
  });
  it('loads all four supporting cards for the selected month and sheet', async () => {
    await settle(fixture);
    await fixture.whenStable();
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    const live = page.querySelector('.mar-support')!;
    expect(api).toHaveBeenCalledWith(
      '/companies/north/service-users/client/medications/mar?month=2026-11&sheet=standard',
    );
    expect(live.textContent).toContain('Backend reason for this code.');
    expect(live.textContent).toContain('Saved staff member');
    expect(live.textContent).toContain('Saved note from the backend.');
    const month = live.querySelector<HTMLInputElement>('#mar-report-month')!;
    month.value = '2026-10';
    month.dispatchEvent(new Event('change'));
    await settle(fixture);
    editor.sheet.set('Controlled');
    await settle(fixture);
    expect(api).toHaveBeenCalledWith(
      '/companies/north/service-users/client/medications/mar?month=2026-10&sheet=controlled',
    );
    expect(live.textContent).toContain('October 2026');
  });

  it('clears saved support cards during a period change and offers a retry on failure', async () => {
    await settle(fixture);
    const fallback = api.getMockImplementation() as (
      path: string,
      ...args: unknown[]
    ) => Promise<unknown>;
    api.mockImplementation(async (path, ...args) => {
      if (path.includes('month=2026-10')) throw Error('MAR unavailable');
      return fallback(path, ...args);
    });
    const live = (fixture.nativeElement as HTMLElement).querySelector('.mar-support')!;
    const month = live.querySelector<HTMLInputElement>('#mar-report-month')!;
    month.value = '2026-10';
    month.dispatchEvent(new Event('change'));
    await settle(fixture);
    expect(live.querySelector('[role="alert"]')?.textContent).toContain('could not be loaded');
    expect(live.textContent).not.toContain('Saved staff member');
    expect(live.querySelector('.chart')).toBeNull();
    api.mockImplementation(fallback);
    live.querySelector<HTMLButtonElement>('.mar-card-state button')!.click();
    await settle(fixture);
    expect(live.textContent).toContain('Saved staff member');
  });

  it('shows an empty period when the report returns no prescriptions', async () => {
    const fallback = api.getMockImplementation() as (
      path: string,
      ...args: unknown[]
    ) => Promise<object>;
    api.mockImplementation(async (path, ...args) => {
      const response = await fallback(path, ...args);
      return path.includes('/medications/mar?')
        ? { ...response, prescriptions: [], staff: [], notes: [] }
        : response;
    });
    await settle(fixture);
    await fixture.whenStable();
    fixture.detectChanges();
    const report = (fixture.nativeElement as HTMLElement).querySelector('cv-mar-report')!;
    expect(report.textContent).toContain('No MAR prescriptions for this period.');
    expect(report.querySelector('.chart')).toBeNull();
    expect(report.querySelector('.prn-table')).toBeNull();
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
    editor.record.doseUnits = 1;
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
  it('submits a cross-midnight actual time in the company timezone without changing the scheduled slot', async () => {
    workspace.timezone = 'Africa/Nairobi';
    await settle(fixture);
    await editor.startRecord();
    await settle(fixture);
    const page = fixture.nativeElement as HTMLElement;
    const actual = page.querySelector<HTMLInputElement>('[name="actualAt"]')!;
    expect(actual.value).toBe('');
    expect(actual.closest('label')?.textContent).toContain('Africa/Nairobi');
    editor.record.doseUnits = 1;
    actual.value = '2026-11-12T00:04';
    actual.dispatchEvent(new Event('input'));
    const reportRequests = () =>
      api.mock.calls.filter(([path]) => path.includes('/medications/mar?'));
    const before = reportRequests().length;
    await editor.save();
    await vi.waitFor(() => expect(reportRequests()).toHaveLength(before + 1));
    expect(api.mock.calls.find(([path]) => path.endsWith('/administrations'))?.[1]).toMatchObject({
      date: '2026-11-11',
      time: '08:00',
      actualAt: '2026-11-11T21:04:00.000Z',
    });
  });
  it('requires an unambiguous actual time during a clock change', async () => {
    await settle(fixture);
    await editor.startRecord();
    editor.record.doseUnits = 1;
    for (const time of ['2026-03-29T01:30', '2026-10-25T01:30']) {
      editor.record.actualLocal = time;
      await editor.save();
      expect(editor.fieldError('actualAt')).toContain('unambiguous');
    }
    expect(api.mock.calls.some(([path]) => path.endsWith('/administrations'))).toBe(false);
    expect(editor.modal()).toBe('record');
  });
  it('offers all six clinical outcomes and only requires an administered quantity for Given', async () => {
    await settle(fixture);
    await editor.startRecord();
    await settle(fixture);
    const page = fixture.nativeElement as HTMLElement;
    const outcome = await TestbedHarnessEnvironment.loader(fixture).getHarness(
      MatSelectHarness.with({ selector: '[name="outcome"]' }),
    );
    await outcome.open();
    expect(
      await Promise.all((await outcome.getOptions()).map((option) => option.getText())),
    ).toEqual([
      'Given (G)',
      'Refused (R)',
      'Omitted (O)',
      'Absent (A)',
      'Not available (N)',
      'Not required (NR)',
    ]);
    const quantity = page.querySelector<HTMLInputElement>('[name="doseUnits"]')!;
    expect(quantity.required).toBe(true);
    quantity.value = '2';
    quantity.dispatchEvent(new Event('input'));
    await settle(fixture);
    for (const option of workspace.outcomes.slice(1)) {
      await outcome.clickOptions({ text: `${option.label} (${option.code})` });
      expect(page.querySelector('[name="doseUnits"]')).toBeNull();
      expect(page.querySelector('[name="reason"]')?.getAttribute('aria-required')).toBe('true');
      expect(page.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    }
    editor.record.reason = 'Recorded instruction';
    editor.record.response = 'Monitoring response';
    await editor.save();
    expect(api.mock.calls.find(([path]) => path.endsWith('/administrations'))?.[1]).toMatchObject({
      outcome: 'Not required',
      doseUnits: null,
      reason: 'Recorded instruction',
      response: 'Monitoring response',
    });
  });
  it('uses the entered PRN date and time as the actual administration instant', async () => {
    workspace.timezone = 'Asia/Kathmandu';
    const prn = { ...prescription(), frequency: 'PRN', times: [] };
    workspace.prescriptions = [prn];
    await settle(fixture);
    api.mockResolvedValueOnce(prn);
    await editor.startRecord();
    await settle(fixture);
    const page = fixture.nativeElement as HTMLElement;
    const time = page.querySelector<HTMLInputElement>('[name="time"]')!;
    expect(time.closest('label')?.textContent).toContain('Actual administration time');
    expect(time.value).toBe('');
    expect(page.querySelector('[name="actualAt"]')).toBeNull();
    editor.record.doseUnits = 1;
    editor.record.time = '05:00';
    await editor.save();
    expect(api.mock.calls.find(([path]) => path.endsWith('/administrations'))?.[1]).toMatchObject({
      date: '2026-11-11',
      time: '05:00',
      actualAt: '2026-11-10T23:15:00.000Z',
    });
  });
  it('locks a pending prescription switch and saves the quantity and response for the loaded medicine', async () => {
    const first = prescription();
    const second = {
      ...prescription(),
      id: 'med-2',
      name: 'Second medicine',
      times: ['09:00'],
      stock: '30.000',
      etag: '"v2"',
    };
    workspace.prescriptions.push(second);
    const fresh = { ...second, times: ['12:30'], etag: '"v3"' };
    await settle(fixture);
    await editor.startRecord();
    await settle(fixture);

    let resolveDetail!: (row: typeof fresh) => void;
    const detail = new Promise<typeof fresh>((resolve) => (resolveDetail = resolve));
    const fallback = api.getMockImplementation() as (
      path: string,
      ...args: unknown[]
    ) => Promise<unknown>;
    api.mockImplementation(async (path, body, method, ...args) => {
      if (path.endsWith('/medications/med-2')) return detail;
      if (path.endsWith('/medications/med-2/administrations') && method === 'POST') {
        const row = {
          ...body,
          company_id: 'north',
          id: 'new-dose',
          medicationId: second.id,
          at: '2026-11-11T12:31:00Z',
          by: 'Recorder',
          userId: 'actor',
          correctionOf: null,
          etag: '"dose-v1"',
        };
        workspace.administrations.push(row);
        second.stock = (Number(second.stock) - Number(row.doseUnits)).toFixed(3);
        return row;
      }
      return fallback(path, body, method, ...args);
    });

    const page = fixture.nativeElement as HTMLElement;
    const select = await TestbedHarnessEnvironment.loader(fixture).getHarness(
      MatSelectHarness.with({ selector: '[name="recordMedication"]' }),
    );
    const setField = (name: string, value: string) => {
      const field = page.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`)!;
      field.value = value;
      field.dispatchEvent(new Event('input'));
    };
    const submit = page.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValue(true);
    setField('doseUnits', '3');
    setField('response', 'Draft for the first medicine');
    await select.clickOptions({ text: 'Second medicine 10 mg' });
    expect(confirm).toHaveBeenCalledOnce();
    expect(await select.getValueText()).toContain(first.name);
    expect(editor.record).toMatchObject({ doseUnits: 3, response: 'Draft for the first medicine' });
    expect(api.mock.calls.some(([path]) => path.endsWith('/medications/med-2'))).toBe(false);

    await select.clickOptions({ text: 'Second medicine 10 mg' });
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(await select.isDisabled()).toBe(true);
    expect(page.querySelector('form')?.getAttribute('aria-busy')).toBe('true');
    expect(page.querySelector('[role="dialog"] [role="status"]')?.textContent).toContain(
      'Loading prescription details',
    );
    for (const name of ['date', 'time', 'doseUnits', 'reason', 'response']) {
      expect(page.querySelector(`[name="${name}"]`)?.matches(':disabled')).toBe(true);
    }
    expect(submit.disabled).toBe(true);
    await editor.save();
    expect(workspace.administrations).toHaveLength(0);

    resolveDetail(fresh);
    await settle(fixture);
    expect(await select.getValueText()).toContain(second.name);
    expect(editor.canLeave()).toBe(true);
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(await select.isDisabled()).toBe(false);
    expect(page.querySelector<HTMLInputElement>('[name="time"]')?.value).toBe('12:30');
    expect(page.querySelector<HTMLInputElement>('[name="doseUnits"]')?.value).toBe('');
    expect(page.querySelector<HTMLTextAreaElement>('[name="response"]')?.value).toBe('');
    expect(submit.disabled).toBe(true);
    await editor.save();
    expect(workspace.administrations).toHaveLength(0);

    setField('doseUnits', '2.5');
    setField('response', 'Monitoring response for the second medicine');
    await settle(fixture);
    expect(submit.disabled).toBe(false);
    submit.click();
    await vi.waitFor(() => expect(editor.saving()).toBe(false));
    await settle(fixture);

    const request = api.mock.calls.find(([path]) => path.endsWith('/med-2/administrations'))!;
    expect(request[3]).toMatchObject({ 'If-Match': fresh.etag });
    expect(workspace.administrations).toEqual([
      expect.objectContaining({
        medicationId: second.id,
        time: '12:30',
        doseUnits: '2.5',
        response: 'Monitoring response for the second medicine',
      }),
    ]);
    expect(editor.prescriptions().map((row: { stock: number }) => row.stock)).toEqual([20, 27.5]);
    expect(editor.records()[0]).toMatchObject({
      medicationId: second.id,
      doseUnits: 2.5,
      response: 'Monitoring response for the second medicine',
    });
  });
  it('sends stock adjustments and discontinuation to their backend commands', async () => {
    await settle(fixture);
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const menu = await loader.getHarness(
      MatMenuHarness.with({ triggerText: 'Manage medications' }),
    );
    await menu.clickItem({ text: 'Recorded medicine 10 mg' }, { text: 'Stock' });
    await settle(fixture);
    expect(editor.modal()).toBe('stock');
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
  it.each([
    {
      label: 'Add Medication',
      kind: 'medication',
      existing: false,
      field: 'name',
      value: 'New name',
    },
    {
      label: 'Edit Medication',
      kind: 'medication',
      existing: true,
      field: 'times',
      value: '12:30',
    },
    {
      label: 'Record dose',
      kind: 'record',
      existing: true,
      field: 'response',
      value: 'Observation',
    },
    { label: 'Adjust stock', kind: 'stock', existing: true, field: 'stockChange', value: '4' },
    { label: 'Discontinue', kind: 'discontinue', existing: true, field: 'reason', value: 'Reason' },
  ])('guards only unsaved changes in $label', async ({ kind, existing, field, value }) => {
    await settle(fixture);
    const page = fixture.nativeElement as HTMLElement;
    const open = async () => {
      await editor.open(kind, existing ? editor.prescriptions()[0] : undefined);
      await settle(fixture);
    };
    const cancel = () => {
      const button = [...page.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(
        (candidate) => candidate.textContent.trim() === 'Cancel',
      )!;
      button.click();
    };
    const unload = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    const routeGuard = CARE_ROUTES.find((route) => route.path === 'medication')!
      .canDeactivate![0] as (component: Medication) => boolean;
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

    await open();
    expect(routeGuard(editor)).toBe(true);
    expect(unload()).toBe(false);
    cancel();
    expect(editor.modal()).toBe('');
    expect(confirm).not.toHaveBeenCalled();

    await open();
    const input = page.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      `[role="dialog"] [name="${field}"]`,
    )!;
    const initial = input.value;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await settle(fixture);
    expect(routeGuard(editor)).toBe(false);
    expect(unload()).toBe(true);
    cancel();
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(editor.modal()).toBe(kind);
    expect(input.value).toBe(value);

    input.value = initial;
    input.dispatchEvent(new Event('input'));
    await settle(fixture);
    expect(routeGuard(editor)).toBe(true);
    expect(unload()).toBe(false);
    cancel();
    expect(editor.modal()).toBe('');
    expect(confirm).toHaveBeenCalledTimes(2);
  });
  it('keeps an invalid draft dirty and marks the named field red', async () => {
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
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(editor.canLeave()).toBe(false);
    editor.close();
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(editor.modal()).toBe('medication');
    expect(editor.draft.name).toBe('Rejected draft');
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
  it('ignores a pending prescription after closing and reopening Record dose', async () => {
    const second = { ...prescription(), id: 'med-2', name: 'Second medicine' };
    workspace.prescriptions.push(second);
    await settle(fixture);
    await editor.startRecord();
    await settle(fixture);
    let resolveDetail!: (row: typeof second) => void;
    api.mockReturnValueOnce(new Promise((resolve) => (resolveDetail = resolve)));
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const select = await loader.getHarness(
      MatSelectHarness.with({ selector: '[name="recordMedication"]' }),
    );
    const confirm = vi.spyOn(window, 'confirm');
    await select.clickOptions({ text: 'Second medicine 10 mg' });
    expect(await select.isDisabled()).toBe(true);
    const page = fixture.nativeElement as HTMLElement;
    page.querySelector<HTMLButtonElement>('[aria-label="Close medication editor"]')!.click();
    await settle(fixture);
    expect(confirm).not.toHaveBeenCalled();
    expect(page.querySelector('[role="dialog"]')).toBeNull();

    await editor.startRecord();
    await settle(fixture);
    resolveDetail(second);
    await settle(fixture);
    const reopened = await loader.getHarness(
      MatSelectHarness.with({ selector: '[name="recordMedication"]' }),
    );
    expect(await reopened.getValueText()).toContain('Recorded medicine');
    expect(editor.record).toMatchObject({ medicationId: 'med-1', doseUnits: null });
    expect(await reopened.isDisabled()).toBe(false);
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
  it('exports the selected month and sheet, reports an empty period, and keeps history separate', async () => {
    await settle(fixture);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:export');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const downloads: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloads.push(this.download);
    });
    const page = fixture.nativeElement as HTMLElement;
    const selectMonth = async (value: string) => {
      const month = page.querySelector<HTMLInputElement>('#mar-report-month')!;
      month.value = value;
      month.dispatchEvent(new Event('change'));
      await settle(fixture);
    };
    const root = '/companies/north/service-users/client/medications';
    await editor.export();
    await selectMonth('2026-10');
    editor.sheet.set('Controlled');
    await settle(fixture);
    await editor.export();
    expect(downloads).toEqual([
      'mar-2026-11-standard-client.csv',
      'mar-2026-10-controlled-client.csv',
    ]);
    await selectMonth('2026-09');
    api.mockResolvedValueOnce(new Blob());
    await editor.export();
    await settle(fixture);
    expect(downloads).toHaveLength(2);
    expect(page.textContent).toContain(
      'No MAR administrations recorded for 2026-09 on the controlled sheet.',
    );
    await editor.export('history');
    expect(downloads.at(-1)).toBe('mar-history-client.csv');
    expect(
      api.mock.calls.filter(([path]) => path.includes('/export')).map(([path]) => path),
    ).toEqual([
      root + '/mar/export?month=2026-11&sheet=standard',
      root + '/mar/export?month=2026-10&sheet=controlled',
      root + '/mar/export?month=2026-09&sheet=controlled',
      root + '/export',
    ]);
  });
  it('revalidates printing through the same permission and reporting period', async () => {
    reportAuthority = { id: 'authority-1', revision: 1, decisionReference: 'Decision-1042' };
    reportWitness = verifiedWitness;
    await settle(fixture);
    const print = vi.spyOn(window, 'print').mockImplementation(() => {
      const output = (fixture.nativeElement as HTMLElement).querySelector('.mar-print-output');
      expect(output?.textContent).toContain('Decision-1042');
      expect(output?.textContent).toContain('Verified colleague (Verified)');
      expect(output?.textContent).toContain('November 2026');
    });
    await editor.print();
    window.dispatchEvent(new Event('afterprint'));
    await settle(fixture);
    expect(print).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('.mar-print-output')).toBeNull();
    expect(
      api.mock.calls.some(([path]) => path.endsWith('/mar/export?month=2026-11&sheet=standard')),
    ).toBe(true);
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
        actualAt: '2026-11-10T08:04:24Z',
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
    expect(fixture.nativeElement.querySelector('[name="time"]').readOnly).toBe(true);
    expect(fixture.nativeElement.querySelector('[name="actualAt"]').value).toBe('2026-11-10T08:04');
    editor.record.reason = 'Correction reason';
    await editor.save();
    expect(
      api.mock.calls.some(
        (c: any[]) =>
          c[0].endsWith('/administrations/dose-1') &&
          c[2] === 'PATCH' &&
          c[1].actualAt === '2026-11-10T08:04:24Z' &&
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
    expect(fixture.nativeElement.querySelector('#witness-request-title')).toBeNull();
    await editor.save();
    expect(
      api.mock.calls.some(
        (c: any[]) =>
          c[0].endsWith('/administrations') &&
          c[1].outcome === 'Refused' &&
          !c[1].witnessApprovalId,
      ),
    ).toBe(true);
  });
  function covertAuthority(status: CovertAuthorityRead['status']): CovertAuthorityRead {
    return {
      id: 'authority-1',
      revision: 1,
      etag: '"v1"',
      status,
      decisionReference: 'Decision-1042',
      prescriber: 'Recorded prescriber',
      careLead: 'Recorded care lead',
      representative: 'Recorded advocate',
      instructions: 'Instructions recorded with the decision.',
      effectiveFrom: '2026-11-10',
      effectiveTo: '2026-11-30',
      reviewDue: '2026-11-28',
      approvedAt: status === 'pending' ? null : '2026-11-10T09:00:00Z',
      approvedBy: status === 'pending' ? null : 'Authorised approver',
      revokedAt: null,
      revokedBy: null,
      revocationReason: '',
    };
  }
  it('blocks pending covert authority and binds the approval acknowledgement to the actual dose', async () => {
    workspace.prescriptions[0] = {
      ...prescription(),
      covert: true,
      covertAuthority: 'Unverified note',
    };
    authorityRecords = [covertAuthority('pending')];
    reportAuthority = { id: 'authority-1', revision: 1, decisionReference: 'Decision-1042' };
    await settle(fixture);
    await editor.startRecord();
    await settle(fixture);
    const page = fixture.nativeElement as HTMLElement;
    const region = () => page.querySelector('[aria-labelledby="covert-dose-title"]')!;
    const save = () => page.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(region().textContent).toContain('Pending approval');
    expect(region().textContent).not.toContain('Instructions recorded with the decision.');
    expect(save().disabled).toBe(true);
    expect(page.querySelectorAll('.mar-covert-authority')).toHaveLength(2);

    editor.close();
    authorityRecords = [covertAuthority('approved')];
    await editor.startRecord();
    await settle(fixture);
    const enter = (name: string, value: string) => {
      const field = page.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
    };
    enter('actualAt', '2026-11-11T08:04');
    enter('doseUnits', '2');
    await settle(fixture);
    expect(region().textContent).toContain('Instructions recorded with the decision.');
    expect(save().disabled).toBe(true);
    const acknowledge = () =>
      page.querySelector<HTMLInputElement>('[name="covertAcknowledged"]')!.click();
    acknowledge();
    await settle(fixture);
    expect(save().disabled).toBe(false);
    enter('actualAt', '2026-11-11T08:05');
    await settle(fixture);
    expect(save().disabled).toBe(true);
    acknowledge();
    await settle(fixture);
    await editor.save();
    expect(api.mock.calls.find(([path]) => path.endsWith('/administrations'))?.[1]).toMatchObject({
      actualAt: '2026-11-11T08:05:00.000Z',
      covertAuthorityId: 'authority-1',
      covertAcknowledged: true,
    });
  });
  it('requires the approver to confirm the covert decision before sending approval', async () => {
    permissions.add('approve');
    workspace.prescriptions[0] = { ...prescription(), covert: true };
    authorityRecords = [covertAuthority('pending')];
    await settle(fixture);
    await editor.open('covert', workspace.prescriptions[0]);
    await settle(fixture);
    const page = fixture.nativeElement as HTMLElement;
    const approve = [...page.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === 'Approve authority',
    )!;
    expect(approve.disabled).toBe(true);
    page.querySelector<HTMLInputElement>('[name="verifyCovertDecision"]')!.click();
    await settle(fixture);
    expect(approve.disabled).toBe(false);
    authorityRecords = [covertAuthority('approved')];
    approve.click();
    await settle(fixture);
    expect(
      api.mock.calls.find(([path]) => path.endsWith('/covert-authorities/authority-1')),
    ).toEqual([
      expect.any(String),
      { action: 'approve', confirmed: true },
      'PATCH',
      { 'If-Match': '"v1"' },
    ]);
    expect(page.querySelector('[aria-label="Covert authority version"]')?.textContent).toContain(
      'Authorised approver',
    );
  });
  const verifiedWitness = {
    status: 'verified' as const,
    name: 'Verified colleague',
    userId: 'witness',
    attestedAt: '2026-11-11T08:05:00Z',
  };
  function approval(medicationId = 'med-1'): MedicationWitnessRead {
    return {
      id: '77000000-0000-0000-0000-000000000001',
      company_id: 'north',
      medicationId,
      medicationName: 'Controlled medicine 10 mg',
      requester: 'Recording colleague',
      correctionOf: null,
      draft: {
        date: '2026-11-11',
        time: '08:00',
        outcome: 'Given',
        doseUnits: '2.000',
        response: 'Observation',
      },
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
      status: 'pending',
      canAttest: false,
      witnessEvidence: null,
    };
  }
  it('binds the controlled dose to a confirmed approval and invalidates it when the editor changes', async () => {
    await settle(fixture);
    api.mockResolvedValueOnce({ ...prescription(), controlled: true });
    await editor.startRecord();
    await settle(fixture);
    const page = fixture.nativeElement as HTMLElement;
    const units = page.querySelector<HTMLInputElement>('[name="doseUnits"]')!;
    const response = page.querySelector<HTMLTextAreaElement>('[name="response"]')!;
    const enter = (element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    };
    enter(units, '2');
    enter(response, 'Observation');
    await settle(fixture);
    const save = page.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(save.disabled).toBe(true);
    expect(page.querySelector('[name="witness"]')).toBeNull();
    const request = approval();
    api.mockResolvedValueOnce(request);
    await editor.updateWitness(false);
    await settle(fixture);
    expect(
      page.querySelector<HTMLInputElement>('[aria-label="Witness request link"]')?.value,
    ).toContain(request.id);
    expect(save.disabled).toBe(true);
    api.mockResolvedValueOnce({ ...request, status: 'approved', witnessEvidence: verifiedWitness });
    await editor.updateWitness(true);
    await settle(fixture);
    expect(save.disabled).toBe(false);
    expect(page.textContent).toContain('Verified colleague (Verified)');
    enter(units, '3');
    await settle(fixture);
    expect(save.disabled).toBe(true);
    await editor.save();
    expect(api.mock.calls.some(([path]) => path.endsWith('/administrations'))).toBe(false);
    enter(units, '2');
    await settle(fixture);
    await editor.save();
    expect(api.mock.calls.find(([path]) => path.endsWith('/administrations'))?.[1]).toMatchObject({
      doseUnits: '2',
      response: 'Observation',
      witnessApprovalId: request.id,
    });
  });
  it('requires explicit confirmation from the witness and renders persisted chart evidence', async () => {
    reportWitness = verifiedWitness;
    const medicationId = '77000000-0000-0000-0000-000000000002';
    const request = approval(medicationId);
    await settle(fixture);
    api.mockResolvedValueOnce({ ...request, canAttest: true });
    queryParams.next(
      convertToParamMap({ witnessMedication: medicationId, witnessApproval: request.id }),
    );
    await settle(fixture);
    const page = fixture.nativeElement as HTMLElement;
    const review = page.querySelector<HTMLElement>('[aria-labelledby="witness-review-title"]')!;
    const attest = review.querySelector<HTMLButtonElement>('button')!;
    expect(attest.disabled).toBe(true);
    expect(review.textContent).toContain('2.000 administered stock units');
    review.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    await settle(fixture);
    expect(attest.disabled).toBe(false);
    api.mockResolvedValueOnce({ ...request, status: 'approved', witnessEvidence: verifiedWitness });
    attest.click();
    await settle(fixture);
    expect(api.mock.calls.find(([, , method]) => method === 'PATCH')?.[1]).toEqual({
      attested: true,
    });
    expect(review.textContent).toContain('Verified colleague (Verified)');
    expect(page.querySelectorAll('cv-mar-report .mar-witness')).toHaveLength(2);
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
