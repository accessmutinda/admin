import { BreakpointObserver } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { WritableSignal } from '@angular/core';
import { of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { UsersAccess } from '../company-admin/access/users-access';
import { ApprovalWorkflows } from '../company-admin/workflows/approval-workflows';
import { PersonDetail } from '../people/person-detail';
import { CHECKS, ONBOARDING, ManagementStore } from './management.store';
import { WorkforceDirectory } from '../people/directory/workforce-directory';

describe('Compact admin navigation and disclosure controls', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [PersonDetail, UsersAccess, ApprovalWorkflows, WorkforceDirectory],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: 'james' }),
              queryParamMap: convertToParamMap({ tab: 'Profile' }),
            },
          },
        },
        {
          provide: BreakpointObserver,
          useValue: {
            observe: () => of({ matches: true, breakpoints: { '(max-width: 767px)': true } }),
            isMatched: () => true,
          },
        },
      ],
    });
    TestBed.inject(AuthService).signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
  });

  it('changes profile sections through the selector without editing staff records', async () => {
    const fixture = TestBed.createComponent(PersonDetail);
    fixture.detectChanges();
    await fixture.whenStable();
    const store = TestBed.inject(ManagementStore);
    const before = JSON.stringify(store.data());
    expect(fixture.nativeElement.querySelector('.details-list').textContent).toContain(
      store.staff().find((p) => p.id === 'james')!.email,
    );
    fixture.debugElement
      .query(By.css('mat-select[aria-label="Person profile section"]'))
      .triggerEventHandler('ngModelChange', 'Learning');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.person-detail-surface h2').textContent).toBe(
      'Assigned learning',
    );
    expect(JSON.stringify(store.data())).toBe(before);
  });

  it('updates permission counts in a draft and restores them through Discard', async () => {
    const fixture = TestBed.createComponent(UsersAccess);
    (fixture.componentInstance as unknown as { tab: WritableSignal<string> }).tab.set(
      'Permissions',
    );
    fixture.detectChanges();
    await fixture.whenStable();
    const store = TestBed.inject(ManagementStore);
    const before = JSON.stringify(store.data());
    const accordion: HTMLElement = fixture.nativeElement.querySelector('.permission-accordion');
    const beforeCount = accordion.querySelector('.permission-enabled-count')!.textContent;
    const checkbox = accordion.querySelector('input')!;
    const initial = checkbox.checked;
    checkbox.checked = !initial;
    checkbox.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(accordion.querySelector('.permission-enabled-count')!.textContent).not.toBe(beforeCount);
    expect(fixture.nativeElement.querySelector('.settings-save-state').textContent).toContain(
      'Unsaved changes',
    );
    expect(JSON.stringify(store.data())).toBe(before);
    const discard = Array.from(
      fixture.nativeElement.querySelectorAll(
        '.settings-save-footer button',
      ) as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent!.trim() === 'Discard')!;
    discard.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(checkbox.checked).toBe(initial);
    expect(accordion.querySelector('.permission-enabled-count')!.textContent).toBe(beforeCount);
    expect(JSON.stringify(store.data())).toBe(before);
  });

  it('retains reviewer drafts when the document-type selector switches routes', async () => {
    const fixture = TestBed.createComponent(ApprovalWorkflows);
    fixture.detectChanges();
    await fixture.whenStable();
    const store = TestBed.inject(ManagementStore);
    const before = JSON.stringify(store.data());
    const reviewer: HTMLInputElement = fixture.nativeElement.querySelector(
      'input[aria-label="Reviewer for step 1"]',
    );
    reviewer.value = 'Draft reviewer';
    reviewer.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    const selector = fixture.debugElement.query(
      By.css('mat-select[aria-label="Approval document type"]'),
    );
    selector.triggerEventHandler('ngModelChange', 'Policies');
    fixture.detectChanges();
    await fixture.whenStable();
    selector.triggerEventHandler('ngModelChange', 'Care plans');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector('input[aria-label="Reviewer for step 1"]').value,
    ).toBe('Draft reviewer');
    expect(JSON.stringify(store.data())).toBe(before);
  });

  it('groups compliance alerts without dropping individual dates or destinations', async () => {
    const store = TestBed.inject(ManagementStore);
    const person = store.staff().find((p) => p.id === 'james')!;
    store.update((data) => ({
      ...data,
      people: [
        {
          ...person,
          checks: CHECKS.map(() => true),
          checkExpiry: { [CHECKS[0]]: '2020-01-01', [CHECKS[1]]: '2099-01-01' },
          visaExpiry: '2020-02-01',
        },
      ],
    }));
    const before = JSON.stringify(store.data());
    const fixture = TestBed.createComponent(WorkforceDirectory);
    fixture.componentRef.setInput('mode', 'compliance');
    fixture.detectChanges();
    await fixture.whenStable();
    const groups = fixture.nativeElement.querySelectorAll('.expiry-person');
    expect(groups).toHaveLength(1);
    expect(groups[0].querySelectorAll('a')).toHaveLength(2);
    expect(groups[0].textContent).toContain('2020-01-01');
    expect(groups[0].textContent).toContain('2020-02-01');
    expect(groups[0].textContent).not.toContain('2099-01-01');
    for (const link of groups[0].querySelectorAll('a')) {
      expect(link.getAttribute('href')).toBe('/manage/people/james?tab=Compliance');
    }
    expect(JSON.stringify(store.data())).toBe(before);
  });

  it('keeps starter progress, next steps and profile links in the redesigned journeys', async () => {
    const store = TestBed.inject(ManagementStore);
    const person = store.staff()[0];
    store.update((data) => ({
      ...data,
      people: [
        { ...person, id: 'new-starter', onboarding: ONBOARDING.map(() => false) },
        { ...person, id: 'complete-starter', onboarding: ONBOARDING.map(() => true) },
        { ...person, id: 'partial-starter', onboarding: ONBOARDING.map((_, i) => i < 4) },
      ],
    }));
    const before = JSON.stringify(store.data());
    const fixture = TestBed.createComponent(WorkforceDirectory);
    fixture.componentRef.setInput('mode', 'onboarding');
    fixture.detectChanges();
    await fixture.whenStable();
    const cards: HTMLElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.starter-journey'),
    );
    expect(cards).toHaveLength(3);
    expect(
      cards.map((card) =>
        card.querySelector('[role="progressbar"]')!.getAttribute('aria-valuenow'),
      ),
    ).toEqual(['0', '100', '50']);
    expect(cards[0].querySelector('.starter-next')!.textContent).toContain(ONBOARDING[0]);
    expect(cards[1].querySelector('.starter-next')!.textContent).toContain('All steps complete');
    expect(cards[1].classList.contains('is-complete')).toBe(true);
    expect(cards[2].querySelector('.starter-next')!.textContent).toContain(ONBOARDING[4]);
    for (const [index, card] of cards.entries()) {
      expect(card.querySelectorAll('td')).toHaveLength(7);
      expect(card.textContent).toContain(person.name);
      expect(card.querySelector('.starter-action')!.getAttribute('href')).toBe(
        '/manage/people/' +
          ['new-starter', 'complete-starter', 'partial-starter'][index] +
          '?tab=Onboarding',
      );
    }
    expect(JSON.stringify(store.data())).toBe(before);
  });
});
