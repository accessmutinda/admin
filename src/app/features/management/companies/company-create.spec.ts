import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyCreatePage } from './company-create';
import { CompaniesApiService } from './companies-api.service';
import { CompanyCreateDraft } from './company-create.models';
import { ManagementStore } from '../shared/management.store';
import { ToastService } from '../../../shared/ui/toast.service';

const result = {
  id: 'server-company',
  code: 'NEW',
  lifecycle: 'pending_setup',
  initial_admin_invitation: { id: 'invitation', state: 'pending', delivery_state: 'queued' },
  request_id: 'request',
};
interface Editor {
  draft: CompanyCreateDraft;
  initialAdminEmail: string;
  step: ReturnType<typeof signal<number>>;
  reviewed: ReturnType<typeof signal<boolean>>;
  created(): boolean;
  error(): string;
  notice(): string;
  create(): Promise<void>;
}
describe('Original five-step company creation with API submission', () => {
  let create: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    localStorage.clear();
    create = vi.fn().mockResolvedValue(result);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: CompaniesApiService,
          useValue: { create, load: vi.fn().mockResolvedValue(undefined) },
        },
        {
          provide: AuthService,
          useValue: {
            currentUser: () => ({ id: 'user-1', name: 'API User' }),
            isSuperAdmin: () => true,
            loadWorkspaces: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ManagementStore,
          useValue: { companies: () => [], records: () => ({}), companyId: () => '' },
        },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    });
  });
  function open() {
    const fixture = TestBed.createComponent(CompanyCreatePage);
    fixture.detectChanges();
    return { fixture, editor: fixture.componentInstance as unknown as Editor };
  }
  function fill(editor: Editor) {
    Object.assign(editor.draft.company, {
      name: 'New Care Company',
      code: 'new',
      registration: '87654321',
      region: 'England',
    });
    editor.draft.company.subscription!.plan = 'Professional';
    Object.assign(editor.draft.company.contacts!.primary, {
      generalEmail: 'office@example.com',
      mainPhone: '+44 20 7946 0123',
      website: 'https://example.com',
    });
    editor.initialAdminEmail = 'admin@example.com';
    editor.reviewed.set(true);
  }
  it('preserves the original labels, steps, fields and draft controls', () => {
    const { fixture, editor } = open();
    const root: HTMLElement = fixture.nativeElement;
    expect(
      Array.from(root.querySelectorAll('.cn-steps strong')).map((node) => node.textContent!.trim()),
    ).toEqual(['Basic Details', 'Registration', 'Contacts', 'Modules', 'Review & Create']);
    expect(root.textContent).toContain('Save Draft');
    expect(root.textContent).toContain('Subscription Plan');
    editor.step.set(3);
    fixture.detectChanges();
    expect(root.querySelector('.cn-modules')).not.toBeNull();
  });
  it('submits the supported backend payload and never creates a local company substitute', async () => {
    const { editor } = open();
    fill(editor);
    await editor.create();
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0]).toMatchObject({
      company: { name: 'New Care Company', code: 'new' },
      initial_admin: { email: 'admin@example.com', mfa_override: 'inherit' },
    });
    expect(editor.created()).toBe(true);
    expect(editor.draft.company.id).toBe('server-company');
    expect(editor.notice()).toContain('awaiting backend support');
    expect(localStorage.getItem('cv_api_company_details_v1')).toBeNull();
  });
  it('preserves the idempotency key on an unchanged retry', async () => {
    create.mockRejectedValueOnce(new Error('Network unavailable.'));
    const { editor } = open();
    fill(editor);
    await editor.create();
    expect(editor.error()).toBe('Network unavailable.');
    await editor.create();
    expect(create.mock.calls[0][1]).toBe(create.mock.calls[1][1]);
  });
  it('does not submit missing required frontend inputs', async () => {
    const { editor } = open();
    await editor.create();
    expect(create).not.toHaveBeenCalled();
  });
});
