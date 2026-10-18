import { ukStamp } from './care.models';
import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ModuleDesign } from '../shared/module-design';
import { CareService } from './care.service';
@Component({
  selector: 'cv-family-portal',
  imports: [ModuleDesign, DatePipe, FormsModule, RouterLink],
  host: { class: 'module-page operations-page' },
  styleUrls: ['./care-shared.css', './care-controls.css'],
  styles: [
    `
      :host {
        max-width: 1100px;
        margin: 24px auto;
        padding: 12px;
      }
      .family-sections {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      @media (max-width: 760px) {
        .family-sections {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  template: `<cv-module-design />
    @if (record(); as r) {
      <div class="care-heading">
        <div>
          <h1>{{ r.name }} · Family Portal</h1>
          <p>Approved information for {{ r.access.name }}.</p>
        </div>
        @if (preview()) {
          <a class="care-button" [routerLink]="['/manage/clients', id(), 'family']"
            >Return to access settings</a
          >
        }
      </div>
      <p class="care-note">
        {{ preview() ? 'Administrator preview. ' : '' }}Device-local demonstration. External account
        invitations and message delivery are not configured.
      </p>
      <div class="family-sections">
        @if (r.plan) {
          <section class="care-panel">
            <h2>Care plan</h2>
            <dl class="care-dl">
              @for (item of planFields; track item.key) {
                <div>
                  <dt>{{ item.label }}</dt>
                  <dd>{{ r.plan.details[item.key] || 'Not recorded' }}</dd>
                </div>
              }
            </dl>
            @for (g of r.plan.goals; track g.id) {
              <h3>{{ g.name }}</h3>
              <p>{{ g.detail }}</p>
            }
          </section>
        }
        @if (r.medication) {
          <section class="care-panel">
            <h2>Medication · read only</h2>
            @for (m of r.medication; track $index) {
              <h3>{{ m.name }} {{ m.strength }}</h3>
              <p>{{ m.dose }} · {{ m.route }} · {{ m.times.join(', ') }}</p>
              <p class="care-note">
                {{ m.discontinuedAt ? 'Discontinued' : m.start + ' – ' + (m.end || 'Ongoing') }}
              </p>
            } @empty {
              <p>No prescriptions recorded.</p>
            }
          </section>
        }
        @if (r.visits) {
          <section class="care-panel">
            <h2>Visits & attendance</h2>
            <div class="care-scroll">
              <table class="care-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Call / time</th>
                    <th>Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  @for (v of r.visits; track v.id) {
                    <tr>
                      <td>{{ v.date | date: 'dd MMM yyyy' }}</td>
                      <td>
                        {{ v.callName }}<small>{{ v.start }} – {{ v.end }}</small>
                      </td>
                      <td>{{ v.completed ? 'Completed' : 'Scheduled / awaiting completion' }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="3">No published visits.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        }
        @if (r.notes !== null) {
          <section class="care-panel">
            <h2>Approved care updates</h2>
            <p style="white-space:pre-line">{{ r.notes || 'No approved updates recorded.' }}</p>
          </section>
        }
        @if (r.invoices) {
          <section class="care-panel">
            <h2>Invoices</h2>
            @for (i of r.invoices; track i.id) {
              <h3>{{ i.number }} · {{ i.date }}</h3>
              <span class="care-tag">{{ i.state }}</span>
              @for (line of i.lines; track line.visitId) {
                <p>{{ line.date }} · {{ line.call }} · £{{ line.amount.toFixed(2) }}</p>
              }
            } @empty {
              <p>No approved invoices.</p>
            }
          </section>
        }
        @if (r.messages) {
          <section class="care-panel">
            <h2>Messages</h2>
            @for (m of r.messages; track m.id) {
              <h3>{{ m.by }} · {{ ukStamp(m.at) }}</h3>
              <p style="white-space:pre-line">{{ m.text }}</p>
            } @empty {
              <p>No messages recorded.</p>
            }
            @if (!preview()) {
              <label
                >Your message<textarea
                  [(ngModel)]="message"
                  rows="3"
                  style="width:100%"
                ></textarea></label
              ><button class="care-button primary" (click)="send()">Record message</button>
            }
            @if (error()) {
              <p class="care-error" role="alert">{{ error() }}</p>
            }
          </section>
        }
      </div>
    } @else {
      <section class="care-panel">
        <h1>Family access unavailable</h1>
        <p>
          The signed-in account, workspace, consent and active permissions must match this family
          record.
        </p>
        <a routerLink="/select-workspace" class="care-button">Select workspace</a>
      </section>
    }`,
})
export class FamilyPortal {
  protected readonly ukStamp = ukStamp;
  private readonly care = inject(CareService);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly query = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly id = computed(() => this.params().get('clientId') ?? '');
  protected readonly accessId = computed(() => this.params().get('accessId') ?? '');
  protected readonly preview = computed(
    () => this.query().get('preview') === '1' && this.care.rota.can('manage'),
  );
  protected readonly record = computed(() =>
    this.care.familyRecord(this.id(), this.accessId(), this.preview()),
  );
  protected message = '';
  protected readonly error = signal('');
  protected readonly planFields = [
    { key: 'name', label: 'Plan' },
    { key: 'needs', label: 'Care needs' },
    { key: 'support', label: 'Support' },
    { key: 'review', label: 'Review date' },
  ];
  protected send(): void {
    const error = this.care.message(
      this.id(),
      this.care.store.companyId(),
      this.accessId(),
      this.message,
      true,
    );
    if (error) this.error.set(error);
    else {
      this.message = '';
      this.error.set('');
    }
  }
}
