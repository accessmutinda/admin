import { carePlanVisitTasks, CarePlanTaskResult } from '../care/care-plan-visit-tasks';
import { ApprovedCareInstructions } from '../care/approved-care-instructions';
import { CareService } from '../care/care.service';
import { computed } from '@angular/core';
import { Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { EcmService } from './ecm.service';
import { EcmEvidence } from './ecm.models';

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((event: { results: { isFinal: boolean; [key: number]: { transcript: string } }[] }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
@Component({
  selector: 'cv-visit-evidence',
  imports: [ApprovedCareInstructions, FormsModule, MatSelectModule, CvSelect],
  template: ` @if (careVisit(); as visit) {
      <cv-approved-care-instructions [clientId]="visit.clientId" [visitId]="visit.id" />
    }
    <form (ngSubmit)="save()" novalidate>
      @if (tasks().length) {
        <section class="visit-task-capture">
          <h3>
            {{
              service.connected
                ? 'Approved care-plan tasks'
                : 'Approved care-plan tasks · demo evidence'
            }}
          </h3>
          <p>
            Record the tasks you carried out. Each result retains its approved plan version for the
            next review.
          </p>
          @for (task of tasks(); track task.taskId; let i = $index) {
            <article>
              <strong>{{ task.section }} · v{{ task.planVersion }}</strong>
              <p>{{ task.instruction }}</p>
              <label
                >Task outcome<select
                  [name]="'task-outcome-' + i"
                  [(ngModel)]="outcomes[task.taskId]"
                >
                  <option value="">Not recorded</option>
                  <option>Completed</option>
                  <option>Not completed</option>
                  <option>Concern</option>
                </select></label
              >
              @if (outcomes[task.taskId]) {
                <label
                  >Task evidence / follow-up
                  {{ outcomes[task.taskId] === 'Completed' ? '(optional)' : '(required)'
                  }}<textarea
                    rows="2"
                    [name]="'task-note-' + i"
                    [(ngModel)]="taskNotes[task.taskId]"
                  ></textarea>
                </label>
              }
            </article>
          }
        </section>
      }

      <div class="panel-body form-grid">
        <p class="full-width">
          {{
            service.connected
              ? 'Record actual care evidence. Submitted notes and scanned attachments are saved to the company record.'
              : 'Demo capture · use sample details. Nothing is sent to a care service or saved to a phone gallery by this page.'
          }}
        </p>
        @if (error()) {
          <p class="ecm-error full-width" role="alert">{{ error() }}</p>
        }
        <label class="full-width"
          >Evidence type<mat-select
            cvSelect
            name="type"
            aria-label="Evidence type"
            [(ngModel)]="type"
          >
            @for (t of types; track t) {
              <mat-option [value]="t">{{ t }}</mat-option>
            }
          </mat-select></label
        >
        <div class="row full-width evidence-actions">
          <button type="button" class="button" (click)="startCamera()">Take photo</button
          ><button
            type="button"
            class="button"
            [disabled]="service.connected"
            (click)="samplePhoto()"
          >
            Use sample photo</button
          ><button type="button" class="button" (click)="recording() ? stopVoice() : startVoice()">
            {{ recording() ? 'Stop recording' : 'Record voice note' }}</button
          ><button type="button" class="button" (click)="dictating() ? stopDictation() : dictate()">
            {{ dictating() ? 'Stop dictation' : 'Speech-to-text' }}</button
          ><button
            type="button"
            class="button"
            [disabled]="service.connected"
            (click)="
              note =
                'Sample note: Breakfast prepared, medication prompt given and wellbeing checked. No concerns observed.'
            "
          >
            Insert demo transcript
          </button>
        </div>
        @if (camera()) {
          <div class="full-width evidence-camera">
            <video
              [srcObject]="camera()"
              autoplay
              playsinline
              muted
              aria-label="Camera preview"
            ></video>
            <div class="row">
              <button type="button" class="button primary" (click)="capture()">Capture photo</button
              ><button type="button" class="button" (click)="stopCamera()">Cancel camera</button>
            </div>
          </div>
        }
        <label class="full-width"
          >{{
            service.connected
              ? 'Upload photo (optional, up to 500 KB)'
              : 'Upload sample photo (optional, up to 500 KB)'
          }}<input
            #fileInput
            type="file"
            accept="image/png,image/jpeg,image/webp"
            (change)="upload($event)"
        /></label>
        @if (photo()) {
          <div class="full-width">
            <img
              class="evidence-preview"
              [src]="photo()"
              alt="Photo awaiting evidence submission"
            /><button
              class="button"
              type="button"
              (click)="photo.set(''); photoName = ''; fileInput.value = ''"
            >
              Remove photo
            </button>
          </div>
        }
        @if (recording()) {
          <p class="full-width" role="status">Recording voice note · maximum 60 seconds</p>
        }
        @if (audio()) {
          <div class="full-width">
            <audio controls [src]="audio()" aria-label="Voice note awaiting submission"></audio
            ><button type="button" class="button" (click)="audio.set(''); audioName = ''">
              Remove recording
            </button>
          </div>
        }
        <label class="full-width"
          >Care note / reviewed transcript (required)<textarea
            name="note"
            rows="4"
            [(ngModel)]="note"
            required
          ></textarea>
        </label>
        <p class="full-width">
          {{
            service.connected
              ? 'Review dictation before saving. Browser speech-to-text may use its provider.'
              : 'Review dictation before saving. Browser speech-to-text may use its provider; demo transcript works without microphone access.'
          }}
        </p>
        <label class="check-label full-width"
          ><input type="checkbox" name="consent" [(ngModel)]="consent" />Consent, care-plan
          permission and a necessary purpose confirmed for this photo</label
        >
        @if (type !== 'Care note') {
          <p class="full-width">
            This concern creates a manager review case. Sensitive photos stay hidden from
            non-manager roles in this demo.
          </p>
        }
      </div>
      <div class="form-footer">
        <button type="button" class="button" (click)="cancelled.emit()">Cancel</button
        ><button
          class="button primary"
          type="submit"
          [disabled]="busy() || recording() || dictating()"
        >
          {{ busy() ? 'Preparing evidence…' : 'Review and submit' }}
        </button>
      </div>
    </form>`,
  styles: [
    `
      :host {
        display: block;
      }
      .visit-task-capture {
        margin: 14px;
        padding: 16px;
        border: 1px solid #d9e9e7;
        border-radius: 8px;
        background: var(--color-teal-50);
      }
      .visit-task-capture h3 {
        margin: 0;
        color: var(--color-navy);
        font-size: 15px;
      }
      .visit-task-capture p {
        margin: 8px 0;
        font-size: 12px;
        line-height: 1.5;
      }
      .visit-task-capture article {
        margin-top: 12px;
        padding: 12px;
        background: white;
        border-radius: 6px;
      }
      .visit-task-capture strong {
        color: var(--color-teal-600);
        font-size: 11px;
      }
      .visit-task-capture label {
        display: grid;
        gap: 6px;
        margin-top: 10px;
        font-size: 12px;
      }
      .visit-task-capture select,
      .visit-task-capture textarea {
        padding: 8px;
        font: inherit;
        border: 1px solid #d7e4e7;
        border-radius: 5px;
        width: 100%;
        box-sizing: border-box;
      }
      .evidence-actions {
        flex-wrap: wrap;
      }
      .evidence-camera video,
      .evidence-preview {
        max-height: 220px;
        width: 100%;
        object-fit: contain;
        border-radius: 8px;
      }
      .evidence-camera {
        display: grid;
        gap: 8px;
      }
      .ecm-error {
        color: #b42318;
        background: #fff1f0;
        padding: 10px;
        border-radius: 8px;
      }
      audio {
        width: 100%;
        margin-bottom: 8px;
      }
    `,
  ],
})
export class VisitEvidence {
  private readonly care = inject(CareService);
  protected readonly careVisit = computed(() =>
    this.care.rota.data().visits.find((v) => v.id === this.visitId()),
  );
  protected readonly tasks = computed(() => {
    const visit = this.careVisit();
    const client = visit && this.care.client(visit.clientId);
    return visit && client && this.service.canCaptureEvidence(visit.id)
      ? carePlanVisitTasks(client, visit)
      : [];
  });
  protected outcomes: Record<string, CarePlanTaskResult['outcome'] | ''> = {};
  protected taskNotes: Record<string, string> = {};
  hasUnsavedChanges() {
    return !!(
      this.note.trim() ||
      this.photo() ||
      this.audio() ||
      Object.values(this.outcomes).some(Boolean)
    );
  }
  readonly visitId = input.required<string>();
  readonly saved = output<void>();
  readonly cancelled = output<void>();
  protected readonly service = inject(EcmService);
  protected readonly types: EcmEvidence['type'][] = [
    'Care note',
    'Safeguarding',
    'Wound / skin',
    'Other concern',
  ];
  protected type: EcmEvidence['type'] = 'Care note';
  protected note = '';
  protected consent = false;
  protected photoName = '';
  protected audioName = '';
  protected readonly photo = signal('');
  protected readonly audio = signal('');
  protected readonly camera = signal<MediaStream | null>(null);
  protected readonly recording = signal(false);
  protected readonly dictating = signal(false);
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  private recorder: MediaRecorder | null = null;
  private microphone: MediaStream | null = null;
  private recognition: Recognition | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  private alive = true;
  private session = 0;
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.alive = false;
      this.session++;
      this.stopCamera();
      this.stopVoice();
      this.stopDictation();
    });
  }
  protected async startCamera(): Promise<void> {
    this.error.set('');
    this.stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      if (!this.alive) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.camera.set(stream);
    } catch {
      this.error.set('Camera access is unavailable. Choose a sample photo or upload instead.');
    }
  }
  protected stopCamera(): void {
    this.camera()
      ?.getTracks()
      .forEach((t) => t.stop());
    this.camera.set(null);
  }
  protected capture(): void {
    const video = document.querySelector('cv-visit-evidence video') as HTMLVideoElement | null;
    if (!video?.videoWidth) {
      this.error.set('Wait for the camera preview before capturing.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(640, video.videoWidth);
    canvas.height = Math.round((video.videoHeight * canvas.width) / video.videoWidth);
    canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/jpeg', 0.7);
    if (data.length > 700000) {
      this.error.set('This capture is too large. Try a smaller photo.');
      return;
    }
    this.photo.set(data);
    this.photoName = 'captured-demo-photo.jpg';
    this.stopCamera();
  }
  protected samplePhoto(): void {
    const c = document.createElement('canvas');
    c.width = 480;
    c.height = 240;
    const g = c.getContext('2d')!;
    g.fillStyle = '#e6f7f5';
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#0f2d4a';
    g.font = '600 24px sans-serif';
    g.fillText('Sample visit evidence', 40, 105);
    g.font = '16px sans-serif';
    g.fillText('Demo photo · no service user pictured', 40, 145);
    this.photo.set(c.toDataURL('image/png'));
    this.photoName = 'sample-visit.png';
  }
  protected async upload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;
    this.error.set('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(f.type) || f.size > 500000) {
      this.error.set('Choose a PNG, JPEG or WebP under 500 KB.');
      input.value = '';
      return;
    }
    this.busy.set(true);
    try {
      const data = await this.read(f);
      if (this.alive) {
        this.photo.set(data);
        this.photoName = f.name;
      }
    } catch {
      this.error.set('Could not read this file. Try again.');
    } finally {
      this.busy.set(false);
    }
  }
  private read(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject();
      r.readAsDataURL(blob);
    });
  }
  protected async startVoice(): Promise<void> {
    this.error.set('');
    if (!navigator.mediaDevices || typeof MediaRecorder === 'undefined') {
      this.error.set(
        'Voice recording is unavailable in this browser. Use a typed note or demo transcript.',
      );
      return;
    }
    const session = ++this.session;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!this.alive || session !== this.session) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.microphone = stream;
      const recorder = new MediaRecorder(stream);
      this.recorder = recorder;
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        this.microphone = null;
        this.recording.set(false);
        const blob = new Blob(chunks, { type: recorder.mimeType });
        if (!this.alive || session !== this.session) return;
        if (blob.size > 2000000) {
          this.error.set('This recording exceeds 2 MB. Try a shorter note.');
          return;
        }
        this.busy.set(true);
        try {
          const data = await this.read(blob);
          if (this.alive && session === this.session) {
            this.audio.set(data);
            this.audioName = 'demo-voice-note';
          }
        } catch {
          this.error.set('Could not read the recording. Try again.');
        } finally {
          this.busy.set(false);
        }
      };
      recorder.start();
      this.recording.set(true);
      this.stopTimer = setTimeout(() => this.stopVoice(), 60000);
    } catch {
      this.error.set('Microphone access is unavailable. Use a typed note or demo transcript.');
    }
  }
  protected stopVoice(): void {
    if (this.stopTimer) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    if (this.recorder?.state === 'recording') this.recorder.stop();
    else this.microphone?.getTracks().forEach((t) => t.stop());
    this.recording.set(false);
  }
  protected dictate(): void {
    const scope = window as unknown as {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const Constructor = scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
    if (!Constructor) {
      this.error.set('Speech-to-text is unavailable. Use the demo transcript or type a note.');
      return;
    }
    this.error.set('');
    const r = new Constructor();
    this.recognition = r;
    r.lang = 'en-GB';
    r.continuous = false;
    r.interimResults = false;
    r.onresult = (e) => {
      for (const result of Array.from(e.results)) {
        if (result.isFinal) this.note = `${this.note} ${result[0].transcript}`.trim();
      }
    };
    r.onerror = (e) => {
      this.error.set(`Dictation stopped (${e.error}). Use a typed note or demo transcript.`);
      this.dictating.set(false);
    };
    r.onend = () => this.dictating.set(false);
    try {
      r.start();
      this.dictating.set(true);
    } catch {
      this.error.set('Could not start dictation. Try a typed note.');
    }
  }
  protected stopDictation(): void {
    this.recognition?.stop();
    this.dictating.set(false);
  }
  protected save(): void {
    if (this.busy() || this.recording() || this.dictating()) return;
    const result = this.service.evidence(
      this.visitId(),
      {
        type: this.type,
        note: this.note,
        photo: this.photo(),
        photoName: this.photoName,
        audio: this.audio(),
        audioName: this.audioName,
        transcript: this.note,
        taskResults: this.tasks().length
          ? this.tasks()
              .filter((task) => this.outcomes[task.taskId])
              .map((task) => ({
                ...task,
                outcome: this.outcomes[task.taskId] as CarePlanTaskResult['outcome'],
                note: this.taskNotes[task.taskId] || '',
              }))
          : undefined,
      },
      this.consent,
    );
    const pending = result as string | null | Promise<string | null>;
    const finish = (error: string | null) => {
      this.busy.set(false);
      this.error.set(error || '');
      if (!error) this.saved.emit();
    };
    if (pending instanceof Promise) {
      this.busy.set(true);
      void pending
        .then(finish)
        .catch((error) =>
          finish(error instanceof Error ? error.message : 'Evidence could not be saved.'),
        );
    } else finish(pending);
  }
}
