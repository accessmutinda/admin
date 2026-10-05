import { Directive, inject } from '@angular/core';
import { MatSelect } from '@angular/material/select';

@Directive({
  selector: 'mat-select[cvSelect]',
  host: { class: 'cv-select', '(keydown.escape)': 'closeOnEscape($event)' },
})
export class CvSelect {
  private readonly select = inject(MatSelect);
  constructor() {
    const select = this.select;
    select.panelClass = 'cv-select-panel';
    select.disableOptionCentering = true;
    select.typeaheadDebounceInterval = 250;
  }
  protected closeOnEscape(event: Event): void {
    if (!this.select.panelOpen) return;
    this.select.close();
    event.preventDefault();
    event.stopPropagation();
  }
}
