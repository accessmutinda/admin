import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { InspectorService } from './inspector.service';
import { InspectorPage } from './inspector-page';
import {
  CATEGORIES,
  INSPECTOR_PAGES,
  InspectorDocument,
  csv,
  documentStatus,
} from './inspector.models';
import { ManagementStore } from '../management/shared/management.store';
import { WorkspaceService } from '../../core/auth/workspace.service';
import { ROLES } from '../../core/auth/models/role';
import { AuthService } from '../../core/auth/auth.service';
import { DEMO_USER } from '../../core/auth/fixtures';
import { decodeDocument, zip } from './inspector-download';
import { routes } from '../../app.routes';
import { RouterTestingHarness } from '@angular/router/testing';

function session(roleCode = 'IN'): void {
  localStorage.setItem(
    'cv_session',
    JSON.stringify({
      user: { ...DEMO_USER, roleCode },
      workspaceId: 'lqcs',
      mfaVerified: true,
      signedInAt: new Date().toISOString(),
    }),
  );
}
function document(id = 'evidence-1'): InspectorDocument {
  return {
    id,
    name: 'Safeguarding policy.txt',
    category: 'Policies',
    questions: ['Safe'],
    owner: 'Review lead',
    updated: '2026-10-18',
    version: '1.0',
    expiry: '',
    status: 'Pending review',
    content: 'data:text/plain;base64,cG9saWN5',
    source: 'Inspection upload',
  };
}
describe('Inspector workspace', () => {
  let data: InspectorService;
  let store: ManagementStore;
  beforeEach(() => {
    localStorage.clear();
    session();
    TestBed.configureTestingModule({ imports: [InspectorPage], providers: [provideRouter([])] });
    data = TestBed.inject(InspectorService);
    store = data.store;
  });
  afterEach(() => vi.restoreAllMocks());
  it('keeps inspection records isolated and preserves unrelated workspace data', () => {
    const people = structuredClone(store.data().people);
    const draft = structuredClone(data.state().draft);
    draft.summary = 'Review summary';
    expect(data.saveDraft(draft, 'lqcs')).toBe('');
    expect(data.addDocument(document(), 'lqcs')).toBe('');
    expect(store.data().people).toEqual(people);
    TestBed.inject(WorkspaceService).switchWorkspace('riverside');
    expect(data.state().draft.summary).toBe('');
    expect(data.documents()).toHaveLength(0);
    expect(data.saveDraft(draft, 'lqcs')).toContain('workspace changed');
    expect(data.addDocument(document(), 'lqcs')).toContain('workspace changed');
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    expect(data.state().draft.summary).toBe('Review summary');
    expect(data.documents()).toHaveLength(1);
  });
  it('rejects a stale draft without losing the newer saved findings', () => {
    const draft = structuredClone(data.state().draft);
    expect(data.saveDraft({ ...draft, summary: 'Newer saved content' }, 'lqcs')).toBe('');
    expect(data.saveDraft({ ...draft, summary: 'Stale content' }, 'lqcs')).toContain(
      'another window',
    );
    expect(data.state().draft.summary).toBe('Newer saved content');
  });
  it('does not report success or update records when persistence fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Full');
    });
    expect(data.addDocument(document(), 'lqcs')).toContain('Could not save');
    expect(data.saveDraft({ ...data.state().draft, summary: 'Unsaved' }, 'lqcs')).toContain(
      'Could not save',
    );
    expect(data.documents()).toHaveLength(0);
    expect(data.state().draft.summary).toBe('');
  });
  it('aggregates source evidence without mutating the source record', () => {
    const person = structuredClone(store.staff()[0]);
    person.documents = [
      {
        id: 'dbs',
        name: 'DBS file.pdf',
        type: 'application/pdf',
        content: 'data:application/pdf;base64,cG9saWN5',
        status: 'Verified',
        uploadedAt: '2026-10-18',
        expiry: '2020-01-01',
      },
    ];
    store.updatePerson(person);
    const before = structuredClone(store.data());
    expect(data.documents()[0].status).toBe('Expired');
    expect(data.documents()[0].source).toBe('Staff record');
    expect(store.data()).toEqual(before);
  });
});

