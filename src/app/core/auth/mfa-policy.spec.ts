import { effectiveMfa } from './mfa-policy';

describe('MFA policy editor values', () => {
  it('uses the configured role default for inherited policies', () => {
    expect(
      effectiveMfa(
        { email: 'member@example.com', role: 'Care Worker', mfaPolicy: 'inherit' },
        { 'Care Worker': false },
      ),
    ).toBe(false);
  });
  it('applies an explicit override for the policy editor', () => {
    expect(
      effectiveMfa(
        { email: 'member@example.com', role: 'Care Worker', mfaPolicy: 'required' },
        { 'Care Worker': false },
      ),
    ).toBe(true);
    expect(
      effectiveMfa({ email: 'member@example.com', role: 'Care Worker', mfaPolicy: 'not-required' }),
    ).toBe(false);
  });
});
