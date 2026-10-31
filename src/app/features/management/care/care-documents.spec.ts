import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { DEMO_USER } from '../../../core/auth/fixtures';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { ManagementStore } from '../shared/management.store';
import { RotaService } from '../rota/rota.service';
import { emptyClientFile } from '../clients/client-file.models';
import { CareDocuments } from './care-documents';
import { CareService } from './care.service';
import { CareDocument } from './care.models';
import { documentMetadata, documentVisibility } from './care-documents.models';
import { InspectorService } from '../../inspector/inspector.service';

const actor = signal({ ...DEMO_USER, roleCode: 'CA' as typeof DEMO_USER.roleCode });
describe('Service-user Documents', () => {
  let care: CareService, store: ManagementStore;
  const doc = (id = 'doc', category = 'Care Plan'): CareDocument => ({
    id,
    category,
    name: `${id}.pdf`,
    version: '1.0',
    data: 'data:application/pdf;base64,JVBERi0xLjQK',
    mime: 'application/pdf',
    size: 9,
    at: '2026-10-26T09:00:00Z',
    by: 'Uploader',
    visibility: { staff: true, family: true, inspector: true },
  });
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: 'client' }),
              queryParamMap: convertToParamMap({}),
            },
            paramMap: of(convertToParamMap({ id: 'client' })),
          },
        },
      ],
    });
    const auth = TestBed.inject(AuthService);
    auth.signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    actor.set({ ...DEMO_USER, roleCode: 'CA' });
    vi.spyOn(auth, 'currentUser').mockImplementation(() => actor());
    store = TestBed.inject(ManagementStore);
    TestBed.inject(RotaService).saveClient({
      id: 'client',
      name: 'Mary Test',
      reference: 'C1',
      address: '1 Road',
      postcode: 'HA1 1AA',
      active: true,
      priority: 'Standard',
      funding: 'Private',
      file: emptyClientFile(),
    });
    care = TestBed.inject(CareService);
    expect(care.saveDocument('client', 'lqcs', doc())).toBeNull();
  });
  it('synchronises all table and details switches, summary totals and persisted records', async () => {
    const fixture = TestBed.createComponent(CareDocuments);
    fixture.detectChanges();
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    for (const a of ['Staff', 'Family', 'Inspector']) {
      const button = root.querySelector(`[aria-label="Show doc.pdf to ${a}"]`) as HTMLButtonElement;
      expect(button.getAttribute('aria-checked')).toBe('true');
      button.click();
      fixture.detectChanges();
      const panel = root.querySelector(
        `[aria-label="Document details: show to ${a}"]`,
      ) as HTMLButtonElement;
      expect(panel.getAttribute('aria-checked')).toBe('false');
      panel.click();
      fixture.detectChanges();
      expect(button.getAttribute('aria-checked')).toBe('true');
    }
    const page = fixture.componentInstance as any;
    expect(page.counts()).toEqual({ staff: 1, family: 1, inspector: 1 });
    expect(care.documents('client')[0].revisions).toHaveLength(6);
    expect(JSON.stringify(store.data())).toContain('Document visibility changed');
  });
  it('filters categories and audience without changing the source totals', async () => {
    care.saveDocument('client', 'lqcs', {
      ...doc('risk', 'Risk assessment'),
      familyShared: false,
      visibility: { staff: true, family: false, inspector: true },
    });
    const fixture = TestBed.createComponent(CareDocuments);
    fixture.detectChanges();
    await fixture.whenStable();
    const page = fixture.componentInstance as any;
    expect(page.documentDate('2026-07-01T23:30:00Z')).toBe('02/07/2026');
    expect(page.documentDate('')).toBe('Not recorded');
    expect(page.categoryCount('Risk Assessment')).toBe(1);
    page.chooseGroup('Risk Assessment');
    expect(page.rows().map((d: CareDocument) => d.id)).toEqual(['risk']);
    page.chooseAudience('family');
    expect(page.rows().map((d: CareDocument) => d.id)).toEqual(['doc']);
    expect(page.counts().staff).toBe(2);
    expect(page.categoryCount('All Documents')).toBe(2);
    page.select(page.rows()[0]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('cv-care-header')).toHaveLength(1);
  });
  it('counts each document once in the doughnut and updates segments after visibility changes', async () => {
    care.saveDocument('client', 'lqcs', {
      ...doc('partial'),
      visibility: { staff: true, family: false, inspector: false },
    });
    care.saveDocument('client', 'lqcs', {
      ...doc('private'),
      visibility: { staff: false, family: false, inspector: false },
    });
    const fixture = TestBed.createComponent(CareDocuments);
    fixture.detectChanges();
    await fixture.whenStable();
    const page = fixture.componentInstance as any;
    expect(page.visibilitySegments().map((s: { count: number }) => s.count)).toEqual([1, 1, 1]);
    expect(
      page.visibilitySegments().reduce((sum: number, s: { portion: number }) => sum + s.portion, 0),
    ).toBeCloseTo(100);
    const chart = fixture.nativeElement.querySelector('.document-donut svg') as SVGElement;
    expect(chart.getAttribute('aria-label')).toContain('All audiences: 1');
    expect(chart.querySelectorAll('circle[stroke-width="18"]')).toHaveLength(4);
    care.setDocumentVisibility('client', 'lqcs', 'doc', 'staff', false, 1);
    fixture.detectChanges();
    expect(page.visibilitySegments().map((s: { count: number }) => s.count)).toEqual([0, 2, 1]);
    page.chooseAudience('staff');
    expect(page.visibilitySegments().map((s: { count: number }) => s.count)).toEqual([0, 2, 1]);
    store.saveWorkspace((data) => ({
      ...data,
      rota: {
        ...data.rota!,
        clients: data.rota!.clients.map((c) =>
          c.id === 'client' ? { ...c, file: { ...c.file!, documents: [] } } : c,
        ),
      },
    }));
    fixture.detectChanges();
    expect(page.visibilitySegments().every((s: { portion: number }) => s.portion === 0)).toBe(true);
    expect(chart.getAttribute('aria-label')).toBe('Document visibility: no documents.');
    expect(chart.querySelectorAll('circle')).toHaveLength(1);
  });
  it('preserves prior metadata and rejects stale revisions and invalid dates', () => {
    const d = care.documents('client')[0];
    const metadata = {
      ...documentMetadata(d),
      description: 'Updated description',
      reviewDate: '2027-04-26',
      issueDate: '2026-10-26',
    };
    expect(care.updateDocument('client', 'lqcs', d.id, metadata, 1)).toBeNull();
    expect(care.documents('client')[0].revisions![0].description).toBe('');
    expect(care.updateDocument('client', 'lqcs', d.id, metadata, 1)).toContain('changed');
    expect(care.setDocumentVisibility('client', 'lqcs', d.id, 'staff', false, 1)).toContain(
      'changed',
    );
    expect(
      care.updateDocument('client', 'lqcs', d.id, { ...metadata, reviewDate: '2026-01-01' }, 2),
    ).toContain('review date');
    expect(care.documents('client')[0].data).toBe(d.data);
  });
  it('retains upload drafts after storage failure and saves new metadata and sharing', async () => {
    const fixture = TestBed.createComponent(CareDocuments);
    fixture.detectChanges();
    await fixture.whenStable();
    const page = fixture.componentInstance as any;
    page.open();
    page.pending = doc('new');
    page.metadata = { ...documentMetadata(doc('new')), description: 'New upload' };
    page.sharing = { staff: true, family: false, inspector: false };
    const save = vi.spyOn(store, 'saveWorkspace').mockReturnValueOnce(false);
    page.save();
    expect(page.editing()).toBe(true);
    expect(page.pending.id).toBe('new');
    expect(page.error()).toContain('Could not save');
    save.mockRestore();
    page.save();
    expect(page.editing()).toBe(false);
    expect(documentVisibility(care.documents('client').find((d) => d.id === 'new')!)).toEqual({
      staff: true,
      family: false,
      inspector: false,
    });
    expect(care.documents('client').find((d) => d.id === 'new')!.description).toBe('New upload');
  });
  it('reads and uploads a valid PDF with its metadata and current author', async () => {
    const fixture = TestBed.createComponent(CareDocuments);
    fixture.detectChanges();
    await fixture.whenStable();
    const page = fixture.componentInstance as any;
    page.open();
    const file = new File(['%PDF-1.4\nExample'], 'uploaded.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: async () => new TextEncoder().encode('%PDF-1.4\nExample').buffer,
    });
    await page.upload({ target: { files: [file], value: 'uploaded.pdf' } });
    expect(page.metadata.name).toBe('uploaded.pdf');
    expect(page.pending.data).toContain('data:application/pdf;base64,');
    page.metadata.description = 'Document description';
    page.save();
    const saved = care.documents('client').find((d) => d.name === 'uploaded.pdf')!;
    expect(saved.by).toBe(actor().name);
    expect(saved.description).toBe('Document description');
    expect(saved.revision).toBe(1);
    expect(page.editing()).toBe(false);
  });
  it('validates uploads before saving and guards workspace changes', async () => {
    const fixture = TestBed.createComponent(CareDocuments);
    fixture.detectChanges();
    await fixture.whenStable();
    const page = fixture.componentInstance as any;
    page.open();
    const file = new File(['not a PDF'], 'bad.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: async () => new TextEncoder().encode('not a PDF').buffer,
    });
    await page.upload({ target: { files: [file], value: 'bad.pdf' } });
    expect(page.error()).toContain('content does not match');
    expect(page.pending).toBeNull();
    page.pending = doc('new');
    page.metadata = documentMetadata(page.pending);
    TestBed.inject(WorkspaceService).switchWorkspace('riverside');
    page.save();
    expect(page.error()).toContain('workspace changed');
  });
  it('removes active records with confirmation and retains audit and archived bytes', async () => {
    const fixture = TestBed.createComponent(CareDocuments);
    fixture.detectChanges();
    await fixture.whenStable();
    const page = fixture.componentInstance as any;
    const d = care.documents('client')[0];
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    page.remove(d);
    expect(care.documents('client')).toHaveLength(1);
    page.remove(d);
    expect(care.documents('client')).toHaveLength(0);
    expect(care.client('client')!.file!.documentArchive![0].data).toBe(d.data);
    expect(care.client('client')!.file!.documentArchive![0].deletedBy).toBe(actor().name);
    expect(care.saveDocument('client', 'lqcs', d)).toContain('already exists');
  });
  it('honours Inspector and staff sharing and denies visibility writes to read-only roles', () => {
    care.setDocumentVisibility('client', 'lqcs', 'doc', 'inspector', false, 1);
    expect(
      TestBed.inject(InspectorService)
        .documents()
        .some((d) => d.id === 'care:client:doc'),
    ).toBe(false);
    actor.set({ ...actor(), roleCode: 'IN' });
    expect(care.documents('client')).toHaveLength(0);
    expect(care.canManageDocuments()).toBe(false);
    expect(care.setDocumentVisibility('client', 'lqcs', 'doc', 'family', false)).toContain(
      'permission',
    );
    actor.set({ ...actor(), roleCode: 'CA' });
    care.setDocumentVisibility('client', 'lqcs', 'doc', 'staff', false, 2);
    store.saveWorkspace((data) => ({
      ...data,
      people: [
        ...data.people,
        {
          id: 'staff-reader',
          name: 'Reader',
          email: actor().email,
          role: 'Care Worker',
          location: 'London',
          stage: 'Hired',
          vacancy: '',
          start: '2025-01-01',
          notes: [],
          checks: [],
          onboarding: [],
          learning: [],
          progress: {},
        },
      ],
    }));
    actor.set({ ...actor(), roleCode: 'CW' });
    vi.spyOn(TestBed.inject(RotaService), 'can').mockImplementation((action) => action === 'view');
    expect(care.documents('client')).toHaveLength(0);
  });
  it('previews a generated PDF blob and releases it when the preview closes', async () => {
    const fixture = TestBed.createComponent(CareDocuments);
    fixture.detectChanges();
    await fixture.whenStable();
    const page = fixture.componentInstance as any;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['%PDF-1.4'], { type: 'application/pdf' }),
      }),
    );
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-document');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    await page.view(care.documents('client')[0]);
    expect(page.preview()?.url).toBe('blob:test-document');
    page.closePreview();
    expect(page.preview()).toBeNull();
    expect(revoke).toHaveBeenCalledWith('blob:test-document');
    create.mockRestore();
    revoke.mockRestore();
    vi.unstubAllGlobals();
  });
});
