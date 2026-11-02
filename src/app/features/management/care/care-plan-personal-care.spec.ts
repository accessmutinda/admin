import { TestBed } from '@angular/core/testing';
import { CarePlanPersonalCare } from './care-plan-personal-care';
import { PLAN_FIELDS, seedCarePlan } from './care-plan.models';
import { PERSONAL_ASSISTANCE, PERSONAL_EQUIPMENT } from './care-plan-personal-care.models';
import { RotaClient } from '../rota/rota.models';
import { emptyClientFile } from '../clients/client-file.models';
import { seededAssessment } from './care-plan-assessment.models';

describe('Personal Care first-design workflow', () => {
  async function setup(editable = true) {
    const client: RotaClient = {
      id: 'personal-test',
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
        id: 'skin',
        name: 'Personal hygiene concern',
        detail: 'Recorded personal care follow-up',
        date: '2026-10-20',
        status: 'Active',
        level: 'Medium',
      },
      {
        id: 'mobility',
        name: 'Mobility concern',
        detail: 'Walking support',
        date: '2026-10-21',
        status: 'Active',
        level: 'Medium',
      },
    ];
    const plan = seedCarePlan(client).versions[0];
    for (const [key] of PLAN_FIELDS) plan.sections[1].fields[key] = 'Recorded ' + key;
    plan.sections[1].fields['assistance'] = PERSONAL_ASSISTANCE[0] + '\nExisting agreed support';
    plan.sections[1].fields['equipment'] =
      PERSONAL_EQUIPMENT[0] + '\nExisting assessed instructions';
    plan.sections[1].fields['reviewOutcome'] = 'No significant change';
    plan.sections[1].review = '2027-01-26';
    plan.sections[1].complete = true;
    plan.assessments = [seededAssessment('Skin / pressure', '2027-01-26')];
    const approved = structuredClone(plan);
    approved.status = 'Approved';
    approved.approvedAt = '2026-10-26T09:00:00Z';
    const fixture = TestBed.createComponent(CarePlanPersonalCare);
    for (const [name, value] of Object.entries({
      plan,
      client,
      approved,
      previous: approved.sections[1],
      editable,
      manager: editable,
      completed: 7,
      actor: 'Review manager',
    }))
      fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, plan, client, approved };
  }
  it('renders the first image’s twelve form cells and three sidebar panels without replacing the fixed header', async () => {
    const { fixture } = await setup();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelectorAll('.care-grid>.care-field')).toHaveLength(12);
    expect(page.querySelectorAll('.care-sidebar>section')).toHaveLength(3);
    expect(page.querySelectorAll('.assistance .option')).toHaveLength(5);
    expect(page.querySelectorAll('.equipment .option')).toHaveLength(4);
    expect(page.querySelector('.care-field.risks')).toBeTruthy();
    expect(page.querySelector('.care-field.goal')).toBeTruthy();
    expect(page.querySelector('.care-field.review-outcome')).toBeTruthy();
    expect(page.querySelector('cv-care-plan-identity-header')).toBeNull();
    expect(page.textContent).toContain('Voice Transcript');
  });
  it('updates checkboxes without deleting existing assistance/equipment instructions', async () => {
    const { component } = await setup();
    component.toggle('assistance', PERSONAL_ASSISTANCE[1], true);
    component.toggle('assistance', PERSONAL_ASSISTANCE[0], false);
    expect(component.selected('assistance', PERSONAL_ASSISTANCE[1])).toBe(true);
    expect(component.selected('assistance', PERSONAL_ASSISTANCE[0])).toBe(false);
    expect(component.additional('assistance')).toBe('Existing agreed support');
    component.toggle('equipment', PERSONAL_EQUIPMENT[1], true);
    component.updateAdditional('equipment', 'Updated assessed instructions');
    expect(component.selected('equipment', PERSONAL_EQUIPMENT[0])).toBe(true);
    expect(component.section.fields['equipment']).toContain('Updated assessed instructions');
    expect(component.section.complete).toBe(false);
  });
  it('edits a candidate separately and changes care wording only after explicit acceptance', async () => {
    const { component, plan } = await setup();
    const before = component.section.fields['situation'];
    component.updateTranscript('A new supervisor transcript.');
    component.generate();
    expect(component.section.fields['situation']).toBe(before);
    component.updateProposal('I need the support agreed in my review.');
    expect(component.section.fields['situation']).toBe(before);
    component.accept();
    expect(component.section.fields['situation']).toBe('I need the support agreed in my review.');
    expect(component.decision()).toBe('Accepted');
    expect(component.history.at(-1)?.by).toBe('Review manager');
    expect(plan.status).toBe('Draft');
    expect(component.section.complete).toBe(false);
  });
  it('rejects proposals without altering clinical fields and invalidates stale proposals after a transcript edit', async () => {
    const { component } = await setup();
    const before = Object.fromEntries(
      PLAN_FIELDS.map(([key]) => [key, component.section.fields[key]]),
    );
    component.generate();
    component.updateTranscript('Different transcript');
    expect(component.decision()).toBe('Needs regeneration');
    component.reject();
    expect(component.decision()).toBe('Rejected');
    expect(
      Object.fromEntries(PLAN_FIELDS.map(([key]) => [key, component.section.fields[key]])),
    ).toEqual(before);
  });
  it('validates review outcome and pending AI decisions before completing, while draft saves remain available', async () => {
    const { component } = await setup();
    const actions: string[] = [];
    component.action.subscribe((action) => actions.push(action));
    component.setField('reviewOutcome', 'Not reviewed');
    component.save(false);
    expect(actions).toEqual(['save']);
    component.save(true);
    expect(component.error()).toContain('review outcome');
    component.setField('reviewOutcome', 'No significant change');
    component.generate();
    component.save(true);
    expect(component.error()).toContain('pending AI');
    component.reject();
    component.save(true);
    expect(actions).toEqual(['save', 'complete']);
    expect(component.section.fields['lastReview']).toBe('2026-10-26');
  });
  it('stores required No as a boolean, retains notes, and exposes related-record/navigation actions', async () => {
    const { fixture, component } = await setup();
    const before = component.section.fields['assistance'];
    component.setRequired(false);
    expect(component.section.required).toBe(false);
    expect(component.outcome).toBe('Care plan not required');
    expect(component.section.fields['assistance']).toBe(before);
    const actions: string[] = [];
    component.action.subscribe((action) => actions.push(action));
    const page = fixture.nativeElement as HTMLElement;
    page
      .querySelectorAll<HTMLButtonElement>('.section-context nav button')
      .forEach((button) => button.click());
    page
      .querySelectorAll<HTMLButtonElement>('.related-records button')
      .forEach((button) => button.click());
    expect(actions).toEqual(['previous', 'next', 'skin', 'body', 'incidents']);
    expect(component.incidents.map((entry) => entry.id)).toEqual(['skin']);
  });
  it('protects approved care wording, AI decisions, transcript and disclosure controls', async () => {
    const { fixture, component } = await setup(false);
    const before = JSON.stringify(component.plan());
    component.setField('situation', 'Changed');
    component.toggle('equipment', PERSONAL_EQUIPMENT[1], true);
    component.generate();
    component.accept();
    component.reject();
    component.updateTranscript('Changed');
    component.save(true);
    expect(JSON.stringify(component.plan())).toBe(before);
    expect(fixture.nativeElement.querySelector('.section-footer>div button')).toBeNull();
    expect(
      [...fixture.nativeElement.querySelectorAll('.care-grid textarea')].every(
        (control: any) => control.disabled || control.closest('fieldset')?.disabled,
      ),
    ).toBe(true);
  });
  it('does not include an unrelated Mobility-only change in Personal Care history', async () => {
    const { component } = await setup();
    const before = structuredClone(component.plan().sections);
    const after = structuredClone(before);
    after[2].fields['situation'] = 'Changed Mobility';
    component.plan().events.push({
      at: '2026-11-01T09:00:00Z',
      by: 'Manager',
      action: 'save',
      detail: JSON.stringify([{ field: 'sections', previous: before, current: after }]),
    });
    expect(component.history).toHaveLength(0);
    after[1].fields['preferences'] = 'Changed preference';
    component.plan().events.push({
      at: '2026-11-01T10:00:00Z',
      by: 'Manager',
      action: 'save',
      detail: JSON.stringify([{ field: 'sections', previous: before, current: after }]),
    });
    expect(component.history).toHaveLength(1);
  });
  it('records recognised speech into the draft transcript and stops capture on destruction', async () => {
    const { fixture, component } = await setup();
    const previous = Object.getOwnPropertyDescriptor(window, 'SpeechRecognition');
    let capture: any;
    class FakeSpeech {
      start = vi.fn();
      stop = vi.fn();
      onresult: any;
      onend: any;
      onerror: any;
      constructor() {
        capture = this;
      }
    }
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: FakeSpeech });
    try {
      component.toggleRecording();
      expect(capture.start).toHaveBeenCalledOnce();
      capture.onresult({
        resultIndex: 0,
        results: [
          Object.assign([{ transcript: 'The person confirmed their washing preference.' }], {
            isFinal: true,
          }),
        ],
      });
      expect(component.section.fields['personalVoiceTranscript']).toContain('washing preference');
      fixture.destroy();
      expect(capture.stop).toHaveBeenCalled();
      expect(capture.onresult).toBeNull();
    } finally {
      fixture.destroy();
      if (previous) Object.defineProperty(window, 'SpeechRecognition', previous);
      else delete (window as any).SpeechRecognition;
    }
  });
  it('provides a manual transcript path when browser recognition is unavailable', async () => {
    const { component, fixture } = await setup();
    const saved = Object.getOwnPropertyDescriptor(window, 'SpeechRecognition');
    const webkit = Object.getOwnPropertyDescriptor(window, 'webkitSpeechRecognition');
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: undefined });
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      configurable: true,
      value: undefined,
    });
    try {
      component.toggleRecording();
      expect(component.transcriptEditing()).toBe(true);
      expect(component.notice()).toContain('Edit the transcript');
      expect(component.listening()).toBe(false);
    } finally {
      fixture.destroy();
      if (saved) Object.defineProperty(window, 'SpeechRecognition', saved);
      else delete (window as any).SpeechRecognition;
      if (webkit) Object.defineProperty(window, 'webkitSpeechRecognition', webkit);
      else delete (window as any).webkitSpeechRecognition;
    }
  });
  it('plays, pauses, seeks and cleans up transcript read-aloud without editing clinical data', async () => {
    const { component, fixture } = await setup();
    const before = JSON.stringify(component.plan());
    const synthBefore = Object.getOwnPropertyDescriptor(window, 'speechSynthesis');
    const utteranceBefore = Object.getOwnPropertyDescriptor(window, 'SpeechSynthesisUtterance');
    const synth = { speak: vi.fn(), pause: vi.fn(), resume: vi.fn(), cancel: vi.fn() };
    class FakeUtterance {
      constructor(public text: string) {}
    }
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: FakeUtterance,
    });
    try {
      component.togglePlayback();
      expect(synth.speak).toHaveBeenCalledOnce();
      expect(component.playback()).toBe('playing');
      component.togglePlayback();
      expect(synth.pause).toHaveBeenCalled();
      component.togglePlayback();
      expect(synth.resume).toHaveBeenCalled();
      component.seek(1);
      expect(synth.speak).toHaveBeenCalledTimes(2);
      component.seek(component.duration);
      expect(component.playback()).toBe('stopped');
      expect(synth.speak).toHaveBeenCalledTimes(2);
      expect(JSON.stringify(component.plan())).toBe(before);
      fixture.destroy();
      expect(synth.cancel).toHaveBeenCalled();
    } finally {
      fixture.destroy();
      if (synthBefore) Object.defineProperty(window, 'speechSynthesis', synthBefore);
      else delete (window as any).speechSynthesis;
      if (utteranceBefore)
        Object.defineProperty(window, 'SpeechSynthesisUtterance', utteranceBefore);
      else delete (window as any).SpeechSynthesisUtterance;
    }
  });
  it('preserves newer manual wording until a stale AI candidate is reviewed again', async () => {
    const { component } = await setup();
    component.generate();
    component.setField('situation', 'Newer wording confirmed with the person.');
    component.accept();
    expect(component.section.fields['situation']).toBe('Newer wording confirmed with the person.');
    expect(component.decision()).toBe('Needs regeneration');
    component.editProposal();
    component.updateProposal('Human-reviewed final wording.');
    component.accept();
    expect(component.section.fields['situation']).toBe('Human-reviewed final wording.');
  });
});
