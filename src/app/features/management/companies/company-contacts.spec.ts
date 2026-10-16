import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { ToastService } from '../../../shared/ui/toast.service';
import { ManagementStore } from '../shared/management.store';
import { CompanyContactsPage } from './company-contacts';
import {
  AddressKind,
  CompanyAddress,
  CompanyContacts,
  CompanyKeyContact,
  CONTACT_CATEGORIES,
  contactsCompletion,
  contactInformationComplete,
  effectiveAddress,
} from './company-contacts.models';

type ContactsEditor = {
  draft: CompanyContacts;
  save(): void;
  cancel(): void;
  saveError(): string;
  hasChanges(): boolean;
  setAddress(kind: AddressKind, field: keyof CompanyAddress, value: string): void;
  checkAddress(kind: AddressKind): void;
  isChecked(kind: AddressKind): boolean;
  mapUrl(kind: AddressKind): string | null;
  openContact(contact?: CompanyKeyContact, category?: string): void;
  removeContact(id: string): void;
};
const address: CompanyAddress = {
  line1: '123 Green Lane',
  line2: 'The Courtyard',
  city: 'Richmond',
  county: 'London',
  postcode: 'SW14 8EX',
  country: 'United Kingdom',
};

describe('Company contact information', () => {
  let store: ManagementStore;
  const toast = { success: vi.fn(), error: vi.fn() };
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [CompanyContactsPage],
      providers: [
        provideRouter([]),
        { provide: ToastService, useValue: toast },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'lqcs' }) } },
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
    const fixture = TestBed.createComponent(CompanyContactsPage);
    fixture.detectChanges();
    return { fixture, editor: fixture.componentInstance as unknown as ContactsEditor };
  }
  function fill(editor: ContactsEditor) {
    for (const kind of ['registered', 'headOffice', 'billing'] as const)
      editor.draft.addresses[kind] = structuredClone(address);
    editor.draft.primary.mainPhone = '020 8943 4567';
    editor.draft.primary.generalEmail = 'office@example.co.uk';
  }
  it('renders all address, primary-contact and key-contact panels without invented people', () => {
    const { fixture, editor } = create();
    const text = fixture.nativeElement.textContent;
    for (const label of [
      'Registered Address',
      'Head Office Address',
      'Billing Address',
      'Primary Contact Details',
      'Address Validation Status',
      'Contact Completeness',
      'Key Contacts',
    ])
      expect(text).toContain(label);
    expect(editor.draft.keyContacts).toEqual([]);
    expect(fixture.nativeElement.querySelectorAll('.cc-contact-card').length).toBe(5);
    expect(text).not.toContain('Verified with Royal Mail');
  });
  it('keeps same-as-registered billing live and saves copied fields with the company', () => {
    const { editor } = create();
    fill(editor);
    editor.draft.billingSameAsRegistered = true;
    editor.setAddress('registered', 'line1', '456 Green Lane');
    expect(effectiveAddress(editor.draft, 'billing').line1).toBe('456 Green Lane');
    editor.save();
    expect(store.company()?.contacts?.addresses.billing.line1).toBe('456 Green Lane');
    expect(store.company()?.headOfficeAddress).toContain('123 Green Lane');
    expect(store.company()?.postcode).toBe('SW14 8EX');
    expect(editor.hasChanges()).toBe(false);
    expect(contactInformationComplete(store.company())).toBe(true);
    expect(store.companies().find((c) => c.id === 'riverside')?.contacts).toBeUndefined();
    expect(
      JSON.parse(localStorage.getItem('cv_companies_v1')!)[0].contacts.primary.generalEmail,
    ).toBe('office@example.co.uk');
  });
  it('invalidates a local address check after details change', () => {
    const { editor } = create();
    fill(editor);
    editor.checkAddress('registered');
    expect(editor.isChecked('registered')).toBe(true);
    editor.setAddress('registered', 'line1', 'A different office');
    expect(editor.isChecked('registered')).toBe(false);
    expect(editor.mapUrl('registered')).toContain('A%20different%20office');
  });
  it('rejects invalid addresses and contact details before saving', () => {
    const { fixture, editor } = create();
    fill(editor);
    editor.draft.addresses.registered.postcode = 'invalid';
    editor.draft.primary.generalEmail = 'not-an-email';
    editor.save();
    fixture.detectChanges();
    expect(editor.saveError()).toContain('highlighted');
    expect(store.company()?.contacts).toBeUndefined();
    expect(
      fixture.nativeElement.querySelector('#registered-postcode').getAttribute('aria-invalid'),
    ).toBe('true');
    expect(
      fixture.nativeElement.querySelector('#primary-generalEmail').getAttribute('aria-invalid'),
    ).toBe('true');
  });
  it('edits and removes contacts in the unsaved draft without granting system access', () => {
    const { fixture, editor } = create();
    const contact: CompanyKeyContact = {
      id: 'manager',
      category: 'Registered Manager',
      name: 'Alex Manager',
      role: 'Registered Manager',
      email: 'alex@example.co.uk',
      phone: '020 8943 4567',
      active: true,
    };
    const open = vi
      .spyOn(fixture.debugElement.injector.get(MatDialog), 'open')
      .mockReturnValue({ afterClosed: () => of(contact) } as never);
    const members = structuredClone(store.data().members);
    editor.openContact();
    expect(editor.draft.keyContacts[0].name).toBe('Alex Manager');
    expect(store.company()?.contacts).toBeUndefined();
    expect(store.data().members).toEqual(members);
    open.mockReturnValue({
      afterClosed: () => of({ ...contact, name: 'Updated Manager' }),
    } as never);
    editor.openContact(contact);
    expect(editor.draft.keyContacts).toHaveLength(1);
    expect(editor.draft.keyContacts[0].name).toBe('Updated Manager');
    editor.removeContact(contact.id);
    expect(editor.draft.keyContacts).toEqual([]);
  });
  it('derives 100% only from complete addresses, primary contacts and all five key types', () => {
    const { editor } = create();
    fill(editor);
    expect(contactsCompletion(editor.draft)).toBeLessThan(100);
    editor.draft.keyContacts = CONTACT_CATEGORIES.map((category, i) => ({
      id: String(i),
      category: category.name,
      name: 'Contact ' + i,
      role: category.name,
      email: 'contact' + i + '@example.co.uk',
      phone: '020 8943 4567',
      active: true,
    }));
    expect(contactsCompletion(editor.draft)).toBe(100);
    editor.draft.keyContacts[0].active = false;
    expect(contactsCompletion(editor.draft)).toBeLessThan(100);
  });
  it('keeps edits intact if storage fails and allows cancel to restore saved values', () => {
    const { editor } = create();
    const original = structuredClone(editor.draft);
    fill(editor);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage full');
    });
    editor.save();
    expect(editor.saveError()).toContain('could not be saved');
    expect(editor.draft.primary.generalEmail).toBe('office@example.co.uk');
    expect(store.company()?.contacts).toBeUndefined();
    expect(toast.success).not.toHaveBeenCalled();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    editor.cancel();
    expect(editor.draft).toEqual(original);
    expect(editor.hasChanges()).toBe(false);
  });
});
