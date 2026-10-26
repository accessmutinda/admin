import { Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'cv-module-design',
  template: '',
  host: { hidden: '' },
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    './module-design.css',
    './module-controls.css',
    './module-layouts.css',
    './module-workspaces.css',
    '../staff-portal/portal-reference-theme.css',
    '../staff-portal/portal-dashboard-two.css',
  ],
})
export class ModuleDesign {}
