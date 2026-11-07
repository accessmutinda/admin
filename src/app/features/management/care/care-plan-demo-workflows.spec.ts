import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { DEMO_USER } from '../../../core/auth/fixtures';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { ManagementStore } from '../shared/management.store';
import { RotaService } from '../rota/rota.service';
import { RotaVisit } from '../rota/rota.models';
import { emptyClientFile } from '../clients/client-file.models';
import { EcmService } from '../ecm/ecm.service';
import { CarePlanService } from './care-plan.service';
import { createCarePlanPdf } from './care-plan-pdf';
import { carePlanVisitTasks } from './care-plan-visit-tasks';
import { PlanVersion, approvedInstructions } from './care-plan.models';

// Exercise the actual local store and lifecycle together, not a second implementation.
describe('Care-plan frontend demo workflows', () => {
  const clientId = 'demo-workflow-client';
  const workspace = 'lqcs';
  const actor = signal({ ...DEMO_USER, roleCode: 'CA' as typeof DEMO_USER.roleCode });
  let plans: CarePlanService;
  let store: ManagementStore;
  let rota: RotaService;
  const revision = () => plans.read(clientId)!.revision;
  const plan = () => structuredClone(plans.read(clientId)!.versions[0]);
  const manager = () =>
    actor.set({ ...DEMO_USER, id: 'independent-manager', name: 'Demo Manager', roleCode: 'RM' });
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    const auth = TestBed.inject(AuthService);
    auth.signInDemoSession();
    TestBed.inject(WorkspaceService).switchWorkspace(workspace);
    actor.set({ ...DEMO_USER, roleCode: 'CA' });
    vi.spyOn(auth, 'currentUser').mockImplementation(() => actor());
    plans = TestBed.inject(CarePlanService);
    store = TestBed.inject(ManagementStore);
    rota = TestBed.inject(RotaService);
    expect(
      rota.saveClient({
        id: clientId,
        name: 'Demo Person',
        reference: 'DEMO-CP',
        address: 'Demo Road',
        postcode: 'HA1 1AA',
        active: true,
        funding: 'Private',
        priority: 'Standard',
        file: emptyClientFile(),
      }),
    ).toBeNull();
    expect(plans.initialise(clientId, workspace)).toBeNull();
  });
  function threeSections(): PlanVersion {
    const draft = plan();
    draft.confirmed = true;
    draft.capacity['concerns'] = 'No';
    draft.capacity['decision'] = 'Understands personal care support.';
    draft.packageDecision = 'No change';
    draft.qualityReview =
      'Reviewed the available sections and deferred areas for the frontend demonstration.';
    draft.sections.slice(0, 3).forEach((section) => {
      section.complete = true;
      Object.keys(section.fields).forEach(
        (key) => (section.fields[key] = `Reviewed ${section.name}.`),
      );
      section.visibility = { staff: true, family: true, inspector: true };
    });
    draft.sections[1].fields['assistance'] = 'Support washing and dressing.';
    draft.sections[1].fields['actions'] = 'Encourage independent choices.';
    draft.sections[3].fields['situation'] = 'DEFERRED-CONTENT-NOT-FOR-PDF';
    return draft;
  }
  function approveDemo() {
    const draft = threeSections();
    draft.demoScope = 'available-sections';
    expect(plans.commit(clientId, workspace, draft, revision(), 'submit')).toBeNull();
    manager();
    expect(
      plans.commit(clientId, workspace, plan(), revision(), 'approve', '', {
        name: actor().name,
        confirmed: true,
      }),
    ).toBeNull();
    return plan();
  }
  it('requires explicit partial scope, preserves deferred sections and records independent signed demo approval', () => {
    const draft = threeSections();
    expect(plans.commit(clientId, workspace, draft, revision(), 'submit')).toContain(
      'complete every required section',
    );
    draft.demoScope = 'available-sections';
    expect(plans.commit(clientId, workspace, draft, revision(), 'submit')).toBeNull();
    expect(
      plan()
        .sections.slice(3)
        .every((section) => !section.complete && section.required),
    ).toBe(true);
    expect(plans.commit(clientId, workspace, plan(), revision(), 'approve')).toContain(
      'different manager',
    );
    manager();
    expect(plans.commit(clientId, workspace, plan(), revision(), 'approve')).toContain(
      'demonstration signature',
    );
    expect(
      plans.commit(clientId, workspace, plan(), revision(), 'approve', '', {
        name: 'Another person',
        confirmed: true,
      }),
    ).toContain('signed-in name');
    expect(
      plans.commit(clientId, workspace, plan(), revision(), 'approve', '', {
        name: 'Demo Manager',
        confirmed: true,
      }),
    ).toBeNull();
    const approved = plan();
    expect(approved.demoSignature?.userId).toBe(actor().id);
    expect(approved.events.at(-1)?.detail).toContain('14 care areas deferred');
    expect(approvedInstructions(plans.care.client(clientId)!, 'staff')).toHaveLength(3);
    const pdf = createCarePlanPdf(approved).output();
    expect(pdf).toContain('PARTIAL DEMO');
    expect(pdf).toContain('Demonstration signature');
    expect(pdf).toContain('Demo Manager');
    expect(pdf).not.toContain('DEFERRED-CONTENT-NOT-FOR-PDF');
    const before = JSON.stringify(approved);
    expect(plans.commit(clientId, workspace, approved, revision(), 'save')).toContain('immutable');
    expect(JSON.stringify(plan())).toBe(before);
  });
  it('prevents changing the submitted scope and clears a signature when starting the next review', () => {
    const approved = approveDemo();
    const changed = plan();
    changed.demoScope = undefined;
    expect(plans.commit(clientId, workspace, changed, revision(), 'save')).toContain('immutable');
    expect(plans.commit(clientId, workspace, approved, revision(), 'review')).toBeNull();
    expect(plan().demoSignature).toBeUndefined();
    expect(plan().status).toBe('Draft');
    expect(plans.read(clientId)!.versions.find((p) => p.id === approved.id)?.demoSignature).toEqual(
      approved.demoSignature,
    );
  });
  it('tracks authorised handoffs through the rota queue without mutating calls, visits or approved content', () => {
    const draft = threeSections();
    draft.packageDecision = 'Change required';
    draft.packageProposal = 'Demonstrate a longer morning call.';
    expect(plans.commit(clientId, workspace, draft, revision(), 'save')).toBeNull();
    expect(plans.commit(clientId, workspace, plan(), revision(), 'package')).toContain(
      'different manager',
    );
    manager();
    const calls = JSON.stringify(rota.data().calls);
    const visits = JSON.stringify(rota.data().visits);
    expect(plans.commit(clientId, workspace, plan(), revision(), 'package')).toBeNull();
    const id = plans.read(clientId)!.packageHandoffs![0].id;
    expect(plans.advancePackageHandoff(clientId, workspace, id, revision() - 1, '')).toContain(
      'changed',
    );
    expect(plans.advancePackageHandoff(clientId, workspace, id, revision(), '')).toBeNull();
    expect(plans.read(clientId)!.packageHandoffs![0].status).toBe('Awaiting rota update');
    expect(plans.advancePackageHandoff(clientId, workspace, id, revision(), '')).toContain(
      'outcome',
    );
    expect(
      plans.advancePackageHandoff(
        clientId,
        workspace,
        id,
        revision(),
        'Demo update reviewed; call length remains unchanged.',
      ),
    ).toBeNull();
    expect(plans.read(clientId)!.packageHandoffs![0].events.map((e) => e.action)).toEqual([
      'Authorised',
      'Awaiting rota update',
      'Completed',
    ]);
    expect(JSON.stringify(rota.data().calls)).toBe(calls);
    expect(JSON.stringify(rota.data().visits)).toBe(visits);
  });
  it('records version-linked task evidence, rejects forged tasks and restricts carers to assigned visits', () => {
    const approved = approveDemo();
    const staff = store.staff()[0];
    const visit: RotaVisit = {
      id: 'demo-task-visit',
      callId: 'demo-call',
      clientId,
      clientName: 'Demo Person',
      address: 'Demo Road',
      callName: 'Personal care',
      date: '2026-11-02',
      start: '08:00',
      end: '08:30',
      carers: 1,
      skills: [],
      tasks: 'Washing and dressing',
      staffIds: [staff.id],
      allocation: 'Regular',
      state: 'Published',
      priority: 'Standard',
      attendance: [],
      exception: '',
    };
    store.saveWorkspace((data) => ({ ...data, rota: { ...data.rota!, visits: [visit] } }));
    const tasks = carePlanVisitTasks(plans.care.client(clientId)!, visit);
    expect(tasks.length).toBeGreaterThan(0);
    expect(
      tasks.every((task) => task.planVersionId === approved.id && task.section === 'Personal Care'),
    ).toBe(true);
    const ecm = TestBed.inject(EcmService);
    const input = {
      type: 'Care note' as const,
      note: 'Reviewed task results.',
      photo: '',
      photoName: '',
      taskResults: [{ ...tasks[0], outcome: 'Concern' as const, note: '' }],
    };
    expect(ecm.evidence(visit.id, input, false)).toContain('explain');
    input.taskResults[0].note = 'Washing support took longer. Review call length.';
    expect(
      ecm.evidence(
        visit.id,
        { ...input, taskResults: [{ ...input.taskResults[0], instruction: 'Forged instruction' }] },
        false,
      ),
    ).toContain('changed');
    actor.set({ ...DEMO_USER, roleCode: 'CW', email: 'unassigned@example.test' });
    expect(ecm.canCaptureEvidence(visit.id)).toBe(false);
    expect(ecm.evidence(visit.id, input, false)).toContain('assigned carer');
    actor.set({ ...DEMO_USER, roleCode: 'CW', email: staff.email });
    expect(ecm.canCaptureEvidence(visit.id)).toBe(true);
    expect(ecm.evidence(visit.id, input, false)).toBeNull();
    expect(ecm.data().evidence.at(-1)?.taskResults?.[0].planVersionId).toBe(approved.id);
    expect(ecm.data().evidence.at(-1)?.taskResults?.[0].note).toContain('call length');
    expect(plan().events).toEqual(approved.events);
  });
});
