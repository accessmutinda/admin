import { TestBed } from '@angular/core/testing';
import { CarePlanAboutMeEditor } from './care-plan-about-me-editor';
import { PlanVersion, seedCarePlan } from './care-plan.models';
import { RotaClient } from '../rota/rota.models';
import { emptyClientFile } from '../clients/client-file.models';

describe('About Me reference edit workflow', () => {
  const client: RotaClient = {
    id: 'edit-about',
    name: 'Mary Wilson',
    reference: 'CV001',
    address: '25 Test Road',
    postcode: 'HA1 1AA',
    funding: 'Private',
    priority: 'Standard',
    active: true,
    file: emptyClientFile(),
  };
  async function setup(manager = true) {
    const plan = seedCarePlan(client).versions[0];
    plan.details['dob'] = '1942-07-19';
    plan.sections[0].fields['situation'] = 'I enjoy familiar routines.';
    const fixture = TestBed.createComponent(CarePlanAboutMeEditor);
    fixture.componentRef.setInput('plan', plan);
    fixture.componentRef.setInput('client', structuredClone(client));
    fixture.componentRef.setInput('manager', manager);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, plan };
  }
  it('uses three About Me steps and the reference card and action layout', async () => {
    const { fixture } = await setup();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.edit-stepper button')).toHaveLength(3);
    expect(root.textContent).toContain('Personal Information');
    expect(root.textContent).toContain('Confirm All');
    expect(root.textContent).toContain('Save Changes');
    expect(root.textContent).not.toContain('Passport');
    expect(root.textContent).not.toContain('Participation');
    expect(root.querySelectorAll('.contact-edit-grid article')).toHaveLength(6);
  });
  it('enables only the card being edited and binds changes to an isolated draft', async () => {
    const { fixture, component, plan } = await setup();
    const input = fixture.nativeElement.querySelector('.field-name input') as HTMLInputElement;
    expect(input.closest('fieldset')!.disabled).toBe(true);
    (fixture.nativeElement.querySelector('.personal-card button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(input.closest('fieldset')!.disabled).toBe(false);
    input.value = 'Mary preferred name';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.draft.details['name']).toBe('Mary preferred name');
    expect(plan.details['name']).toBe('Mary Wilson');
    expect(component.client().name).toBe('Mary Wilson');
    expect(component.dirty).toBe(true);
  });
  it('emits a valid changed version only when Save Changes is selected', async () => {
    const { component, plan } = await setup();
    let saved: PlanVersion | undefined;
    component.saved.subscribe((p) => (saved = p));
    component.draft.sections[0].fields['matters'] = 'Being heard and respected';
    component.changed();
    expect(saved).toBeUndefined();
    component.save();
    expect(saved?.sections[0].fields['matters']).toBe('Being heard and respected');
    expect(plan.sections[0].fields['matters']).not.toBe('Being heard and respected');
    expect(saved?.sections[0].complete).toBe(false);
  });
  it('validates existing required personal data before saving or confirming', async () => {
    const { component } = await setup();
    let saved = false;
    component.saved.subscribe(() => (saved = true));
    component.draft.details['dob'] = 'bad-date';
    component.changed();
    component.save();
    expect(component.error()).toContain('valid date of birth');
    expect(saved).toBe(false);
    component.confirmAll();
    expect(component.confirmed()).toEqual([]);
  });
  it('preserves edits when discard is declined and cancels only after confirmation', async () => {
    const { component, plan } = await setup();
    let cancelled = false;
    component.cancelled.subscribe(() => (cancelled = true));
    component.draft.details['name'] = 'Changed';
    component.changed();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.cancel();
    expect(cancelled).toBe(false);
    confirm.mockReturnValue(true);
    component.cancel();
    expect(cancelled).toBe(true);
    expect(plan.details['name']).toBe('Mary Wilson');
    confirm.mockRestore();
  });
  it('keeps only the selected step visible and locks disclosure for non-managers', async () => {
    const { fixture, component } = await setup(false);
    component.switchStep(1);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.narrative-edit-grid')[0].children).toHaveLength(
      6,
    );
    expect(fixture.nativeElement.querySelector('.personal-card')).toBeNull();
    component.switchStep(2);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(
      [...fixture.nativeElement.querySelectorAll('[role=switch]')].every((e: any) => e.disabled),
    ).toBe(true);
    expect(fixture.nativeElement.querySelector('[aria-current=step]').textContent).toContain(
      'Review & Visibility',
    );
  });
  it('confirms the current step without publishing or completing the care section', async () => {
    const { component } = await setup();
    component.section.complete = false;
    component.confirmAll();
    expect(component.confirmed()).toEqual([0]);
    expect(component.draft.confirmed).toBe(true);
    expect(component.section.complete).toBe(false);
    expect(component.draft.status).toBe('Draft');
    component.switchStep(1);
    component.draft.sections[0].fields['family'] = 'My family matters';
    component.changed();
    expect(component.confirmed()).toEqual([0]);
  });
  it('opens contacts as source records without creating duplicate contact editors', async () => {
    const { fixture, component } = await setup();
    let opened = false;
    component.sourceContacts.subscribe(() => (opened = true));
    (fixture.nativeElement.querySelector('.contacts-card button') as HTMLButtonElement).click();
    expect(opened).toBe(true);
    expect(
      [...fixture.nativeElement.querySelectorAll('.contact-fields input')].every(
        (e: any) => e.readOnly,
      ),
    ).toBe(true);
  });
});
