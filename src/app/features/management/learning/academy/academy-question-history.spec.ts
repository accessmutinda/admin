import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AcademyQuestionEditor } from './academy-question-editor';
import type { AcademyQuestionHistoryEntry } from './academy.generated';
import { emptyAcademy, type AcademyCourse, type AcademyQuestion } from './academy.models';
import { AcademyService } from './academy.service';

@Component({ template: '' })
class ExitPage {}

describe('Saved question version history', () => {
  it('shows both saved draft revisions after reopening the question', async () => {
    const course: AcademyCourse = {
      id: 'course-1',
      title: 'Safeguarding',
      description: 'Report concerns.',
      category: 'Mandatory',
      mandatory: true,
      cpdHours: 1,
      passMark: 80,
      validityMonths: 12,
      status: 'Draft',
      sample: false,
      thumbnailId: '',
      lessons: [],
      version: 2,
      updatedAt: '',
    };
    const revisions: AcademyQuestionHistoryEntry[] = [];
    let questions: AcademyQuestion[] = [];
    const history = vi.fn(async () => structuredClone(revisions));
    const saveBank = vi.fn(async (_id: string, bank: AcademyQuestion[]) => {
      const first = !questions.length;
      course.version++;
      course.updatedAt = new Date(Date.UTC(2026, 10, 12, 9, course.version)).toISOString();
      questions = bank.map((question) => ({
        ...structuredClone(question),
        version: course.version,
        updatedAt: course.updatedAt,
      }));
      revisions.unshift({
        version: course.version,
        at: course.updatedAt,
        by: 'Course author',
        summary: first ? 'Question added' : 'Feedback updated',
      });
      return null;
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'questions/new', component: AcademyQuestionEditor },
          { path: 'questions/:questionId', component: AcademyQuestionEditor },
          { path: 'exit', component: ExitPage },
        ]),
        {
          provide: AcademyService,
          useValue: {
            store: { companyId: () => 'north' },
            api: {
              saving: () => false,
              error: () => '',
              available: () => true,
              scope: () => 'north',
              can: () => true,
              questionHistory: history,
            },
            state: () => emptyAcademy(),
            course: () => course,
            editableCourses: () => [course],
            editableQuestions: () => questions,
            persistQuestionBank: saveBank,
          },
        },
      ],
    });
    const harness = await RouterTestingHarness.create('/questions/new');
    const editor = harness.routeDebugElement!.componentInstance as AcademyQuestionEditor;
    const panel = () => harness.routeNativeElement!.querySelector('.version-history')!;
    const settle = async () => {
      await harness.fixture.whenStable();
      harness.detectChanges();
    };
    const save = async () => {
      const button = [...harness.routeNativeElement!.querySelectorAll('button')].find((item) =>
        item.textContent?.includes('Save Question Bank'),
      )!;
      button.click();
      await settle();
    };
    expect(panel().textContent).toContain('first revision');
    expect(history).not.toHaveBeenCalled();
    Object.assign(editor['draft'], {
      text: 'Who should you contact?',
      options: [
        { id: 'a', text: 'Safeguarding lead' },
        { id: 'b', text: 'No one' },
      ],
      correctIds: ['a'],
      correctFeedback: 'Correct.',
    });
    await save();
    expect(panel().textContent).toContain('Question added');
    editor['draft'].correctFeedback = 'Contact the lead directly.';
    await save();
    expect(saveBank).toHaveBeenCalledTimes(2);
    await harness.navigateByUrl('/exit');
    const reopened = await harness.navigateByUrl(
      '/questions/' + questions[0].id,
      AcademyQuestionEditor,
    );
    await settle();
    expect(reopened['draft'].correctFeedback).toBe('Contact the lead directly.');
    expect(reopened['draft'].correctIds).toEqual(['a']);
    expect(history).toHaveBeenLastCalledWith(course.id, questions[0].id);
    const rows = [...panel().querySelectorAll('tbody tr')];
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('v4 (Current)');
    expect(rows[0].textContent).toContain('Feedback updated');
    expect(rows[1].textContent).toContain('Question added');
    expect(rows.map((row) => row.querySelector('time')?.getAttribute('datetime'))).toEqual(
      revisions.map((revision) => revision.at),
    );
  });
});
