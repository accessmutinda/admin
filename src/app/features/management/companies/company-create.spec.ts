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
          useValue: {
            loading: () => false,
            loaded: () => true,
            create,
            load: vi.fn().mockResolvedValue(undefined),
          },
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
    editor.draft.company.subscription!.plan = 'Growth';
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
    const { fixture, editor } = open();
    fill(editor);
    await editor.create();
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0]).toMatchObject({
      company: { name: 'New Care Company', code: 'new', registration_number: '87654321' },
      initial_admin: { email: 'admin@example.com', mfa_override: 'inherit' },
    });
    expect(editor.created()).toBe(true);
    expect(editor.draft.company.id).toBe('server-company');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.cn-success').textContent).toContain(
      'The initial Company Admin invitation was queued for email delivery.',
    );
    expect(localStorage.getItem('cv_api_company_details_v1')).toBeNull();
  });
  it('explains before submission that the Company Admin invitation is queued separately from the welcome email', () => {
    const { fixture, editor } = open();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('#cn-email-help')?.textContent).toContain(
      'Welcome emails are currently unavailable.',
    );
    editor.step.set(4);
    fixture.detectChanges();
    const email = root.querySelector('#cn-initial-admin-email')!;
    const help = root.querySelector(`#${email.getAttribute('aria-describedby')}`);
    expect(help?.textContent).toContain('Create Company queues a Company Admin invitation');
    expect(root.querySelector('.cn-guidance')?.textContent).toContain(
      'The optional welcome email is a separate message.',
    );
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
  it('submits a corrected registration number with a new idempotency key after a failed request', async () => {
    create.mockRejectedValueOnce(new Error('Network unavailable.'));
    const { editor } = open();
    fill(editor);
    await editor.create();
    editor.draft.company.registration = 'SC123456';
    await editor.create();
    expect(create.mock.calls[1][0].company.registration_number).toBe('SC123456');
    expect(create.mock.calls[0][1]).not.toBe(create.mock.calls[1][1]);
  });
  it('does not submit missing required frontend inputs', async () => {
    const { editor } = open();
    await editor.create();
    expect(create).not.toHaveBeenCalled();
  });
  it('reaches 100% when the required details are filled, before the review confirmation', () => {
    const { fixture, editor } = open();
    const readiness = editor as unknown as { percentage(): number };
    fill(editor);
    editor.initialAdminEmail = '';
    fixture.detectChanges();
    expect(readiness.percentage()).toBe(80);
    editor.initialAdminEmail = 'admin@example.com';
    editor.reviewed.set(false);
    fixture.detectChanges();
    expect(readiness.percentage()).toBe(100);
  });
});
