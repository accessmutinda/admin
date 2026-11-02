import { TestBed } from '@angular/core/testing';
import { CarePlanAboutMe } from './care-plan-about-me';
import { seedCarePlan } from './care-plan.models';
import { RotaClient } from '../rota/rota.models';
import { emptyClientFile } from '../clients/client-file.models';

describe('About Me reference screen', () => {
  const client: RotaClient = {
    id: 'about-test',
    name: 'Mary Wilson',
    reference: 'CV001',
    address: '25 Test Road',
    postcode: 'HA1 1AA',
    funding: 'Private',
    priority: 'Standard',
    active: true,
    file: emptyClientFile(),
  };
  function setup(editable = true, manager = true) {
    const fixture = TestBed.createComponent(CarePlanAboutMe);
    fixture.componentRef.setInput('client', structuredClone(client));
    fixture.componentRef.setInput('plan', seedCarePlan(client).versions[0]);
    fixture.componentRef.setInput('editable', editable);
    fixture.componentRef.setInput('manager', manager);
    fixture.detectChanges();
    return fixture;
  }
  it('shows the reference field groups, contact cards, sidebar and footer', () => {
    const fixture = setup();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.details-grid label').length).toBe(11);
    expect(root.querySelectorAll('.story-grid')[0].children.length).toBe(6);
    expect(root.querySelectorAll('.contact').length).toBe(6);
    expect(root.textContent).toContain('Visibility Settings');
    expect(root.textContent).toContain('Next: Personal Care');
    expect(root.querySelectorAll('[role=switch]').length).toBe(3);
  });
  it('updates the version snapshot, preserves the service-user source and invalidates completion', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    component.section.complete = true;
    component.change('name', 'Preferred recorded name');
    component.storyChange('matters', 'My family and my independence');
    expect(component.plan().details['name']).toBe('Preferred recorded name');
    expect(component.client().name).toBe('Mary Wilson');
    expect(component.section.complete).toBe(false);
    expect(component.value('clientId')).toBe('CV001');
  });
  it('routes contact actions to the source and keeps voice and AI actions actionable', () => {
    const fixture = setup();
    const actions: string[] = [];
    fixture.componentInstance.action.subscribe((a) => actions.push(a));
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('.contact button') as HTMLButtonElement).click();
    [...root.querySelectorAll<HTMLButtonElement>('.heading-actions button')]
      .find((b) => b.textContent?.includes('Record by Voice'))!
      .click();
    (root.querySelector('.quick .ai') as HTMLButtonElement).click();
    expect(actions).toEqual(['contacts', 'voice', 'improve']);
  });
  it('keeps approved versions read only and restricts visibility to managers', async () => {
    const fixture = setup(false, false);
    await fixture.whenStable();
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.change('name', 'Changed');
    component.storyChange('situation', 'Changed');
    expect(component.plan().details['name']).toBe('Mary Wilson');
    expect(
      [...fixture.nativeElement.querySelectorAll('[role=switch]')].every((e: any) => e.disabled),
    ).toBe(true);
    expect(fixture.nativeElement.querySelector('.photo-panel button').disabled).toBe(true);
  });
  it('records internal notes with actor and audit event and requests persistence', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    const actions: string[] = [];
    component.action.subscribe((a) => actions.push(a));
    component.note = 'Confirm language preference at next review';
    component.addNote();
    expect(component.section.fields['internalNotes']).toContain('Confirm language preference');
    expect(component.history.at(-1)?.action).toBe('Internal note added');
    expect(actions).toEqual(['save']);
    expect(component.note).toBe('');
  });
  it('removes a care-plan photo without removing the service-user photo', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    component.client().file!.photo = 'data:image/png;base64,source';
    expect(component.photo).toContain('source');
    component.change('aboutPhoto', '');
    expect(component.photo).toBe('');
    expect(component.client().file!.photo).toContain('source');
  });
  it('keeps switches locked for editors who cannot approve', async () => {
    const fixture = setup(true, false);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(
      [...fixture.nativeElement.querySelectorAll('[role=switch]')].every((e: any) => e.disabled),
    ).toBe(true);
    expect(fixture.nativeElement.querySelector('.photo-panel button').disabled).toBe(false);
  });
  it('rejects unsupported photo uploads without changing the snapshot', async () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    const file = new File(['document'], 'document.txt', { type: 'text/plain' });
    await component.upload({
      target: { files: [file], value: 'document.txt' },
    } as unknown as Event);
    expect(component.photoError()).toContain('JPG, PNG or WebP');
    expect(component.plan().details['aboutPhoto']).toBeUndefined();
  });
  it('saves formatted introduction with plain care wording and refreshes after AI changes', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    const editor = document.createElement('div');
    editor.innerHTML = '<b>My family</b> matters to me';
    component.updateIntroduction(editor);
    expect(component.section.fields['situation']).toBe('My family matters to me');
    expect(component.introductionHtml).toContain('<b>My family</b>');
    component.storyChange('situation', 'AI wording accepted');
    expect(component.introductionHtml).toBe('AI wording accepted');
  });
  it('preserves the active editor DOM while typing so the caret is not reset', () => {
    const fixture = setup();
    const editor = fixture.nativeElement.querySelector('.rich-introduction') as HTMLElement;
    editor.dispatchEvent(new Event('focus'));
    editor.innerHTML = '<b>My words</b>';
    const textNode = editor.firstChild;
    editor.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(editor.firstChild).toBe(textNode);
    expect(fixture.componentInstance.section.fields['situation']).toBe('My words');
    editor.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(editor.innerHTML).toBe('<b>My words</b>');
  });
  it('includes saved personal detail changes in section status and history', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    component.plan().events.push({
      at: '2026-11-01T09:00:00Z',
      by: 'Review manager',
      action: 'save',
      detail: JSON.stringify([
        { field: 'details', previous: { name: 'Mary Wilson' }, current: { name: 'Mary' } },
      ]),
    });
    expect(component.updated?.by).toBe('Review manager');
    expect(component.history.at(-1)?.action).toBe('save');
  });
});
