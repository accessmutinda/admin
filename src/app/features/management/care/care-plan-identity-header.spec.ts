import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CarePlanIdentityHeader } from './care-plan-identity-header';
import { RotaClient } from '../rota/rota.models';
import { emptyClientFile } from '../clients/client-file.models';
import { seedCarePlan } from './care-plan.models';

describe('Fixed care-plan identity header', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));
  function setup() {
    const client: RotaClient = {
      id: 'identity-test',
      name: 'Mary Wilson',
      reference: 'CV001',
      address: '25 Test Road',
      postcode: 'HA1 1AA',
      funding: 'Private',
      priority: 'Standard',
      active: true,
      file: emptyClientFile(),
    };
    client.file!.details = { dob: '1942-07-19', nhs: '123 456 7890' };
    const plan = seedCarePlan(client).versions[0];
    plan.status = 'Approved';
    plan.version = '3.1';
    plan.approvedAt = '2026-10-26T10:00:00Z';
    plan.review = '2027-01-26';
    const fixture = TestBed.createComponent(CarePlanIdentityHeader);
    for (const [name, value] of Object.entries({
      client,
      plan,
      photo: 'data:image/png;base64,photo',
      canManage: true,
      canExport: true,
      canSave: true,
      hasWorkingReview: true,
    }))
      fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, client, plan };
  }
  it('uses the locked identity/actions/current-plan arrangement and reference labels', () => {
    const { fixture } = setup();
    const root = fixture.nativeElement as HTMLElement;
    const grid = root.querySelector('.identity-grid')!;
    expect([...grid.children].map((child) => child.className)).toEqual([
      'care-plan-person',
      'care-plan-header-actions',
      'care-plan-version',
    ]);
    expect(root.querySelector('.care-plan-person-title')?.textContent).toContain('Mary Wilson');
    expect(root.querySelector('.identity-status')?.textContent).toBe('Active');
    expect(root.querySelector('.identity-facts')?.textContent).toContain('DOB: 19/07/1942');
    expect(root.querySelector('.identity-facts')?.textContent).toContain('NHS No: 123 456 7890');
    expect(root.querySelector('.identity-facts')?.textContent).toContain('Client ID: CV001');
    expect(root.querySelector('.header-back')?.textContent).toContain('Back');
    const back = vi.fn();
    fixture.componentInstance.action.subscribe(back);
    root.querySelector<HTMLButtonElement>('.header-back')!.click();
    expect(back).toHaveBeenCalledWith('back');
    expect(root.querySelector('.care-plan-version')?.textContent).toContain('Version 3.1');
    expect(root.querySelector('.care-plan-version')?.textContent).toContain('26 Oct 2026');
    expect(root.querySelector('.care-plan-version')?.textContent).toContain('26 Jan 2027');
  });
  it('keeps Print, Share and More available and delegates menu actions without changing plan data', () => {
    const { fixture, component, plan } = setup();
    const actions: string[] = [];
    const before = JSON.stringify(plan);
    component.action.subscribe((action) => actions.push(action));
    const root = fixture.nativeElement as HTMLElement;
    const buttons = root.querySelectorAll<HTMLButtonElement>('.care-plan-header-actions>button');
    buttons[0].click();
    buttons[1].click();
    const menu = root.querySelector<HTMLDetailsElement>('details')!;
    menu.open = true;
    (root.querySelector('.more-actions button') as HTMLButtonElement).click();
    expect(actions).toEqual(['print', 'share', 'pdf']);
    expect(menu.open).toBe(false);
    expect(JSON.stringify(plan)).toBe(before);
    menu.open = true;
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(menu.open).toBe(false);
  });
  it('respects permissions while retaining the same three top controls', () => {
    const { fixture } = setup();
    for (const name of ['canManage', 'canExport', 'canSave'])
      fixture.componentRef.setInput(name, false);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.care-plan-header-actions>button')).toHaveLength(2);
    expect(root.querySelector('summary')?.textContent).toContain('More');
    expect(
      [...root.querySelectorAll<HTMLButtonElement>('.more-actions button')].every(
        (button) => button.disabled,
      ),
    ).toBe(true);
  });
  it('handles missing photo/plan and inactive clients without showing invented details', () => {
    const { fixture, client } = setup();
    client.active = false;
    fixture.componentRef.setInput('client', { ...client });
    fixture.componentRef.setInput('photo', '');
    fixture.componentRef.setInput('plan', undefined);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.care-plan-photo')).toBeNull();
    expect(root.querySelector('.care-plan-initials')?.textContent).toBe('MW');
    expect(root.querySelector('.identity-status')?.textContent).toBe('Inactive');
    expect(root.querySelector('.care-plan-version')?.textContent).toContain('No current plan');
    expect(root.querySelector('.more-actions')?.textContent).toContain('Create Care Plan');
  });
});
