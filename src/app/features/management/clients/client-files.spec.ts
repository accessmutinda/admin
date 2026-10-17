import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { DEMO_USER } from '../../../core/auth/fixtures';
import { ManagementStore } from '../shared/management.store';
import { RotaService } from '../rota/rota.service';
import { RotaClient } from '../rota/rota.models';
import { Rota } from '../rota/rota';
import { ClientFiles } from './client-files';
import { CLIENT_SECTIONS, ClientEntry, emptyClientFile } from './client-file.models';

type Editor = {
  startProfile(create?: boolean): void;
  editSection(): void;
  editEntry(entry?: ClientEntry): void;
  draft: RotaClient;
  values: Record<string, string>;
  entry: ClientEntry;
  save(): void;
  discard(): void;
  setSection(key: string): void;
  error: () => string;
};
describe('Client files and care records', () => {
  const params = new BehaviorSubject(convertToParamMap({ id: 'client' }));
  let service: RotaService;
  const actor = signal({ ...DEMO_USER, roleCode: 'CA' as typeof DEMO_USER.roleCode });
  beforeEach(() => {
    localStorage.clear();
    params.next(convertToParamMap({ id: 'client' }));
    TestBed.configureTestingModule({
      imports: [ClientFiles, Rota],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: params.asObservable(),
            snapshot: {
              paramMap: params.value,
              data: {},
              queryParamMap: convertToParamMap({ client: 'client' }),
            },
          },
        },
      ],
    });
    const auth = TestBed.inject(AuthService);
    auth.signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    actor.set({ ...DEMO_USER, roleCode: 'CA' });
    vi.spyOn(auth, 'currentUser').mockImplementation(() => actor());
    service = TestBed.inject(RotaService);
    expect(
      service.saveClient({
        id: 'client',
        name: 'Mary Smith',
        reference: 'M1',
        address: '1 Test Street',
        postcode: 'SW1A 1AA',
        funding: 'Private',
        priority: 'Standard',
        active: true,
      }),
    ).toBeNull();
  });

  it('renders every reference section for existing clients without inventing care data', async () => {
    const fixture = TestBed.createComponent(ClientFiles);
    const editor = fixture.componentInstance as unknown as Editor;
    for (const section of CLIENT_SECTIONS) {
      editor.setSection(section.key);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(fixture.nativeElement.textContent).toContain('Mary Smith');
      expect(fixture.nativeElement.querySelector('.client-content').textContent).toContain(
        section.key === 'overview' ? 'What matters to me' : section.label,
      );
    }
    expect(fixture.nativeElement.textContent).not.toContain('Consent given');
  });

  it('keeps all record sections reachable through grouped navigation and locks them during editing', async () => {
    const fixture = TestBed.createComponent(ClientFiles);
    fixture.detectChanges();
    await fixture.whenStable();
    const page: HTMLElement = fixture.nativeElement;
    expect(page.querySelector('h1')?.textContent).toContain('Mary Smith');
    expect(page.querySelectorAll('.client-nav-group')).toHaveLength(4);
    const buttons = [...page.querySelectorAll<HTMLButtonElement>('.client-section-nav button')];
    expect(buttons).toHaveLength(CLIENT_SECTIONS.length);
    for (const section of CLIENT_SECTIONS) {
      expect(
        buttons.filter((button) => button.textContent!.trim().endsWith(section.label)),
      ).toHaveLength(1);
    }
    buttons.find((button) => button.textContent!.trim().endsWith('Medication profile'))!.click();
    fixture.detectChanges();
    expect(page.querySelector('.client-section-panel h2')?.textContent).toBe('Medication profile');
    (fixture.componentInstance as unknown as Editor).editEntry();
    fixture.detectChanges();
    expect(buttons.every((button) => button.disabled)).toBe(true);
  });

  it('shows missing overview information explicitly instead of implying no risks, allergies or completed tasks', async () => {
    const fixture = TestBed.createComponent(ClientFiles);
    fixture.detectChanges();
    await fixture.whenStable();
    const page: HTMLElement = fixture.nativeElement;
    expect(page.querySelectorAll('.client-care-alerts .client-record-state')).toHaveLength(2);
    for (const state of page.querySelectorAll('.client-care-alerts .client-record-state'))
      expect(state.textContent?.trim()).toBe('Not recorded');
    expect(
      page.querySelector('[aria-labelledby="client-medication-title"]')?.textContent,
    ).toContain('Not recorded');
    expect(page.querySelector('[aria-labelledby="client-consent-title"]')?.textContent).toContain(
      'Not recorded',
    );
    expect(page.querySelector('.client-personal blockquote')).toBeNull();
    expect(page.querySelector('.client-content')!.textContent).not.toContain('0 / 0');
  });

  it('uses saved review, allergy, medication and consent records and opens the relevant detail', async () => {
    const file = emptyClientFile();
    file.details['about'] = 'I enjoy breakfast in the garden.';
    file.sections['plan'] = {
      name: 'Morning support',
      start: '2019-01-01',
      review: '2020-01-01',
      status: 'Active',
    };
    file.sections['consent'] = { status: 'Withdrawn', date: '2025-01-01' };
    const entry: ClientEntry = {
      id: 'allergy-1',
      name: 'Recorded allergen',
      detail: 'Saved response guidance',
      date: '2025-01-01',
      level: 'High',
      status: 'Active',
    };
    file.entries['allergies'] = [
      entry,
      { ...entry, id: 'allergy-2', name: 'Historical allergy record', status: 'Inactive' },
    ];
    file.entries['medication'] = [
      { ...entry, id: 'med-1', name: 'Recorded medication', level: 'Low' },
    ];
    file.entries['risks'] = [{ ...entry, id: 'risk-1', name: 'Recorded mobility risk' }];
    expect(service.saveClient({ ...service.data().clients[0], file })).toBeNull();
    const fixture = TestBed.createComponent(ClientFiles);
    fixture.detectChanges();
    await fixture.whenStable();
    const page: HTMLElement = fixture.nativeElement;
    expect(page.querySelector('.client-personal blockquote')?.textContent).toBe(
      file.details['about'],
    );
    expect(page.querySelector('[aria-labelledby="client-plan-title"]')?.textContent).toContain(
      'Overdue',
    );
    expect(page.querySelector('[aria-labelledby="client-consent-title"]')?.textContent).toContain(
      'Withdrawn',
    );
    expect(
      page.querySelector('[aria-labelledby="client-medication-title"]')?.textContent,
    ).toContain('Recorded medication');
    expect(page.querySelector('.client-care-alerts')?.textContent).toContain(
      'Recorded mobility risk',
    );
    expect(page.querySelector('.client-care-alerts')?.textContent).toContain('Recorded allergen');
    expect(page.querySelector('.client-care-alerts')?.textContent).not.toContain(
      'Historical allergy record',
    );
    [...page.querySelectorAll<HTMLButtonElement>('.client-care-alerts button')]
      .find((button) => button.textContent!.includes('View allergies'))!
      .click();
    fixture.detectChanges();
    expect(page.querySelector('.client-section-panel h2')?.textContent).toBe('Allergies');
    expect(page.querySelector('.client-content')!.textContent).toContain(
      'Historical allergy record',
    );
  });

  it('validates care-plan dates, saves the corrected draft and discards later changes', async () => {
    const fixture = TestBed.createComponent(ClientFiles);
    const editor = fixture.componentInstance as unknown as Editor;
    editor.setSection('plan');
    editor.editSection();
    editor.values = { name: 'Morning support', start: '2026-10-08', review: '2026-10-07' };
    editor.save();
    expect(editor.error()).toContain('review date');
    expect(service.data().clients[0].file).toBeUndefined();
    editor.values['review'] = '2027-04-08';
    editor.save();
    expect(service.data().clients[0].file?.sections['plan']['name']).toBe('Morning support');
    editor.editSection();
    editor.values['name'] = 'Unsaved change';
    editor.discard();
    expect(service.data().clients[0].file?.sections['plan']['name']).toBe('Morning support');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.client-content').textContent).toContain(
      'Morning support',
    );
  });

  it('keeps tasks within their client, preserves completion and persists workspace records', () => {
    const fixture = TestBed.createComponent(ClientFiles);
    const editor = fixture.componentInstance as unknown as Editor;
    editor.setSection('tasks');
    editor.editEntry();
    editor.entry.name = 'Breakfast support';
    editor.entry.detail = 'Breakfast prepared and enjoyed.';
    editor.entry.status = 'Completed';
    editor.save();
    expect(service.data().clients[0].file?.entries['tasks'][0].status).toBe('Completed');
    const stored = JSON.parse(localStorage.getItem('cv_management_v1')!);
    expect(stored['lqcs'].rota.clients[0].file.entries.tasks[0].detail).toContain('enjoyed');
    const workspace = TestBed.inject(WorkspaceService);
    workspace.switchWorkspace('riverside');
    expect(service.data().clients).toHaveLength(0);
    workspace.switchWorkspace('lqcs');
    expect(service.data().clients[0].file?.entries['tasks']).toHaveLength(1);
  });

  it('opens the client’s existing call packages from the care record', async () => {
    expect(
      service.saveCall({
        id: 'morning',
        clientId: 'client',
        name: 'Morning support',
        start: '08:00',
        end: '08:30',
        weekdays: [1],
        carers: 1,
        skills: [],
        regularStaffIds: [],
        tasks: 'Breakfast',
        active: true,
      }),
    ).toBeNull();
    const record = TestBed.createComponent(ClientFiles);
    record.detectChanges();
    await record.whenStable();
    expect(
      record.nativeElement.querySelector('a[href*="/manage/rota"]').getAttribute('href'),
    ).toContain('client=client');
    const rota = TestBed.createComponent(Rota);
    rota.detectChanges();
    await rota.whenStable();
    expect(rota.nativeElement.querySelector('.rota-call-list').textContent).toContain(
      'Morning support',
    );
  });

  it('does not save a draft into a different workspace or after permission is revoked', () => {
    const fixture = TestBed.createComponent(ClientFiles);
    const editor = fixture.componentInstance as unknown as Editor;
    editor.startProfile();
    editor.draft.name = 'Changed person';
    TestBed.inject(WorkspaceService).switchWorkspace('riverside');
    editor.save();
    expect(editor.error()).toContain('workspace changed');
    expect(service.data().clients).toHaveLength(0);
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    actor.set({ ...DEMO_USER, roleCode: 'CW' });
    TestBed.inject(ManagementStore).update((data) => ({
      ...data,
      rotaPermissions: { 'Care Worker': ['view'] },
    }));
    editor.save();
    expect(editor.error()).toContain('permission');
    expect(service.data().clients[0].name).toBe('Mary Smith');
  });

  it('keeps storage failures visible without reporting a saved record', () => {
    const fixture = TestBed.createComponent(ClientFiles);
    const editor = fixture.componentInstance as unknown as Editor;
    editor.setSection('consent');
    editor.editSection();
    editor.values['status'] = 'Given';
    vi.spyOn(TestBed.inject(ManagementStore), 'saveWorkspace').mockReturnValue(false);
    editor.save();
    expect(editor.error()).toContain('Could not save');
    expect(service.data().clients[0].file).toBeUndefined();
  });

  it('rejects invalid dates without throwing or modifying saved care information', () => {
    const file = emptyClientFile();
    file.details['dob'] = '2026-02-30';
    expect(service.saveClient({ ...service.data().clients[0], file })).toContain('valid dates');
    file.details['dob'] = 'invalid';
    expect(service.saveClient({ ...service.data().clients[0], file })).toContain('valid dates');
    expect(service.data().clients[0].file).toBeUndefined();
  });
});
