import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { ManagementStore } from '../shared/management.store';
import { People } from './people';

interface LeaveSearch {
  leaveSearch: string;
  searchLeave(): void;
  clearLeaveSearch(): void;
  filteredLeaves(): { id: string }[];
  reviewSearch: string;
  searchReviews(): void;
  clearReviewSearch(): void;
  filteredReviews(): { id: string; status: string }[];
  completeReview(id: string): void;
}

describe('People record searches', () => {
  let editor: LeaveSearch;
  let store: ManagementStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [People],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { data: { section: 'leave' } } } },
      ],
    }).overrideComponent(People, { set: { template: '' } });
    TestBed.inject(AuthService).signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    store = TestBed.inject(ManagementStore);
    store.update((data) => ({
      ...data,
      reviews: [
        {
          id: 'supervision',
          person: 'James Carter',
          type: 'Supervision',
          date: '2026-10-12',
          status: 'Scheduled',
        },
        {
          id: 'appraisal',
          person: 'Maria Lopez',
          type: 'Annual appraisal',
          date: '2026-11-02',
          status: 'Completed',
        },
      ],
      leaves: [
        {
          id: 'annual',
          person: 'James Carter',
          type: 'Annual leave',
          start: '2026-10-12',
          end: '2026-10-15',
        },
        {
          id: 'training',
          person: 'Maria Lopez',
          type: 'Training',
          start: '2026-11-02',
          end: '2026-11-02',
        },
      ],
    }));
    editor = TestBed.createComponent(People).componentInstance as unknown as LeaveSearch;
  });

  it('submits case-insensitive searches by person, type and date without changing records', () => {
    for (const [query, expected] of [
      ['  JAMES  ', 'annual'],
      ['training', 'training'],
      ['2026-10-15', 'annual'],
    ]) {
      editor.leaveSearch = query;
      editor.searchLeave();
      expect(editor.filteredLeaves().map((entry) => entry.id)).toEqual([expected]);
    }
    expect(store.data().leaves).toHaveLength(2);
  });

  it('keeps the submitted results while typing and restores all records when cleared', () => {
    editor.leaveSearch = 'unknown';
    editor.searchLeave();
    expect(editor.filteredLeaves()).toEqual([]);
    editor.leaveSearch = 'James';
    expect(editor.filteredLeaves()).toEqual([]);
    editor.clearLeaveSearch();
    expect(editor.leaveSearch).toBe('');
    expect(editor.filteredLeaves()).toHaveLength(2);
  });
  it('searches reviews by person, type, date and status without changing saved records', () => {
    for (const [query, expected] of [
      [' JAMES ', 'supervision'],
      ['appraisal', 'appraisal'],
      ['2026-10-12', 'supervision'],
      ['completed', 'appraisal'],
    ]) {
      editor.reviewSearch = query;
      editor.searchReviews();
      expect(editor.filteredReviews().map((entry) => entry.id)).toEqual([expected]);
    }
    expect(store.data().reviews).toHaveLength(2);
  });

  it('updates status-filtered results when completing a review and clears the search', () => {
    editor.reviewSearch = 'scheduled';
    editor.searchReviews();
    expect(editor.filteredReviews()).toHaveLength(1);
    editor.completeReview('supervision');
    expect(editor.filteredReviews()).toEqual([]);
    expect(store.data().reviews[0].status).toBe('Completed');
    editor.clearReviewSearch();
    expect(editor.reviewSearch).toBe('');
    expect(editor.filteredReviews()).toHaveLength(2);
  });
});
