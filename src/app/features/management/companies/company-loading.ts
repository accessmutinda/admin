import { Component, computed, input } from '@angular/core';
import { Skeleton } from '../../../shared/ui/skeleton';

@Component({
  selector: 'cv-company-loading',
  imports: [Skeleton],
  host: { role: 'status', 'aria-label': 'Loading company information', 'aria-busy': 'true' },
  template: `
    @if (heading()) {
      <div class="co-heading">
        <cv-skeleton sizeClass="mb-4 h-7 w-64 max-w-full" />
      </div>
    }
    @if (view() !== 'directory') {
      <section class="co-surface summary" aria-hidden="true">
        <cv-skeleton sizeClass="h-20 w-20 shrink-0" />
        <div class="identity">
          <cv-skeleton sizeClass="h-5 w-52 max-w-full" />
          <div class="facts">
            @for (fact of facts(); track fact.label) {
              <div>
                <cv-skeleton sizeClass="mb-2 h-2 w-20" />
                <cv-skeleton sizeClass="h-3 w-24" />
              </div>
            }
          </div>
        </div>
      </section>
    }
    @if (view() === 'overview' || view() === 'directory') {
      <div class="metrics" [class.directory-metrics]="view() === 'directory'" aria-hidden="true">
        @for (label of metricLabels(); track label) {
          <section class="co-surface">
            <cv-skeleton sizeClass="h-3 w-28 max-w-full" />
            <cv-skeleton sizeClass="mt-2 h-6 w-16" /><cv-skeleton
              sizeClass="mt-2 h-2 w-28 max-w-full"
            />
          </section>
        }
      </div>
    }
    @if (view() === 'overview') {
      <div class="overview-main">
        <section class="co-surface panel" aria-hidden="true">
          <cv-skeleton sizeClass="h-4 w-44 max-w-full" />
          <div class="checks">
            @for (
              label of [
                'General Information',
                'Registration & Compliance',
                'Contact Information',
                'Branches & Locations',
                'Branding',
                'Modules & Subscription',
                'Roles & Permissions',
                'Integrations',
              ];
              track label
            ) {
              <div class="check">
                <cv-skeleton sizeClass="h-3 w-28 max-w-full" />
                <cv-skeleton sizeClass="mt-2 h-2 w-full" /><cv-skeleton sizeClass="mt-2 h-2 w-20" />
              </div>
            }
          </div>
        </section>
        <aside class="co-surface panel" aria-hidden="true">
          <cv-skeleton sizeClass="h-4 w-28" />
          @for (
            action of [
              'Create New Company',
              'Duplicate Existing Setup',
              'Edit Company Profile',
              'Manage Modules',
              'Invite Admin User',
            ];
            track action
          ) {
            <div class="check">
              <cv-skeleton sizeClass="h-3 w-28 max-w-full" />
              <cv-skeleton sizeClass="mt-2 h-2 w-24" />
            </div>
          }
        </aside>
      </div>
    } @else if (view() !== 'directory') {
      <div class="layout" aria-hidden="true">
        <div class="panels" [class.contact-panels]="view() === 'contacts'">
          @for (section of sections(); track section.title) {
            <section class="co-surface panel">
              <cv-skeleton sizeClass="h-4 w-40 max-w-full" />
              <div class="fields">
                @for (label of section.fields; track $index) {
                  <div>
                    <cv-skeleton sizeClass="mb-2 h-2 w-24 max-w-full" />
                    <cv-skeleton sizeClass="h-8 w-full" />
                  </div>
                }
              </div>
            </section>
          }
        </div>
        <aside class="co-surface panel">
          <cv-skeleton sizeClass="h-4 w-28" />
          <cv-skeleton sizeClass="mt-3 h-7 w-16" />
          @for (row of [0, 1, 2, 3]; track row) {
            <cv-skeleton sizeClass="mt-5 h-3 w-full" />
          }
        </aside>
      </div>
    }
    @if (
      view() === 'overview' ||
      view() === 'directory' ||
      view() === 'locations' ||
      view() === 'access'
    ) {
      <section class="co-surface panel table" aria-hidden="true">
        <cv-skeleton sizeClass="h-4 w-40 max-w-full" />
        @for (row of [0, 1, 2, 3, 4]; track row) {
          <div class="table-row">
            @for (cell of [0, 1, 2, 3]; track cell) {
              <cv-skeleton sizeClass="h-3 w-full" />
            }
          </div>
        }
      </section>
    }
    <span class="sr-only">Loading saved company information.</span>
  `,
  styles: `
    :host {
      display: block;
    }
    .co-surface {
      background: white;
      border: 1px solid var(--color-line);
      border-radius: 8px;
    }
    section,
    aside {
      padding: 12px;
    }
    .summary {
      display: flex;
      gap: 16px;
      align-items: center;
      margin-bottom: 12px;
    }
    .identity {
      flex: 1;
      min-width: 0;
    }
    .facts {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-top: 16px;
    }
    .facts small,
    label {
      display: block;
      font-size: 11px;
      color: var(--color-slate);
      margin-bottom: 6px;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
      margin-bottom: 12px;
    }
    .overview-main {
      display: grid;
      grid-template-columns: minmax(0, 3fr) minmax(220px, 1.2fr);
      gap: 12px;
    }
    .overview-main aside .check {
      margin-top: 8px;
    }
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 3fr) minmax(220px, 1fr);
      gap: 12px;
    }
    .panels {
      display: grid;
      gap: 12px;
    }
    .layout aside {
      align-self: start;
    }
    .directory-metrics {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .contact-panels {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .contact-panels > section:last-child {
      grid-column: 1/-1;
    }
    .contact-panels .fields {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .fields {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px 12px;
      margin-top: 16px;
    }
    h2,
    h3 {
      font-size: 12px;
      font-weight: 600;
      color: var(--color-navy);
    }
    .checks {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-top: 12px;
    }
    .check {
      border: 1px solid var(--color-line);
      border-radius: 7px;
      padding: 12px;
      min-height: 90px;
    }
    .panel {
      margin-bottom: 12px;
    }
    .table-row {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 24px;
      padding: 15px 0;
      border-bottom: 1px solid var(--color-line);
    }
    @media (max-width: 900px) {
      .layout,
      .overview-main {
        grid-template-columns: 1fr;
      }
      .fields,
      .facts {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .metrics {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 599px) {
      .fields,
      .contact-panels {
        grid-template-columns: 1fr;
      }
      .checks {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .facts {
        grid-template-columns: 1fr;
      }
      .summary {
        align-items: flex-start;
      }
      .table {
        overflow: hidden;
      }
      .table-row {
        gap: 12px;
      }
      .metrics section:last-child {
        grid-column: 1/-1;
      }
    }
  `,
})
export class CompanyLoading {
  readonly view = input('profile');
  readonly company = input<{
    name?: string;
    code?: string;
    registration?: string;
    sector?: string;
  }>();
  protected readonly facts = computed(() => [
    { label: 'Company code', value: this.company()?.code },
    { label: 'Registration number', value: this.company()?.registration },
    { label: 'Service type', value: this.company()?.sector },
  ]);
  readonly heading = input('');
  protected readonly metricLabels = computed(() =>
    this.view() === 'directory'
      ? ['Total Companies', 'Active Companies', 'Pending Setup', 'Inactive Companies']
      : [
          'Total Companies',
          'Active Companies',
          'Pending Setups',
          'Profile Completion',
          'Open Admin Tasks',
        ],
  );
  protected readonly sections = computed(() => {
    switch (this.view()) {
      case 'contacts':
        return [
          {
            title: 'Registered Address',
            fields: ['Address Line 1', 'Address Line 2', 'City', 'County', 'Postcode', 'Country'],
          },
          {
            title: 'Head Office Address',
            fields: ['Address Line 1', 'Address Line 2', 'City', 'County', 'Postcode', 'Country'],
          },
          { title: 'Billing Address', fields: ['Address Line 1', 'City', 'Postcode', 'Country'] },
          {
            title: 'Primary Contact Details',
            fields: [
              'Main Phone',
              'Secondary Phone',
              'General Email',
              'Billing Email',
              'Website',
              'Emergency Contact',
              'Out-of-Hours Number',
            ],
          },
          {
            title: 'Key Contacts',
            fields: [
              'Registered Manager',
              'Nominated Individual',
              'Finance Contact',
              'Compliance Contact',
              'IT/System Contact',
            ],
          },
        ];
      case 'compliance':
        return [
          {
            title: 'Registration Details',
            fields: [
              'Company Number',
              'CQC Registration Number',
              'VAT / Tax Number',
              'Registered Provider Type',
              'Registration Status',
              'Inspection Type',
              'Insurance Expiry Date',
              'Regulatory Region',
              'Data Protection Registration',
              'Safeguarding Lead',
              'Medication Governance Lead',
            ],
          },
          {
            title: 'Compliance Mapping',
            fields: [
              'Registration Certificate',
              'Insurance Certificate',
              'Data Protection Policy',
              'Business Continuity Plan',
            ],
          },
        ];
      case 'branding':
        return [
          {
            title: 'Theme & Appearance',
            fields: [
              'Company Logo',
              'Favicon',
              'Primary Colour',
              'Secondary Colour',
              'Accent Colour',
              'Font',
            ],
          },
          { title: 'Branding Preview', fields: ['Portal Login', 'Portal Header'] },
        ];
      case 'modules':
        return [
          {
            title: 'Modules & Access',
            fields: ['Care delivery', 'People & HR', 'Finance', 'Reports & insights'],
          },
          {
            title: 'Subscription Details',
            fields: ['Plan', 'Billing cycle', 'Renewal date', 'Users & Limits'],
          },
        ];
      case 'access':
        return [
          {
            title: 'Users & Role Permissions',
            fields: ['Users', 'Role assignments', 'Permissions'],
          },
        ];
      case 'integrations':
        return [
          {
            title: 'Integrations & Data',
            fields: ['API keys', 'Backup preferences', 'Data exports'],
          },
        ];
      case 'locations':
        return [
          {
            title: 'Branches & Service Locations',
            fields: ['Locations', 'Services', 'Registered places'],
          },
        ];
      case 'create':
        return [
          {
            title: 'Basic Company Details',
            fields: [
              'Company Name',
              'Trading Name',
              'Company Code',
              'Service Type',
              'Company Size',
              'Country',
              'Region',
            ],
          },
        ];
      default:
        return [
          {
            title: 'General Information',
            fields: [
              'Company Name',
              'Trading Name',
              'Company Code',
              'Service Type',
              'Description / About Company',
              'Registration Number',
              'Established Date',
              'Head Office Name',
              'Number of Registered Places',
              'Primary Language',
              'Status',
              'Head Office Address',
              'Postcode',
              'Company Size',
            ],
          },
        ];
    }
  });
}
