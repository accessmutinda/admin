import { TestBed } from '@angular/core/testing';
import { CarePlanMobility } from './care-plan-mobility';
import { PLAN_FIELDS, seedCarePlan } from './care-plan.models';
import { RotaClient } from '../rota/rota.models';
import { emptyClientFile } from '../clients/client-file.models';
import { demoCareDocument } from '../../../demo/care-demo-profiles';
import { seededAssessment } from './care-plan-assessment.models';

describe('Reference Mobility care area', () => {
  async function setup(editable = true) {
    const client: RotaClient = {
      id: 'mobility-test',
      name: 'Mary Wilson',
      reference: 'CV001',
      address: '25 Test Road',
      postcode: 'HA1 1AA',
      funding: 'Private',
      priority: 'Standard',
      active: true,
      file: emptyClientFile(),
    };
    client.file!.entries['incidents'] = [
      {
        id: 'incident-1',
        name: 'Change in mobility',
        detail: 'A fictional change was reported; supervisor informed.',
        date: '2026-10-20',
        status: 'Active',
        level: 'Medium',
      },
    ];
    client.file!.entries['risks'] = [
      {
        id: 'risk-1',
        name: 'Falls risk',
        detail: 'Recorded mobility support',
        date: '2026-10-21',
        status: 'Active',
        level: 'Medium',
      },
    ];
    const plan = seedCarePlan(client).versions[0];
    for (const [key] of PLAN_FIELDS) plan.sections[2].fields[key] = 'Recorded ' + key;
    plan.sections[2].fields['changes'] = 'No change';
    plan.sections[2].review = '2027-01-26';
    plan.sections[2].complete = true;
    plan.assessments = [seededAssessment('Falls / Moving & Handling', '2027-01-26')];
    const approved = structuredClone(plan);
    approved.status = 'Approved';
    approved.approvedAt = '2026-10-26T09:00:00Z';
    const docs = [
      demoCareDocument(
        'ot',
        'Occupational Therapy Report.pdf',
        'Mobility assessment',
        '2026-11-01',
      ),
      demoCareDocument('risk', 'Risk Assessment - Mobility.pdf', 'Assessment', '2026-11-01'),
      demoCareDocument('consent', 'Consent.pdf', 'Consent', '2026-11-01'),
    ];
    const fixture = TestBed.createComponent(CarePlanMobility);
    for (const [name, value] of Object.entries({
      client,
      plan,
      approved,
      previous: approved.sections[2],
      editable,
      manager: editable,
      documents: docs,
      actor: 'Review manager',
    }))
      fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, plan, client, approved };
  }
  it('renders the nine reference blocks, seven formatted editors, supporting and linked rows', async () => {
    const { fixture } = await setup();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelectorAll('cv-care-plan-rich-text')).toHaveLength(7);
    expect(page.querySelectorAll('.supporting-documents .linked-row')).toHaveLength(2);
    expect(page.querySelectorAll('.linked-records .linked-row')).toHaveLength(3);
    for (const label of [
      '4. Care plan required?',
      '9. Review information',
      'AI Suggestion',
      'Save as Draft',
      'Save Section',
    ])
      expect(page.textContent).toContain(label);
  });
  it('keeps plain and formatted wording together and invalidates section completion', async () => {
    const { component, plan, client } = await setup();
    component.changeRich('situation', {
      text: 'My confirmed current mobility',
      html: '<b>My confirmed current mobility</b>',
    });
    expect(plan.sections[2].fields['situation']).toBe('My confirmed current mobility');
    expect(component.richHtml('situation')).toContain('<b>');
    expect(plan.sections[2].complete).toBe(false);
    expect(client.name).toBe('Mary Wilson');
    plan.sections[2].fields['situation'] = 'Voice wording accepted';
    expect(component.richHtml('situation')).toBe('');
  });
  it('binds No as a boolean and preserves recorded wording when support is not required', async () => {
    const { fixture, component } = await setup();
    const no = fixture.nativeElement.querySelectorAll('input[type=radio]')[1] as HTMLInputElement;
    no.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.section.required).toBe(false);
    expect(component.section.fields['situation']).toBe('Recorded situation');
  });
  it('keeps an empty changes field editable and validates notes and review dates before save', async () => {
    const { component, fixture } = await setup();
    const dropdown = fixture.nativeElement.querySelector(
      '.review-grid select',
    ) as HTMLSelectElement;
    dropdown.value = 'Changes recorded';
    dropdown.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.changesStatus).toBe('Changes recorded');
    expect(fixture.nativeElement.querySelector('.review-notes textarea')).toBeTruthy();
    component.save(false);
    expect(component.error()).toContain('Describe the changes');
    component.setReviewNotes('Reviewed with the person');
    component.setLastReview('bad');
    component.save(false);
    expect(component.error()).toContain('valid review dates');
    component.setLastReview('2027-02-01');
    component.save(false);
    expect(component.error()).toContain('on or after');
    component.setLastReview('2026-10-26');
    component.setChanges('No change');
    expect(component.section.fields['changes']).toBe('No change');
  });
  it('uses the recorded incident as evidence and applies only after explicit acceptance', async () => {
    const { component, plan } = await setup();
    const before = plan.sections[2].fields['situation'];
    expect(component.suggestion).toContain('linked incident');
    expect(component.section.fields['changes']).toBe('No change');
    component.applySuggestion();
    expect(component.section.fields['changes']).toContain('linked incident');
    expect(component.section.fields['situation']).toBe(before);
    expect(component.history.at(-1)?.by).toBe('Review manager');
    const count = component.history.length;
    component.applySuggestion();
    expect(component.history).toHaveLength(count);
    expect(plan.status).toBe('Draft');
    expect(component.section.complete).toBe(false);
  });
  it('routes draft and completion actions independently without publishing', async () => {
    const { component } = await setup();
    const actions: string[] = [];
    component.action.subscribe((a) => actions.push(a));
    component.save(false);
    component.save(true);
    expect(actions).toEqual(['save', 'complete']);
    expect(component.plan().status).toBe('Draft');
  });
  it('keeps approved wording, review metadata and AI actions read only', async () => {
    const { fixture, component } = await setup(false);
    const before = JSON.stringify(component.plan());
    component.applySuggestion();
    component.changeRich('situation', { text: 'Changed', html: 'Changed' });
    component.setLastReview('2026-01-01');
    component.save(true);
    expect(JSON.stringify(component.plan())).toBe(before);
    expect(fixture.nativeElement.querySelector('.save-actions button')).toBeNull();
    expect(
      [...fixture.nativeElement.querySelectorAll('.editor-content')].every(
        (e: any) => e.getAttribute('contenteditable') === 'false',
      ),
    ).toBe(true);
  });
  it('opens actual supporting documents and linked assessments, and reveals section history', async () => {
    const { fixture, component } = await setup();
    const documents: string[] = [];
    const records: string[] = [];
    component.documentView.subscribe((id) => documents.push(id));
    component.linked.subscribe((record) => records.push(record.kind));
    fixture.nativeElement.querySelector('.supporting-documents .linked-row button').click();
    fixture.nativeElement.querySelector('.linked-records .linked-row button').click();
    expect(documents).toEqual(['ot']);
    expect(records).toEqual(['assessment']);
    const history = [...fixture.nativeElement.querySelectorAll('button')].find((b: any) =>
      b.textContent.includes('View History'),
    ) as HTMLButtonElement;
    history.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Previous approved wording');
  });
  it('stores the displayed last review date and recognises section-tagged supporting documents', async () => {
    const { fixture, component } = await setup();
    component.save(false);
    expect(component.section.fields['lastReview']).toBe('2026-10-26');
    const document = demoCareDocument('uploaded', 'Follow-up.pdf', 'Other', '2026-11-01');
    document.description = 'Supporting document for the Mobility care-plan section.';
    fixture.componentRef.setInput('documents', [document]);
    fixture.detectChanges();
    expect(component.supporting.map((d) => d.id)).toEqual(['uploaded']);
  });
});
