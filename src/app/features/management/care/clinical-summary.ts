import { Component, computed, input, output, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RotaClient, londonDate } from '../rota/rota.models';
import { ManagementStore } from '../shared/management.store';
import { RotaService } from '../rota/rota.service';
@Component({
  selector: 'cv-clinical-summary',
  imports: [RouterLink],
  styleUrls: ['./care-shared.css', './care-controls.css'],
  styles: [
    `
      .clinical-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }
      .clinical-services {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .clinical-services a {
        flex: 1;
        min-width: 110px;
        text-decoration: none;
        padding: 8px;
        background: #eaf5fc;
        border-radius: 5px;
      }
      .clinical-services small {
        display: block;
        color: #657184;
      }
      .clinical-grid .care-dl div {
        grid-template-columns: 1fr;
      }
      .clinical-grid .care-dl dt {
        font-size: 11px;
      }
      @media (max-width: 1100px) {
        .clinical-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 600px) {
        .clinical-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  template: ` <section class="care-panel">
      <div class="care-toolbar">
        <h2>Services required</h2>
        <a [routerLink]="['/manage/rota/call-packages']" [queryParams]="{ client: client().id }"
          >Manage services</a
        >
      </div>
      <div class="clinical-services">
        @for (call of calls(); track call.id) {
          <a [routerLink]="['/manage/clients', client().id, 'visits']"
            ><strong>{{ call.name }}</strong
            ><small
              >{{ call.start }} – {{ call.end }} · {{ call.weekdays.length }} days / week</small
            ></a
          >
        } @empty {
          <p class="care-note">No services recorded.</p>
        }
      </div>
    </section>
    <div class="clinical-grid">
      @for (panel of panels; track panel.key) {
        <section class="care-panel">
          <div class="care-toolbar">
            <h2>{{ panel.label }}</h2>
            @if (rota.can('manage')) {
              <button class="care-button" (click)="edit.emit(panel.key)">Edit</button>
            }
          </div>
          <dl class="care-dl">
            @for (field of panel.fields; track field.key) {
              <div>
                <dt>{{ field.label }}</dt>
                <dd>
                  {{
                    field.key === 'preferredStaff'
                      ? staffNames(value(panel.key, field.key))
                      : value(panel.key, field.key) || 'Not recorded'
                  }}
                </dd>
              </div>
            }
          </dl>
        </section>
      }
    </div>
    <section class="care-panel">
      <div class="care-toolbar">
        <h2>Upcoming allocations</h2>
        <a [routerLink]="['/manage/clients', client().id, 'visits']">Open allocation planner</a>
      </div>
      <div class="care-scroll">
        <table class="care-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time / call</th>
              <th>Carers</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            @for (v of upcoming(); track v.id) {
              <tr>
                <td>{{ v.date }}</td>
                <td>{{ v.start }} · {{ v.callName }}</td>
                <td>{{ staffNames(v.staffIds.join(',')) }}</td>
                <td>
                  {{
                    v.staffIds.length < v.carers
                      ? 'Unallocated'
                      : v.state === 'Draft'
                        ? 'Allocated · Draft'
                        : 'Published'
                  }}
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4">No upcoming visits.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>`,
})
export class ClinicalSummary {
  readonly client = input.required<RotaClient>();
  readonly edit = output<string>();
  protected readonly store = inject(ManagementStore);
  protected readonly rota = inject(RotaService);
  protected readonly calls = computed(() =>
    this.rota.data().calls.filter((c) => c.clientId === this.client().id && c.active),
  );
  protected readonly upcoming = computed(() =>
    this.rota
      .data()
      .visits.filter(
        (v) => v.clientId === this.client().id && v.state !== 'Cancelled' && v.date >= londonDate(),
      )
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
      .slice(0, 6),
  );
  protected readonly panels = [
    {
      key: 'diagnoses',
      label: 'Health & communication',
      fields: [
        { key: 'primary', label: 'Primary diagnosis' },
        { key: 'communication', label: 'Communication' },
        { key: 'sensory', label: 'Hearing & vision' },
        { key: 'diet', label: 'Dietary needs' },
        { key: 'ongoing', label: 'Ongoing healthcare' },
      ],
    },
    {
      key: 'capacity',
      label: 'Capacity & legal authority',
      fields: [
        { key: 'status', label: 'Capacity summary' },
        { key: 'assessed', label: 'Last assessed' },
        { key: 'welfareLpa', label: 'LPA · Health & Welfare' },
        { key: 'financeLpa', label: 'LPA · Property & Finance' },
        { key: 'advance', label: 'Advance decision / DNR' },
      ],
    },
    {
      key: 'support',
      label: 'Care & support needs',
      fields: [
        { key: 'personal', label: 'Personal care' },
        { key: 'nutrition', label: 'Nutrition & hydration' },
        { key: 'continence', label: 'Continence' },
        { key: 'safety', label: 'Safety & wellbeing' },
        { key: 'behaviour', label: 'Behaviour & reassuring approaches' },
        { key: 'gender', label: 'Carer gender requirement' },
        { key: 'preferredStaff', label: 'Preferred carers' },
        { key: 'continuity', label: 'Continuity notes' },
      ],
    },
  ];
  protected value(section: string, key: string): string {
    return this.client().file?.sections[section]?.[key] ?? '';
  }
  protected staffNames(ids: string): string {
    return (
      ids
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
        .map((id) => this.store.staff().find((p) => p.id === id)?.name ?? 'Unavailable carer')
        .join(', ') || 'Not recorded'
    );
  }
}
