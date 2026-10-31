import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'cv-visits-workspace',
  imports: [RouterOutlet],
  host: { class: 'module-page operations-page visits-workspace' },
  styleUrls: ['../care/care-shared.css', '../care/care-controls.css'],
  template: `<router-outlet />`,
})
export class VisitsWorkspace {}
