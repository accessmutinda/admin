import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { MatSelectHarness } from '@angular/material/select/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { FamilyPortal } from './family-portal';
import { CareService } from './care.service';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { emptyClientFile } from '../clients/client-file.models';
import { FAMILY_SCOPES, blankPrescription } from './care.models';
import { londonDate } from '../rota/rota.models';

describe('Family portal pages', () => {
  let fixture: ComponentFixture<FamilyPortal>;
  let care: CareService;
  const params = new BehaviorSubject(
    convertToParamMap({ clientId: 'client', accessId: 'family', page: 'overview' }),
  );
  const query = new BehaviorSubject(convertToParamMap({}));
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    params.next(convertToParamMap({ clientId: 'client', accessId: 'family', page: 'overview' }));
    query.next(convertToParamMap({}));
    TestBed.configureTestingModule({
      imports: [FamilyPortal],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: params,
            queryParamMap: query,
            snapshot: { paramMap: params.value, queryParamMap: query.value },
          },
        },
      ],
    });
    const auth = TestBed.inject(AuthService);
    auth.signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    care = TestBed.inject(CareService);
    const file = emptyClientFile();
    file.sections['consent'] = { family: 'Agreed', photo: 'Agreed' };
    file.sections['family'] = { approved: 'Enjoyed garden time today.' };
    file.sections['plan'] = {
      needs: 'Support with daily routines.',
      support: 'Allow time and offer choices.',
    };
    file.familyAccess = [
      {
        id: 'family',
        name: 'Family member',
        email: auth.currentUser()!.email,
        relationship: 'Son',
        status: 'Active',
        scopes: [...FAMILY_SCOPES],
        at: '',
      },
    ];
    expect(
      care.rota.saveClient({
        id: 'client',
        name: 'Margaret Williams',
        reference: 'C1',
        address: '1 Test Road',
        postcode: 'BS8',
        active: true,
        funding: 'Private',
        priority: 'Standard',
        file,
      }),
    ).toBeNull();
    fixture = TestBed.createComponent(FamilyPortal);
    fixture.detectChanges();
  });
  afterEach(() => vi.restoreAllMocks());
  const text = () => fixture.nativeElement.querySelector('main').textContent as string;
  function page(value: string) {
    params.next(convertToParamMap({ clientId: 'client', accessId: 'family', page: value }));
    fixture.detectChanges();
  }
  it('renders each family destination with approved data and meaningful empty states', () => {
    expect(text()).toContain('Margaret Williams');
    const expected: Record<string, string> = {
      'care-plan': 'Allow time and offer choices.',
      visits: 'No visits match this view.',
      notes: 'Enjoyed garden time today.',
      medication: 'Medication key',
      documents: 'No documents have been approved',
      photos: 'No approved photos are available',
      messages: 'No messages yet.',
      permissions: 'Access & permissions',
      invoices: 'No approved invoices',
      support: 'Here to help',
    };
    for (const [destination, content] of Object.entries(expected)) {
      page(destination);
      expect(text()).toContain(content);
    }
  });
  it('opens every portal section for administrators without a configured family account', () => {
    const c = structuredClone(care.client('client')!);
    c.file!.familyAccess = [];
    c.file!.sections['consent'] = {};
    care.rota.saveClient(c);
    params.next(convertToParamMap({}));
    fixture.detectChanges();
    expect(text()).toContain('Margaret Williams');
    expect(text()).toContain('Full administrator access');
    expect(text()).not.toContain('No active family access');
    for (const destination of [
      'care-plan',
      'visits',
      'medication',
      'documents',
      'photos',
      'messages',
      'notes',
      'invoices',
    ]) {
      params.next(convertToParamMap({ page: destination }));
      fixture.detectChanges();
      expect(text()).not.toContain('access is restricted');
      expect(text()).toContain('Full administrator access');
    }
    expect(care.client('client')?.file?.familyAccess).toEqual([]);
    expect(care.client('client')?.file?.sections['consent']).toEqual({});
  });
  it('replaces shared content immediately when a permission is revoked', () => {
    page('notes');
    expect(text()).toContain('Enjoyed garden time');
    const c = structuredClone(care.client('client')!);
    c.file!.familyAccess![0].scopes = ['Messages'];
    expect(care.rota.saveClient(c)).toBeNull();
    fixture.detectChanges();
    expect(text()).toContain('Daily notes access is restricted');
    expect(text()).not.toContain('Enjoyed garden time');
  });
  it('shows no records after consent withdrawal or an invalid deep link', () => {
    params.next(convertToParamMap({ clientId: 'client', accessId: 'invalid', page: 'overview' }));
    fixture.detectChanges();
    expect(text()).toContain('Family access unavailable');
    const c = structuredClone(care.client('client')!);
    c.file!.sections['consent']['family'] = 'Declined';
    care.rota.saveClient(c);
    page('overview');
    expect(text()).toContain('Family access unavailable');
    expect(text()).not.toContain('Margaret Williams');
  });
  it('restores unsent messages across page and workspace changes without leaking recipients', async () => {
    page('messages');
    await fixture.whenStable();
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'Please call about tomorrow’s visit.';
    textarea.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    page('notes');
    page('messages');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('textarea').value).toBe(
      'Please call about tomorrow’s visit.',
    );
    const other = structuredClone(care.client('client')!);
    other.id = 'other';
    other.reference = 'C2';
    other.name = 'Other service user';
    expect(care.rota.saveClient(other)).toBeNull();
    params.next(convertToParamMap({ clientId: 'other', accessId: 'family', page: 'messages' }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('textarea').value).toBe('');
    page('messages');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('textarea').value).toBe(
      'Please call about tomorrow’s visit.',
    );
    TestBed.inject(WorkspaceService).switchWorkspace('riverside');
    fixture.detectChanges();
    expect(text()).not.toContain('Please call about tomorrow’s visit.');
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('textarea').value).toBe(
      'Please call about tomorrow’s visit.',
    );
  });
  it('retains a draft when session storage fails and warns before closing the browser', async () => {
    page('messages');
    await fixture.whenStable();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Full');
    });
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'Keep this unsent draft';
    textarea.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(text()).toContain('Browser storage is unavailable');
    page('notes');
    page('messages');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('textarea').value).toBe('Keep this unsent draft');
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
  it('reports actual photo consent and disables messages explicitly in preview permissions', () => {
    const c = structuredClone(care.client('client')!);
    c.file!.sections['consent']['photo'] = 'Declined';
    care.rota.saveClient(c);
    page('permissions');
    const rows = [...fixture.nativeElement.querySelectorAll('tr')] as HTMLTableRowElement[];
    expect(rows.find((r) => r.textContent?.includes('Photos & wellbeing'))?.textContent).toContain(
      'Restricted',
    );
    expect(text()).toContain('Photography consent is not enabled.');
    page('photos');
    expect(text()).toContain('access is restricted');
    query.next(convertToParamMap({ preview: '1' }));
    page('permissions');
    expect(text()).toContain('Preview only');
    expect(text()).toContain('sending is disabled');
  });
  it('shows only current prescriptions in the overview and keeps historical statuses in medication', () => {
    const c = structuredClone(care.client('client')!);
    c.file!.medications = [
      {
        ...blankPrescription(),
        id: 'ended',
        name: 'Old prescription',
        start: '2000-01-01',
        end: '2001-01-01',
      },
      {
        ...blankPrescription(),
        id: 'discontinued',
        name: 'Stopped prescription',
        start: '2000-01-01',
        discontinuedAt: '2001-01-01T08:00:00Z',
      },
      { ...blankPrescription(), id: 'future', name: 'Future prescription', start: '2099-01-01' },
      { ...blankPrescription(), id: 'current', name: 'Current prescription', start: '2000-01-01' },
    ];
    care.rota.saveClient(c);
    fixture.detectChanges();
    expect(text()).toContain('Current prescription');
    expect(text()).not.toContain('Old prescription');
    expect(text()).not.toContain('Stopped prescription');
    expect(text()).not.toContain('Future prescription');
    page('medication');
    expect(text()).toContain('Ended');
    expect(text()).toContain('Discontinued');
    expect(text()).toContain('Scheduled');
  });
  it('filters approved dated updates and distinguishes the undated legacy summary', async () => {
    const c = structuredClone(care.client('client')!);
    c.file!.familyUpdates = [
      {
        id: 'new',
        date: londonDate(),
        category: 'Wellbeing',
        text: 'Enjoyed an afternoon walk.',
        by: 'Care team',
        at: new Date().toISOString(),
      },
      {
        id: 'old',
        date: '2000-01-01',
        category: 'Medication',
        text: 'Historical approved medication update.',
        by: 'Care team',
        at: '2000-01-01T12:00:00Z',
      },
    ];
    care.rota.saveClient(c);
    page('notes');
    expect(text()).toContain('Enjoyed an afternoon walk.');
    expect(text()).toContain('date and author not recorded');
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const period = await loader.getHarness(
      MatSelectHarness.with({ selector: '[aria-label="Update date range"]' }),
    );
    await period.open();
    await period.clickOptions({ text: 'Last 7 days' });
    expect(text()).toContain('Enjoyed an afternoon walk.');
    expect(text()).not.toContain('Historical approved');
    expect(text()).not.toContain('Enjoyed garden time today.');
    const category = await loader.getHarness(
      MatSelectHarness.with({ selector: '[aria-label="Update category"]' }),
    );
    await category.open();
    await category.clickOptions({ text: 'Medication' });
    expect(text()).toContain('No approved care updates match');
  });
  it('saves a family message and prevents sending in administrator preview', async () => {
    page('messages');
    await fixture.whenStable();
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'Thank you for the update.';
    textarea.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.detectChanges();
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
    expect(care.familyRecord('client', 'family')?.messages?.at(-1)?.text).toBe(
      'Thank you for the update.',
    );
    query.next(convertToParamMap({ preview: '1' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    expect(text()).toContain('Sending is disabled');
    const key =
      'cv_family_draft:' +
      JSON.stringify([care.auth.currentUser()!.id, 'lqcs', 'client', 'family']);
    expect(sessionStorage.getItem(key)).toBeNull();
  });
});
