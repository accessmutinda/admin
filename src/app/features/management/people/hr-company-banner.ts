import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ManagementStore } from '../shared/management.store';

@Component({
  selector: 'cv-hr-company-banner',
  imports: [RouterLink],
  template: `
    @if (store.company(); as company) {
      <section class="co-summary co-surface" aria-label="Company overview">
        <div class="co-company-image">
          @if (company.logo) {
            <img [src]="company.logo" [alt]="company.name + ' logo'" />
          } @else {
            <div class="co-reference-photo" role="img" aria-label="Care home placeholder"></div>
          }
        </div>
        <div class="co-summary-content">
          <div class="co-summary-header">
            <div class="co-company-title">
              <h2>{{ company.name }}</h2>
            </div>
            <a class="co-profile-button" routerLink="/manage/people"
              >People & HR<span class="material-symbols-outlined" aria-hidden="true"
                >arrow_forward</span
              ></a
            >
          </div>
          <div class="co-facts">
            <div>
              <span>Company code</span><strong>{{ company.code }}</strong>
            </div>
            <div>
              <span>Registration number</span
              ><strong>{{ company.registration || 'Not recorded' }}</strong>
            </div>
            <div>
              <span>Service type</span><strong>{{ company.sector || 'Not recorded' }}</strong>
            </div>
          </div>
          <div class="co-details">
            <div>
              <span class="material-symbols-outlined" aria-hidden="true">location_on</span
              ><span
                ><small>Head Office</small
                >{{ company.headOfficeAddress || company.postcode || 'Location not added' }}</span
              >
            </div>
          </div>
        </div>
      </section>
    }
  `,
  styles: [':host { display: block; } .co-details > div { grid-column: 1 / -1; }'],
})
export class HrCompanyBanner {
  protected readonly store = inject(ManagementStore);
}
