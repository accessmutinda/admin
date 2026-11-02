import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CarePlanOverview } from './care-plan-overview';
import { RotaClient, RotaCall } from '../rota/rota.models';
import { seedCarePlan } from './care-plan.models';
import { emptyClientFile } from '../clients/client-file.models';

describe('Reference care-plan Overview dashboard', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));
  function setup() {
    const client: RotaClient = {
      id: 'overview-test',
      name: 'Mary Wilson',
      reference: 'CV001',
      address: '25 Test Road',
      postcode: 'HA1 1AA',
      funding: 'Private',
      priority: 'Standard',
      active: true,
      phone: '07700 900001',
      file: emptyClientFile(),
    };
    client.file!.details = {
      dob: '1942-07-19',
      preferredName: 'Mary',
      nhs: '123 456 7890',
      language: 'English',
      religion: 'Recorded preference',
    };
    client.file!.contacts = [
      {
        id: 'gp',
        type: 'GP',
        name: 'Demo Practice',
        relationship: 'GP',
        phone: '07700 900100',
        email: 'gp@example.test',
        nextOfKin: false,
      },
    ];
    const plan = seedCarePlan(client).versions[0];
    plan.sections[0].complete = true;
    plan.sections[1].complete = false;
    plan.sections[1].fields['situation'] = 'Support washing';
    plan.sections[2].complete = false;
    for (const key of Object.keys(plan.sections[2].fields)) plan.sections[2].fields[key] = '';
    const fixture = TestBed.createComponent(CarePlanOverview);
    fixture.componentRef.setInput('client', client);
    fixture.componentRef.setInput('plan', plan);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, plan, client };
  }
  it('renders the reference seven cards and all 17 clickable progress sections', () => {
    const { fixture } = setup();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelectorAll('.top-grid>.dashboard-card')).toHaveLength(4);
    expect(page.querySelectorAll('.middle-grid>.dashboard-card')).toHaveLength(3);
    expect(page.querySelectorAll('.progress-section')).toHaveLength(17);
    for (const name of [
      'Key Information',
      'Current Care Plan',
      'Key Risks & Alerts',
      'Quick Actions',
      'Current Care Package',
      'Professional Contacts',
      'Recent Activity',
      'Care Plan Progress',
    ])
      expect(page.textContent).toContain(name);
    expect(page.querySelectorAll('.key-facts>div')).toHaveLength(10);
  });
  it('keeps approved plan metadata separate from a working review', () => {
    const { fixture, component, plan } = setup();
    const approved = structuredClone(plan);
    approved.status = 'Approved';
    approved.version = '3.1';
    approved.author = 'Approving author';
    fixture.componentRef.setInput('approved', approved);
    fixture.detectChanges();
    expect(component.current.version).toBe('3.1');
    expect(fixture.nativeElement.querySelector('.current-plan').textContent).toContain(
      'Approving author',
    );
    expect(fixture.nativeElement.querySelector('.current-plan').textContent).toContain(
      'Continue Review',
    );
  });
  it('calculates real weekly calls and minutes instead of counting call patterns', () => {
    const { fixture, component } = setup();
    const call: RotaCall = {
      id: 'call-1',
      clientId: 'overview-test',
      name: 'Evening',
      start: '19:00',
      end: '20:00',
      weekdays: [1, 3],
      carers: 1,
      skills: [],
      regularStaffIds: [],
      tasks: 'Agreed support',
      active: true,
    };
    fixture.componentRef.setInput('calls', [call]);
    fixture.detectChanges();
    expect(component.packageRows).toHaveLength(2);
    expect(component.weeklyMinutes).toBe(120);
    expect(fixture.nativeElement.querySelector('.package-total').textContent).toContain(
      '2 calls per week (120 minutes)',
    );
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(2);
  });
  it('shows distinct completion states from actual section data', () => {
    const { component, plan, fixture } = setup();
    expect(component.status(plan.sections[0])).toBe('Completed');
    expect(component.status(plan.sections[1])).toBe('In Progress');
    expect(component.status(plan.sections[2])).toBe('Not Started');
    expect(fixture.nativeElement.querySelectorAll('.progress-legend>span')).toHaveLength(3);
  });
  it('opens the selected care area and emits actionable create/AI buttons', () => {
    const { component, fixture } = setup();
    const actions: string[] = [];
    const areas: number[] = [];
    component.action.subscribe((a) => actions.push(a));
    component.area.subscribe((i) => areas.push(i));
    const page = fixture.nativeElement as HTMLElement;
    for (const label of [
      'Create Incident',
      'Create Compliment',
      'Create Complaint',
      'AI Review & Suggestions',
    ])
      [...page.querySelectorAll<HTMLButtonElement>('.quick-actions button')]
        .find((b) => b.textContent?.includes(label))!
        .click();
    (page.querySelectorAll('.progress-section')[2] as HTMLButtonElement).click();
    expect(actions).toEqual(['incident', 'compliment', 'complaint', 'quality']);
    expect(areas).toEqual([2]);
  });
  it('keeps all source destinations as Overview links and excludes inactive risks', () => {
    const { fixture, client, component } = setup();
    client.file!.entries['risks'] = [
      {
        id: 'closed',
        name: 'Closed risk',
        detail: 'Resolved',
        date: '2026-10-01',
        level: 'Low',
        status: 'Inactive',
      },
      {
        id: 'open',
        name: 'Current fall risk',
        detail: 'Support',
        date: '2026-10-01',
        level: 'Medium',
        status: 'Active',
      },
    ];
    fixture.detectChanges();
    expect(component.alerts.some((a) => a.text === 'Current fall risk')).toBe(true);
    expect(component.alerts.some((a) => a.text === 'Closed risk')).toBe(false);
    expect(
      fixture.nativeElement
        .querySelector('a[data-source-record="medication"]')
        .getAttribute('href'),
    ).toBe('/manage/clients/overview-test/medication');
    expect(
      fixture.nativeElement.querySelector('.professional a[href="tel:07700 900100"]'),
    ).toBeTruthy();
  });
  it('distinguishes carried-forward wording that is not yet reviewed from changed work in progress', () => {
    const { fixture, component, plan } = setup();
    const previous = structuredClone(plan);
    previous.status = 'Approved';
    previous.sections[1].complete = true;
    fixture.componentRef.setInput('approved', previous);
    fixture.detectChanges();
    expect(component.status(plan.sections[1])).toBe('Not Started');
    plan.sections[1].fields['changes'] = 'New preference confirmed';
    expect(component.status(plan.sections[1])).toBe('In Progress');
  });
});
