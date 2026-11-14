import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { PortalClientContext } from './portal-client-context';
import { PortalClientShell } from './portal-client-shell';

describe('Staff service-user navigation authority', () => {
  const sources = signal<string[]>([]),
    paths = signal<string[]>([]),
    edit = signal(false);
  beforeEach(() => {
    sources.set([]);
    paths.set([]);
    edit.set(false);
    TestBed.configureTestingModule({
      imports: [PortalClientShell],
      providers: [
        provideRouter([]),
        {
          provide: CompanyAccessService,
          useValue: {
            can: () => edit(),
            canPath: (path: string) => paths().includes(path),
          },
        },
      ],
    });
    TestBed.overrideComponent(PortalClientShell, {
      set: {
        providers: [
          {
            provide: PortalClientContext,
            useValue: {
              id: () => 'client',
              client: () => ({
                id: 'client',
                name: 'Assigned person',
                reference: 'SU-1',
                active: true,
                address: '1 Example Road',
                postcode: 'AB1',
              }),
              contacts: () => [],
              staffApi: {
                ready: () => true,
                available: (source: string) => sources().includes(source),
              },
              portal: { care: { rota: { data: () => ({ calls: [] }) } } },
            },
          },
        ],
      },
    });
  });
  it('keeps unavailable source tabs and ungranted admin actions out of the staff workflow', () => {
    const fixture = TestBed.createComponent(PortalClientShell);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Overview');
    expect(text).toContain('Audit trail');
    for (const label of [
      'Edit care profile',
      'Care plan',
      'Documents',
      'Professionals',
      'Client journal',
      'Allocation & follow-up',
    ])
      expect(text).not.toContain(label);
  });
  it('shows source tabs and owning-module links only while the current grants permit them', () => {
    sources.set(['communications', 'journal', 'rostering']);
    paths.set([
      '/manage/clients/client',
      '/manage/care-plans/client',
      '/manage/clients/client/documents',
    ]);
    edit.set(true);
    const fixture = TestBed.createComponent(PortalClientShell);
    fixture.detectChanges();
    let text = fixture.nativeElement.textContent;
    for (const label of [
      'Edit care profile',
      'Care plan',
      'Documents',
      'Professionals',
      'Client journal',
      'Allocation & follow-up',
    ])
      expect(text).toContain(label);
    sources.set([]);
    paths.set([]);
    edit.set(false);
    fixture.detectChanges();
    text = fixture.nativeElement.textContent;
    expect(text).not.toContain('Edit care profile');
    expect(text).not.toContain('Professionals');
    expect(text).not.toContain('Documents');
  });
});
