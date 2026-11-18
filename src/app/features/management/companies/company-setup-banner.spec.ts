import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Company } from '../shared/management.store';
import { CompanySetupBanner } from './company-setup-banner';

describe('Company setup banner', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  function render(completion: number | null, state: Partial<Company> = {}) {
    const fixture = TestBed.createComponent(CompanySetupBanner);
    fixture.componentRef.setInput('company', {
      id: 'company-1',
      name: 'Stored Care',
      apiSummaryOnly: true,
      setupCompletion: completion,
      ...state,
    } as Company);
    fixture.detectChanges();
    return fixture;
  }

  it('shows saved progress while the required-section status is unavailable', () => {
    const fixture = render(57);
    const root: HTMLElement = fixture.nativeElement;
    expect(root.textContent).toContain('Stored Care · Setup Completion 57%');
    expect(root.querySelector('progress')?.value).toBe(57);
    expect(root.querySelector('a')).toBeNull();
  });

  it.each([
    ['general', '?edit=true#general-information', 'Fill in the required company details'],
    ['registration', '/compliance#rc-registration', 'required registration details'],
    ['contacts', '/contacts', 'company email, phone number and required addresses'],
    ['locations', '/locations', 'at least one active location'],
    ['modules', '/modules/overview', 'at least one applicable module'],
    ['documents', '/compliance#rc-mapping', 'four required documents'],
    ['access', '/access#ua-users-title', 'must accept the invitation and become active'],
  ] as const)('opens the single pending %s section and explains the next action', (key, path, guidance) => {
    const { nativeElement: root } = render(key === 'documents' ? 100 : 86, {
      id: 'another-company',
      profileCompletion: 86,
      primaryAdministratorState: 'invited',
      setupProgress: { general: { complete: true }, [key]: { complete: false } },
    });
    expect(root.querySelector('a')?.textContent).toContain('Complete profile');
    expect(root.querySelector('a')?.getAttribute('href')).toBe('/manage/companies/another-company' + path);
    expect(root.textContent).toContain(guidance);
  });

  it('opens the required-section checklist when several sections are pending', () => {
    const { nativeElement: root } = render(71, {
      setupProgress: {
        general: { complete: true },
        contacts: { complete: false },
        locations: { complete: false },
      },
    });
    expect(root.querySelector('a')?.getAttribute('href')).toBe(
      '/manage/companies/company-1#required-sections',
    );
    expect(root.textContent).toContain('Required Sections checklist');
  });

  it('shows the prompt for a company with zero progress', () => {
    expect(render(0).nativeElement.textContent).toContain('Setup Completion 0%');
  });

  it('shows what remains before and after branding is published', () => {
    const fixture = render(71);
    for (const published of [false, true]) {
      fixture.componentRef.setInput('company', {
        id: 'company-1',
        name: 'Stored Care',
        profileCompletion: 86,
        setupCompletion: published ? 86 : 71,
        setupProgress: {
          branding: { complete: published },
          documents: { complete: true },
          access: { complete: false },
        },
      } as Company);
      fixture.detectChanges();
      const root: HTMLElement = fixture.nativeElement;
      expect(root.textContent).toContain(`Setup Completion ${published ? 86 : 71}%`);
      expect(root.textContent).toContain('Activate a Company Admin');
      expect(root.textContent?.includes('Publish branding')).toBe(!published);
    }
  });

  it.each([100, null])('hides the prompt when completion is %s', (completion) => {
    expect(render(completion).nativeElement.querySelector('section')).toBeNull();
  });

  it('removes the prompt when the saved profile reaches completion', () => {
    const fixture = render(57, { setupProgress: { contacts: { complete: false } } });
    fixture.componentRef.setInput('company', {
      id: 'company-1',
      name: 'Stored Care',
      apiSummaryOnly: true,
      setupCompletion: 100,
    } as Company);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
  });

  it('keeps branding guidance separate after the required profile is complete', () => {
    const { nativeElement: root } = render(86, {
      profileCompletion: 100,
      setupProgress: { general: { complete: true }, branding: { complete: false } },
    });
    expect(root.textContent).not.toContain('Complete profile');
    expect(root.querySelector('a')?.getAttribute('href')).toBe('/manage/companies/company-1/branding');
  });
});
