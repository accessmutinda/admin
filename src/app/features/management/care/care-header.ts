import { AlignedWorkspaceTabs } from './workspace-tabs.directive';
import { Component, computed, inject, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { RotaClient } from '../rota/rota.models';
import { RotaService } from '../rota/rota.service';
import { age } from './care.models';
import { emptyClientFile } from '../clients/client-file.models';
@Component({
  selector: 'cv-care-header',
  imports: [DatePipe, RouterLink, AlignedWorkspaceTabs],
  templateUrl: './care-header.html',
  styleUrls: [
    './service-user-spacing.css',
    './care-shared.css',
    './care-controls.css',
    '../clients/client-profile-overview.css',
    '../clients/client-profile-responsive.css',
    './care-profile-header.css',
  ],
})
export class CareHeader {
  readonly client = input.required<RotaClient>();
  readonly active = input('overview');
  readonly breadcrumb = input(true);
  readonly local = input(false);
  readonly disabled = input(false);
  readonly edit = output<void>();
  readonly sectionChange = output<string>();
  protected readonly service = inject(RotaService);
  private readonly router = inject(Router);
  protected readonly age = age;
  protected readonly file = computed(() => this.client().file ?? emptyClientFile());
  protected readonly calls = computed(() =>
    this.service.data().calls.filter((c) => c.clientId === this.client().id && c.active),
  );
  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((n) => n[0])
      .join('');
  }
  protected editProfile(): void {
    if (!this.service.can('manage') || this.disabled()) return;
    if (this.local()) this.edit.emit();
    else
      void this.router.navigate(['/manage/clients', this.client().id], {
        queryParams: { edit: 'profile' },
      });
  }
  protected printProfile(): void {
    if (this.service.can('export')) window.print();
  }
  protected select(section: string): void {
    if (this.disabled()) return;
    if (this.local()) this.sectionChange.emit(section);
    else
      void this.router.navigate(['/manage/clients', this.client().id], {
        queryParams: section === 'plan' ? { section: 'plan' } : {},
      });
  }
  protected readonly tabs = [
    { label: 'Client Journal', path: 'journal' },
    { label: 'Professional Communications', path: 'communications' },
    { label: 'Medication & MAR', path: 'medication' },
    { label: 'Visits & Allocation', path: 'visits' },
    { label: 'Visit Notes', path: 'visit-notes' },
    { label: 'Documents', path: 'documents' },
    { label: 'Contacts', path: 'contacts' },
    { label: 'Family Portal', path: 'family' },
    { label: 'Audit Trail', path: 'audit' },
  ];
  protected readonly profileSignals = computed(() => {
    const file = this.file();
    const diagnoses = [
      file.sections['diagnoses']?.['primary'],
      ...(file.entries['diagnoses'] ?? []).filter((e) => e.status === 'Active').map((e) => e.name),
    ].filter(Boolean);
    const conditions = [...new Set([...diagnoses, ...(this.client()?.riskFlags ?? [])])];
    const kin =
      file.contacts?.find((c) => c.nextOfKin)?.name || this.client()?.representative?.name;
    return [
      ...conditions.slice(0, 2).map((label) => ({ label, icon: 'neurology', tone: 'red' })),
      {
        label: 'Capacity: ' + (file.sections['capacity']?.['status'] || 'Not recorded'),
        icon: 'balance',
        tone: 'amber',
      },
      {
        label:
          'LPA: Health & Welfare' +
          (file.sections['capacity']?.['welfareLpa'] ? ' · Recorded' : ' · Not recorded'),
        icon: 'description',
        tone: file.sections['capacity']?.['welfareLpa'] ? 'green' : 'neutral',
      },
      {
        label:
          'LPA: Property & Finance' +
          (file.sections['capacity']?.['financeLpa'] ? ' · Recorded' : ' · Not recorded'),
        icon: 'description',
        tone: file.sections['capacity']?.['financeLpa'] ? 'green' : 'neutral',
      },
      {
        label:
          'Time-sensitive calls: ' +
          (this.calls().some((c) => c.timeSensitive)
            ? 'Yes'
            : this.calls().length
              ? 'No'
              : 'Not recorded'),
        icon: 'schedule',
        tone: this.calls().some((c) => c.timeSensitive) ? 'red' : 'neutral',
      },
      {
        label:
          'Behaviour: ' +
          (file.sections['support']?.['behaviour'] ? 'Support recorded' : 'Not recorded'),
        icon: 'verified_user',
        tone: file.sections['support']?.['behaviour'] ? 'green' : 'neutral',
      },
      {
        label: 'Key safe: ' + (file.sections['access']?.['location'] ? 'Recorded' : 'Not recorded'),
        icon: 'key',
        tone: file.sections['access']?.['location'] ? 'green' : 'neutral',
      },
      { label: 'Next of kin: ' + (kin || 'Not recorded'), icon: 'group', tone: 'blue' },
    ];
  });
}
