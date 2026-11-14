import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Company } from '../shared/management.store';
import { companyCompletion } from './company-profile.models';

@Component({
  selector: 'cv-company-setup-banner',
  imports: [RouterLink],
  template: `
    @if (completion() != null && completion()! < 100) {
      <section class="setup-banner" aria-label="Complete company setup">
        <div class="setup-copy">
          <strong>{{ company().name }} is {{ completion() }}% complete</strong>
          <progress
            [value]="completion()"
            max="100"
            aria-label="Company setup completion"
          ></progress>
        </div>
        <a
          [routerLink]="['/manage/companies', company().id]"
          [queryParams]="{ edit: true }"
          fragment="general-information"
          >Complete profile<span class="material-symbols-outlined" aria-hidden="true"
            >arrow_forward</span
          ></a
        >
      </section>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .setup-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      margin-bottom: 12px;
      border: 1px solid #fecaca;
      border-radius: 8px;
      background: #fff1f2;
      color: #881337;
    }
    .setup-copy {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px 12px;
      flex: 1;
      min-width: 0;
    }
    strong {
      font-size: 13px;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }
    progress {
      display: block;
      width: 80px;
      height: 5px;
      flex-shrink: 0;
      accent-color: #be123c;
    }
    a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 6px 10px;
      border-radius: 6px;
      background: #be123c;
      color: white;
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
      flex-shrink: 0;
    }
    a .material-symbols-outlined {
      font-size: 16px;
    }
    a:hover {
      background: #9f1239;
    }
    a:focus-visible {
      outline: 3px solid #881337;
      outline-offset: 3px;
    }
    @media (max-width: 640px) {
      .setup-banner {
        flex-wrap: wrap;
        gap: 8px;
      }
      progress {
        width: 56px;
      }
    }
  `,
})
export class CompanySetupBanner {
  readonly company = input.required<Company>();
  protected readonly completion = computed(() => companyCompletion(this.company()));
}
