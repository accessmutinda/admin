import { DestroyRef, computed, inject, signal } from '@angular/core';

export function locationClock() {
  const captured = signal({ server: 0, local: performance.now() });
  const elapsed = signal(performance.now());
  const now = computed(() => captured().server + Math.max(0, elapsed() - captured().local));
  const tick = () => elapsed.set(performance.now());
  const timer = setInterval(tick, 1000);
  document.addEventListener('visibilitychange', tick);
  inject(DestroyRef).onDestroy(() => {
    clearInterval(timer);
    document.removeEventListener('visibilitychange', tick);
  });
  return {
    now,
    fresh: computed(() => now() - captured().server < 60000),
    sync(asOf: string): void {
      captured.set({ server: Date.parse(asOf), local: performance.now() });
      tick();
    },
    before(deadline: string | null): boolean {
      return !!deadline && now() < Date.parse(deadline);
    },
  };
}
