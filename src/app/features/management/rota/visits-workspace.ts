import { Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { ModuleDesign } from '../shared/module-design';
import { AccessRequired } from '../shared/access-required';
import { RotaService } from './rota.service';

@Component({
  selector: 'cv-visits-workspace',
  imports: [RouterLink, RouterOutlet, RouterLinkActive, ModuleDesign, AccessRequired],
  host: { class: 'module-page operations-page visits-workspace' },
  styleUrls: ['../care/care-shared.css', '../care/care-controls.css', './visits-workspace.css'],
  template: `
    <cv-module-design />
    @if (!scheduleView()) {
      <nav class="co-breadcrumb" aria-label="Breadcrumb">
        <a routerLink="/manage/rota">Care Delivery</a><span aria-hidden="true">›</span>
        <span>Visits & Rostering</span>
      </nav>
    }
    @if (service.can('view')) {
      @if (!scheduleView()) {
        <div class="care-heading">
          <div>
            <h1>Visits & Rostering</h1>
            <p>Manage weekly visits, allocate staff and deliver safe, high-quality care.</p>
          </div>
          @if (service.can('manage')) {
            <a
              class="care-button primary"
              routerLink="/manage/rota/planner"
              [queryParams]="{ plan: 'true' }"
              >+ Add Visit</a
            >
          }
        </div>
      }
      @if (!scheduleView()) {
        <nav class="visits-section-links" aria-label="Visit workflows">
          @for (item of sections; track item.path) {
            <a [routerLink]="item.path" routerLinkActive="active" ariaCurrentWhenActive="page">{{
              item.label
            }}</a>
          }
        </nav>
      }
      <div class="visits-view-content"><router-outlet /></div>
    } @else {
      <cv-access-required
        feature="Visits & Rostering"
        module="Care delivery"
        viewPermission="View rota"
        permissionsTitle="Visits & Rostering access"
      />
    }
  `,
})
export class VisitsWorkspace {
  private readonly router = inject(Router);
  protected readonly sections = [
    { path: '/manage/rota/overview', label: 'Roster & allocations' },
    { path: '/manage/rota/call-packages', label: 'Call packages' },
    { path: '/manage/rota/publishing', label: 'Publishing' },
    { path: '/manage/ecm', label: 'Live visits / ECM' },
    { path: '/manage/rota/history', label: 'History & audit' },
  ];
  protected readonly scheduleView = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => this.isSchedule(event.urlAfterRedirects)),
    ),
    { initialValue: this.isSchedule(this.router.url) },
  );
  private isSchedule(url: string): boolean {
    return ['/manage/rota/overview', '/manage/rota/planner'].includes(url.split('?')[0]);
  }
  protected readonly service = inject(RotaService);
}
