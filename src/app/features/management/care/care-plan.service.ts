import { Injectable, inject } from '@angular/core';
import { CareService } from './care.service';
import {
  CarePlanRecord,
  inReviewScope,
  DEMO_APPROVAL_LABEL,
  PlanVersion,
  planIssues,
  planDetails,
  planDate,
  sectionError,
  seedCarePlan,
} from './care-plan.models';

@Injectable({ providedIn: 'root' })
export class CarePlanService {
  readonly connected: boolean = false;
  readonly care = inject(CareService);
  canEdit() {
    return (
      this.care.rota.can('manage') &&
      ['PO', 'CA', 'RM', 'CC', 'FS'].includes(this.care.auth.currentUser()?.roleCode || '')
    );
  }
  canApprove() {
    return (
      this.care.rota.can('manage') &&
      ['PO', 'CA', 'RM'].includes(this.care.auth.currentUser()?.roleCode || '')
    );
  }
  read(id: string) {
    return this.care.client(id)?.file?.carePlan;
  }
  initialise(id: string, workspace: string): string | null | Promise<string | null> {
    if (this.read(id)) return null;
    const c = this.care.client(id);
    if (!c || !this.canEdit()) return 'Care management permission is required.';
    const record = seedCarePlan(c);
    const actor = this.care.auth.currentUser()!;
    record.versions[0].packageSnapshot = structuredClone(
      this.care.rota.data().calls.filter((c) => c.clientId === id && c.active),
    );
    record.versions[0].author = actor.name;
    record.versions[0].authorId = actor.id;
    record.versions[0].contributors = [actor.id];
    return this.care.saveCarePlanRecord(
      id,
      workspace,
      record,
      undefined,
      'Care-plan draft created',
    );
  }
  commit(
    id: string,
    workspace: string,
    draft: PlanVersion,
    revision: number,
    action: 'save' | 'submit' | 'approve' | 'return' | 'review' | 'package',
    reason = '',
    signature?: { name: string; confirmed: boolean },
  ): string | null | Promise<string | null> {
    const current = this.read(id),
      client = this.care.client(id),
      actor = this.care.auth.currentUser();
    if (!current || !client || !actor || !this.canEdit())
      return 'Care management permission is required.';
    if (current.revision !== revision)
      return 'This care plan changed. Reload before saving; your draft is retained.';
    const record = structuredClone(current),
      old = record.versions.find((v) => v.id === draft.id);
    if (!old) return 'Version unavailable.';
    if (action !== 'review' && (old.status === 'Approved' || old.status === 'Superseded'))
      return 'Approved versions are immutable. Start a new review.';
    let next = structuredClone(draft);
    if (action === 'review') {
      if (
        old.status !== 'Approved' ||
        record.versions.some((v) => ['Draft', 'In review'].includes(v.status))
      )
        return 'An approved plan and no open draft are required.';
      next = {
        ...structuredClone(old),
        id: crypto.randomUUID(),
        version: (Number(old.version) + 0.1).toFixed(1),
        status: 'Draft',
        author: actor.name,
        authorId: actor.id,
        contributors: [actor.id],
        reviewer: '',
        approver: '',
        approvedAt: '',
        createdAt: new Date().toISOString(),
        details: planDetails(client),
        packageSnapshot: structuredClone(
          this.care.rota.data().calls.filter((c) => c.clientId === id && c.active),
        ),
        confirmed: false,
        qualityReview: '',
        events: [],
        reviewReport: undefined,
        demoSignature: undefined,
        visitEvidenceReviews: [],
        packageDecision: 'Not reviewed',
        packageProposal: '',
        packageStatus: 'Not requested',
      };
      next.sections.forEach((s) => (s.complete = false));
      record.versions.unshift(next);
    } else {
      if (old.status !== 'Draft' && next.demoScope !== old.demoScope)
        return 'Return this version to draft before changing its review scope.';
      if (next.demoScope && next.demoScope !== 'available-sections')
        return 'Choose the available-sections demo scope.';
      next.demoSignature = old.demoSignature;
      const contentChanged = Object.keys(next).some(
        (k) =>
          ![
            'events',
            'contributors',
            'status',
            'author',
            'authorId',
            'reviewer',
            'approver',
            'approvedAt',
          ].includes(k) && JSON.stringify((old as any)[k]) !== JSON.stringify((next as any)[k]),
      );
      next.contributors = [
        ...new Set([
          ...(old.contributors || [old.authorId]),
          ...(['save', 'submit'].includes(action) && contentChanged ? [actor.id] : []),
        ]),
      ];
      if (action === 'save' && old.status !== 'Draft')
        return 'Return this version to draft before editing.';
      if (
        !this.canApprove() &&
        next.sections.some(
          (s, i) => JSON.stringify(s.visibility) !== JSON.stringify(old.sections[i]?.visibility),
        )
      )
        return 'Senior management permission is required to change disclosure settings.';
      if (action === 'submit') {
        if (old.status !== 'Draft') return 'Only a draft can be submitted.';
        const issues = planIssues(
          next,
          client,
          this.care.rota.data().calls.filter((c) => c.clientId === id && c.active),
        );
        if (issues.length && !next.qualityReview.trim())
          return 'Review quality findings and record a management review rationale before submission.';
        if (
          !next.confirmed ||
          next.sections.some(
            (s) => inReviewScope(next, s) && s.required && (!s.complete || !!sectionError(s)),
          ) ||
          !next.capacity['decision'].trim() ||
          next.capacity['concerns'] === 'Not recorded' ||
          next.packageDecision === 'Not reviewed'
        )
          return 'Confirm details, capacity, care package and complete every required section before submission.';
        if (!planDate(next.review)) return 'Enter a valid plan review date.';
        if (
          next.participation['source'] !== 'Service user' &&
          ['name', 'relationship', 'reason', 'authority'].some(
            (k) => !next.participation[k]?.trim(),
          )
        )
          return 'Complete the representative details and authority.';
        if (next.packageDecision === 'Change required' && !next.packageProposal.trim())
          return 'Describe the proposed package change.';
        next.packageSnapshot = structuredClone(
          this.care.rota.data().calls.filter((c) => c.clientId === id && c.active),
        );
        next.documentSnapshot = (client.file?.documents || [])
          .filter((d) => !d.deletedAt)
          .map((d) => ({ name: d.name, version: d.version }));
        next.status = 'In review';
        next.reviewer = '';
      }
      if (action === 'approve') {
        if (!this.canApprove() || old.status !== 'In review')
          return 'Senior management can approve submitted versions only.';
        if (old.authorId === actor.id || old.contributors?.includes(actor.id))
          return 'A different manager must approve this care plan.';
        if (
          old.demoScope &&
          (!signature?.confirmed ||
            signature.name.trim().toLowerCase() !== actor.name.trim().toLowerCase())
        )
          return 'Type your signed-in name and confirm the demonstration signature.';
        next = structuredClone(old);
        if (old.demoScope)
          next.demoSignature = {
            name: actor.name,
            userId: actor.id,
            at: new Date().toISOString(),
            label: 'Demonstration signature',
          };
        next.status = 'Approved';
        next.approver = actor.name;
        next.reviewer = actor.name;
        next.approvedAt = new Date().toISOString();
        record.versions.forEach((v) => {
          if (v.status === 'Approved') v.status = 'Superseded';
        });
      }
      if (action === 'return') {
        if (!this.canApprove() || old.status !== 'In review' || !reason.trim())
          return 'A manager must enter a reason to return a submitted plan.';
        next = structuredClone(old);
        next.status = 'Draft';
        next.reviewer = actor.name;
      }
      if (action === 'package') {
        if (
          !this.canApprove() ||
          old.packageDecision !== 'Change required' ||
          !['Pending approval', 'Not requested'].includes(old.packageStatus)
        )
          return 'A manager and a pending package change are required.';
        if (old.authorId === actor.id || old.contributors?.includes(actor.id))
          return 'A different manager must authorise the package recommendation.';
        next = structuredClone(old);
        next.packageStatus = 'Authorised recommendation — rota update required';
        record.packageHandoffs = [
          ...(record.packageHandoffs || []),
          {
            id: crypto.randomUUID(),
            versionId: old.id,
            version: old.version,
            proposal: old.packageProposal,
            status: 'Authorised',
            note: '',
            events: [
              {
                at: new Date().toISOString(),
                by: actor.name,
                action: 'Authorised',
                detail: old.packageProposal,
              },
            ],
          },
        ];
      }
      if (action === 'save') {
        next.status = old.status;
        next.approver = old.approver;
        next.approvedAt = old.approvedAt;
        next.reviewer = old.reviewer;
      }
      next.author = old.author;
      next.authorId = old.authorId;
      next.version = old.version;
      record.versions[record.versions.findIndex((v) => v.id === old.id)] = next;
    }
    if (
      action === 'save' &&
      next.packageDecision === 'Change required' &&
      next.packageStatus === 'Not requested'
    )
      next.packageStatus = 'Pending approval';
    const differences = Object.keys(next)
      .filter(
        (k) =>
          k !== 'events' && JSON.stringify((old as any)[k]) !== JSON.stringify((next as any)[k]),
      )
      .map((k) => ({ field: k, previous: (old as any)[k], current: (next as any)[k] }));
    const changes =
      action === 'save' ? JSON.stringify(differences) : reason || `Version ${next.version}`;
    if (
      JSON.stringify(old.capacity) !== JSON.stringify(next.capacity) ||
      JSON.stringify(old.participation) !== JSON.stringify(next.participation)
    )
      next.events.push({
        at: new Date().toISOString(),
        by: actor.name,
        action: 'Capacity / representation changed — management review required',
        detail: JSON.stringify({
          previous: { capacity: old.capacity, participation: old.participation },
          current: { capacity: next.capacity, participation: next.participation },
        }),
      });
    next.events.push({
      at: new Date().toISOString(),
      by: actor.name,
      action,
      detail:
        next.demoScope && ['submit', 'approve'].includes(action)
          ? `${DEMO_APPROVAL_LABEL}. ${changes}`
          : changes,
    });
    record.revision++;
    return this.care.saveCarePlanRecord(
      id,
      workspace,
      record,
      current.revision,
      `Care plan ${action} · v${next.version}`,
    );
  }
  advancePackageHandoff(
    id: string,
    workspace: string,
    handoffId: string,
    revision: number,
    note: string,
  ): string | null {
    if (!this.care.rota.can('manage') || !this.canEdit())
      return 'Rota management permission is required.';
    const saved = this.read(id);
    if (!saved || saved.revision !== revision)
      return 'This care plan changed. Reload the handoff before saving.';
    const record = structuredClone(saved);
    const handoff = record.packageHandoffs?.find((item) => item.id === handoffId);
    if (!handoff || handoff.status === 'Completed')
      return 'Choose an outstanding authorised recommendation.';
    if (handoff.status === 'Awaiting rota update' && !note.trim())
      return 'Record the simulated rota update and outcome.';
    handoff.status = handoff.status === 'Authorised' ? 'Awaiting rota update' : 'Completed';
    handoff.note = note.trim();
    handoff.events.push({
      at: new Date().toISOString(),
      by: this.care.auth.currentUser()!.name,
      action: handoff.status,
      detail: 'Frontend simulation — live calls and allocations unchanged. ' + note.trim(),
    });
    record.revision++;
    return this.care.saveCarePlanRecord(
      id,
      workspace,
      record,
      saved.revision,
      'Demo package handoff: ' + handoff.status,
    );
  }
}
