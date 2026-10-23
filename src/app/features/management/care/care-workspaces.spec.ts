import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { ManagementStore } from '../shared/management.store';
import { RotaService } from '../rota/rota.service';
import { emptyClientFile } from '../clients/client-file.models';
import { CareService } from './care.service';
import { Medication } from './medication';
import { CareRecords } from './care-records';
import { VisitPlanner } from './visit-planner';
import { ServiceUserDirectory } from './service-user-directory';
import { FamilyPortal } from './family-portal';
import { blankPrescription } from './care.models';

describe('Care workspaces', () => {
  let rota: RotaService, care: CareService, store: ManagementStore;
  const params = new BehaviorSubject(
    convertToParamMap({ id: 'client', clientId: 'client', accessId: 'family' }),
  );
  const data = new BehaviorSubject({ careSection: 'contacts' });
  beforeEach(() => {
    localStorage.clear();
    params.next(convertToParamMap({ id: 'client', clientId: 'client', accessId: 'family' }));
    data.next({ careSection: 'contacts' });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: params.asObservable(),
            data: data.asObservable(),
            queryParamMap: new BehaviorSubject(convertToParamMap({})),
            snapshot: {
              paramMap: params.value,
              data: data.value,
              queryParamMap: convertToParamMap({}),
            },
          },
        },
      ],
    });
    TestBed.inject(AuthService).signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    rota = TestBed.inject(RotaService);
    care = TestBed.inject(CareService);
    store = TestBed.inject(ManagementStore);
    rota.saveClient({
      id: 'client',
      name: 'Mary Test',
      reference: 'C1',
      address: '1 Test Street',
      postcode: 'HA1 1AA',
      funding: 'Private',
      priority: 'Standard',
      active: true,
      file: emptyClientFile(),
    });
  });
  it('shares a dated family update only after publishing and guards an unfinished update', async () => {
    data.next({ careSection: 'family' });
    const fixture = TestBed.createComponent(CareRecords);
    fixture.detectChanges();
    await fixture.whenStable();
    const editor = fixture.componentInstance as any;
    editor.editUpdate('Approved update for the family');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(editor.canLeave()).toBe(false);
    expect(care.client('client')?.file?.familyUpdates).toBeUndefined();
    editor.shareUpdate();
    fixture.detectChanges();
    expect(care.client('client')?.file?.familyUpdates?.[0].text).toBe(
      'Approved update for the family',
    );
    expect(editor.canLeave()).toBe(true);
    confirm.mockRestore();
  });
  it('opens the medication drawer, retains invalid drafts, saves and renders the MAR schedule', async () => {
    const fixture = TestBed.createComponent(Medication);
    fixture.detectChanges();
    const editor = fixture.componentInstance as any;
    editor.open('medication');
    editor.save();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Complete');
    editor.draft = {
      ...blankPrescription(),
      name: 'Test prescription',
      strength: '500mg',
      dose: '1 tablet',
      prescriber: 'Dr Test',
      pharmacy: 'Pharmacy',
      indication: 'Recorded reason',
    };
    editor.timeText = '08:00, 18:00';
    editor.save();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.mar-table').textContent).toContain(
      'Test prescription',
    );
    expect(fixture.nativeElement.querySelector('.mar-table').textContent).toContain('18:00');
    editor.period.set('Month');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.mar-table thead th').length).toBeGreaterThan(
      28,
    );
  });
  it('shows contacts, documents, sharing permissions and audit without a second client record', async () => {
    const fixture = TestBed.createComponent(CareRecords);
    for (const section of ['contacts', 'documents', 'family', 'audit']) {
      data.next({ careSection: section });
      fixture.detectChanges();
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('cv-care-header').textContent).toContain(
        'Mary Test',
      );
      expect(fixture.nativeElement.textContent).not.toContain('Service user unavailable');
    }
    expect(rota.data().clients).toHaveLength(1);
  });
  it('bounds directory pages after filtering and provides a card view of the same results', async () => {
    for (let i = 0; i < 12; i++)
      rota.saveClient({
        id: 'c' + i,
        name: 'Person ' + i,
        reference: 'R' + i,
        address: 'Road',
        postcode: 'HA1 1AA',
        funding: 'NHS',
        active: true,
        priority: 'Standard',
      });
    const fixture = TestBed.createComponent(ServiceUserDirectory);
    const directory = fixture.componentInstance as any;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(8);
    directory.page.set(2);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(5);
    directory.view.set('Cards');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.directory-cards article')).toHaveLength(5);
    directory.view.set('Table');
    directory.query.set('Mary');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Page 1 of 1');
    directory.view.set('Cards');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.directory-cards article')).toHaveLength(1);
  });
  it('renders all planner views and opens a client-scoped recurring allocation form', async () => {
    const fixture = TestBed.createComponent(VisitPlanner);
    const planner = fixture.componentInstance as any;
    for (const view of ['Week', 'Month', 'List', 'Staff', 'Service user']) {
      planner.view.set(view);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(fixture.nativeElement.textContent).toContain('Mary Test');
    }
    planner.create();
    fixture.detectChanges();
    expect(planner.plan.clientId).toBe('client');
    expect(fixture.nativeElement.querySelector('[role="dialog"]').textContent).toContain(
      'Plan recurring visits',
    );
  });
  it('does not render denied clinical data or allow a nonmatching family account', () => {
    vi.spyOn(rota, 'can').mockReturnValue(false);
    const medication = TestBed.createComponent(Medication);
    medication.detectChanges();
    expect(medication.nativeElement.textContent).not.toContain('Mary Test');
    const family = TestBed.createComponent(FamilyPortal);
    family.detectChanges();
    expect(family.nativeElement.textContent).toContain('Family access unavailable');
    expect(family.nativeElement.textContent).not.toContain('Mary Test');
  });
  it('reads parameter changes without saving a draft to a newly selected client', () => {
    const fixture = TestBed.createComponent(Medication);
    fixture.detectChanges();
    const editor = fixture.componentInstance as any;
    editor.open('medication');
    params.next(convertToParamMap({ id: 'different' }));
    editor.save();
    expect(editor.error()).toContain('changed');
    expect(care.client('client')!.file!.medications).toBeUndefined();
  });
  it('retains document bytes after a failed save and retries without rereading the file', async () => {
    const fixture = TestBed.createComponent(CareRecords);
    data.next({ careSection: 'documents' });
    fixture.detectChanges();
    const records = fixture.componentInstance as any;
    const file = new File(['%PDF-1.7\nTest document'], 'care-plan.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(file, 'arrayBuffer', {
      value: async () => new TextEncoder().encode('%PDF-1.7\nTest document').buffer,
    });
    const save = vi
      .spyOn(care, 'saveDocument')
      .mockReturnValueOnce('Could not save. Storage full.');
    await records.upload({ target: { files: [file], value: 'care-plan.pdf' } });
    expect(records.pendingDocument()?.name).toBe('care-plan.pdf');
    expect(records.error()).toContain('Storage');
    records.savePendingDocument();
    expect(save).toHaveBeenCalledTimes(2);
    expect(records.pendingDocument()).toBeNull();
    expect(care.client('client')!.file!.documents).toHaveLength(1);
  });
  it('keeps failed file persistence visible and rejects unsupported upload types', async () => {
    const fixture = TestBed.createComponent(CareRecords);
    data.next({ careSection: 'documents' });
    fixture.detectChanges();
    const records = fixture.componentInstance as any;
    const input = {
      files: [new File(['<svg/>'], 'unsafe.svg', { type: 'image/svg+xml' })],
      value: 'unsafe.svg',
    };
    await records.upload({ target: input });
    fixture.detectChanges();
    expect(records.error()).toContain('PDF');
    expect(care.client('client')!.file!.documents).toBeUndefined();
  });
});

describe('Nested service-user routes', () => {
  it('resolves the client identity on every lazy workspace route', async () => {
    const { RouterTestingHarness } = await import('@angular/router/testing');
    const { CARE_ROUTES } = await import('./care.routes');
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'clients/:id', children: CARE_ROUTES }])],
    });
    TestBed.inject(AuthService).signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    TestBed.inject(RotaService).saveClient({
      id: 'client',
      name: 'Nested route person',
      reference: 'N1',
      address: 'Test Road',
      postcode: 'HA1 1AA',
      funding: 'Private',
      priority: 'Standard',
      active: true,
      file: emptyClientFile(),
    });
    const harness = await RouterTestingHarness.create();
    for (const section of [
      '',
      'medication',
      'visits',
      'contacts',
      'documents',
      'family',
      'audit',
    ]) {
      await harness.navigateByUrl('/clients/client' + (section ? '/' + section : ''));
      expect(harness.routeNativeElement!.textContent).toContain('Nested route person');
      expect(harness.routeNativeElement!.textContent).not.toContain('Service user unavailable');
    }
  });
});
