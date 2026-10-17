import { complianceComplete } from './company-compliance.models';
import { locationsComplete } from '../locations/locations.models';
import { contactInformationComplete } from './company-contacts.models';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ManagementStore } from '../shared/management.store';
import {
  companyCompletion,
  companyModifiedAt,
  generalInformationComplete,
} from './company-profile.models';

@Component({
  selector: 'cv-companies',
  host: { class: 'module-page companies-page' },
  imports: [FormsModule, RouterLink],
  templateUrl: './companies.html',
})
export class Companies {
  protected readonly store = inject(ManagementStore);
  protected readonly search = signal('');
  protected readonly company = computed(() => this.store.company() ?? this.store.companies()[0]);
  protected readonly profileLink = computed(() => [
    '/manage/companies',
    this.company()?.id ?? 'new',
  ]);
  protected readonly filtered = computed(() =>
    this.store
      .companies()
      .filter((c) =>
        `${c.name} ${c.code} ${c.sector}`
          .toLowerCase()
          .includes(this.search().trim().toLowerCase()),
      ),
  );
  protected readonly preview = computed(() => this.filtered().slice(0, 5));
  protected readonly completion = companyCompletion;
  protected readonly modifiedAt = companyModifiedAt;
  protected readonly average = computed(() => {
    const all = this.store.companies();
    return all.length
      ? Math.round(all.reduce((total, c) => total + this.completion(c), 0) / all.length)
      : 0;
  });
  protected readonly active = computed(
    () => this.store.companies().filter((c) => c.active ?? c.modules.length > 0).length,
  );
  protected readonly pending = computed(
    () => this.store.companies().filter((c) => this.completion(c) < 75).length,
  );
  protected readonly checklist = computed(() => {
    const c = this.company();
    return [
      {
        title: 'General Information',
        description: 'Basic company information and service details',
        icon: 'description',
        tone: 'teal',
        state: generalInformationComplete(c) ? 'Complete' : 'Pending',
        link: this.profileLink(),
      },
      {
        title: 'Registration & Compliance',
        description: 'Registration, documents and responsible owners',
        icon: 'shield',
        tone: 'teal',
        state: complianceComplete(c) ? 'Complete' : c?.compliance ? 'In Progress' : 'Pending',
        link: [...this.profileLink(), 'compliance'],
      },
      {
        title: 'Contact Information',
        description: 'Key contacts and communication details',
        icon: 'groups',
        tone: 'cyan',
        state: contactInformationComplete(c) ? 'Complete' : 'Pending',
        link: [...this.profileLink(), 'contacts'],
      },
      {
        title: 'Branches & Locations',
        description: 'Manage all company locations and services',
        icon: 'location_on',
        tone: 'blue',
        state: locationsComplete(this.store.data().locations)
          ? 'Complete'
          : this.store.data().locations?.length
            ? 'In Progress'
            : 'Pending',
        link: ['/manage/locations'],
      },
      {
        title: 'Branding',
        description: 'Logo, colours and customisation settings',
        icon: 'palette',
        tone: 'teal',
        state: c?.logo ? 'Complete' : 'In Progress',
        link: [...this.profileLink(), 'branding'],
      },
      {
        title: 'Modules & Subscription',
        description: 'Select and configure modules',
        icon: 'deployed_code',
        tone: 'orange',
        state: c?.modules.length ? 'Complete' : 'Pending',
        link: [...this.profileLink(), 'modules'],
      },
      {
        title: 'Roles & Permissions',
        description: 'Admin users and role assignments',
        icon: 'groups',
        tone: 'cyan',
        state: this.store.data().members.length ? 'Complete' : 'Pending',
        link: ['/manage/companies/access'],
      },
      {
        title: 'Integrations',
        description: 'API setup, backup preferences and data exports',
        icon: 'link',
        tone: 'blue',
        state: 'Pending',
        link: ['/manage/companies/integrations'],
      },
    ];
  });
  protected readonly tasks = computed(
    () => this.checklist().filter((item) => item.state !== 'Complete').length,
  );
  protected readonly actions = computed(() => [
    { title: 'Create New Company', icon: 'add', link: ['/manage/companies/new'] },
    {
      title: 'Duplicate Existing Setup',
      icon: 'content_copy',
      link: ['/manage/companies/new'],
      duplicate: this.company()?.id,
    },
    { title: 'Edit Company Profile', icon: 'edit_square', link: this.profileLink(), edit: true },
    {
      title: 'Manage Modules',
      icon: 'deployed_code',
      link: [...this.profileLink(), 'modules'],
    },
    {
      title: 'Invite Admin User',
      icon: 'person_add',
      link: ['/manage/companies/access'],
      invite: true,
    },
  ]);
}
