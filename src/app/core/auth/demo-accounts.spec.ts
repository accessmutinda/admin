import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { DEMO_PASSWORD, DEMO_MFA_CODE } from './fixtures';
describe('Local demonstration portal accounts', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });
  it('uses the existing MFA flow for each local portal role', () => {
    const auth = TestBed.inject(AuthService);
    for (const [email, role] of [
      ['admin@example.test', 'CA'],
      ['inspector@example.test', 'IN'],
      ['family.0@example.test', 'CW'],
    ]) {
      auth.signIn(email, DEMO_PASSWORD);
      expect(auth.pendingUser()?.roleCode).toBe(role);
      auth.verifyMfa(DEMO_MFA_CODE, false);
      expect(auth.currentUser()?.email).toBe(email);
      auth.signOut();
    }
  });
});
