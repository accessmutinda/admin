import { Component, input } from '@angular/core';
import { Skeleton } from '../../../shared/ui/skeleton';

@Component({
  selector: 'cv-company-modules-loading',
  imports: [Skeleton],
  host: {
    role: 'status',
    'aria-busy': 'true',
    '[attr.aria-label]': "configuration() ? 'Loading submodule configuration' : 'Loading modules'",
  },
  template: `
    @if (showCompany()) {
      <section class="co-summary co-surface" aria-hidden="true">
        <cv-skeleton sizeClass="h-18 w-22 max-w-full" />
        <div class="co-summary-content">
          <div class="co-summary-header"><cv-skeleton sizeClass="h-5 w-52 max-w-full" /></div>
          <div class="co-facts">
            @for (fact of [0, 1, 2]; track fact) {
              <div><cv-skeleton sizeClass="h-3 w-32 max-w-full" /></div>
            }
          </div>
          <cv-skeleton sizeClass="mt-2 h-3 w-full" />
        </div>
      </section>
    }
    <section class="co-surface cm-panel" aria-hidden="true">
      <div class="cm-panel-heading">
        <cv-skeleton sizeClass="h-8 w-8" />
        <div>
          <cv-skeleton sizeClass="h-4 w-48 max-w-full" />
          <cv-skeleton sizeClass="mt-2 h-2 w-64 max-w-full" />
        </div>
        @if (configuration()) {
          <cv-skeleton sizeClass="h-7 w-32" />
        }
      </div>
      @if (configuration()) {
        <div class="cm-configuration-access">
          <div class="cm-configuration-access-copy">
            <cv-skeleton sizeClass="h-3 w-32 max-w-full" />
            <cv-skeleton sizeClass="mt-2 h-2 w-64 max-w-full" />
          </div>
          <cv-skeleton sizeClass="h-4 w-7" />
        </div>
        <div class="cm-submodule-heading">
          <cv-skeleton sizeClass="h-3 w-36" /><cv-skeleton sizeClass="h-3 w-20" />
        </div>
      }
      <div class="cm-module-grid" [class.cm-submodule-grid]="configuration()">
        @for (card of [0, 1, 2, 3, 4, 5, 6, 7, 8]; track card) {
          <div class="cm-module" [class.cm-submodule-card]="configuration()">
            <div class="cm-module-top">
              <cv-skeleton sizeClass="h-8 w-8" />
              <div>
                <cv-skeleton sizeClass="h-3 w-32 max-w-full" />
                @if (!configuration()) {
                  <cv-skeleton sizeClass="mt-2 h-3 w-16" />
                }
              </div>
              <cv-skeleton sizeClass="h-4 w-7" />
            </div>
            <div class="card-copy">
              <cv-skeleton sizeClass="h-2 w-full" /><cv-skeleton sizeClass="h-2 w-3/4" />
            </div>
            @if (configuration()) {
              <div class="cm-submodule-footer"><cv-skeleton sizeClass="h-4 w-16" /></div>
            } @else {
              <div class="cm-permissions">
                <cv-skeleton sizeClass="h-5 w-5" />
                <div>
                  <cv-skeleton sizeClass="h-3 w-24" /><cv-skeleton
                    sizeClass="mt-2 h-2 w-40 max-w-full"
                  />
                </div>
              </div>
              <cv-skeleton class="card-link" sizeClass="h-3 w-20" />
            }
          </div>
        }
      </div>
      @if (configuration()) {
        <div class="cm-callout permissions">
          <cv-skeleton sizeClass="h-6 w-6" />
          <div class="permissions-copy">
            <cv-skeleton sizeClass="h-3 w-32" /><cv-skeleton
              sizeClass="mt-2 h-2 w-full"
            /><cv-skeleton sizeClass="mt-3 h-3 w-40 max-w-full" />
          </div>
        </div>
      }
    </section>
    <span class="sr-only">{{
      configuration()
        ? 'Loading saved submodules and feature access.'
        : 'Loading saved modules and feature access.'
    }}</span>
  `,
  styles: `
    :host {
      display: block;
    }
    .card-copy {
      display: grid;
      gap: 6px;
      margin: 8px 0;
      flex: 1;
    }
    .card-link {
      align-self: flex-end;
    }
    .permissions {
      margin-top: 12px;
    }
    .permissions-copy {
      flex: 1;
      min-width: 0;
    }
  `,
})
export class CompanyModulesLoading {
  readonly configuration = input(false);
  readonly showCompany = input(false);
}