describe('Inspector pages', () => {
  const routeData = new BehaviorSubject({ page: 'documents' });
  beforeEach(() => {
    localStorage.clear();
    session();
    routeData.next({ page: 'documents' });
    TestBed.configureTestingModule({
      imports: [InspectorPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            data: routeData,
            queryParamMap: new BehaviorSubject(convertToParamMap({})),
            snapshot: { data: { page: 'documents' }, queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    });
  });
  afterEach(() => vi.restoreAllMocks());
  function create() {
    const fixture = TestBed.createComponent(InspectorPage);
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance, service: TestBed.inject(InspectorService) };
  }
  it.each(INSPECTOR_PAGES.map((p) => [p.path, p.label]))(
    'renders %s with its full page heading',
    (path, label) => {
      routeData.next({ page: path });
      const { fixture } = create();
      expect(fixture.nativeElement.querySelector('h1').textContent).toBe(label);
      expect(fixture.nativeElement.textContent).toContain('London Quality Care Services');
      expect(fixture.nativeElement.querySelectorAll('button').length).toBeGreaterThan(0);
    },
  );
  it('keeps clinical risk separate from a high visit priority', () => {
    const { page } = create();
    const client: Parameters<InspectorPage['clientRisk']>[0] = {
      id: 'client',
      name: 'Test person',
      reference: 'REF',
      address: '',
      postcode: '',
      funding: 'Private',
      priority: 'High',
      active: true,
    };
    expect(page.clientRisk(client)).toBe('Not assessed');
    client.file = {
      details: {},
      sections: {},
      updatedAt: '',
      entries: {
        risks: [
          {
            id: 'risk',
            name: 'Mobility',
            detail: '',
            date: '2026-10-18',
            level: 'Medium',
            status: 'Active',
          },
        ],
      },
    };
    expect(page.clientRisk(client)).toBe('Medium');
  });
  it('filters the full document set and keeps selection across eight-row pages', () => {
    const { fixture, page, service } = create();
    for (let i = 0; i < 10; i++)
      service.addDocument(
        { ...document(String(i)), name: `Policy ${i}.txt`, category: CATEGORIES[i % 2] },
        'lqcs',
      );
    fixture.detectChanges();
    expect(page.visibleDocuments()).toHaveLength(8);
    page.toggleVisible(true);
    page.currentPage.set(2);
    expect(page.visibleDocuments()).toHaveLength(2);
    page.toggleVisible(true);
    expect(page.selectedDocuments()).toHaveLength(10);
    page.category.set('Policies');
    page.filterChanged();
    expect(page.documents()).toHaveLength(5);
    expect(page.selectedDocuments()).toHaveLength(10);
    page.search.set('Policy 9');
    page.category.set('');
    page.filterChanged();
    expect(page.documents()).toHaveLength(1);
    expect(page.documents()[0].id).toBe('9');
  });
  it('retains an unsaved note after failure and saves it successfully on retry', () => {
    routeData.next({ page: 'notes' });
    const { page, service } = create();
    page.updateNote('Reviewed person-centred care evidence.');
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Full');
    });
    expect(page.save()).toBe(false);
    expect(page.dirty()).toBe(true);
    expect(page.draft().notes['Overall Summary']).toContain('person-centred');
    spy.mockRestore();
    expect(page.save()).toBe(true);
    expect(page.dirty()).toBe(false);
    expect(service.state().draft.notes['Overall Summary']).toContain('person-centred');
  });
  it('validates required-action ownership and persists evidence references', () => {
    routeData.next({ page: 'notes' });
    const { page, service } = create();
    service.addDocument(document(), 'lqcs');
    page.openFinding();
    page.findingField('type', 'Required action');
    page.findingField('text', 'Review policy evidence');
    page.saveFinding();
    expect(page.modalError()).toContain('owner and due date');
    page.findingField('owner', 'Registered Manager');
    page.findingField('due', '2026-12-01');
    page.findingEvidence('evidence-1', true);
    page.saveFinding();
    expect(service.state().draft.findings).toHaveLength(1);
    expect(service.state().draft.findings[0].evidenceIds).toEqual(['evidence-1']);
  });
  it('does not duplicate a new finding after a failed save and retry', () => {
    routeData.next({ page: 'notes' });
    const { page, service } = create();
    page.openFinding();
    page.findingField('text', 'Evidence reviewed');
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Full');
    });
    page.saveFinding();
    expect(page.modalOpen()).toBe(true);
    spy.mockRestore();
    page.saveFinding();
    expect(service.state().draft.findings).toHaveLength(1);
  });
  it('clears selected evidence and a pending modal when the workspace changes', () => {
    const { fixture, page, service } = create();
    service.addDocument(document(), 'lqcs');
    page.toggleDocument('evidence-1', true);
    page.openUpload();
    fixture.detectChanges();
    TestBed.inject(WorkspaceService).switchWorkspace('riverside');
    fixture.detectChanges();
    expect(page.selectedDocuments()).toHaveLength(0);
    expect(page.modalOpen()).toBe(false);
  });
  it('rejects an upload above the size limit without writing a document', async () => {
    const { page, service } = create();
    page.uploadName.set('Large evidence.pdf');
    page.uploadFile.set(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.pdf'));
    await page.upload();
    expect(page.modalError()).toContain('up to 5 MB');
    expect(service.documents()).toHaveLength(0);
  });
  it('opens a usable category selector from the upload dialog', async () => {
    const { fixture, page } = create();
    page.openUpload();
    fixture.detectChanges();
    const selector: HTMLElement = fixture.nativeElement.querySelector(
      '[aria-label="Upload category"] .mat-mdc-select-trigger',
    );
    selector.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const options = [...window.document.querySelectorAll('mat-option')];
    const audits = options.find((option) => option.textContent?.trim() === 'Audits') as HTMLElement;
    expect(audits).toBeTruthy();
    audits.click();
    fixture.detectChanges();
    expect(page.uploadCategory()).toBe('Audits');
    expect(fixture.nativeElement.querySelector('[role="dialog"]').getAttribute('aria-modal')).toBe(
      'true',
    );
  });
  it('saves an uploaded file with its category, question and pending status', async () => {
    const { page, service } = create();
    page.uploadName.set('Review evidence.txt');
    page.uploadFile.set(new File(['evidence'], 'review.txt', { type: 'text/plain' }));
    page.uploadQuestion.set('Responsive');
    await page.upload();
    expect(service.documents()[0].questions).toEqual(['Responsive']);
    expect(service.documents()[0].status).toBe('Pending review');
    expect(new TextDecoder().decode(decodeDocument(service.documents()[0].content))).toBe(
      'evidence',
    );
  });
});

