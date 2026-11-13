import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CompanyAccessService } from '../../core/access/company-access.service';
import { inspectorEntryPath } from '../../core/access/inspector-routes';
import { INSPECTOR_PAGES } from './inspector.models';

@Component({
  selector: 'cv-inspector-unavailable',
  imports: [RouterLink],
  styleUrls: ['./inspector-page.css','./inspector-actions.css'],
  template: `<div class="inspection-page">
    <div class="page-heading">
      <div>
        <h1>{{ page?.label || 'Inspector Portal' }}</h1>
        <p>{{ page?.description }}</p>
      </div>
    </div>
    <section class="panel" role="status">
      <h2>Live workflow unavailable</h2>
      <p>
        This section is not connected to the backend yet. Live records and saved inspection actions
        are unavailable here.
      </p>
      <p>
        Provider Profile, Service Users, Staffing, Medication and Incidents &amp; Safeguarding use connected records when your inspection
        access permits them.
      </p>
      <a class="secondary" [routerLink]="destination() || '/account/security'">{{
        destination() ? 'Open available module' : 'Account & support'
      }}</a>
    </section>
  </div>`,
})
export class InspectorUnavailable {
  private readonly access = inject(CompanyAccessService);
  private readonly route = inject(ActivatedRoute);
  readonly page = INSPECTOR_PAGES.find(page => page.path === this.route.snapshot.data['page']);
  readonly destination = computed(() => inspectorEntryPath((path) => this.access.canPath(path)));
  canLeave() {
    return true;
  }
}
