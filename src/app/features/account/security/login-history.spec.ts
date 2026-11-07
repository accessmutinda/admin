import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoginHistory } from './login-history';

describe('Account activity availability', () => {
  it('shows an unavailable state without invented events, devices or revoke actions', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(LoginHistory);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('not available yet');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });
});
