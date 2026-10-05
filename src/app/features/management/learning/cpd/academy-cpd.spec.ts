import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../../core/auth/auth.service';
import { WorkspaceService } from '../../../../core/auth/workspace.service';
import { ManagementStore } from '../../shared/management.store';
import { AcademyCpd } from './academy-cpd';

interface CpdEditor {
  cpd: { activity: string; hours: number; date: string; reflection: string };
  addCpd(): void;
}

describe('CPD entry ownership', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [AcademyCpd] }).overrideComponent(AcademyCpd, {
      set: { template: '' },
    });
    TestBed.inject(AuthService).signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
  });

  it('saves a webinar reflection to the person selected when the dialog opened', () => {
    const fixture = TestBed.createComponent(AcademyCpd);
    fixture.componentRef.setInput('personId', 'james');
    fixture.componentInstance.open('Webinar reflection');
    fixture.componentRef.setInput('personId', 'aisha');
    const editor = fixture.componentInstance as unknown as CpdEditor;
    editor.cpd.date = '2026-10-05';
    editor.cpd.hours = 0.75;
    editor.cpd.reflection = '  Discuss safer practice with the team.  ';
    editor.addCpd();
    const entries = TestBed.inject(ManagementStore).data().cpd;
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      personId: 'james',
      activity: 'Webinar reflection',
      hours: 0.75,
      reflection: 'Discuss safer practice with the team.',
    });
  });

  it('rejects fractional hours outside quarter-hour increments and removed staff', () => {
    const fixture = TestBed.createComponent(AcademyCpd);
    fixture.componentRef.setInput('personId', 'james');
    fixture.componentInstance.open('Learning activity');
    const editor = fixture.componentInstance as unknown as CpdEditor;
    editor.cpd = {
      activity: 'Learning activity',
      date: '2026-10-05',
      hours: 0.3,
      reflection: 'Reflection',
    };
    const store = TestBed.inject(ManagementStore);
    editor.addCpd();
    expect(store.data().cpd).toHaveLength(0);
    editor.cpd.hours = 0.5;
    store.update((d) => ({ ...d, people: d.people.filter((p) => p.id !== 'james') }));
    editor.addCpd();
    expect(store.data().cpd).toHaveLength(0);
  });
});
