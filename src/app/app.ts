import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, NavigationError, Router, RouterOutlet } from '@angular/router';
import { filter, take } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from './core/auth/auth.service';
import { AuthLoading } from './shared/layouts/auth-loading';
import { CompanyLoading } from './features/management/companies/company-loading';
import { Logo } from './shared/ui/logo';
import { Skeleton } from './shared/ui/skeleton';
@Component({
  imports: [RouterOutlet, AuthLoading, CompanyLoading, Logo, Skeleton],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  protected readonly ready = signal(false);
  protected readonly failed = signal(false);
  protected readonly initialPath = window.location.pathname;
  protected readonly management = this.initialPath.startsWith('/manage');
  protected readonly view = this.initialPath.includes('contacts')
    ? 'contacts'
    : this.initialPath.includes('compliance')
      ? 'compliance'
      : this.initialPath.includes('branding')
        ? 'branding'
        : this.initialPath.includes('modules')
          ? 'modules'
          : this.initialPath.includes('directory')
            ? 'directory'
            : this.initialPath.includes('locations')
              ? 'locations'
              : this.initialPath.includes('integrations')
                ? 'integrations'
                : this.initialPath.includes('access')
                  ? 'access'
                  : /companies\/?$/.test(this.initialPath)
                    ? 'overview'
                    : 'profile';
  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd || event instanceof NavigationError),
        take(1),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        this.failed.set(event instanceof NavigationError);
        this.ready.set(true);
      });
    // Render the shell immediately, but establish session authority before routing.
    const navigate = () => this.router.initialNavigation();
    void this.auth.initialize().then(navigate, navigate);
  }
  protected retry(): void {
    window.location.reload();
  }
}
