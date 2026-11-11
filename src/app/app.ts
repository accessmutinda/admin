import { PageNavigation } from './core/navigation/page-navigation.service';
import { PageTransition } from './shared/layouts/page-transition';
import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, NavigationError, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from './core/auth/auth.service';
import { SessionTimeout } from './core/auth/session-timeout';
@Component({
  imports: [RouterOutlet, PageTransition, SessionTimeout],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  protected readonly navigation = inject(PageNavigation);
  protected readonly ready = signal(false);
  protected readonly failed = signal(false);
  protected readonly initialPath = window.location.pathname;
  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd || event instanceof NavigationError),
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
