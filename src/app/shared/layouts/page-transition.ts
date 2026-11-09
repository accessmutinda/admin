import { Component, computed, input } from '@angular/core';
import { AuthLoading } from './auth-loading';
import { PageLoading } from './page-loading';
import { Logo } from '../ui/logo';
import { Skeleton } from '../ui/skeleton';
import { shellFor } from '../../core/navigation/page-navigation.service';

@Component({
  selector: 'cv-page-transition',
  imports: [AuthLoading, PageLoading, Logo, Skeleton],
  template: `
    @if (authentication()) {
      <cv-auth-loading [path]="url()" />
    } @else {
      <div class="page-transition" [class.with-navigation]="shell()">
        @if (shell()) {
          <aside aria-hidden="true">
            <cv-logo tone="light" />
            @for (row of [0, 1, 2, 3, 4, 5, 6]; track row) {
              <cv-skeleton sizeClass="mt-6 h-4 w-full" />
            }
          </aside>
        }
        <main>
          <header><cv-logo /></header>
          <cv-page-loading [url]="url()" />
        </main>
      </div>
    }
  `,
  styles: `
    .page-transition {
      min-height: 100svh;
      background: #eff7fb;
    }
    .with-navigation {
      display: grid;
      grid-template-columns: 240px minmax(0, 1fr);
    }
    aside {
      padding: 24px;
      background: #0b3050;
    }
    main {
      padding: 16px;
      min-width: 0;
    }
    header {
      display: flex;
      align-items: center;
      margin-bottom: 24px;
    }
    @media (max-width: 1023px) {
      .with-navigation {
        display: block;
      }
      aside {
        display: none;
      }
      main {
        padding: 12px;
      }
    }
  `,
})
export class PageTransition {
  readonly url = input.required<string>();
  protected readonly shell = computed(() => shellFor(this.url()));
  protected readonly authentication = computed(() =>
    /^\/(auth(?:\/|$)|select-workspace(?:[/?#]|$))/.test(this.url()),
  );
}
