import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { ToastService } from '../../../shared/ui/toast.service';
import { ManagementStore, Member } from '../shared/management.store';
import { CompanyUserDialog, CompanyUserDialogData } from './company-user-dialog';

interface UserEditor {
  email: string;
  role: string;
  status: string;
  error(): string;
  save(): void;
}
describe('Company membership dialogs', () => {
  let store: ManagementStore;
  const toast = { success: vi.fn(), info: vi.fn(), error: vi.fn() };
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [CompanyUserDialog],
      providers: [{ provide: ToastService, useValue: toast }],
    });
    TestBed.inject(AuthService).signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    store = TestBed.inject(ManagementStore);
    vi.clearAllMocks();
  });
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    vi.restoreAllMocks();
  });
  function open(mode: CompanyUserDialogData['mode'], member?: Member) {
    const ref = TestBed.inject(MatDialog).open(CompanyUserDialog, {
      data: { companyId: 'lqcs', mode, member: member ? structuredClone(member) : undefined },
      autoFocus: false,
    });
    TestBed.tick();
    return {
      editor: ref.componentInstance as unknown as UserEditor,
      close: vi.spyOn(ref, 'close'),
      element: document.querySelector('cv-company-user-dialog')!,
    };
  }
  it('records an invitation with normalised email and an explicit delivery limitation', () => {
    const { editor, close, element } = open('invite');
    expect(element.textContent).toContain('Send Invite');
    expect(element.textContent).toContain('Email delivery is not connected');
    editor.email = '  NEW.User@Example.co.uk  ';
    editor.role = 'Care Coordinator';
    editor.save();
    const member = store.data().members.find((m) => m.email === 'new.user@example.co.uk');
    expect(member?.status).toBe('Invited');
    expect(member?.role).toBe('Care Coordinator');
    expect(member?.name).toBe('');
    expect(close).toHaveBeenCalledWith(true);
    expect(JSON.parse(localStorage.getItem('cv_management_v1')!).lqcs.members).toHaveLength(5);
    expect(toast.success).toHaveBeenCalledWith(
      'Invitation recorded. Email delivery is not connected.',
    );
  });
  it('rejects invalid and duplicate emails and invalid roles without closing', () => {
    const { editor, close } = open('invite');
    editor.email = 'bad';
    editor.save();
    expect(editor.error()).toContain('valid email');
    editor.email = 'ARTHUR.BENNETT@example.co.uk';
    editor.save();
    expect(editor.error()).toContain('already exists');
    editor.email = 'new@example.co.uk';
    editor.role = 'Unsupported';
    editor.save();
    expect(editor.error()).toContain('valid role');
    expect(store.data().members).toHaveLength(4);
    expect(close).not.toHaveBeenCalled();
  });
  it('edits role and status while preserving the original email and identity', () => {
    const member = structuredClone(store.data().members[0]);
    const { editor, element } = open('edit', member);
    expect(element.querySelector('input[type="email"]')).toBeNull();
    expect(element.textContent).toContain(member.email);
    expect(element.textContent).toContain('read-only');
    editor.email = 'changed@example.co.uk';
    editor.role = 'Care Worker';
    editor.status = 'Suspended';
    editor.save();
    expect(store.data().members.find((m) => m.id === member.id)).toEqual({
      ...member,
      role: 'Care Worker',
      status: 'Suspended',
    });
    expect(store.data().people.length).toBeGreaterThan(0);
  });
  it('does not change membership when cancelled and requires the delete confirmation', () => {
    const member = structuredClone(store.data().members[0]);
    const before = structuredClone(store.data());
    const { editor, element, close } = open('delete', member);
    expect(element.textContent).toContain('Remove this user');
    expect(element.textContent).toContain(member.email);
    expect(element.querySelector('mat-select')).toBeNull();
    const cancel = Array.from(element.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Cancel',
    )!;
    cancel.click();
    expect(store.data()).toEqual(before);
    const confirm = open('delete', member);
    confirm.editor.save();
    expect(store.data().members.some((m) => m.id === member.id)).toBe(false);
    expect(store.data().people).toEqual(before.people);
    expect(store.data().permissions).toEqual(before.permissions);
  });
  it('retains the popup and edits when storage fails', () => {
    const { editor, close } = open('invite');
    editor.email = 'retry@example.co.uk';
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Full');
    });
    editor.save();
    expect(editor.error()).toContain('could not be saved');
    expect(editor.email).toBe('retry@example.co.uk');
    expect(close).not.toHaveBeenCalled();
    expect(store.data().members).toHaveLength(4);
    expect(toast.success).not.toHaveBeenCalled();
  });
  it('blocks saving after the selected workspace changes', () => {
    const { editor, close } = open('invite');
    editor.email = 'new@example.co.uk';
    TestBed.inject(WorkspaceService).switchWorkspace('riverside');
    editor.save();
    expect(editor.error()).toContain('workspace');
    expect(close).not.toHaveBeenCalled();
    expect(store.records()['riverside']).toBeUndefined();
  });
  it('checks member existence again before applying an edit', () => {
    const member = structuredClone(store.data().members[0]);
    const { editor, close } = open('edit', member);
    store.saveWorkspace((data) => ({
      ...data,
      members: data.members.filter((m) => m.id !== member.id),
    }));
    editor.role = 'Care Worker';
    editor.save();
    expect(editor.error()).toContain('no longer exists');
    expect(close).not.toHaveBeenCalled();
    expect(store.data().members).toHaveLength(3);
  });
});
