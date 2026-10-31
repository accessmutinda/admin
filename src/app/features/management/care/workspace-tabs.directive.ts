import { Directive, DestroyRef, ElementRef, afterNextRender, inject } from '@angular/core';

@Directive({ selector: '[cvAlignedWorkspaceTabs]' })
export class AlignedWorkspaceTabs {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const nav = this.element.nativeElement;
      let frame: number | undefined;
      let destroyed = false;
      const align = () => {
        frame = undefined;
        nav.classList.remove('is-wrapped');
        const first = nav.firstElementChild;
        const top = first?.getBoundingClientRect().top ?? 0;
        const wrapped = Array.from(nav.children).some(
          (item) => item.getBoundingClientRect().top > top + 1,
        );
        nav.classList.toggle('is-wrapped', wrapped);
      };
      const schedule = () => {
        if (!destroyed && frame === undefined) frame = requestAnimationFrame(align);
      };
      const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
      observer?.observe(nav);
      window.addEventListener('resize', schedule);
      document.fonts?.ready.then(schedule);
      this.destroyRef.onDestroy(() => {
        destroyed = true;
        observer?.disconnect();
        window.removeEventListener('resize', schedule);
        if (frame !== undefined) cancelAnimationFrame(frame);
      });
      align();
    });
  }
}
