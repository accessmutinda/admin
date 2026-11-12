import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { AcademySettingsPage } from './academy-settings';
import { AcademySettingsApi } from './academy-settings-api.service';
import { AcademyService } from './academy.service';
import { AcademyAssets } from './academy-assets.service';
import { AcademyAdminNav } from './academy-shared';
import { AcademyCertificateView } from './academy-certificate';
import { emptyAcademy } from './academy.models';

@Component({ selector: 'cv-academy-admin-nav', template: '' })
class NavigationStub {}
@Component({ selector: 'cv-academy-certificate', template: '', inputs: ['certificate'] })
class CertificateStub {
  certificate?: unknown;
}

async function setup(editable = false) {
  const data = emptyAcademy();
  const api = {
    scope: signal('company'),
    settings: () => data.settings,
    record: () => ({ etag: '"v1"' }),
    canEdit: signal(editable),
    canRemind: () => true,
    saving: signal(false),
    loading: () => false,
    error: signal(''),
    reminders: vi.fn(async () => 0),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: AcademyService,
        useValue: {
          state: () => data,
          me: () => null,
          store: { companyId: api.scope, company: () => ({ name: 'Company' }) },
          api: { available: () => false },
          certificatesApi: { available: () => true, load: vi.fn() },
        },
      },
      { provide: AcademySettingsApi, useValue: api },
      { provide: AcademyAssets, useValue: {} },
      { provide: CompanyAccessService, useValue: { core: () => false } },
    ],
  });
  TestBed.overrideComponent(AcademySettingsPage, {
    remove: { imports: [AcademyAdminNav, AcademyCertificateView] },
    add: { imports: [NavigationStub, CertificateStub] },
  });
  const fixture = TestBed.createComponent(AcademySettingsPage);
  fixture.detectChanges();
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    Array.from(root.querySelectorAll('button')).find((el) => el.textContent?.trim() === text)!;
  return { api, fixture, root, button };
}

describe('Academy settings action permissions', () => {
  it('keeps settings read-only while allowing a separately authorised reminder command', async () => {
    const { api, fixture, root, button } = await setup();
    expect(button('Save changes').matches(':disabled')).toBe(true);
    expect(root.querySelector('input[type=number]')?.matches(':disabled')).toBe(true);
    button('Notifications').click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.querySelector('textarea')?.matches(':disabled')).toBe(true);
    expect(button('Generate due reminders now').matches(':disabled')).toBe(false);
    button('Generate due reminders now').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.reminders).toHaveBeenCalledOnce();
    expect(root.textContent).toContain('0 portal reminders queued');
  });
  it('locks material selectors and reload while a save is in progress', async () => {
    const { api, fixture, root, button } = await setup(true);
    api.error.set('Earlier request failed');
    api.saving.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(
      root
        .querySelector('mat-select[aria-label="Certificate logo"]')
        ?.getAttribute('aria-disabled'),
    ).toBe('true');
    expect(button('Reload settings').disabled).toBe(true);
  });
  it('ignores an old reminder failure after the workspace changes', async () => {
    const { api, fixture, root, button } = await setup();
    let fail!: (error: Error) => void;
    api.reminders.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          fail = reject;
        }),
    );
    button('Notifications').click();
    fixture.detectChanges();
    await fixture.whenStable();
    button('Generate due reminders now').click();
    api.scope.set('another-company');
    fixture.detectChanges();
    fail(Error('Old workspace request failed'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(root.textContent).not.toContain('Old workspace request failed');
    expect(root.textContent).not.toContain('portal reminders queued');
  });
});
