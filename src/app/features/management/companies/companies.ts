import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ManagementStore } from '../shared/management.store';
@Component({
  selector: 'cv-companies',
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
    <section class="panel">
      <div class="panel-toolbar">
        <div>
          <h2>
            Company directory <span class="count">{{ filtered().length }}</span>
          </h2>
          <p>Manage company profiles, branding and configuration.</p>
        </div>
        <label class="search-box"
          ><span class="material-symbols-outlined" aria-hidden="true">search</span
          ><input
            aria-label="Search companies"
            placeholder="Search companies…"
            [ngModel]="search()"
            (ngModelChange)="search.set($event)"
        /></label>
      </div>
      <div class="company-grid">
        @for (company of filtered(); track company.id) {
          <article
            class="company-card"
            [attr.data-tone]="sectorTone(company.sector)"
            [class.current-company]="company.id === store.companyId()"
          >
            <span class="company-watermark material-symbols-outlined" aria-hidden="true">{{
              sectorIcon(company.sector)
            }}</span>
            <div class="row between">
              <span class="company-symbol" [style.background]="company.color">
                @if (company.logo) {
                  <img [src]="company.logo" alt="" />
                } @else {
                  {{ company.code }}
                }</span
              ><span class="badge" [class.success]="company.id === store.companyId()">{{
                company.id === store.companyId() ? 'Current workspace' : 'Configured'
              }}</span>
            </div>
            <h3>{{ company.name }}</h3>
            <p>
              <span class="sector-label"
                ><span class="material-symbols-outlined" aria-hidden="true">{{
                  sectorIcon(company.sector)
                }}</span
                >{{ company.sector }}</span
              >
            </p>
            <div class="company-card-details">
              <span
                ><span class="material-symbols-outlined" aria-hidden="true">groups</span
                >{{ company.size }}</span
              ><span
                ><span class="material-symbols-outlined" aria-hidden="true">grid_view</span
                >{{ company.modules.length }} modules</span
              >
            </div>
            <div class="card-footer">
              <span>Company profile</span
              ><a [routerLink]="['/manage/companies', company.id]" class="text-link"
                >Manage
                <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span></a
              >
            </div>
          </article>
        } @empty {
          <div class="empty-state">
            <span class="material-symbols-outlined" aria-hidden="true">search_off</span>
            <h3>No companies found</h3>
            <p>Try another name or care sector.</p>
            <button class="button" (click)="search.set('')">Clear search</button>
          </div>
        }
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
