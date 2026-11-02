import { of } from 'rxjs';
import { isPersonalCareIncident } from './care-plan-personal-care.models';
import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { CareHeader } from './care-header';
import { CareService } from './care.service';
import { ClientEntry } from '../clients/client-file.models';
@Component({
  selector: 'cv-care-events',
  imports: [DatePipe, FormsModule, CareHeader, RouterLink],
  styleUrls: ['./care-shared.css', './care-controls.css', './care-plan.css'],
  template: `@if (client(); as c) {
      <cv-care-header [client]="c" [active]="page()" />
      <section class="plan-card">
        <div class="card-heading">
          <div>
            <h2>{{ page() === 'feedback' ? 'Reviews & Feedback' : 'Incidents & Complaints' }}</h2>
            <p>{{ c.name }} · Service User records and follow-up.</p>
          </div>
          @if (canEdit()) {
            <button class="button primary" (click)="open()">+ Add record</button>
          }
        </div>
        @if (personalContext()) {
          <p>
            Personal Care related records ·
            <a [routerLink]="['/manage/clients', id(), 'incidents']">View all records</a>
          </p>
        }
        @if (error()) {
          <p class="message error" role="alert">{{ error() }}</p>
        }
        @if (notice()) {
          <p class="message success" role="status">{{ notice() }}</p>
        }
        @if (page() === 'incidents') {
          <div class="actions">
            <button
              class="button"
              [class.primary]="collection() === 'incidents'"
              (click)="choose('incidents')"
            >
              Incidents</button
            ><button
              class="button"
              [class.primary]="collection() === 'complaints'"
              (click)="choose('complaints')"
            >
              Complaints
            </button>
          </div>
        }
        @for (entry of entries(); track entry.id) {
          <article class="record-row">
            <div>
              <strong>{{ entry.name }}</strong>
              <p>{{ entry.detail }}</p>
              <small
                >{{ entry.date | date: 'dd MMM yyyy' }} · {{ entry.level }} ·
                {{ entry.status }}</small
              >
            </div>
            @if (canEdit()) {
              <button class="button" (click)="open(entry)">View / update</button>
            }
          </article>
        } @empty {
          <p>No records in this category.</p>
        }
        @if (editing()) {
          <h3>{{ draft.id ? 'Update record' : creationTitle }}</h3>
          <div class="form-grid">
            <label>Title<input [(ngModel)]="draft.name" /></label
            ><label>Date<input type="date" [(ngModel)]="draft.date" /></label
            ><label
              >Details and follow-up<textarea rows="4" [(ngModel)]="draft.detail"></textarea></label
            ><label
              >Risk level<select [(ngModel)]="draft.level">
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select></label
            ><label
              >Status<select [(ngModel)]="draft.status">
                <option>Active</option>
                <option>Completed</option>
                <option>Inactive</option>
              </select></label
            >
          </div>
          <div class="actions">
            <button class="button primary" (click)="save()">Save record</button
            ><button class="button" (click)="editing.set(false)">Cancel</button>
          </div>
        }
      </section>
    } @else {
      <p>Service user unavailable.</p>
    }`,
})
export class CareEvents {
  protected readonly care = inject(CareService);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  protected readonly id = computed(() => this.params().get('id') || '');
  protected readonly client = computed(() => this.care.client(this.id()));
  protected readonly page = signal(
    this.route.snapshot.data['careEventSection'] as 'incidents' | 'feedback',
  );
  protected readonly collection = signal<'incidents' | 'complaints' | 'feedback'>(
    this.page() === 'feedback' ? 'feedback' : 'incidents',
  );
  private readonly routeQuery = toSignal(
    this.route.queryParamMap || of(this.route.snapshot.queryParamMap),
    { initialValue: this.route.snapshot.queryParamMap },
  );
  protected readonly personalContext = computed(
    () => this.routeQuery()?.get('related') === 'personal-care',
  );
  protected readonly entries = computed(() => {
    const entries = this.client()?.file?.entries[this.collection()] || [];
    return this.personalContext() ? entries.filter(isPersonalCareIncident) : entries;
  });
  protected readonly editing = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected draft: ClientEntry = {
    id: '',
    name: '',
    detail: '',
    date: new Date().toISOString().slice(0, 10),
    level: 'Low',
    status: 'Active',
  };
  private clean = '';
  private revision = '';
  private workspace = '';
  constructor() {
    const create = this.route.snapshot.queryParamMap.get('create');
    if (
      (this.page() === 'incidents' && ['incident', 'complaint'].includes(create || '')) ||
      (this.page() === 'feedback' && create === 'compliment')
    ) {
      this.collection.set(
        create === 'complaint' ? 'complaints' : create === 'compliment' ? 'feedback' : 'incidents',
      );
      this.open();
      if (this.editing()) {
        this.draft.name =
          create === 'compliment'
            ? 'Compliment'
            : create === 'complaint'
              ? 'Complaint'
              : 'Incident';
        this.clean = JSON.stringify(this.draft);
      }
    } else {
      const entryId = this.route.snapshot.queryParamMap.get('entry');
      const entry = this.entries().find((item) => item.id === entryId);
      if (entry) this.open(entry);
    }
  }
  protected get creationTitle() {
    if (this.collection() === 'complaints') return 'New complaint';
    if (this.collection() === 'incidents') return 'New incident';
    return this.route.snapshot.queryParamMap.get('create') === 'compliment'
      ? 'New compliment'
      : 'New feedback';
  }
  protected canEdit() {
    return (
      this.care.rota.can('manage') &&
      ['PO', 'CA', 'RM', 'CC', 'FS'].includes(this.care.auth.currentUser()?.roleCode || '')
    );
  }
  canLeave() {
    return (
      !this.editing() ||
      JSON.stringify(this.draft) === this.clean ||
      window.confirm('Discard unsaved Service User record changes?')
    );
  }
  protected open(entry?: ClientEntry) {
    if (!this.canEdit() || !this.canLeave()) return;
    this.draft = entry
      ? structuredClone(entry)
      : {
          id: '',
          name: '',
          detail: '',
          date: new Date().toISOString().slice(0, 10),
          level: 'Low',
          status: 'Active',
        };
    this.clean = JSON.stringify(this.draft);
    this.revision = this.client()?.file?.updatedAt || '';
    this.workspace = this.care.store.companyId();
    this.editing.set(true);
  }
  protected choose(collection: 'incidents' | 'complaints') {
    if (this.canLeave()) {
      this.editing.set(false);
      this.collection.set(collection);
    }
  }
  protected save() {
    const error = this.care.saveLinkedClientEntry(
      this.id(),
      this.workspace,
      this.collection(),
      this.draft,
      this.revision,
    );
    this.error.set(error || '');
    if (!error) {
      this.editing.set(false);
      this.notice.set('Service User record saved.');
    }
  }
}
