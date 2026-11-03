import { Component, computed, inject, input } from '@angular/core';
import { CareService } from './care.service';
import { approvedInstructions } from './care-plan.models';

@Component({
  selector: 'cv-approved-care-instructions',
  template: `<section class="instructions">
    <h3>Approved visit care instructions</h3>
    @if (partialDemo()) {
      <p>
        <strong>Partial demo approval:</strong> three available care areas only; 14 areas are
        deferred. This is not a complete care-plan approval.
      </p>
    }
    <p>Follow the current approved plan, the visit task list and linked risk assessments.</p>
    @for (s of instructions(); track s.name) {
      <details>
        <summary>{{ s.name }}</summary>
        <p>{{ s.instructions }}</p>
        <p><strong>Choices:</strong> {{ s.preferences }}</p>
        <p><strong>Actions:</strong> {{ s.actions }}</p>
        <p><strong>Escalation:</strong> {{ s.escalation }}</p>
      </details>
    } @empty {
      <p>No approved instructions are shared for this visit.</p>
    }
  </section>`,
  styles: [
    `
      .instructions {
        background: #f4f8fd;
        border: 1px solid #dce6f0;
        border-radius: 8px;
        padding: 14px;
        margin: 12px 0;
        font-size: 12px;
        color: #304a64;
      }
      .instructions h3 {
        font-size: 14px;
        margin: 0 0 8px;
      }
      .instructions p {
        line-height: 1.6;
      }
      details {
        background: white;
        padding: 10px;
        margin: 6px 0;
        border-radius: 5px;
      }
      summary {
        cursor: pointer;
        font-weight: 700;
      }
    `,
  ],
})
export class ApprovedCareInstructions {
  readonly clientId = input.required<string>();
  readonly visitId = input('');
  private readonly care = inject(CareService);
  protected readonly partialDemo = computed(
    () =>
      this.care
        .client(this.clientId())
        ?.file?.carePlan?.versions.find((p) => p.status === 'Approved')?.demoScope ===
      'available-sections',
  );
  protected readonly instructions = computed(() => {
    const client = this.care.client(this.clientId());
    if (!client) return [];
    const actor = this.care.auth.currentUser();
    const visit = this.care.rota
      .data()
      .visits.find(
        (v) => v.id === this.visitId() && v.clientId === client.id && v.state === 'Published',
      );
    if (this.visitId() && !visit) return [];
    const staff = this.care.store
      .staff()
      .find((s) => s.email.toLowerCase() === actor?.email.toLowerCase());
    if (
      actor?.roleCode === 'CW' &&
      (!staff ||
        !(visit
          ? visit.staffIds.includes(staff.id)
          : this.care.rota
              .data()
              .visits.some(
                (v) =>
                  v.clientId === client.id &&
                  v.state === 'Published' &&
                  v.staffIds.includes(staff.id),
              )))
    )
      return [];
    const all = approvedInstructions(client, actor?.roleCode === 'IN' ? 'inspector' : 'staff');
    if (!visit) return all;
    const task = (visit.callName + ' ' + visit.tasks).toLowerCase();
    const relevant = all.filter((s) => {
      const name = s.name.toLowerCase();
      if (['communication', 'home access & security'].includes(name)) return true;
      if (
        /meal|food|drink|nutrition|fluid/.test(task) &&
        ['nutrition & hydration', 'cultural / religious needs'].includes(name)
      )
        return true;
      if (
        /personal|wash|dress|toilet/.test(task) &&
        ['personal care', 'dressing & grooming', 'continence', 'mobility'].includes(name)
      )
        return true;
      if (/medic|mar/.test(task) && name === 'medication support') return true;
      return task.includes(name);
    });
    return relevant.length ? relevant : all;
  });
}
