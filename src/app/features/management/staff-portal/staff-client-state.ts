import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StaffClientsApi } from './staff-clients-api.service';
@Component({
  selector: 'cv-staff-client-state',
  styleUrls: ['./portal-ui.css', './portal-forms.css'],
  imports: [RouterLink],
  template: `<section class="portal-panel" role="status" [attr.aria-busy]="api().loading()">
    <div class="portal-panel-body">
      <h1>
        <span class="material-symbols-outlined" aria-hidden="true">{{
          api().loading() ? 'groups' : 'lock_person'
        }}</span
        >{{
          api().loading()
            ? 'Loading your service users'
            : api().code() === 'staff_inactive'
              ? 'Your staff record is inactive'
              : api().code() === 'staff_not_linked'
                ? 'Link your staff account to continue'
                : 'Your service users are unavailable'
        }}
      </h1>
      <p [attr.role]="api().error() ? 'alert' : null">
        {{
          api().loading()
            ? 'We are checking your staff account and loading your assigned service users.'
            : api().error()
        }}
      </p>
      @if (!api().loading()) {
        <div class="portal-form-actions">
          <button class="button primary" (click)="api().load()">Try again</button
          ><a class="button" routerLink="/account/security">Account &amp; support</a
          ><a class="button" routerLink="/staff-portal/dashboard">Back to staff dashboard</a>
        </div>
      }
    </div>
  </section>`,
})
export class StaffClientState {
  readonly api = input.required<StaffClientsApi>();
}
