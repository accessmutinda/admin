import { CompanyAccessService } from '../../../core/access/company-access.service';
import { EcmService } from '../ecm/ecm.service';
import { carePlanVisitTasks } from './care-plan-visit-tasks';
import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { DEMO_USER } from '../../../demo/business-fixtures';
import { ManagementStore } from '../shared/management.store';
import { seedCareDemo as originalCareFixture } from '../../../demo/care-demo';
const seedCareDemo = (data: Parameters<typeof originalCareFixture>[0]) =>
  JSON.parse(
    JSON.stringify(originalCareFixture(data)).replaceAll(
      'care-demo-staff-',
      'care-plan-test-staff-',
    ),
  );
import { CarePlanRegister } from './care-plan-register';
import { CarePlan } from './care-plan';
import { CARE_ROUTES } from './care.routes';

@Component({ template: '' })
class SourceRecordTarget {}

describe('Dedicated care-plan routes', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'manage/care-plans', component: CarePlanRegister },
          {
            path: 'manage/care-plans/:id',
            component: CarePlan,
            data: { carePlanWorkspace: true },
            canDeactivate: [(component: CarePlan) => component.canLeave()],
          },
          {
            path: 'manage/clients/:id',
            children: [
              ...CARE_ROUTES.filter((route) => route.path === 'care-plan'),
              { path: '**', component: SourceRecordTarget },
            ],
          },
        ]),
      ],
    });
    const auth = TestBed.inject(AuthService);
    (auth as any).accessExpiresAt = Date.now() + 3_600_000;
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(auth, 'api').mockResolvedValue({} as never);
    vi.spyOn(auth, 'profile').mockReturnValue({
      company_id: 'lqcs',
      company_entry_state: 'ready',
    } as any);
    vi.spyOn(auth, 'canAccessCompany').mockReturnValue(true);
    vi.spyOn(auth, 'selectWorkspace').mockResolvedValue();
    const access = TestBed.inject(CompanyAccessService);
    vi.spyOn(access, 'refresh').mockResolvedValue();
    vi.spyOn(access, 'can').mockReturnValue(true);
    vi.spyOn(access, 'canPath').mockReturnValue(true);
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    vi.spyOn(auth, 'currentUser').mockReturnValue({ ...DEMO_USER, roleCode: 'CA' });
    TestBed.inject(ManagementStore).saveWorkspace((data) => seedCareDemo(data));
  });
  it('shows actual task evidence in Quality Review and saves a supervisor reflection', async () => {
    const store = TestBed.inject(ManagementStore);
    const client = store.data().rota!.clients.find((c) => c.id === 'care-demo-client-1')!;
    const visit = store
      .data()
      .rota!.visits.find((v) => v.clientId === client.id && v.state === 'Published')!;
    expect(visit).toBeTruthy();
    const tasks = carePlanVisitTasks(client, visit);
    expect(tasks.length).toBeGreaterThan(0);
    const ecm = TestBed.inject(EcmService);
    expect(
      ecm.evidence(
        visit.id,
        {
          type: 'Care note',
          note: 'Demo personal care took longer than planned.',
          photo: '',
          photoName: '',
          taskResults: [{ ...tasks[0], outcome: 'Concern', note: 'Review morning call duration.' }],
        },
        false,
      ),
    ).toBeNull();
    const evidence = ecm.data().evidence.at(-1)!;
    const harness = await RouterTestingHarness.create(
      '/manage/care-plans/care-demo-client-1?view=quality',
    );
    const page = harness.fixture.nativeElement as HTMLElement;
    expect(page.querySelector('.demo-evidence-review')?.textContent).toContain(
      'Review morning call duration.',
    );
    const field = page.querySelector<HTMLTextAreaElement>('.demo-evidence-review textarea')!;
    field.value = 'Discuss the longer call with the rota manager; review personal care support.';
    field.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();
    harness.detectChanges();
    page.querySelector<HTMLButtonElement>('.demo-evidence-review button')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const saved = store.data().rota!.clients.find((c) => c.id === client.id)!.file!.carePlan!;
    const review = saved.versions
      .find((p) => p.status === 'Draft')!
      .visitEvidenceReviews!.find((item) => item.evidenceId === evidence.id)!;
    expect(review.reflection).toContain('rota manager');
    expect(page.querySelector('.demo-evidence-review .pill')?.textContent).toBe('Reviewed');
  }, 15000);
  it('provides editable assessment fields and review controls for every remaining care area', async () => {
    const harness = await RouterTestingHarness.create(
      '/manage/care-plans/care-demo-client-1?view=care-plan&stage=sections&area=Nutrition%20%26%20Hydration',
    );
    const page = harness.fixture.nativeElement as HTMLElement;
    for (let index = 3; index < 17; index++) {
      page.querySelector<HTMLButtonElement>('[data-tab="area-' + index + '"]')!.click();
      await harness.fixture.whenStable();
      harness.detectChanges();
      const panel = page.querySelector('.care-area-editor')!;
      expect(panel.textContent).toContain('Mark section reviewed');
      expect(panel.querySelector('h2')!.textContent).toContain(
        (harness.routeDebugElement!.componentInstance as any).section.name,
      );
      expect(panel.querySelectorAll('textarea')).toHaveLength(9);
      expect(panel.querySelector('input[type=date]')).toBeTruthy();
      expect(page.querySelector('.plan-layout.with-context')).toBeNull();
      expect(page.querySelector<HTMLElement>('#care-plan-voice-panel')!.hidden).toBe(true);
    }
    expect(
      page.querySelector<HTMLButtonElement>('.coming-soon-navigation button:last-child')!.disabled,
    ).toBe(true);
  });
  it('uses previous-screen history for Back and falls back to the care-plan register on direct entry', async () => {
    const harness = await RouterTestingHarness.create('/manage/care-plans/care-demo-client-1');
    const location = TestBed.inject(Location);
    vi.spyOn(location, 'getState').mockReturnValue({ navigationId: 1 });
    const page = harness.fixture.nativeElement as HTMLElement;
    page.querySelector<HTMLButtonElement>('.header-back')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/manage/care-plans');
    expect(page.textContent).not.toContain('Explore care-plan workflows');
    await harness.navigateByUrl('/manage/care-plans/care-demo-client-1');
    vi.mocked(location.getState).mockReturnValue({ navigationId: 3 });
    const back = vi.spyOn(location, 'back');
    page.querySelector<HTMLButtonElement>('.header-back')!.click();
    expect(back).toHaveBeenCalledOnce();
  });
  it('opens the register entry in Care plans and switches tabs without loading the service-user profile', async () => {
    const harness = await RouterTestingHarness.create('/manage/care-plans');
    const page = harness.fixture.nativeElement as HTMLElement;
    const link = [...page.querySelectorAll<HTMLAnchorElement>('a')].find(
      (a) =>
        a.classList.contains('open-plan') &&
        a.getAttribute('href') === '/manage/care-plans/care-demo-client-1',
    )!;
    expect(link).toBeTruthy();
    link.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/manage/care-plans/care-demo-client-1');
    expect(page.textContent).toContain('Mary Wilson');
    expect(page.textContent).not.toContain('Service User Profile');
    const header = page.querySelector('.care-plan-sticky-shell');
    expect(page.querySelector('[role="tablist"][aria-label="Care areas"]')).toBeNull();
    const moduleNav = page.querySelector('[role="tablist"][aria-label="Care-plan modules"]')!;
    expect(
      [...moduleNav.querySelectorAll('[role="tab"]')].map((tab) =>
        tab.textContent?.trim().replace(/\s+/g, ' '),
      ),
    ).toEqual([
      'home Overview',
      'assignment Care Plan',
      'fact_check Assessments',
      'accessibility_new Body Chart',
      'verified Quality Review',
      'history Review History',
    ]);
    for (const source of ['medication', 'visits', 'documents', 'feedback', 'family', 'risks']) {
      expect(moduleNav.querySelector('[data-tab="' + source + '"]')).toBeNull();
      expect(page.querySelector('a[data-source-record="' + source + '"]')).toBeTruthy();
    }
    expect(page.querySelector('.care-plan-more')).toBeNull();
    expect(page.querySelector('a[data-source-record="medication"]')?.getAttribute('href')).toBe(
      '/manage/clients/care-demo-client-1/medication',
    );
    page.querySelector<HTMLButtonElement>('[data-tab="care-plan"]')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toContain('view=care-plan');
    expect(page.querySelector('[role="tablist"][aria-label="Care areas"]')).toBeTruthy();
    expect(page.querySelector('cv-care-plan-section-nav')).toBeTruthy();
    expect(page.querySelector('.care-plan-sticky-shell [aria-label="Care areas"]')).toBeNull();
    expect(page.querySelector('[aria-label="Care areas"]')?.getAttribute('aria-orientation')).toBe(
      'vertical',
    );
    expect(page.querySelector('.plan-layout.with-section-nav')).toBeTruthy();
    expect(page.querySelector('cv-care-plan-about-me')).toBeTruthy();
    expect(page.querySelectorAll('cv-care-plan-about-me .contact')).toHaveLength(6);
    expect(page.querySelector('.plan-layout.with-context')).toBeNull();
    page.querySelector<HTMLButtonElement>('[data-tab="area-1"]')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.querySelector('.plan-content')!.textContent).toContain('Personal Care');
    const editor = harness.routeDebugElement!.componentInstance as any;
    editor.section.fields['situation'] = 'Unsaved wording retained between modules';
    page.querySelector<HTMLButtonElement>('[data-tab="overview"]')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.querySelector('[role="tablist"][aria-label="Care areas"]')).toBeNull();
    expect(editor.plan.sections[1].fields['situation']).toBe(
      'Unsaved wording retained between modules',
    );
    expect(page.querySelector('.care-plan-sticky-shell')).toBe(header);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    editor.openServiceUserRecord('medication');
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/manage/clients/care-demo-client-1/medication');
  }, 15000);
  it('redirects old care-plan links into the dedicated workspace and preserves the selected stage', async () => {
    const harness = await RouterTestingHarness.create(
      '/manage/clients/care-demo-client-1/care-plan?stage=quality',
    );
    expect(TestBed.inject(Router).url).toBe('/manage/care-plans/care-demo-client-1?stage=quality');
    expect(harness.fixture.nativeElement.textContent).toContain(
      'Review rationale / resolution of findings',
    );
    expect(harness.fixture.nativeElement.textContent).not.toContain('Service User Profile');
  }, 15000);
  it('keeps incident and feedback destinations under Service Users', async () => {
    const harness = await RouterTestingHarness.create(
      '/manage/clients/care-demo-client-1/incidents',
    );
    const page = harness.fixture.nativeElement as HTMLElement;
    await harness.navigateByUrl('/manage/clients/care-demo-client-1/feedback');
    expect(page.querySelector('cv-care-plan')).toBeNull();
  }, 15000);
  it('opens the separate About Me editor, guards local edits and saves without changing Service Users', async () => {
    const harness = await RouterTestingHarness.create(
      '/manage/care-plans/care-demo-client-1?view=care-plan&stage=sections&area=About%20Me',
    );
    const page = harness.fixture.nativeElement as HTMLElement;
    const edit = [...page.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.includes('Edit About Me'),
    )!;
    edit.click();
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.querySelector('cv-care-plan-about-me-editor')).toBeTruthy();
    expect(page.querySelectorAll('.edit-stepper button')).toHaveLength(3);
    expect(page.querySelector('[aria-label="Care areas"]')).toBeNull();
    page.querySelector<HTMLButtonElement>('.personal-card button')!.click();
    harness.detectChanges();
    const name = page.querySelector<HTMLInputElement>('.field-name input')!;
    name.value = 'Mary Wilson review snapshot';
    name.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();
    harness.detectChanges();
    const root = harness.routeDebugElement!.componentInstance as CarePlan;
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(root.canLeave()).toBe(false);
    confirm.mockRestore();
    const save = [...page.querySelectorAll<HTMLButtonElement>('.edit-actions button')].find((b) =>
      b.textContent?.includes('Save Changes'),
    )!;
    save.click();
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.querySelector('cv-care-plan-about-me-editor')).toBeNull();
    const record = TestBed.inject(ManagementStore)
      .data()
      .rota!.clients.find((c) => c.id === 'care-demo-client-1')!;
    expect(record.name).toBe('Mary Wilson');
    expect(record.file!.carePlan!.versions.find((p) => p.status === 'Draft')!.details['name']).toBe(
      'Mary Wilson review snapshot',
    );
    expect(page.textContent).toContain('About Me changes saved.');
  });
  it('guards same-page Review History navigation while the About Me edit has unsaved changes', async () => {
    const harness = await RouterTestingHarness.create(
      '/manage/care-plans/care-demo-client-1?view=care-plan&stage=sections&area=About%20Me',
    );
    const root = harness.routeDebugElement!.componentInstance as any;
    root.startAboutEdit();
    harness.detectChanges();
    await harness.fixture.whenStable();
    root.aboutEditDirty = true;
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await TestBed.inject(Router).navigate(['/manage/care-plans', 'care-demo-client-1'], {
      queryParams: { view: 'versions' },
    });
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(root.editingAboutMe).toBe(true);
    expect(TestBed.inject(Router).url).toContain('view=care-plan');
    confirm.mockReturnValue(true);
    await TestBed.inject(Router).navigate(['/manage/care-plans', 'care-demo-client-1'], {
      queryParams: { view: 'versions' },
    });
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(root.editingAboutMe).toBe(false);
    expect(harness.fixture.nativeElement.querySelector('cv-care-plan-about-me-editor')).toBeNull();
    expect(TestBed.inject(Router).url).toContain('view=versions');
    confirm.mockRestore();
  });
  it('routes incident, compliment and complaint creation to their source forms from Overview', async () => {
    const harness = await RouterTestingHarness.create('/manage/care-plans/care-demo-client-1');
    const page = harness.fixture.nativeElement as HTMLElement;
    for (const [label, kind, destination, title] of [
      ['Create Incident', 'incident', 'incidents', 'New incident'],
      ['Create Compliment', 'compliment', 'feedback', 'New compliment'],
      ['Create Complaint', 'complaint', 'incidents', 'New complaint'],
    ]) {
      const action = [...page.querySelectorAll<HTMLButtonElement>('.quick-actions button')].find(
        (b) => b.textContent?.includes(label),
      )!;
      expect(action).toBeTruthy();
      action.click();
      await harness.fixture.whenStable();
      harness.detectChanges();
      expect(TestBed.inject(Router).url).toBe(
        '/manage/clients/care-demo-client-1/' + destination + '?create=' + kind,
      );
      await harness.navigateByUrl('/manage/care-plans/care-demo-client-1');
      harness.detectChanges();
    }
  }, 15000);
  it('resumes the existing draft after viewing the approved plan from Overview', async () => {
    const harness = await RouterTestingHarness.create('/manage/care-plans/care-demo-client-1');
    const page = harness.fixture.nativeElement as HTMLElement;
    page.querySelector<HTMLButtonElement>('.current-plan .version-row button')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const root = harness.routeDebugElement!.componentInstance as any;
    expect(root.plan.status).toBe('Approved');
    page.querySelector<HTMLButtonElement>('[data-tab="overview"]')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const review = page.querySelector<HTMLButtonElement>('.current-plan .plan-actions .primary')!;
    expect(review.textContent).toContain('Continue Review');
    review.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(root.plan.status).toBe('Draft');
    expect(root.tab).toBe('Client details');
    expect(root.error()).toBe('');
  });
  it('opens the source audit trail for the full recent activity history', async () => {
    const harness = await RouterTestingHarness.create('/manage/care-plans/care-demo-client-1');
    harness.fixture.nativeElement.querySelector('.recent-activity header button').click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/manage/clients/care-demo-client-1/audit');
  });
  it('opens the dedicated Mobility screen and saves its wording and completion only to the draft', async () => {
    const harness = await RouterTestingHarness.create(
      '/manage/care-plans/care-demo-client-1?view=care-plan&stage=sections&area=Mobility',
    );
    const page = harness.fixture.nativeElement as HTMLElement;
    expect(page.querySelector('cv-care-plan-mobility')).toBeTruthy();
    expect(page.querySelector('.plan-layout.with-context')).toBeNull();
    expect(page.querySelector('.mobility-context-summary')).toBeNull();
    expect(page.querySelectorAll('cv-care-plan-identity-header')).toHaveLength(1);
    expect(
      page.querySelector('cv-care-plan-identity-header .care-plan-version')?.textContent,
    ).toContain('Current Care Plan');
    expect(
      page.querySelectorAll('cv-care-plan-mobility .supporting-documents .linked-row'),
    ).toHaveLength(2);
    const field = page.querySelector<HTMLElement>('.field-situation .editor-content')!;
    field.dispatchEvent(new Event('focus'));
    field.innerHTML = '<b>Confirmed mobility wording</b>';
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('blur'));
    await harness.fixture.whenStable();
    harness.detectChanges();
    const root = harness.routeDebugElement!.componentInstance as any;
    expect(root.dirty()).toBe(true);
    page.querySelector<HTMLButtonElement>('.save-actions button')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(root.error()).toBe('');
    expect(root.plan.sections[2].fields['situation']).toBe('Confirmed mobility wording');
    page.querySelector<HTMLButtonElement>('.save-actions .primary')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const record = TestBed.inject(ManagementStore)
      .data()
      .rota!.clients.find((c) => c.id === 'care-demo-client-1')!.file!.carePlan!;
    expect(record.versions.find((p) => p.status === 'Draft')!.sections[2].complete).toBe(true);
    expect(
      record.versions.find((p) => p.status === 'Approved')!.sections[2].fields['situation'],
    ).not.toBe('Confirmed mobility wording');
    expect(root.plan.status).toBe('Draft');
  });
  it('opens Add Document and a linked incident in their existing Service User editors', async () => {
    const url = '/manage/care-plans/care-demo-client-1?view=care-plan&stage=sections&area=Mobility';
    const harness = await RouterTestingHarness.create(url);
    const page = harness.fixture.nativeElement as HTMLElement;
    page.querySelector<HTMLButtonElement>('.supporting-documents header button')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe(
      '/manage/clients/care-demo-client-1/documents?create=1&section=Mobility',
    );
    await harness.navigateByUrl(url);
    harness.detectChanges();
    const root = harness.routeDebugElement!.componentInstance as any;
    const entry = TestBed.inject(ManagementStore)
      .data()
      .rota!.clients.find((c) => c.id === 'care-demo-client-1')!.file!.entries['incidents'][0];
    root.openMobilityRecord({ kind: 'incident', id: entry.id, name: entry.name, date: entry.date });
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toContain('/incidents?entry=');
  }, 15000);
  it('opens the selected supporting document in its source viewer', async () => {
    const harness = await RouterTestingHarness.create(
      '/manage/care-plans/care-demo-client-1?view=care-plan&stage=sections&area=Mobility',
    );
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['%PDF-1.4'], { type: 'application/pdf' }),
    } as Response);
    const createBefore = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
    const revokeBefore = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:mobility-document-test'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    try {
      const page = harness.fixture.nativeElement as HTMLElement;
      page.querySelector<HTMLButtonElement>('.supporting-documents .linked-row button')!.click();
      await harness.fixture.whenStable();
      harness.detectChanges();
      expect(TestBed.inject(Router).url).toContain('/documents?document=');
      expect(TestBed.inject(Router).url).toContain('document=');
    } finally {
      harness.fixture.destroy();
      fetch.mockRestore();
      if (createBefore) Object.defineProperty(URL, 'createObjectURL', createBefore);
      else delete (URL as any).createObjectURL;
      if (revokeBefore) Object.defineProperty(URL, 'revokeObjectURL', revokeBefore);
      else delete (URL as any).revokeObjectURL;
    }
  }, 15000);
  it('opens a linked mobility assessment in Assessments and keeps approved mobility read only', async () => {
    const harness = await RouterTestingHarness.create(
      '/manage/care-plans/care-demo-client-1?view=care-plan&stage=sections&area=Mobility',
    );
    const page = harness.fixture.nativeElement as HTMLElement;
    page.querySelector<HTMLButtonElement>('.linked-records .linked-row button')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const root = harness.routeDebugElement!.componentInstance as any;
    expect(root.workspaceView).toBe('assessments');
    expect(root.assessment.section).toBe('Mobility');
    await harness.navigateByUrl(
      '/manage/care-plans/care-demo-client-1?view=care-plan&stage=sections&area=Mobility&version=approved',
    );
    // Version selection is explicit in the working workspace; reload the chosen snapshot.
    root.chooseVersion('approved');
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(root.plan.status).toBe('Approved');
    expect(page.querySelector('cv-care-plan-mobility .save-actions button')).toBeNull();
    expect(page.querySelector('.read-only-label')?.textContent).toContain('Read only');
  });
  it('preserves exactly one fixed identity header across every care-plan module, area and edit mode', async () => {
    const harness = await RouterTestingHarness.create('/manage/care-plans/care-demo-client-1');
    const page = harness.fixture.nativeElement as HTMLElement;
    const header = page.querySelector('cv-care-plan-identity-header')!;
    const identity = header.querySelector('.care-plan-person')!.textContent;
    const currentPlan = header.querySelector('.care-plan-version')!.textContent;
    const verify = () => {
      expect(page.querySelectorAll('cv-care-plan-identity-header')).toHaveLength(1);
      expect(page.querySelector('cv-care-plan-identity-header')).toBe(header);
      expect(header.querySelector('.care-plan-person')!.textContent).toBe(identity);
      expect(header.querySelector('.care-plan-version')!.textContent).toBe(currentPlan);
      expect(header.querySelectorAll('.care-plan-header-actions>button')).toHaveLength(2);
      expect(header.querySelector('summary')!.textContent).toContain('More');
      expect(page.querySelector('.mobility-context-summary')).toBeNull();
    };
    verify();
    for (const tab of ['care-plan', 'assessments', 'body', 'quality', 'versions', 'overview']) {
      page.querySelector<HTMLButtonElement>('[data-tab="' + tab + '"]')!.click();
      await harness.fixture.whenStable();
      harness.detectChanges();
      verify();
    }
    page.querySelector<HTMLButtonElement>('[data-tab="care-plan"]')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    for (const tab of ['area-2', 'area-1', 'area-0']) {
      page.querySelector<HTMLButtonElement>('[data-tab="' + tab + '"]')!.click();
      await harness.fixture.whenStable();
      harness.detectChanges();
      verify();
    }
    [...page.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Edit About Me'))!
      .click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    verify();
    expect(page.querySelector('cv-care-plan-about-me-editor')).toBeTruthy();
    expect(
      [...header.querySelectorAll<HTMLButtonElement>('.more-actions button')].find((button) =>
        button.textContent?.includes('Save Draft'),
      )!.disabled,
    ).toBe(true);
  }, 15000);
  it('opens Personal Care with the fixed identity header, saves checkbox/text data and completes only the draft', async () => {
    const harness = await RouterTestingHarness.create(
      '/manage/care-plans/care-demo-client-1?view=care-plan&stage=sections&area=Personal%20Care',
    );
    const page = harness.fixture.nativeElement as HTMLElement;
    const header = page.querySelector('cv-care-plan-identity-header')!;
    expect(page.querySelector('cv-care-plan-personal-care')).toBeTruthy();
    expect(page.querySelector('.plan-layout.with-context')).toBeNull();
    expect(page.querySelectorAll('.care-grid>.care-field')).toHaveLength(12);
    const input = page.querySelector<HTMLTextAreaElement>('#personal-preferences')!;
    input.value = 'I prefer to choose my own toiletries.';
    input.dispatchEvent(new Event('input'));
    const option = page.querySelectorAll<HTMLInputElement>('.equipment .option input')[1];
    option.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    page.querySelector<HTMLButtonElement>('.section-footer>div button')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const root = harness.routeDebugElement!.componentInstance as any;
    expect(root.error()).toBe('');
    page.querySelector<HTMLButtonElement>('.section-footer .primary')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const record = TestBed.inject(ManagementStore)
      .data()
      .rota!.clients.find((client) => client.id === 'care-demo-client-1')!.file!.carePlan!;
    const draft = record.versions.find((version) => version.status === 'Draft')!;
    expect(draft.sections[1].fields['preferences']).toBe('I prefer to choose my own toiletries.');
    expect(draft.sections[1].fields['equipment']).toContain('Grab rails');
    expect(draft.sections[1].complete).toBe(true);
    expect(
      record.versions.find((version) => version.status === 'Approved')!.sections[1].fields[
        'preferences'
      ],
    ).not.toBe('I prefer to choose my own toiletries.');
    expect(page.querySelector('cv-care-plan-identity-header')).toBe(header);
    page.querySelector<HTMLButtonElement>('.section-context nav .primary')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.querySelector('cv-care-plan-mobility')).toBeTruthy();
    expect(page.querySelector('cv-care-plan-identity-header')).toBe(header);
  });
  it('opens the existing Skin assessment and the Personal Care incident filter without adding Service User tabs', async () => {
    const url =
      '/manage/care-plans/care-demo-client-1?view=care-plan&stage=sections&area=Personal%20Care';
    const harness = await RouterTestingHarness.create(url);
    const page = harness.fixture.nativeElement as HTMLElement;
    page.querySelector<HTMLButtonElement>('.related-records article button')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    const root = harness.routeDebugElement!.componentInstance as any;
    expect(root.workspaceView).toBe('assessments');
    expect(root.assessment.name).toBe('Skin / pressure');
    await harness.navigateByUrl(url);
    harness.detectChanges();
    await harness.fixture.whenStable();
    page.querySelectorAll<HTMLButtonElement>('.related-records article button')[2].click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe(
      '/manage/clients/care-demo-client-1/incidents?related=personal-care',
    );
    expect(page.textContent).not.toContain('Reported change in mobility');
  }, 15000);
});
