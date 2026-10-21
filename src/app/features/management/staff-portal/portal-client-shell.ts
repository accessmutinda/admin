import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PortalClientContext } from './portal-client-context';
import { age } from '../care/care.models';
@Component({
  selector: 'cv-portal-client-shell',
  providers: [PortalClientContext],
  imports: [DatePipe, RouterLink, RouterLinkActive, RouterOutlet],
  styleUrls: ['./portal-ui.css', './portal-client.css'],
  template: ` <nav class="co-breadcrumb" aria-label="Breadcrumb">
      <a routerLink="/staff-portal/service-users">Service users</a
      ><span> › {{ context.client()?.name ?? 'Service user' }}</span>
    </nav>
    @if (context.client(); as client) {
      <section class="portal-panel client-identity">
        <div class="client-photo">
          @if (client.file?.photo) {
            <img [src]="client.file!.photo" [alt]="client.name" />
          } @else {
            <span>{{ initials(client.name) }}</span>
          }
        </div>
        <div class="client-identity-content">
          <h1>
            {{ client.name }}
            <span class="portal-badge" [attr.data-tone]="client.active ? 'green' : 'amber'">{{
              client.active ? 'Active' : 'Inactive'
            }}</span>
          </h1>
          <p>
            {{ client.file?.details?.['gender'] || 'Gender not recorded' }}
            @if (client.file?.details?.['dob']) {
              · {{ age(client.file!.details['dob']) }} years ({{
                client.file!.details['dob'] | date: 'd MMM y'
              }})
            }
          </p>
          <p>NHS: {{ client.file?.details?.['nhs'] || 'Not recorded' }} · {{ client.reference }}</p>
          <p class="client-address">
            <span class="material-symbols-outlined" aria-hidden="true">location_on</span
            >{{ client.address }}, {{ client.postcode }}
          </p>
        </div>
        <div class="client-flags">
          @for (flag of client.riskFlags ?? []; track flag) {
            <span class="portal-badge" data-tone="red">{{ flag }}</span>
          }
          <span class="portal-badge" data-tone="amber"
            >Capacity: {{ client.file?.sections?.['capacity']?.['status'] || 'Not recorded' }}</span
          ><span class="portal-badge" data-tone="green"
            >LPA: {{ client.file?.sections?.['capacity']?.['welfareLpa'] || 'Not recorded' }}</span
          ><span class="portal-badge"
            >Next of kin: {{ client.representative?.name || nextOfKin() }}</span
          ><span class="portal-badge" data-tone="green">{{
            client.file?.details?.['living'] || 'Living arrangements not recorded'
          }}</span>
        </div>
      </section>
      <nav class="client-nav" aria-label="Service user portal sections">
        @for (tab of tabs; track tab.path) {
          <a
            [routerLink]="['/staff-portal/service-users', context.id(), tab.path]"
            routerLinkActive="active"
            ariaCurrentWhenActive="page"
            ><span class="material-symbols-outlined" aria-hidden="true">{{ tab.icon }}</span
            >{{ tab.label }}</a
          >
        }
        <a [routerLink]="['/manage/clients', context.id()]"
          ><span class="material-symbols-outlined" aria-hidden="true">assignment</span>Care plan</a
        ><a [routerLink]="['/manage/clients', context.id(), 'documents']"
          ><span class="material-symbols-outlined" aria-hidden="true">description</span>Documents</a
        >
      </nav>
      <router-outlet />
    } @else {
      <div class="portal-panel portal-empty">
        <h3>Service user unavailable</h3>
        <p>
          This record is unavailable in the current workspace or your role does not have care
          access.
        </p>
        <a class="button" routerLink="/staff-portal/service-users">Return to service users</a>
      </div>
    }`,
})
export class PortalClientShell {
  protected readonly context = inject(PortalClientContext);
  protected readonly age = age;
  protected readonly tabs = [
    { path: 'overview', label: 'Overview', icon: 'home' },
    { path: 'allocation', label: 'Allocation & follow-up', icon: 'calendar_month' },
    { path: 'communications', label: 'Professionals', icon: 'groups' },
    { path: 'journal', label: 'Client journal', icon: 'forum' },
    { path: 'audit', label: 'Audit trail', icon: 'history' },
  ];
  protected initials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('');
  }
  protected nextOfKin(): string {
    return this.context.contacts().find((c) => c.nextOfKin)?.name ?? 'Not recorded';
  }
}
