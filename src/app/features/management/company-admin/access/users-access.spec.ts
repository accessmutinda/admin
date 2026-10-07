import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { WorkspaceService } from '../../../../core/auth/workspace.service';
import { UsersAccess } from './users-access';
import { ManagementStore } from '../../shared/management.store';

interface PermissionEditor {
  role: string;
  permissions: Record<string, boolean[]>;
  changeRole(): void;
  applyPermissionPreset(preset: 'view' | 'standard' | 'none'): void;
  discardPermissions(): void;
  savePermissions(): void;
  permissionsChanged(): boolean;
  togglePayrollAction(action: 'view' | 'manage' | 'approve' | 'finalise' | 'export' | 'pay'): void;
  hasPayrollAction(action: 'view' | 'manage'): boolean;
  toggleRotaAction(action: 'view' | 'manage' | 'publish' | 'attendance' | 'export'): void;
  hasRotaAction(action: 'view' | 'manage' | 'publish' | 'attendance' | 'export'): boolean;
}

describe('UsersAccess permission drafts', () => {
  let editor: PermissionEditor;
  let store: ManagementStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [UsersAccess],
      providers: [provideRouter([])],
    }).overrideComponent(UsersAccess, { set: { template: '' } });
    TestBed.inject(AuthService).signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    store = TestBed.inject(ManagementStore);
    editor = TestBed.createComponent(UsersAccess).componentInstance as unknown as PermissionEditor;
  });

  it('keeps separate unsaved drafts when switching roles', () => {
    editor.applyPermissionPreset('view');
    editor.permissions['Care delivery'][3] = true;
    editor.role = 'HR Officer';
    editor.changeRole();
    editor.applyPermissionPreset('none');
    editor.role = 'Registered Manager';
    editor.changeRole();
    expect(editor.permissions['Care delivery']).toEqual([true, false, false, true, false]);
    expect(store.data().permissions['Registered Manager:Care delivery']).toBeUndefined();
    editor.role = 'HR Officer';
    editor.changeRole();
    expect(editor.permissions['Care delivery']).toEqual([false, false, false, false, false]);
  });

  it('saves only the selected role and restores its saved settings on discard', () => {
    editor.applyPermissionPreset('view');
    editor.role = 'HR Officer';
    editor.changeRole();
    editor.applyPermissionPreset('none');
    editor.savePermissions();
    expect(store.data().permissions['Registered Manager:Care delivery']).toBeUndefined();
    expect(store.data().permissions['HR Officer:Care delivery']).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(editor.permissionsChanged()).toBe(false);
    editor.applyPermissionPreset('standard');
    expect(editor.permissionsChanged()).toBe(true);
    editor.discardPermissions();
    expect(editor.permissions['Care delivery']).toEqual([false, false, false, false, false]);
    expect(editor.permissionsChanged()).toBe(false);
  });
  it('keeps payroll access drafts by role and persists only the selected role', () => {
    editor.togglePayrollAction('manage');
    expect(editor.hasPayrollAction('manage')).toBe(false);
    editor.role = 'Care Worker';
    editor.changeRole();
    editor.togglePayrollAction('view');
    editor.savePermissions();
    expect(store.data().payrollPermissions?.['Care Worker']).toEqual(['view']);
    expect(store.data().payrollPermissions?.['Registered Manager']).toBeUndefined();
    editor.role = 'Registered Manager';
    editor.changeRole();
    expect(editor.hasPayrollAction('manage')).toBe(false);
    editor.discardPermissions();
    expect(editor.hasPayrollAction('manage')).toBe(true);
  });
  it('keeps rota access drafts per role and saves only the selected role', () => {
    editor.toggleRotaAction('publish');
    expect(editor.hasRotaAction('publish')).toBe(false);
    editor.role = 'Care Worker';
    editor.changeRole();
    editor.toggleRotaAction('view');
    editor.toggleRotaAction('attendance');
    editor.savePermissions();
    expect(store.data().rotaPermissions?.['Care Worker']).toEqual(['view', 'attendance']);
    expect(store.data().rotaPermissions?.['Registered Manager']).toBeUndefined();
    editor.role = 'Registered Manager';
    editor.changeRole();
    expect(editor.hasRotaAction('publish')).toBe(false);
    editor.discardPermissions();
    expect(editor.hasRotaAction('publish')).toBe(true);
  });
  it('applies presets to rota permissions and restores the saved draft on discard', () => {
    editor.applyPermissionPreset('none');
    expect(editor.hasRotaAction('view')).toBe(false);
    expect(editor.permissionsChanged()).toBe(true);
    editor.discardPermissions();
    expect(editor.hasRotaAction('view')).toBe(true);
    editor.applyPermissionPreset('view');
    expect(editor.hasRotaAction('view')).toBe(true);
    expect(editor.hasRotaAction('attendance')).toBe(false);
    editor.savePermissions();
    expect(store.data().rotaPermissions?.['Registered Manager']).toEqual(['view']);
    editor.applyPermissionPreset('standard');
    expect(editor.hasRotaAction('attendance')).toBe(true);
  });
  it('retains permission drafts when saving fails', () => {
    editor.applyPermissionPreset('none');
    vi.spyOn(store, 'saveWorkspace').mockReturnValue(false);
    editor.savePermissions();
    expect(editor.permissionsChanged()).toBe(true);
    expect(store.data().rotaPermissions?.['Registered Manager']).toBeUndefined();
  });
});
