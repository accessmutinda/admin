import { SetupAreaKey } from './companies-api.models';
import { CompaniesApiService } from './companies-api.service';
import { QuickActions } from '../shared/quick-actions';
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
  imports: [FormsModule, RouterLink, QuickActions],
  templateUrl: './companies.html',
})
export class Companies {
  protected readonly api = inject(CompaniesApiService);
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
  protected readonly statsReady = computed(
    () => this.api.loaded() && !this.api.loading() && !this.api.error(),
  );
  protected readonly total = computed(() =>
    this.statsReady()
      ? (this.api.overview()?.authorised_total ?? this.store.companies().length)
      : null,
  );
  protected readonly active = computed(() =>
    this.statsReady()
      ? (this.api.overview()?.active_total ??
        this.store.companies().filter((c) => c.lifecycle === 'active').length)
      : null,
  );
  protected readonly pending = computed(() =>
    this.statsReady()
      ? (this.api.overview()?.pending_setup_total ??
        this.store.companies().filter((c) => c.lifecycle === 'pending_setup').length)
      : null,
  );
  protected readonly average = computed(() => {
    if (!this.statsReady()) return null;
    const server = this.api.overview();
    if (server) return server.profile_completion_percent;
    const values = this.store.companies().map(companyCompletion);
    if (values.some((value) => value == null)) return null;
    return values.length
      ? Math.round(values.reduce<number>((sum, value) => sum + (value ?? 0), 0) / values.length)
      : 0;
  });
  protected readonly checklist = computed(() => {
    const c = this.company();
    return [
      {
        key: 'general',
        title: 'General Information',
        description: 'Basic company information and service details',
        icon: 'description',
        tone: 'teal',
        state: generalInformationComplete(c)
          ? 'Complete'
          : c &&
              [c.name, c.code, c.sector, c.description, c.registration].some((value) =>
                value?.trim(),
              )
            ? 'In Progress'
            : 'Pending',
        link: this.profileLink(),
      },
      {
        key: 'registration',
        title: 'Registration & Compliance',
        description: 'Registration, documents and responsible owners',
        icon: 'shield',
        tone: 'teal',
        state: complianceComplete(c) ? 'Complete' : c?.compliance ? 'In Progress' : 'Pending',
        link: [...this.profileLink(), 'compliance'],
      },
      {
        key: 'contacts',
        title: 'Contact Information',
        description: 'Key contacts and communication details',
        icon: 'groups',
        tone: 'cyan',
        state: contactInformationComplete(c) ? 'Complete' : 'Pending',
        link: [...this.profileLink(), 'contacts'],
      },
      {
        key: 'locations',
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
        key: 'branding',
        title: 'Branding',
        description: 'Logo, colours and customisation settings',
        icon: 'palette',
        tone: 'teal',
        state: c?.logo ? 'Complete' : c?.branding ? 'In Progress' : 'Pending',
        link: [...this.profileLink(), 'branding'],
      },
      {
        key: 'modules',
        title: 'Modules & Subscription',
        description: 'Select and configure modules',
        icon: 'deployed_code',
        tone: 'orange',
        state: c?.modules.length ? 'Complete' : 'Pending',
        link: [...this.profileLink(), 'modules'],
      },
      {
        key: 'access',
        title: 'Roles & Permissions',
        description: 'Admin users and role assignments',
        icon: 'groups',
        tone: 'cyan',
        state: this.store.data().members.length ? 'Complete' : 'Pending',
        link: ['/manage/companies/access'],
      },
      {
        key: 'integrations',
        title: 'Integrations',
        description: 'API setup, backup preferences and data exports',
        icon: 'link',
        tone: 'blue',
        state: 'Pending',
        link: ['/manage/companies/integrations'],
      },
    ].map((item) => {
      const area = c?.setupProgress?.[item.key as SetupAreaKey];
      const state = area
        ? area.available === false || area.complete == null
          ? 'Unavailable'
          : area.complete
            ? 'Complete'
            : area.state === 'in_progress'
              ? 'In Progress'
              : 'Pending'
        : c?.apiSummaryOnly
          ? 'Unavailable'
          : item.state;
      return {
        ...item,
        state,
        statusTone: state === 'Complete' ? 'green' : state === 'In Progress' ? 'orange' : 'neutral',
      };
    });
  });
  protected readonly tasks = computed(() =>
    this.statsReady() ? (this.api.overview()?.open_admin_tasks ?? null) : null,
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
