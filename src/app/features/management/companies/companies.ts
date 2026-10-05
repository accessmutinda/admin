import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ManagementStore } from '../shared/management.store';
@Component({
  selector: 'cv-companies',
  host: { class: 'companies-page' },
  imports: [FormsModule, RouterLink],
  template: ` <div class="page-heading">
      <div>
        <p class="eyebrow">ORGANISATION</p>
        <h1>Your care companies</h1>
        <p>A considered space for every organisation you support.</p>
      </div>
      <a class="button primary" routerLink="/manage/companies/new"
        ><span class="material-symbols-outlined" aria-hidden="true">add</span>Add company</a
      >
    </div>
    <div class="metrics">
      <div class="metric" data-tone="teal">
        <span class="metric-icon material-symbols-outlined" aria-hidden="true">domain</span
        ><span>Care companies</span><strong>{{ store.companies().length }}</strong
        ><small>Individual, connected workspaces</small>
      </div>
      <div class="metric" data-tone="blue">
        <span class="metric-icon material-symbols-outlined" aria-hidden="true">grid_view</span
        ><span>Enabled modules</span
        ><strong>{{ store.company()?.modules?.length ?? 0 }}<em>/ 6</em></strong
        ><small>In your current workspace</small>
      </div>
      <div class="metric" data-tone="purple">
        <span class="metric-icon material-symbols-outlined" aria-hidden="true">verified</span
        ><span>Your workspace</span><strong class="metric-name">{{ store.company()?.name }}</strong
        ><small>{{ store.company()?.sector }}</small>
      </div>
    </div>
    <section class="panel company-directory-panel" aria-labelledby="directory-title">
      <div class="panel-toolbar">
        <div class="directory-heading">
          <span class="directory-heading-icon material-symbols-outlined" aria-hidden="true"
            >domain</span
          >
          <div>
            <h2 id="directory-title">
              Company directory <span class="count">{{ filtered().length }}</span>
            </h2>
            <p>Manage company profiles, branding and configuration.</p>
          </div>
        </div>
        <label class="search-box"
          ><span class="material-symbols-outlined" aria-hidden="true">search</span
          ><input
            aria-label="Search companies"
            placeholder="Search companies or sectors…"
            [ngModel]="search()"
            (ngModelChange)="search.set($event)"
          />
          @if (search()) {
            <button
              class="directory-clear-search"
              type="button"
              aria-label="Clear company search"
              (click)="search.set('')"
            >
              <span class="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          }
        </label>
      </div>
      @if (filtered().length) {
        <div class="company-directory">
          <table class="company-table" aria-label="Company directory">
            <thead>
              <tr>
                <th scope="col">Company</th>
                <th scope="col">Care sector</th>
                <th scope="col">Staff size</th>
                <th scope="col">Modules</th>
                <th scope="col">Workspace</th>
                <th scope="col"><span class="company-action-label">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              @for (company of filtered(); track company.id) {
                <tr
                  [attr.data-tone]="sectorTone(company.sector)"
                  [class.current-company]="company.id === store.companyId()"
                >
                  <th scope="row" class="company-identity-cell">
                    <div class="company-identity">
                      <span class="company-symbol" [style.--company-color]="company.color">
                        @if (company.logo) {
                          <img [src]="company.logo" alt="" />
                        } @else {
                          {{ company.code }}
                        }
                      </span>
                      <div>
                        <a
                          class="company-name-link"
                          [routerLink]="['/manage/companies', company.id]"
                          >{{ company.name }}</a
                        >
                        <div class="company-identity-meta">
                          <span class="company-code-label">{{ company.code }}</span>
                          @if (company.postcode) {
                            <span class="company-location"
                              ><span class="material-symbols-outlined" aria-hidden="true"
                                >location_on</span
                              >{{ company.postcode }}</span
                            >
                          }
                        </div>
                      </div>
                    </div>
                  </th>
                  <td class="company-sector-cell">
                    <span class="sector-label">
                      <span class="material-symbols-outlined" aria-hidden="true">{{
                        sectorIcon(company.sector)
                      }}</span>
                      {{ company.sector }}
                    </span>
                  </td>
                  <td class="company-size-cell">
                    <span class="company-staff-size"
                      ><span class="material-symbols-outlined" aria-hidden="true">groups</span
                      >{{ company.size }}</span
                    >
                  </td>
                  <td class="company-modules-cell">
                    <span class="module-count"
                      ><span class="material-symbols-outlined" aria-hidden="true">grid_view</span
                      >{{ company.modules.length }}</span
                    ><span class="mobile-module-label"> modules</span>
                  </td>
                  <td class="company-status-cell">
                    <span
                      class="workspace-status"
                      [class.is-current]="company.id === store.companyId()"
                    >
                      <span class="workspace-status-dot" aria-hidden="true"></span>
                      {{ company.id === store.companyId() ? 'Current workspace' : 'Configured' }}
                    </span>
                  </td>
                  <td class="company-action-cell">
                    <a
                      [routerLink]="['/manage/companies', company.id]"
                      class="company-manage"
                      [attr.aria-label]="'Manage ' + company.name"
                    >
                      Manage
                      <span class="material-symbols-outlined" aria-hidden="true"
                        >arrow_forward</span
                      >
                    </a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="empty-state">
          <span class="material-symbols-outlined" aria-hidden="true">search_off</span>
          <h3>No companies found</h3>
          <p>Try another name or care sector.</p>
          <button class="button" (click)="search.set('')">Clear search</button>
        </div>
      }
      <div class="directory-footer">
        <span>Showing {{ filtered().length }} of {{ store.companies().length }} companies</span>
        <span class="directory-footer-hint"
          ><span class="material-symbols-outlined" aria-hidden="true">tune</span>Profiles, branding
          &amp; modules</span
        >
      </div>
    </section>`,
})
export class Companies {
  protected readonly store = inject(ManagementStore);
  protected sectorTone(sector: string): string {
    return (
      (
        {
          'Domiciliary care': 'teal',
          'Residential care': 'blue',
          'Supported living': 'amber',
          'Dementia care': 'purple',
          'Community care': 'green',
        } as Record<string, string>
      )[sector] ?? 'teal'
    );
  }
  protected sectorIcon(sector: string): string {
    return (
      (
        {
          'Domiciliary care': 'home_health',
          'Residential care': 'apartment',
          'Supported living': 'diversity_1',
          'Dementia care': 'psychology',
          'Community care': 'volunteer_activism',
        } as Record<string, string>
      )[sector] ?? 'domain'
    );
  }
  protected readonly search = signal('');
  protected readonly filtered = computed(() =>
    this.store
      .companies()
      .filter((c) =>
        `${c.name} ${c.sector}`.toLowerCase().includes(this.search().toLowerCase().trim()),
      ),
  );
}
