import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { ToastService } from '../../../shared/ui/toast.service';
import { ManagementStore, Company } from '../shared/management.store';
import { CompanyProfile } from './company-profile';

interface ProfileControls {
  draft: Company;
  editing: () => boolean;
  draftAvailable: () => boolean;
  saveError: () => string;
  edit(): void;
  cancel(): void;
  save(): void;
  saveDraft(): void;
  resumeDraft(): void;
}

describe('Company profile', () => {
  let store: ManagementStore;
  const toast = { success: vi.fn(), error: vi.fn() };
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [CompanyProfile],
      providers: [
        provideRouter([]),
        { provide: ToastService, useValue: toast },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: 'lqcs' }),
              queryParamMap: convertToParamMap({}),
            },
          },
        },
      ],
    });
    TestBed.inject(AuthService).signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    store = TestBed.inject(ManagementStore);
    vi.clearAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());
  function create() {
    const fixture = TestBed.createComponent(CompanyProfile);
    fixture.detectChanges();
    return { fixture, controls: fixture.componentInstance as unknown as ProfileControls };
  }
  function fill(controls: ProfileControls) {
    Object.assign(controls.draft, {
      name: 'Updated Care',
      tradingName: 'Care Together',
      description: 'Person-centred residential care.',
      establishedDate: '2010-03-15',
      headOfficeName: 'Main office',
      registeredPlaces: 48,
      primaryLanguage: 'English',
      active: true,
      headOfficeAddress: '123 Green Lane',
    });
  }
  it('opens read-only, then presents the stacked editable form and cancels without saving', () => {
    const { fixture, controls } = create();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(fixture.nativeElement.querySelector('dl').textContent).toContain(
      'London Quality Care Services',
    );
    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#input-name')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#input-registeredPlaces')).toBeTruthy();
    controls.draft.name = 'Unsaved name';
    controls.cancel();
    fixture.detectChanges();
    expect(controls.editing()).toBe(false);
    expect(store.company()?.name).toBe('London Quality Care Services');
  });
  it('saves the new information, preserves branding/modules and returns to read-only', () => {
    const { controls } = create();
    const original = structuredClone(store.company()!);
    controls.edit();
    fill(controls);
    controls.save();
    expect(controls.editing()).toBe(false);
    expect(store.company()).toMatchObject({
      name: 'Updated Care',
      registeredPlaces: 48,
      tradingName: 'Care Together',
      modifiedBy: 'Jane Doe',
    });
    expect(store.company()?.modules).toEqual(original.modules);
    expect(store.company()?.color).toBe(original.color);
    expect(JSON.parse(localStorage.getItem('cv_companies_v1')!)[0].description).toBe(
      'Person-centred residential care.',
    );
  });
  it('rejects missing required information and invalid place counts without changing saved data', () => {
    const { controls } = create();
    controls.edit();
    controls.draft.name = '';
    controls.save();
    expect(controls.editing()).toBe(true);
    fill(controls);
    controls.draft.registeredPlaces = -1;
    controls.save();
    expect(store.company()?.name).toBe('London Quality Care Services');
    expect(toast.success).not.toHaveBeenCalled();
  });
  it('keeps a saved draft separate and allows it to be resumed after reopening', () => {
    const first = create();
    first.controls.edit();
    fill(first.controls);
    first.controls.saveDraft();
    expect(store.company()?.name).toBe('London Quality Care Services');
    first.fixture.destroy();
    const { controls } = create();
    expect(controls.draftAvailable()).toBe(true);
    controls.resumeDraft();
    expect(controls.draft.name).toBe('Updated Care');
    expect(controls.editing()).toBe(true);
    controls.save();
    expect(localStorage.getItem('cv_company_profile_draft:lqcs')).toBeNull();
  });
  it('retains edits and reports a storage failure without claiming a successful save', () => {
    const { controls } = create();
    controls.edit();
    fill(controls);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage full');
    });
    controls.save();
    expect(controls.editing()).toBe(true);
    expect(controls.draft.name).toBe('Updated Care');
    expect(controls.saveError()).toContain('could not be saved');
    expect(store.company()?.name).toBe('London Quality Care Services');
    expect(toast.success).not.toHaveBeenCalled();
  });
});
