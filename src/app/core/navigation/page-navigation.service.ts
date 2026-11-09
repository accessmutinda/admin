import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationSkipped,
  NavigationStart,
  Router,
} from '@angular/router';

@Injectable({ providedIn: 'root' })
export class PageNavigation {
  private readonly router = inject(Router);
  private readonly pending = signal<{ id: number; url: string; source: string } | null>(null);
  readonly destination = () => this.pending()?.url ?? '';

  constructor() {
    const current = this.router.currentNavigation();
    if (current) this.start(current.id, current.extractedUrl.toString());
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationStart) this.start(event.id, event.url);
      else if (
        (event instanceof NavigationEnd ||
          event instanceof NavigationCancel ||
          event instanceof NavigationError ||
          event instanceof NavigationSkipped) &&
        event.id === this.pending()?.id
      )
        this.pending.set(null);
    });
  }

  localDestination(shell: string): string {
    const destination = this.destination();
    return shellFor(destination) === shell && shellFor(this.pending()?.source ?? '') === shell
      ? destination
      : '';
  }

  rootDestination(): string {
    const destination = this.destination();
    const shell = shellFor(destination);
    return shell && shell === shellFor(this.pending()?.source ?? '') ? '' : destination;
  }

  private start(id: number, url: string): void {
    const path = url.split(/[?#]/)[0];
    const previous = this.router.url.split(/[?#]/)[0];
    this.pending.set(path !== previous ? { id, url, source: this.router.url } : null);
  }
}

export function shellFor(url: string): string {
  const path = url.split(/[?#]/)[0];
  if (/^\/(manage|account)(\/|$)/.test(path)) return 'management';
  if (/^\/staff-portal(\/|$)/.test(path)) return 'staff';
  if (/^\/inspector(\/|$)/.test(path)) return 'inspector';
  return '';
}
