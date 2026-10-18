import { Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { RotaClient } from '../rota/rota.models';
import { age } from './care.models';
@Component({
  selector: 'cv-care-header',
  imports: [DatePipe, RouterLink, RouterLinkActive],
  styleUrls: ['./care-shared.css', './care-controls.css'],
  styles: [
    `
      .identity {
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
      }
      .identity img,
      .identity-avatar {
        width: 72px;
        height: 72px;
        object-fit: cover;
        border-radius: 7px;
      }
      .identity-avatar {
        display: grid;
        place-items: center;
        background: #eaf5fc;
        color: #0066ac;
        font-size: 24px;
      }
      .identity h1 {
        font-size: 21px;
        color: #081535;
        margin: 0;
      }
      .identity p {
        margin: 4px 0;
      }
      .identity-content {
        flex: 1;
        min-width: 180px;
      }
    `,
  ],
  template: `<nav class="co-breadcrumb" aria-label="Breadcrumb">
      <a routerLink="/manage/clients">Client Files</a><span> › {{ client().name }}</span>
    </nav>
    <section class="care-panel identity" aria-label="Service user identity">
      @if (client().file?.photo) {
        <img [src]="client().file!.photo" [alt]="client().name" />
      } @else {
        <span class="identity-avatar" aria-hidden="true">{{ initials() }}</span>
      }
      <div class="identity-content">
        <h1>
          {{ client().name }}
          <span class="care-tag" [attr.data-tone]="client().active ? 'green' : 'amber'">{{
            client().active ? 'Active' : 'Inactive'
          }}</span>
        </h1>
        <p>
          {{ client().file?.details?.['gender'] || 'Gender not recorded' }} ·
          @if (years() !== null) {
            {{ years() }} years ·
          }
          {{ client().file?.details?.['dob'] | date: 'dd MMM yyyy' }} · NHS:
          {{ client().file?.details?.['nhs'] || 'Not recorded' }}
        </p>
        <p>
          {{ client().address }}, {{ client().postcode }} ·
          {{ client().file?.details?.['living'] || 'Living arrangement not recorded' }}
        </p>
        @for (flag of client().riskFlags ?? []; track flag) {
          <span class="care-tag" data-tone="amber">{{ flag }}</span>
        }
        <span class="care-tag"
          >Capacity: {{ client().file?.sections?.['capacity']?.['status'] || 'Not recorded' }}</span
        >
      </div>
      <a class="care-button" [routerLink]="['/manage/clients', client().id]">View profile</a>
    </section>
    <nav class="care-tabs" aria-label="Service user workspace">
      @for (tab of tabs; track tab.path) {
        <a
          [routerLink]="['/manage/clients', client().id, ...tab.path]"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          ariaCurrentWhenActive="page"
          >{{ tab.label }}</a
        >
      }
    </nav>`,
})
export class CareHeader {
  readonly client = input.required<RotaClient>();
  protected readonly years = computed(() => age(this.client().file?.details['dob'] ?? ''));
  protected readonly initials = computed(() =>
    this.client()
      .name.split(/\s+/)
      .slice(0, 2)
      .map((n) => n[0])
      .join(''),
  );
  protected readonly tabs = [
    { label: 'Overview', path: [] },
    { label: 'Medication & MAR', path: ['medication'] },
    { label: 'Visits & Allocation', path: ['visits'] },
    { label: 'Contacts', path: ['contacts'] },
    { label: 'Documents', path: ['documents'] },
    { label: 'Family Portal', path: ['family'] },
    { label: 'Audit Trail', path: ['audit'] },
  ];
}
