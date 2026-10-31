import { SYSTEM_DEMO_VERSION } from '../../../demo/system-demo-utils';
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
import { ProfileVisits } from './profile-visits';
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
  it('opens the medication drawer, retains invalid drafts, saves and renders the medication register', async () => {
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
    expect(
      fixture.nativeElement.querySelector('[aria-label="Medication register"]').textContent,
    ).toContain('Test prescription');
    expect(fixture.nativeElement.querySelector('.mar-table')).toBeNull();
    const preview = fixture.nativeElement.querySelector('.mar-settings-preview');
    expect(preview.textContent).toContain('Test prescription');
    expect(preview.textContent).toContain('08:00');
    expect(preview.textContent).toContain('18:00');
    expect(preview.querySelectorAll('[aria-label="Scheduled dose"]')).toHaveLength(8);
    expect(fixture.nativeElement.textContent).not.toContain('Administration history & corrections');
    expect(fixture.nativeElement.textContent).not.toContain('Additional Information');
    expect(fixture.nativeElement.querySelector('.medication-audit-panel')).not.toBeNull();
  });
  it('keeps standard and controlled registers aligned with the selected MAR sheet and preselects a PRN draft', async () => {
    const fixture = TestBed.createComponent(Medication);
    fixture.detectChanges();
    const editor = fixture.componentInstance as any;
    for (const controlled of [false, true]) {
      editor.open('medication');
      editor.draft = {
        ...blankPrescription(),
        name: controlled ? 'Controlled fixture' : 'Standard fixture',
        strength: '1mg',
        dose: '1 tablet',
        prescriber: 'Test prescriber',
        pharmacy: 'Test pharmacy',
        indication: 'Test indication',
        controlled,
      };
      editor.timeText = '08:00';
      editor.save();
    }
    fixture.detectChanges();
    await fixture.whenStable();
    const page: HTMLElement = fixture.nativeElement;
    expect(page.querySelector('[aria-label="Medication register"]')!.textContent).toContain(
      'Standard fixture',
    );
    expect(page.querySelector('[aria-label="Medication register"]')!.textContent).not.toContain(
      'Controlled fixture',
    );
    page
      .querySelector<HTMLElement>('[aria-label="MAR sheet type"] .mat-mdc-select-trigger')!
      .click();
    fixture.detectChanges();
    await fixture.whenStable();
    [...document.querySelectorAll<HTMLElement>('mat-option')]
      .find((option) => option.textContent!.includes('Controlled drugs'))!
      .click();
    fixture.detectChanges();
    expect(page.querySelector('[aria-label="Medication register"]')!.textContent).toContain(
      'Controlled fixture',
    );
    expect(page.querySelector('[aria-label="Medication register"]')!.textContent).not.toContain(
      'Standard fixture',
    );
    expect(page.querySelector('.mar-table')).toBeNull();
    expect(page.querySelector('.mar-preview-table')!.textContent).toContain('Controlled fixture');
    expect(page.querySelector('.mar-preview-table')!.textContent).not.toContain('Standard fixture');
    editor.addPrn();
    fixture.detectChanges();
    expect(page.querySelector('[aria-label="Medication record summary"]')!.textContent).toContain(
      'Current medicines',
    );
    editor.modal.set('');
    editor.open('medication');
    expect(editor.draft.controlled).toBe(true);
    editor.addPrn();
    expect(editor.draft.frequency).toBe('PRN');
    expect(editor.draft.controlled).toBe(true);
    expect(editor.timeText).toBe('');
    expect(page.querySelector('[role="dialog"]')).not.toBeNull();
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
  it('applies roster filter drafts together and clears specialist training requirements', () => {
    const fixture = TestBed.createComponent(VisitPlanner);
    const planner = fixture.componentInstance as any;
    planner.filterDraft.client = 'client';
    planner.filterDraft.medication = 'Yes';
    planner.filterDraft.handling = 'No';
    planner.filterDraft.unallocated = true;
    expect(planner.clientFilter()).toBe('');
    expect(planner.trainingFilters()).toEqual({});
    planner.applyFilters();
    expect(planner.clientFilter()).toBe('client');
    expect(planner.trainingFilters()).toMatchObject({ medication: 'Yes', handling: 'No' });
    expect(planner.allocationFilter()).toBe('Unallocated');
    planner.clear();
    expect(planner.trainingFilters()).toEqual({});
    expect(planner.allocationFilter()).toBe('All');
    expect(planner.filterDraft.medication).toBe('');
  });
  it('renders complete calendar weeks and keeps List view scoped to the displayed month', () => {
    const fixture = TestBed.createComponent(ProfileVisits);
    fixture.componentRef.setInput('client', rota.data().clients[0]);
    fixture.detectChanges();
    const profile = fixture.componentInstance as any;
    profile.anchor.set('2026-08-15');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.day')).toHaveLength(42);
    profile.anchor.set('2027-02-15');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.day')).toHaveLength(28);
    profile.view.set('List');
    expect(profile.start()).toBe('2027-02-01');
    expect(profile.end()).toBe('2027-02-28');
    profile.move(1);
    expect(profile.start()).toBe('2027-03-01');
    profile.move(-1);
    profile.view.set('Week');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.day')).toHaveLength(7);
  });
  it('guards an unfinished inline allocation and validates two distinct double-up carers', () => {
    const fixture = TestBed.createComponent(ProfileVisits);
    fixture.componentRef.setInput('client', rota.data().clients[0]);
    fixture.detectChanges();
    const profile = fixture.componentInstance as any;
    profile.dirty.set(true);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(profile.canLeave()).toBe(false);
    profile.form.primary = store.staff()[0].id;
    profile.form.doubleUp = true;
    profile.form.second = profile.form.primary;
    profile.save();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'different second carer',
    );
    expect(rota.data().visits).toHaveLength(0);
    profile.reset();
    expect(profile.canLeave()).toBe(true);
    confirm.mockRestore();
  });
  it('keeps the inline allocation form hidden when managing visits is denied', () => {
    vi.spyOn(rota, 'can').mockImplementation((action) => action === 'view');
    const fixture = TestBed.createComponent(ProfileVisits);
    fixture.componentRef.setInput('client', rota.data().clients[0]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.allocation-panel')).toBeNull();
    expect(fixture.nativeElement.querySelector('.calendar-panel')).not.toBeNull();
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
    const auth = TestBed.inject(AuthService);
    const user = auth.currentUser()!;
    vi.spyOn(auth, 'currentUser').mockReturnValue({ ...user, roleCode: 'CA' });
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
    TestBed.inject(ManagementStore).saveWorkspace((data) => ({
      ...data,
      systemDemoVersion: SYSTEM_DEMO_VERSION,
    }));
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
      'journal',
      'communications',
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
      const page = harness.routeNativeElement!;
      expect(page.querySelectorAll('cv-care-header')).toHaveLength(1);
      expect(page.querySelectorAll('nav[aria-label="Service user workspace"]')).toHaveLength(1);
      expect(page.querySelector('#client-record-name')?.textContent).toContain(
        'Nested route person',
      );
      expect(
        page.querySelector('nav[aria-label="Service user workspace"] [aria-current="page"]')
          ?.textContent,
      ).toContain(
        section === ''
          ? 'Overview'
          : (
              {
                journal: 'Client Journal',
                communications: 'Professional Communications',
                medication: 'Medication & MAR',
                visits: 'Visits & Allocation',
                contacts: 'Contacts',
                documents: 'Documents',
                family: 'Family Portal',
                audit: 'Audit Trail',
              } as Record<string, string>
            )[section],
      );
      if (section === 'journal') expect(page.querySelector('cv-staff-journal')).not.toBeNull();
      if (section === 'communications') {
        expect(page.querySelector('cv-portal-communications')).not.toBeNull();
        const editor = page.querySelector<HTMLInputElement>('input[name=subject]')!;
        editor.value = 'Unsaved professional update';
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
        await harness.navigateByUrl('/clients/client/medication');
        expect(
          harness.routeNativeElement!.querySelector('cv-portal-communications'),
        ).not.toBeNull();
        expect(confirm).toHaveBeenCalled();
        confirm.mockReturnValue(true);
        await harness.navigateByUrl('/clients/client/medication');
        confirm.mockRestore();
      }
      expect(page.querySelectorAll('.client-section-nav')).toHaveLength(section ? 0 : 1);
    }
  });
});
