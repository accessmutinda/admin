import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { OnboardingStaffApi, OnboardingPerson } from './onboarding-staff-api.service';
import { newStaff } from './hr.models';

describe('Academy evidence ownership in staff forms', () => {
  it('keeps source certificate rows and filings out of HR update payloads', async () => {
    const person = newStaff() as OnboardingPerson;
    person.id = 'worker';
    person.hr.training = [
      {
        courseId: 'manual',
        completed: '',
        expiry: '',
        assessor: '',
        competency: 'Not assessed',
        certificateId: '',
      },
      {
        courseId: 'academy',
        completed: '2026-11-12',
        expiry: '2027-11-12',
        assessor: 'Provider',
        competency: 'Not assessed',
        certificateId: 'certificate',
        sourceCompletionId: 'filing',
        score: 100,
      },
    ];
    person.documents = [
      { id: 'manual-document', name: 'evidence.pdf', type: 'application/pdf', content: '' },
      {
        id: 'filing',
        name: 'certificate.pdf',
        type: 'application/pdf',
        content: '',
        sourceCertificateId: 'certificate',
      },
    ];
    const response = {
      company_id: 'company',
      version: 1,
      etag: '"v1"',
      person,
      courses: [],
      local_date: '2026-11-12',
      capabilities: {},
      readiness: {},
    };
    const request = vi.fn(
      async (
        _path: string,
        _body?: { training?: { courseId: string }[]; documents?: { id: string }[] },
      ) => response,
    );
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { profile: () => ({ id: 'user' }), api: request } },
        {
          provide: CompanyAccessService,
          useValue: {
            companyId: signal('company'),
            context: () => ({ revision: 1 }),
            can: () => true,
          },
        },
      ],
    });
    const api = TestBed.inject(OnboardingStaffApi);
    TestBed.tick();
    await api.save(person, 'training', '"v1"');
    expect(
      request.mock.calls[0][1]?.training?.map((t: { courseId: string }) => t.courseId),
    ).toEqual(['manual']);
    await api.save(person, 'documents', '"v1"');
    expect(request.mock.calls[1][1]?.documents?.map((d: { id: string }) => d.id)).toEqual([
      'manual-document',
    ]);
  });
});