describe('Inspector routing', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  });
  it('shows one inspector portal switch link for the standard demo account', async () => {
    session('CW');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/manage/companies');
    const sidebar = harness.routeNativeElement?.querySelector('.app-sidebar');
    expect(sidebar?.textContent).toContain('Inspector Portal');
    const links = [...(sidebar?.querySelectorAll('a[href^="/inspector/"]') ?? [])];
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/inspector/dashboard']);
  });
  it('opens the inspector portal for the standard care-worker account', async () => {
    session('CW');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/inspector/documents');
    expect(TestBed.inject(Router).url).toBe('/inspector/documents');
    expect(harness.routeNativeElement?.textContent).toContain('Documents & Evidence');
  });
  it.each(Object.keys(ROLES))('opens every inspector page for the %s role', async (role) => {
    session(role);
    const harness = await RouterTestingHarness.create();
    for (const page of INSPECTOR_PAGES) {
      await harness.navigateByUrl('/inspector/' + page.path);
      expect(TestBed.inject(Router).url).toBe('/inspector/' + page.path);
      expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe(page.label);
    }
    expect(harness.routeNativeElement?.querySelector('a[href="/manage/companies"]')).toBeTruthy();
  });
  it('still requires sign-in before opening inspector pages', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/inspector/documents');
    expect(TestBed.inject(Router).url).toBe('/auth/sign-in');
  });
  it('supports the inspector demo invitation without changing the normal sign-in role', () => {
    const auth = TestBed.inject(AuthService);
    auth.acceptInvite('inspector-demo').subscribe();
    expect(auth.currentUser()?.roleCode).toBe('IN');
    expect(DEMO_USER.roleCode).toBe('CW');
  });
  it('opens deep links for an inspector with a selected workspace', async () => {
    session();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/inspector/documents?q=policy');
    expect(TestBed.inject(Router).url).toBe('/inspector/documents?q=policy');
    expect(harness.routeNativeElement?.textContent).toContain('Documents & Evidence');
  });
});

describe('Evidence exports', () => {
  it('preserves original file bytes in a ZIP with a valid central directory', () => {
    const bytes = zip([
      { name: '../policy.txt', data: decodeDocument('data:text/plain;base64,cG9saWN5') },
    ]);
    const header = new DataView(bytes.buffer);
    expect(header.getUint32(0, true)).toBe(0x04034b50);
    const nameLength = header.getUint16(26, true),
      fileLength = header.getUint32(18, true);
    expect(
      new TextDecoder().decode(bytes.slice(30 + nameLength, 30 + nameLength + fileLength)),
    ).toBe('policy');
    expect(new TextDecoder().decode(bytes.slice(30, 30 + nameLength))).not.toContain('../');
    expect(header.getUint32(bytes.length - 22, true)).toBe(0x06054b50);
    expect(header.getUint16(bytes.length - 14, true)).toBe(1);
  });
  it('escapes spreadsheet formulas, commas and newlines in evidence indexes', () => {
    expect(csv([['=SUM(A1)', 'a,b', 'line\nbreak', 'A "quote"']])).toBe(
      '"\'=SUM(A1)","a,b","line\nbreak","A ""quote"""',
    );
  });
  it('calculates expiry labels without implying document verification', () => {
    expect(documentStatus({ status: 'Pending review', expiry: '' }, '2026-10-18')).toBe(
      'Pending review',
    );
    expect(documentStatus({ status: 'Verified', expiry: '2026-10-17' }, '2026-10-18')).toBe(
      'Expired',
    );
    expect(documentStatus({ status: 'Recorded', expiry: '2026-10-30' }, '2026-10-18')).toBe(
      'Review due',
    );
  });
});
