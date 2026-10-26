import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { CareContact } from '../care/care.models';
import { ProfessionalRecord } from './portal.models';
import { PortalClientContext } from './portal-client-context';
import { PortalEvidence } from './portal-evidence';
@Component({
  selector: 'cv-portal-communications',
  imports: [DatePipe, FormsModule, MatSelectModule, CvSelect, PortalEvidence],
  templateUrl: './portal-communications.html',
  styleUrls: ['./portal-ui.css', './portal-forms.css', './portal-communications.css'],
})
export class PortalCommunications {
  protected readonly context = inject(PortalClientContext);
  protected readonly portal = this.context.portal;
  protected readonly query = signal('');
  protected readonly type = signal('All');
  protected readonly period = signal('All time');
  protected readonly addingContact = signal(false);
  protected readonly uploading = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly types = [
    'GP note',
    'District nurse note',
    'OT request',
    'Social worker email',
    'Hospital communication',
    'Family update',
    'Phone call',
    'Email',
    'Management action',
  ];
  protected record = this.portal.newCommunication(this.context.id());
  private clean = JSON.stringify(this.record);
  protected contact: CareContact = this.blankContact();
  private contactClean = JSON.stringify(this.contact);
  private contactVersion = '';
  protected readonly records = computed(() =>
    this.context
      .communications()
      .filter(
        (c) =>
          (this.type() === 'All' || c.type === this.type()) &&
          (!this.query() ||
            [c.subject, c.details, this.contactName(c.contactId), c.loggedBy].some((v) =>
              v.toLowerCase().includes(this.query().toLowerCase()),
            )) &&
          (this.period() === 'All time' ||
            Date.parse(c.at) >= Date.now() - (this.period() === 'Last 7 days' ? 7 : 30) * 86400000),
      )
      .sort((a, b) => b.at.localeCompare(a.at)),
  );
  constructor() {
    const id = inject(ActivatedRoute).snapshot.queryParamMap.get('record');
    const record = this.context.communications().find((r) => r.id === id);
    if (record) {
      this.record = structuredClone(record);
      this.record.at = this.localDate(record.at);
      this.clean = JSON.stringify(this.record);
    }
  }
  private blankContact(): CareContact {
    return {
      id: crypto.randomUUID(),
      name: '',
      relationship: '',
      phone: '',
      email: '',
      type: 'Professional',
      nextOfKin: false,
    };
  }
  protected print(): void {
    window.print();
  }
  protected tone(type: string): string {
    return type.includes('GP')
      ? 'purple'
      : type.includes('District')
        ? 'red'
        : type.includes('OT')
          ? 'green'
          : type.includes('Social')
            ? 'amber'
            : type.includes('Family')
              ? 'red'
              : 'blue';
  }
  protected contactName(id: string): string {
    return this.context.contacts().find((c) => c.id === id)?.name ?? 'Contact unavailable';
  }
  protected lastContact(id: string): string {
    return (
      this.context
        .communications()
        .filter((c) => c.contactId === id)
        .sort((a, b) => b.at.localeCompare(a.at))[0]?.at ?? ''
    );
  }
  protected nextContact(id: string): string {
    return (
      this.context
        .communications()
        .filter((c) => c.contactId === id && c.followUp && c.status !== 'Resolved')
        .sort((a, b) => a.followUp.localeCompare(b.followUp))[0]?.followUp ?? ''
    );
  }
  private localDate(value: string): string {
    const d = new Date(value);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
  protected edit(record?: ProfessionalRecord): void {
    if (!this.canLeave()) return;
    this.record = record
      ? structuredClone(record)
      : this.portal.newCommunication(this.context.id());
    if (record) this.record.at = this.localDate(record.at);
    this.clean = JSON.stringify(this.record);
    this.error.set('');
  }
  protected save(): void {
    if (this.uploading()) return;
    const error = this.portal.saveCommunication(this.record);
    this.error.set(error ?? '');
    if (!error) {
      this.record = this.portal.newCommunication(this.context.id());
      this.clean = JSON.stringify(this.record);
      this.notice.set('Professional communication recorded.');
    }
  }
  protected openContact(contact?: CareContact): void {
    if (
      this.addingContact() &&
      JSON.stringify(this.contact) !== this.contactClean &&
      !window.confirm('Discard unsaved contact changes?')
    )
      return;
    this.contact = contact ? structuredClone(contact) : this.blankContact();
    this.contactClean = JSON.stringify(this.contact);
    this.contactVersion = this.context.client()?.file?.updatedAt ?? '';
    this.addingContact.set(true);
    this.error.set('');
  }
  protected cancelContact(): void {
    if (
      JSON.stringify(this.contact) === this.contactClean ||
      window.confirm('Discard unsaved contact changes?')
    )
      this.addingContact.set(false);
  }
  protected saveContact(): void {
    const error = this.portal.care.saveContact(
      this.context.id(),
      this.portal.store.companyId(),
      this.contact,
      this.contactVersion,
    );
    this.error.set(error ?? '');
    if (!error) {
      this.addingContact.set(false);
      this.notice.set('Contact saved to the service user’s care record.');
    }
  }
  canLeave(): boolean {
    return (
      (!this.uploading() &&
        JSON.stringify(this.record) === this.clean &&
        (!this.addingContact() || JSON.stringify(this.contact) === this.contactClean)) ||
      window.confirm('Discard unsaved communication changes?')
    );
  }
}
