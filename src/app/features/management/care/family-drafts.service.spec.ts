import { FamilyDrafts } from './family-drafts.service';

describe('Family message drafts', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => vi.restoreAllMocks());
  it('restores drafts after recreation and isolates account, workspace and recipient keys', () => {
    const drafts = new FamilyDrafts();
    const key = 'cv_family_draft:' + JSON.stringify(['user', 'company', 'client', 'family']);
    expect(drafts.save(key, 'Question for the care team')).toBe(true);
    const restored = new FamilyDrafts();
    expect(restored.read(key)).toBe('Question for the care team');
    for (const parts of [
      ['other', 'company', 'client', 'family'],
      ['user', 'other', 'client', 'family'],
      ['user', 'company', 'other', 'family'],
      ['user', 'company', 'client', 'other'],
    ]) {
      expect(restored.read('cv_family_draft:' + JSON.stringify(parts))).toBe('');
    }
    expect(restored.save(key, '')).toBe(true);
    expect(new FamilyDrafts().read(key)).toBe('');
  });
  it('retains a draft in memory and reports persistence failure when browser storage is full', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Full');
    });
    const drafts = new FamilyDrafts();
    expect(drafts.save('recipient', 'Retain this message')).toBe(false);
    expect(drafts.read('recipient')).toBe('Retain this message');
  });
});
