import { MatSnackBar } from '@angular/material/snack-bar';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { DEMO_USER } from '../../../core/auth/fixtures';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { ManagementStore } from '../shared/management.store';
import { RotaService } from '../rota/rota.service';
import { emptyClientFile } from '../clients/client-file.models';
import { CareService } from './care.service';
import { VisitNotes } from './visit-notes';
import { blankVisitNote } from './visit-notes.models';
import { InspectorService } from '../../inspector/inspector.service';

const actor = signal({ ...DEMO_USER, roleCode: 'CA' as typeof DEMO_USER.roleCode });
describe('Service-user visit notes', () => {
  let care: CareService, store: ManagementStore;
  const draft = (id = 'note') => ({
    ...blankVisitNote('2026-02-10'),
    id,
    carerId: 'carer',
    body: 'Supported with washing and dressing. Client comfortable.',
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
    store.saveWorkspace((data) => ({
      ...data,
      people: [
        ...data.people,
        {
          id: 'carer',
          name: 'Test Carer',
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
    const file = emptyClientFile();
    file.sections['consent'] = { family: 'Agreed' };
    TestBed.inject(RotaService).saveClient({
      id: 'client',
      name: 'Mary Test',
      reference: 'C1',
      address: '1 Road',
      postcode: 'HA1 1AA',
      active: true,
      priority: 'Standard',
      funding: 'Private',
      file,
    });
    care = TestBed.inject(CareService);
  });
  it('saves notes in the service-user file with attribution, revisions and audit', () => {
    expect(care.saveVisitNote('client', 'lqcs', draft())).toBeNull();
    const first = care.visitNotes('client')[0];
    expect(first.createdById).toBe(actor().id);
    expect(first.version).toBe(1);
    expect(
      care.saveVisitNote(
        'client',
        'lqcs',
        { ...first, body: 'Added a factual follow-up.' },
        first.version,
      ),
    ).toBeNull();
    const changed = care.visitNotes('client')[0];
    expect(changed.revisions[0].body).toContain('washing');
    expect(changed.version).toBe(2);
    expect(changed.createdAt).toBe(first.createdAt);
    expect(
      care.client('client')!.file!.audit!.some((event) => event.action === 'Visit note updated'),
    ).toBe(true);
    expect(
      care.saveVisitNote('client', 'lqcs', { ...first, body: 'Stale overwrite' }, first.version),
    ).toContain('changed');
    expect(care.visitNotes('client')[0].body).toBe('Added a factual follow-up.');
  });
  it('enforces care management permissions and filters staff and inspector access', () => {
    care.saveVisitNote('client', 'lqcs', draft());
    store.saveWorkspace((data) => ({
      ...data,
      rotaPermissions: {
        ...data.rotaPermissions,
        'Care Coordinator': ['view', 'attendance'],
        'Care Worker': ['view', 'attendance'],
      },
    }));
    actor.update((a) => ({ ...a, roleCode: 'CC' }));
    expect(care.setVisitNoteVisibility('client', 'lqcs', 'note', 'family', true, 1)).toContain(
      'permission',
    );
    expect(
      care.saveVisitNote('client', 'lqcs', {
        ...draft('other'),
        visibility: { staff: true, family: true, inspector: false },
      }),
    ).toContain('permission');
    actor.update((a) => ({ ...a, roleCode: 'CA' }));
    expect(care.setVisitNoteVisibility('client', 'lqcs', 'note', 'staff', false, 1)).toBeNull();
    actor.update((a) => ({ ...a, roleCode: 'CW' }));
    expect(care.visitNotes('client')).toHaveLength(0);
    actor.update((a) => ({ ...a, roleCode: 'IN' }));
    expect(care.visitNotes('client')).toHaveLength(0);
    actor.update((a) => ({ ...a, roleCode: 'CA' }));
    expect(care.setVisitNoteVisibility('client', 'lqcs', 'note', 'inspector', true, 2)).toBeNull();
    expect(TestBed.inject(InspectorService).visitNotes()).toHaveLength(1);
  });
  it('shares only explicitly allowed notes through active family Notes access without internal history', () => {
    care.saveVisitNote('client', 'lqcs', draft());
    expect(
      care.saveAccess(
        'client',
        'lqcs',
        {
          id: 'family',
          name: 'Family',
          email: actor().email,
          relationship: 'Son',
          status: 'Active',
          scopes: ['Notes'],
          at: '',
        },
        care.client('client')!.file!.updatedAt,
      ),
    ).toBeNull();
    expect(care.familyRecord('client', 'family')!.visitNotes).toHaveLength(0);
    care.setVisitNoteVisibility('client', 'lqcs', 'note', 'family', true, 1);
    const note = care.familyRecord('client', 'family')!.visitNotes![0];
    expect(note.body).toContain('washing');
    expect(note).not.toHaveProperty('revisions');
    expect(note).not.toHaveProperty('createdById');
    expect(note).not.toHaveProperty('attachments');
    care.saveAccess(
      'client',
      'lqcs',
      {
        id: 'family',
        name: 'Family',
        email: actor().email,
        relationship: 'Son',
        status: 'Active',
        scopes: ['Visits'],
        at: '',
      },
      care.client('client')!.file!.updatedAt,
    );
    expect(care.familyRecord('client', 'family')!.visitNotes).toBeNull();
  });
  it('rejects invalid/future notes, foreign visits and workspace changes atomically', () => {
    expect(care.saveVisitNote('client', 'lqcs', { ...draft(), body: ' ' })).toContain('note');
    expect(care.saveVisitNote('client', 'lqcs', { ...draft(), date: '2099-01-01' })).toContain(
      'past',
    );
    expect(
      care.saveVisitNote('client', 'lqcs', { ...draft(), visitId: 'foreign-visit' }),
    ).toContain('visit');
    expect(care.saveVisitNote('client', 'other-company', draft())).toContain('workspace');
    expect(care.visitNotes('client')).toHaveLength(0);
    const save = vi.spyOn(store, 'saveWorkspace').mockReturnValue(false);
    expect(care.saveVisitNote('client', 'lqcs', draft())).toContain('Could not save');
    expect(care.visitNotes('client')).toHaveLength(0);
    save.mockRestore();
  });
  it('renders the requested navigation order, filters and pagination with a selectable details panel', async () => {
    for (let i = 1; i <= 10; i++)
      care.saveVisitNote('client', 'lqcs', {
        ...draft('n' + i),
        date: `2026-02-${String(i).padStart(2, '0')}`,
        visitType: i === 1 ? 'Observation' : 'Personal Care',
      });
    const fixture = TestBed.createComponent(VisitNotes);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const nav = root.querySelector('nav[aria-label="Service user workspace"]')!;
    expect(nav.textContent).not.toContain('Care Plan');
    const labels = Array.from(nav.querySelectorAll('a, button')).map((a) => a.textContent ?? '');
    expect(labels.findIndex((s) => s.includes('Visit Notes'))).toBe(
      labels.findIndex((s) => s.includes('Visits & Allocation')) + 1,
    );
    expect(root.querySelectorAll('.note-row')).toHaveLength(8);
    (root.querySelector('[aria-label="Next page"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelectorAll('.note-row')).toHaveLength(2);
    const page = fixture.componentInstance as any;
    page.filters.type = 'Observation';
    page.search();
    fixture.detectChanges();
    expect(root.querySelectorAll('.note-row')).toHaveLength(1);
    expect(root.querySelector('.note-details')?.textContent).toContain('Observation');
    (root.querySelector('[aria-label="Close visit note details"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelector('.note-details')).toBeNull();
    root
      .querySelector('.note-row')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(root.querySelector('.note-details')).not.toBeNull();
  });
  it('creates a note from the editor, retains invalid drafts and protects unsaved edits', async () => {
    const fixture = TestBed.createComponent(VisitNotes);
    fixture.detectChanges();
    await fixture.whenStable();
    const editor = fixture.componentInstance as any;
    editor.open();
    editor.save();
    fixture.detectChanges();
    expect(editor.editing()).toBe(true);
    expect(editor.error()).not.toBe('');
    editor.draft = draft();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(editor.canLeave()).toBe(false);
    editor.save();
    fixture.detectChanges();
    expect(editor.editing()).toBe(false);
    expect(fixture.nativeElement.querySelector('.note-body')?.textContent).toContain('washing');
    expect(editor.canLeave()).toBe(true);
    confirm.mockRestore();
  });
  it('validates attachment bytes and retains saved attachments when notes are edited', () => {
    const content = '%PDF-1.4\n%%EOF';
    const attachment = {
      id: 'attachment',
      name: 'Visit record.pdf',
      mime: 'application/pdf',
      size: content.length,
      data: 'data:application/pdf;base64,' + btoa(content),
    };
    expect(
      care.saveVisitNote('client', 'lqcs', { ...draft(), attachments: [attachment] }),
    ).toBeNull();
    const note = care.visitNotes('client')[0];
    expect(
      care.saveVisitNote('client', 'lqcs', { ...note, attachments: [] }, note.version),
    ).toContain('retained');
    expect(
      care.saveVisitNote('client', 'lqcs', {
        ...draft('invalid'),
        attachments: [
          { ...attachment, data: 'data:application/pdf;base64,' + btoa('wrong header'), size: 12 },
        ],
      }),
    ).toContain('valid');
    expect(care.visitNotes('client')[0].attachments[0].name).toBe('Visit record.pdf');
  });
  it('persists notes to storage and keeps companies isolated', () => {
    care.saveVisitNote('client', 'lqcs', draft());
    const saved = JSON.parse(localStorage.getItem('cv_management_v1')!);
    expect(
      saved.lqcs.rota.clients.find((c: { id: string }) => c.id === 'client').file.visitNotes[0]
        .body,
    ).toContain('washing');
    const workspace = TestBed.inject(WorkspaceService);
    workspace.switchWorkspace('riverside');
    expect(care.visitNotes('client')).toHaveLength(0);
    workspace.switchWorkspace('lqcs');
    expect(care.visitNotes('client')[0].body).toContain('washing');
  });
  it('persists all three visibility toggles from both the table and details for authorised care users', async () => {
    const popout = vi
      .spyOn(TestBed.inject(MatSnackBar), 'openFromComponent')
      .mockReturnValue({} as never);
    care.saveVisitNote('client', 'lqcs', draft());
    actor.update((a) => ({ ...a, roleCode: 'CW' }));
    expect(care.canManageNoteVisibility()).toBe(true);
    const fixture = TestBed.createComponent(VisitNotes);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    for (const audience of ['staff', 'family', 'inspector'] as const) {
      const initial = care.visitNotes('client')[0].visibility[audience];
      const rowToggle = root.querySelector<HTMLButtonElement>(
        `.note-row button[role="switch"][aria-label$="with ${audience}"]`,
      )!;
      expect(rowToggle.disabled).toBe(false);
      rowToggle.click();
      fixture.detectChanges();
      expect(rowToggle.getAttribute('aria-checked')).toBe(String(!initial));
      const saved = JSON.parse(localStorage.getItem('cv_management_v1')!);
      expect(
        saved.lqcs.rota.clients.find((c: { id: string }) => c.id === 'client').file.visitNotes[0]
          .visibility[audience],
      ).toBe(!initial);
      const detailToggle = root.querySelector<HTMLButtonElement>(
        `.note-details button[role="switch"][aria-label="Share this note with ${audience}"]`,
      )!;
      expect(detailToggle.getAttribute('aria-checked')).toBe(String(!initial));
      detailToggle.click();
      fixture.detectChanges();
      expect(rowToggle.getAttribute('aria-checked')).toBe(String(initial));
      expect(care.visitNotes('client')[0].visibility[audience]).toBe(initial);
    }
    expect(care.visitNotes('client')[0].revisions).toHaveLength(6);
    expect(root.querySelector('.note-notice')).toBeNull();
    expect(popout).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        duration: 2000,
        horizontalPosition: 'left',
        verticalPosition: 'bottom',
        data: { message: 'Visit note visibility updated.', icon: 'check_circle' },
      }),
    );
  });
  it('keeps Inspector sharing controls read-only even if broad rota management is enabled', async () => {
    care.saveVisitNote('client', 'lqcs', {
      ...draft(),
      visibility: { staff: true, family: false, inspector: true },
    });
    actor.update((a) => ({ ...a, roleCode: 'IN' }));
    expect(care.canManageNoteVisibility()).toBe(false);
    const fixture = TestBed.createComponent(VisitNotes);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const toggles = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        'button[role="switch"]',
      ),
    );
    expect(toggles).toHaveLength(6);
    expect(toggles.every((toggle) => toggle.disabled)).toBe(true);
    expect(care.setVisitNoteVisibility('client', 'lqcs', 'note', 'family', true, 1)).toContain(
      'permission',
    );
  });
  it('does not grant family-only accounts clinical note management through their demo role', () => {
    care.saveVisitNote('client', 'lqcs', draft());
    actor.update((a) => ({
      ...a,
      id: 'demo-family',
      email: 'family@example.test',
      roleCode: 'CW',
    }));
    expect(care.canManageNoteVisibility()).toBe(false);
    expect(care.canWriteVisitNotes()).toBe(false);
    expect(care.visitNotes('client')).toHaveLength(0);
    expect(care.setVisitNoteVisibility('client', 'lqcs', 'note', 'family', true, 1)).toContain(
      'permission',
    );
  });
});
