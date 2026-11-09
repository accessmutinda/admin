import { Component, computed, input } from '@angular/core';
import { CompanyLoading } from '../../features/management/companies/company-loading';
import { CompanyModulesLoading } from '../../features/management/companies/company-modules-loading';
import { Skeleton } from '../ui/skeleton';

@Component({
  selector: 'cv-page-loading',
  imports: [CompanyLoading, CompanyModulesLoading, Skeleton],
  host: { class: 'module-page', 'data-route-loading': '' },
  template: `
    @if (companyView(); as view) {
      <cv-company-loading [view]="view" heading="Loading page" />
    } @else if (modules()) {
      <div class="co-heading" aria-hidden="true">
        <cv-skeleton sizeClass="mb-4 h-7 w-64 max-w-full" />
      </div>
      <cv-company-modules-loading [configuration]="configuration()" />
    } @else {
      <div role="status" aria-label="Loading destination page" aria-busy="true">
        <div aria-hidden="true">
          <cv-skeleton sizeClass="mb-3 h-3 w-36" />
          <cv-skeleton sizeClass="mb-3 h-6 w-56 max-w-full" />
          <cv-skeleton sizeClass="mb-5 h-3 w-96 max-w-full" />
          <div class="route-metrics">
            @for (card of [0, 1, 2]; track card) {
              <section>
                <cv-skeleton sizeClass="h-3 w-28 max-w-full" /><cv-skeleton
                  sizeClass="mt-3 h-6 w-16"
                />
              </section>
            }
          </div>
          <section>
            <cv-skeleton sizeClass="h-4 w-40" />
            @for (row of [0, 1, 2, 3, 4, 5]; track row) {
              <div class="route-row">
                @for (cell of [0, 1, 2]; track cell) {
                  <cv-skeleton sizeClass="h-4 w-full" />
                }
              </div>
            }
          </section>
        </div>
        <span class="sr-only">Loading the requested screen.</span>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    section {
      padding: 12px;
      border: 1px solid var(--color-line);
      border-radius: 8px;
      background: white;
    }
    .route-metrics {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-bottom: 12px;
    }
    .route-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
      padding-block: 16px;
      border-bottom: 1px solid var(--color-line);
    }
    @media (max-width: 640px) {
      .route-metrics {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  `,
})
export class PageLoading {
  readonly url = input.required<string>();
  private readonly path = computed(() => this.url().split(/[?#]/)[0]);
  protected readonly modules = computed(() => /\/companies\/[^/]+\/modules\//.test(this.path()));
  protected readonly configuration = computed(
    () => this.modules() && !this.path().endsWith('/overview'),
  );
  protected readonly companyView = computed(() => {
    const path = this.path();
    if (!path.startsWith('/manage/companies') && !path.startsWith('/manage/locations')) return '';
    if (this.modules()) return '';
    if (path === '/manage/companies') return 'overview';
    if (path === '/manage/companies/directory') return 'directory';
    if (path.startsWith('/manage/locations')) return 'locations';
    for (const view of ['contacts', 'compliance', 'branding', 'integrations', 'access'])
      if (path.endsWith('/' + view)) return view;
    return 'profile';
  });
}
