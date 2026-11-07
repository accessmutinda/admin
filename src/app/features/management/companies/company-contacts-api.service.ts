import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { AddressKind, CompanyContacts, emptyCompanyContacts } from './company-contacts.models';
interface AddressRecord {
  id: string;
  version: number;
  kind: string;
  line1: string;
  line2: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
}
interface KeyContactRecord {
  id: string;
  version: number;
  category: string;
  name: string;
  job_role: string;
  email: string;
  phone: string;
  active: boolean;
}
interface ContactInformationRecord {
  channels: Record<string, string | null>;
  addresses: AddressRecord[];
  contacts: KeyContactRecord[];
  billing_uses_registered: boolean | null;
  etag: string;
}
const addressKinds: Record<AddressKind, string> = {
  registered: 'registered',
  headOffice: 'head_office',
  billing: 'billing',
};
const categories: Record<string, string> = {
  registered_manager: 'Registered Manager',
  nominated_individual: 'Nominated Individual',
  finance: 'Finance Contact',
  compliance: 'Compliance Contact',
  it: 'IT/System Contact',
  other: 'Other',
};
const primaryFields: Record<keyof CompanyContacts['primary'], string> = {
  mainPhone: 'main_phone',
  secondaryPhone: 'secondary_phone',
  generalEmail: 'general_email',
  billingEmail: 'billing_email',
  website: 'website',
  emergencyContact: 'emergency_contact',
  outOfHoursNumber: 'out_of_hours_number',
};
@Injectable()
export class CompanyContactsApiService {
  private readonly auth = inject(AuthService);
  private record: ContactInformationRecord | null = null;
  private companyId = '';
  private context = '';
  private generation = 0;
  private retry: { signature: string; key: string } | null = null;
  private identity(): string {
    return `${this.auth.profile()?.id ?? ''}:${this.auth.profile()?.company_id ?? ''}`;
  }
  private assertScope(id: string): void {
    if (
      !this.auth.canAccessCompany(id) ||
      id !== this.companyId ||
      this.context !== this.identity()
    )
      throw new Error('The company context changed. Reload before saving contact information.');
  }
  private validate(record: ContactInformationRecord): void {
    if (
      !record ||
      !record.channels ||
      !Array.isArray(record.addresses) ||
      !Array.isArray(record.contacts) ||
      typeof record.etag !== 'string'
    )
      throw new Error('The contact information could not be read.');
  }
  private map(record: ContactInformationRecord): CompanyContacts {
    const value = emptyCompanyContacts({});
    for (const kind of Object.keys(addressKinds) as AddressKind[]) {
      const row = record.addresses.find((row) => row.kind === addressKinds[kind]);
      value.addresses[kind] = {
        line1: row?.line1 ?? '',
        line2: row?.line2 ?? '',
        city: row?.city ?? '',
        county: row?.county ?? '',
        postcode: row?.postcode ?? '',
        country: row?.country ?? '',
      };
    }
    value.billingSameAsRegistered = record.billing_uses_registered === true;
    for (const key of Object.keys(primaryFields) as (keyof typeof primaryFields)[])
      value.primary[key] = record.channels[primaryFields[key]] ?? '';
    value.keyContacts = record.contacts.map((row) => ({
      id: row.id,
      category: categories[row.category] ?? row.category,
      name: row.name,
      role: row.job_role,
      email: row.email,
      phone: row.phone,
      active: row.active,
    }));
    return value;
  }
  async load(id: string): Promise<CompanyContacts> {
    const generation = ++this.generation;
    this.companyId = id;
    this.context = this.identity();
    this.record = null;
    this.retry = null;
    this.assertScope(id);
    const record = await this.auth.api<ContactInformationRecord>(
      `/companies/${encodeURIComponent(id)}/contact-information`,
    );
    this.assertScope(id);
    if (generation !== this.generation) throw new Error('A newer contact record is being loaded.');
    this.validate(record);
    this.record = record;
    return this.map(record);
  }
  async save(id: string, value: CompanyContacts): Promise<CompanyContacts> {
    this.assertScope(id);
    if (!this.record) throw new Error('Load contact information before saving.');
    const channels = Object.fromEntries(
      Object.entries(primaryFields).map(([key, field]) => [
        field,
        value.primary[key as keyof typeof primaryFields].trim(),
      ]),
    );
    const addresses = (Object.keys(addressKinds) as AddressKind[]).map((key) => {
      const row = this.record!.addresses.find((row) => row.kind === addressKinds[key]);
      const fields = Object.fromEntries(
        Object.entries(value.addresses[key]).map(([field, text]) => [field, text.trim()]),
      );
      const remove =
        !!row &&
        [row.line1, row.line2, row.city, row.county, row.postcode, row.country].some(
          (text) => !!text?.trim(),
        ) &&
        Object.values(fields).every((text) => !text);
      return {
        ...fields,
        kind: addressKinds[key],
        ...(row ? { id: row.id, version: row.version } : {}),
        ...(remove ? { delete: true } : {}),
      };
    });
    const contacts = value.keyContacts.map((contact) => {
      const stored = this.record!.contacts.find((row) => row.id === contact.id);
      const category =
        Object.keys(categories).find((key) => categories[key] === contact.category) ??
        contact.category;
      return {
        category,
        name: contact.name.trim(),
        job_role: contact.role.trim(),
        email: contact.email.trim(),
        phone: contact.phone.trim(),
        active: contact.active,
        ...(stored ? { id: stored.id, version: stored.version } : { client_id: contact.id }),
      };
    });
    const removed_contacts = this.record.contacts
      .filter((row) => !value.keyContacts.some((contact) => contact.id === row.id))
      .map((row) => ({ id: row.id, version: row.version }));
    const payload = {
      channels,
      addresses,
      contacts,
      removed_contacts,
      billing_uses_registered: value.billingSameAsRegistered,
    };
    const signature = JSON.stringify(payload);
    if (this.retry?.signature !== signature) this.retry = { signature, key: crypto.randomUUID() };
    const record = await this.auth.api<ContactInformationRecord>(
      `/companies/${encodeURIComponent(id)}/contact-information`,
      payload,
      'PATCH',
      { 'If-Match': this.record.etag, 'Idempotency-Key': this.retry!.key },
    );
    this.assertScope(id);
    this.validate(record);
    this.record = record;
    this.retry = null;
    return this.map(record);
  }
}
