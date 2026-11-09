import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'cv-company-unavailable',
  imports: [RouterLink],
  template: `
    <section class="cu-card" role="alert" aria-labelledby="company-unavailable-title">
      <span class="cu-icon material-symbols-outlined" aria-hidden="true">cloud_off</span>
      <div class="cu-content">
        <h2 id="company-unavailable-title">Company information unavailable</h2>
        <p class="cu-message">{{ message() }}</p>
        <p class="cu-help">Try again to load the latest company information.</p>
      </div>
      <div class="cu-actions">
        <button type="button" class="cu-retry" [disabled]="busy()" (click)="retry.emit()">
          <span class="material-symbols-outlined" aria-hidden="true">refresh</span>
          {{ busy() ? 'Retrying…' : 'Retry' }}
        </button>
        <a routerLink="/manage/companies" class="cu-back">Back to companies</a>
      </div>
    </section>
  `,
  styleUrl: './company-unavailable.css',
})
export class CompanyUnavailable {
  readonly message = input.required<string>();
  readonly busy = input(false);
  readonly retry = output<void>();
}
