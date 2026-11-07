import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SsoGoogle } from './sso-google';

describe('Google sign-in availability', () => {
  it('does not offer simulated provider authentication', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(SsoGoogle);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('not available yet');
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });
});
