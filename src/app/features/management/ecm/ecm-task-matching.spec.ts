import { voiceNoteFilename } from './visit-evidence';
import { carePlanVisitTasks } from '../care/care-plan-visit-tasks';

const sections = [
  'Mobility',
  'Personal Care',
  'Continence',
  'Dressing & Grooming',
  'Nutrition & Hydration',
  'Cultural / Religious Needs',
];
function tasks(wording: string, hidden = '') {
  const client: any = {
    id: 'patient',
    file: {
      carePlan: {
        versions: [
          {
            id: 'plan',
            version: '1.0',
            status: 'Approved',
            sections: sections.map((name) => ({
              name,
              required: true,
              visibility: { staff: name !== hidden },
              fields: { assistance: 'Offer agreed support', actions: 'Record the response' },
            })),
          },
        ],
      },
    },
  };
  const visit: any = {
    id: 'visit',
    clientId: 'patient',
    state: 'Published',
    callName: wording,
    tasks: '',
  };
  return carePlanVisitTasks(client, visit);
}
describe('Approved task selection in live visit capture', () => {
  it.each([
    ['Walking support', ['Mobility']],
    ['Hoist transfer', ['Mobility']],
    ['Moving support', ['Mobility']],
    ['Mobility support', ['Mobility']],
    ['Toilet support', ['Personal Care', 'Continence', 'Dressing & Grooming']],
    ['Skin care', ['Personal Care', 'Continence', 'Dressing & Grooming']],
    ['Meal preparation', ['Nutrition & Hydration', 'Cultural / Religious Needs']],
  ])('offers the server-supported care areas for %s', (wording, expected) => {
    expect([...new Set(tasks(wording as string).map((task) => task.section))].sort()).toEqual(
      [...expected].sort(),
    );
  });
  it('retains the staff visibility boundary and stable approved task identities', () => {
    expect(tasks('Walking support', 'Mobility')).toEqual([]);
    const selected = tasks('Walking support');
    expect(selected).toHaveLength(2);
    expect(selected.map((task) => task.taskId)).toEqual([
      'plan:Mobility:assistance:0',
      'plan:Mobility:actions:0',
    ]);
  });
});

describe('Recorded visit media filenames', () => {
  it.each([
    ['audio/webm;codecs=opus', 'voice-note.webm'],
    ['audio/ogg', 'voice-note.ogg'],
    ['audio/wav', 'voice-note.wav'],
  ])('preserves the supported recording format %s', (mime, filename) => {
    expect(voiceNoteFilename(mime)).toBe(filename);
  });
  it('reports unsupported browser formats before attempting upload', () => {
    expect(() => voiceNoteFilename('audio/mp4')).toThrow('unsupported');
  });
});
