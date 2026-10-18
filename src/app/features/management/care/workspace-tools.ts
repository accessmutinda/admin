import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { A11yModule } from '@angular/cdk/a11y';
import { CareService } from './care.service';
import { HrService } from '../people/hr.service';
import { emptyEcm, liveVisit } from '../ecm/ecm.models';
import { londonDate } from '../rota/rota.models';
@Component({
  selector: 'cv-workspace-tools',
  imports: [FormsModule, RouterLink, A11yModule],
  styleUrls: ['./care-shared.css', './care-controls.css'],
  styles: [
    `
      :host {
        display: flex;
        gap: 6px;
        align-items: center;
      }
      .workspace-dialog {
        margin: 70px auto auto;
        width: min(650px, calc(100% - 24px));
        max-height: 75vh;
        overflow: auto;
        background: #fff;
        border-radius: 9px;
        padding: 16px;
        box-shadow: 0 8px 40px #07153644;
      }
      .workspace-search {
        width: 100%;
        padding: 12px;
        border: 1px solid #dfe6eb;
        border-radius: 5px;
        box-sizing: border-box;
        font: inherit;
      }
      .workspace-results a {
        display: block;
        padding: 10px 4px;
        border-bottom: 1px solid #edf2f5;
        text-decoration: none;
        color: #06376b;
      }
      .workspace-results small {
        display: block;
        color: #657184;
      }
      .workspace-tool {
        min-height: 32px;
        padding: 4px 8px;
      }
      .workspace-tool .material-symbols-outlined {
        font-size: 18px;
      }
      @media (max-width: 600px) {
        .workspace-tool span.tool-label {
          display: none;
        }
      }
    `,
  ],
  template: ` <button
      class="care-button workspace-tool"
      (click)="open.set('search')"
      aria-label="Search workspace"
    >
      <span class="material-symbols-outlined" aria-hidden="true">search</span
      ><span class="tool-label">Search</span></button
    ><button
      class="care-button workspace-tool"
      (click)="open.set('alerts')"
      [attr.aria-label]="'Notifications: ' + alerts().length"
    >
      <span class="material-symbols-outlined" aria-hidden="true">notifications</span
      >{{ alerts().length }}
    </button>
    @if (open()) {
      <div class="care-overlay" (click)="open.set('')">
        <section
          class="workspace-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="workspace-tools-title"
          cdkTrapFocus
          [cdkTrapFocusAutoCapture]="true"
          (click)="$event.stopPropagation()"
          (keydown.escape)="open.set('')"
        >
          <div class="care-toolbar">
            <h2 id="workspace-tools-title">
              {{ open() === 'search' ? 'Search workspace' : 'Notifications & care alerts' }}
            </h2>
            <button class="care-button" aria-label="Close workspace tools" (click)="open.set('')">
              ×
            </button>
          </div>
          @if (open() === 'search') {
            <label
              >Search service users, staff, visits or medication<input
                class="workspace-search"
                [ngModel]="query()"
                (ngModelChange)="query.set($event)"
                placeholder="Start typing…"
            /></label>
            <div class="workspace-results">
              @for (r of results(); track r.key) {
                <a [routerLink]="r.path" (click)="open.set('')"
                  ><strong>{{ r.title }}</strong
                  ><small>{{ r.kind }} · {{ r.detail }}</small></a
                >
              } @empty {
                <p class="care-empty">
                  {{
                    query().trim().length < 2
                      ? 'Enter at least two characters.'
                      : 'No matching accessible records.'
                  }}
                </p>
              }
            </div>
          } @else {
            <p class="care-note">Derived from current saved visits and care-plan review dates.</p>
            <div class="workspace-results">
              @for (a of alerts(); track a.key) {
                <a [routerLink]="a.path" (click)="open.set('')"
                  ><strong>{{ a.title }}</strong
                  ><small>{{ a.detail }}</small></a
                >
              } @empty {
                <p class="care-empty">No current care alerts.</p>
              }
            </div>
          }
        </section>
      </div>
    }`,
})
export class WorkspaceTools {
  protected readonly care = inject(CareService);
  private readonly hr = inject(HrService);
  protected readonly open = signal('');
  protected readonly query = signal('');
  private readonly now = signal(Date.now());
  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 60000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
  protected readonly results = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (q.length < 2) return [];
    const clients = this.care.clients();
    return [
      ...clients
        .filter((c) =>
          `${c.name} ${c.address} ${c.postcode} ${c.file?.details['gp'] ?? ''} ${c.representative?.name ?? ''}`
            .toLowerCase()
            .includes(q),
        )
        .map((c) => ({
          key: 'c' + c.id,
          title: c.name,
          kind: 'Service user',
          detail: c.postcode,
          path: ['/manage/clients', c.id],
        })),
      ...this.hr
        .staff()
        .filter((p) => `${p.name} ${p.role} ${p.location}`.toLowerCase().includes(q))
        .map((p) => ({
          key: 'p' + p.id,
          title: p.name,
          kind: 'Staff',
          detail: p.role,
          path: ['/manage/people/staff', p.id, 'overview'],
        })),
      ...clients.flatMap((c) =>
        (c.file?.medications ?? [])
          .filter((m) => `${m.name} ${m.indication} ${c.name}`.toLowerCase().includes(q))
          .map((m) => ({
            key: 'm' + c.id + m.id,
            title: m.name + ' ' + m.strength,
            kind: 'Medication',
            detail: c.name,
            path: ['/manage/clients', c.id, 'medication'],
          })),
      ),
      ...(this.care.rota.can('view') ? this.care.rota.data().visits : [])
        .filter((v) => `${v.clientName} ${v.callName} ${v.date}`.toLowerCase().includes(q))
        .slice(0, 30)
        .map((v) => ({
          key: 'v' + v.id,
          title: v.clientName + ' · ' + v.callName,
          kind: 'Visit',
          detail: v.date + ' ' + v.start,
          path: ['/manage/clients', v.clientId, 'visits'],
        })),
    ].slice(0, 50);
  });
  protected readonly alerts = computed(() => {
    const now = this.now(),
      today = londonDate(new Date(now));
    return [
      ...this.care
        .clients()
        .filter(
          (c) =>
            c.active &&
            !!c.file?.sections['plan']?.['review'] &&
            c.file.sections['plan']['review'] <= today,
        )
        .map((c) => ({
          key: 'r' + c.id,
          title: c.name + ' · Care plan review due',
          detail: c.file!.sections['plan']['review'],
          path: ['/manage/clients', c.id],
        })),
      ...(this.care.rota.can('view') ? this.care.rota.data().visits : [])
        .filter(
          (v) =>
            v.state !== 'Cancelled' &&
            v.date === today &&
            (v.staffIds.length < v.carers ||
              (v.state === 'Published' &&
                ['Running late', 'Missed visit risk', 'Missed visit'].includes(
                  liveVisit(v, now, this.care.rota.data().ecm ?? emptyEcm()).status,
                ))),
        )
        .map((v) => ({
          key: 'v' + v.id,
          title:
            v.clientName +
            ' · ' +
            (v.staffIds.length < v.carers
              ? 'Needs staff'
              : liveVisit(v, now, this.care.rota.data().ecm ?? emptyEcm()).status),
          detail: v.callName + ' ' + v.start,
          path: ['/manage/clients', v.clientId, 'visits'],
        })),
    ];
  });
}
