import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Company } from '../shared/management.store';
import { CompanySetupBanner } from './company-setup-banner';

describe('Company setup banner', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  function render(completion: number | null) {
    const fixture = TestBed.createComponent(CompanySetupBanner);
    fixture.componentRef.setInput('company', {
      id: 'company-1',
      name: 'Stored Care',
      apiSummaryOnly: true,
      setupCompletion: completion,
    } as Company);
    fixture.detectChanges();
    return fixture;
  }

  it('shows saved progress and links to that company’s profile', () => {
    const fixture = render(57);
    const root: HTMLElement = fixture.nativeElement;
    expect(root.textContent).toContain('Stored Care · Setup Completion 57%');
    expect(root.querySelector('progress')?.value).toBe(57);
    expect(root.querySelector('a')?.getAttribute('href')).toBe('/manage/companies/company-1');
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
    const fixture = render(57);
    fixture.componentRef.setInput('company', {
      id: 'company-1',
      name: 'Stored Care',
      apiSummaryOnly: true,
      setupCompletion: 100,
    } as Company);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
  });

});
