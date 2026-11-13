import { Component, effect, input, output, signal, untracked, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RotaClient } from '../rota/rota.models';
import { PLAN_FIELDS, PlanSection, PlanVersion, planDate } from './care-plan.models';
import {
  PERSONAL_ASSISTANCE,
  PERSONAL_EQUIPMENT,
  PERSONAL_REVIEW_OUTCOMES,
  isPersonalCareIncident,
} from './care-plan-personal-care.models';
@Component({
  selector: 'cv-care-plan-personal-care',
  imports: [FormsModule, DatePipe],
  templateUrl: './care-plan-personal-care.html',
  styleUrl: './care-plan-personal-care.css',
})
export class CarePlanPersonalCare implements OnDestroy {
  readonly plan = input.required<PlanVersion>();
  readonly client = input.required<RotaClient>();
  readonly approved = input<PlanVersion>();
  readonly previous = input<PlanSection>();
  readonly editable = input(false);
  readonly connected = input(false);
  readonly manager = input(false);
  readonly completed = input(0);
  readonly actor = input('Care manager');
  readonly action = output<string>();
  readonly assistance = PERSONAL_ASSISTANCE;
  readonly equipment = PERSONAL_EQUIPMENT;
  readonly outcomes = PERSONAL_REVIEW_OUTCOMES;
  readonly careFields = PLAN_FIELDS;
  readonly audiences = [
    { key: 'staff' as const, label: 'Staff (Carers)' },
    { key: 'family' as const, label: 'Family Portal' },
    { key: 'inspector' as const, label: 'Inspector Portal' },
  ];
  readonly historyOpen = signal(false);
  readonly notice = signal('');
  readonly error = signal('');
  readonly proposal = signal('');
  readonly decision = signal('Pending');
  readonly proposalEditing = signal(false);
  readonly transcript = signal('');
  readonly transcriptEditing = signal(false);
  readonly listening = signal(false);
  readonly playback = signal<'stopped' | 'playing' | 'paused'>('stopped');
  readonly elapsed = signal(0);
  private version = '';
  private proposalBase = '';
  private recognition: any;
  private utterance: SpeechSynthesisUtterance | null = null;
  private ticker?: number;
  constructor() {
    effect(() => {
      const plan = this.plan();
      if (plan.id === this.version) return;
      this.version = plan.id;
      untracked(() => {
        this.stopRecording();
        this.stopPlayback();
        this.elapsed.set(0);
        this.transcript.set(this.section.fields['personalVoiceTranscript'] || this.seedTranscript);
        this.proposal.set(
          this.section.fields['personalAiDraft'] || this.section.fields['situation'] || '',
        );
        this.decision.set(this.section.fields['personalAiDecision'] || 'Pending');
        this.proposalBase =
          this.section.fields['personalAiBase'] ?? this.section.fields['situation'] ?? '';
        this.proposalEditing.set(false);
        this.transcriptEditing.set(false);
        this.error.set('');
        this.notice.set('');
      });
    });
    effect(() => {
      if (!this.editable()) untracked(() => this.stopRecording());
    });
  }
  get section() {
    return this.plan().sections[1];
  }
  get seedTranscript() {
    return [
      this.section.fields['situation'],
      this.section.fields['preferences'],
      this.section.fields['assistance'],
    ]
      .filter(Boolean)
      .join(' ');
  }
  get lastReview() {
    return (
      this.section.fields['lastReview'] ||
      (this.approved()?.approvedAt || this.plan().approvedAt || this.plan().createdAt).slice(0, 10)
    );
  }
  get outcome() {
    return (
      this.section.fields['reviewOutcome'] ||
      (/^no change/i.test(this.section.fields['changes'] || '')
        ? 'No significant change'
        : 'Not reviewed')
    );
  }
  get skinAssessment() {
    return this.plan().assessments.find((a) => /skin|pressure/i.test(a.name));
  }
  get activeBody() {
    return this.plan().body.filter((b) => b.status !== 'Resolved').length;
  }
  get incidents() {
    return (this.client().file?.entries['incidents'] || []).filter(isPersonalCareIncident);
  }
  get duration() {
    return Math.max(
      1,
      Math.ceil(this.transcript().trim().split(/\s+/).filter(Boolean).length / 2.5),
    );
  }
  get progress() {
    return Math.round((this.completed() / this.plan().sections.length) * 100);
  }
  get history() {
    return this.plan().events.filter((event) => {
      try {
        const detail = JSON.parse(event.detail);
        if (Array.isArray(detail))
          return detail.some(
            (change) =>
              change.field === 'sections' &&
              JSON.stringify(
                change.previous?.find((s: PlanSection) => s.name === 'Personal Care'),
              ) !==
                JSON.stringify(
                  change.current?.find((s: PlanSection) => s.name === 'Personal Care'),
                ),
          );
        return detail.section === 'Personal Care';
      } catch {
        return event.detail.includes('Personal Care') || event.action.includes('Personal Care');
      }
    });
  }
  options(field: 'assistance' | 'equipment') {
    return field === 'assistance' ? this.assistance : this.equipment;
  }
  selected(field: 'assistance' | 'equipment', option: string) {
    return (this.section.fields[field] || '').split('\n').some((line) => line.trim() === option);
  }
  additional(field: 'assistance' | 'equipment') {
    return (this.section.fields[field] || '')
      .split('\n')
      .filter((line) => !this.options(field).includes(line.trim()))
      .join('\n')
      .trim();
  }
  toggle(field: 'assistance' | 'equipment', option: string, checked: boolean) {
    if (!this.editable()) return;
    const custom = this.additional(field);
    const selected = this.options(field).filter((item) =>
      item === option ? checked : this.selected(field, item),
    );
    this.section.fields[field] = [...selected, custom].filter(Boolean).join('\n');
    this.changed();
  }
  updateAdditional(field: 'assistance' | 'equipment', text: string) {
    if (!this.editable()) return;
    this.section.fields[field] = [
      ...this.options(field).filter((option) => this.selected(field, option)),
      text.trim(),
    ]
      .filter(Boolean)
      .join('\n');
    this.changed();
  }
  changed() {
    if (!this.editable()) return;
    this.section.complete = false;
    this.error.set('');
    this.notice.set('');
  }
  setField(field: string, value: string) {
    if (!this.editable()) return;
    if (field === 'situation' && value !== this.section.fields[field]) {
      if (this.section.fields['personalAiDraft']) {
        this.decision.set('Needs regeneration');
        this.section.fields['personalAiDecision'] = 'Needs regeneration';
      } else {
        this.proposal.set(value);
        this.proposalBase = value;
      }
    }
    this.section.fields[field] = value;
    this.changed();
  }
  setRequired(value: boolean) {
    if (!this.editable()) return;
    this.section.required = value;
    if (!value) this.section.fields['reviewOutcome'] = 'Care plan not required';
    this.changed();
  }
  generate() {
    if (this.connected()) {
      this.error.set(
        'A wording provider is not configured. Record the assessed instructions directly.',
      );
      return;
    }
    if (!this.editable()) return;
    const text = this.transcript().trim() || this.section.fields['situation'] || '';
    this.proposalBase = this.section.fields['situation'] || '';
    this.proposal.set(text.replace(/\s+/g, ' ').trim());
    this.decision.set('Pending');
    this.proposalEditing.set(false);
    this.storeProposal();
    this.notice.set(
      'Demo suggestion prepared for Current situation. Check or edit it before accepting.',
    );
  }
  editProposal() {
    if (!this.editable()) return;
    this.proposalEditing.set(!this.proposalEditing());
    if (this.proposalEditing()) {
      this.proposalBase = this.section.fields['situation'] || '';
      this.decision.set('Pending');
      this.storeProposal();
    }
  }
  updateProposal(value: string) {
    if (!this.editable()) return;
    this.proposal.set(value);
    this.decision.set('Pending');
    this.storeProposal();
  }
  private storeProposal() {
    this.section.fields['personalAiDraft'] = this.proposal();
    this.section.fields['personalAiBase'] = this.proposalBase;
    this.section.fields['personalAiDecision'] = this.decision();
    this.changed();
  }
  accept() {
    if (!this.editable() || this.decision() !== 'Pending') return;
    const text = this.proposal().trim();
    if (!text) {
      this.error.set('Enter suggestion wording before accepting.');
      return;
    }
    const previous = this.section.fields['situation'] || '';
    if (previous !== this.proposalBase) {
      this.decision.set('Needs regeneration');
      this.section.fields['personalAiDecision'] = 'Needs regeneration';
      this.error.set(
        'Current situation has changed. Regenerate or edit the suggestion before accepting.',
      );
      return;
    }
    this.section.fields['situation'] = text;
    this.decision.set('Accepted');
    this.proposalEditing.set(false);
    this.storeProposal();
    this.audit('Personal Care AI suggestion accepted', {
      field: 'situation',
      previous,
      current: text,
      source: 'Seeded frontend suggestion',
      transcript: this.transcript(),
    });
    this.notice.set(
      'Suggested wording accepted into Current situation. Review the section and save the draft.',
    );
  }
  reject() {
    if (!this.editable() || !['Pending', 'Needs regeneration'].includes(this.decision())) return;
    this.decision.set('Rejected');
    this.proposalEditing.set(false);
    this.storeProposal();
    this.audit('Personal Care AI suggestion rejected', {
      proposed: this.proposal(),
      source: 'Seeded frontend suggestion',
    });
    this.notice.set('Suggestion rejected. Current care wording has been preserved.');
  }
  private audit(action: string, detail: object) {
    this.plan().events.push({
      at: new Date().toISOString(),
      by: this.actor(),
      action,
      detail: JSON.stringify({ section: 'Personal Care', ...detail }),
    });
  }
  updateTranscript(value: string) {
    if (!this.editable()) return;
    this.stopPlayback();
    this.elapsed.set(0);
    this.transcript.set(value);
    this.section.fields['personalVoiceTranscript'] = value;
    if (this.section.fields['personalAiDraft']) {
      this.decision.set('Needs regeneration');
      this.section.fields['personalAiDecision'] = 'Needs regeneration';
    }
    this.changed();
  }
  toggleRecording() {
    if (!this.editable()) return;
    if (this.listening()) {
      this.stopRecording();
      return;
    }
    const Speech = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Speech) {
      this.transcriptEditing.set(true);
      this.notice.set(
        'Voice recognition is unavailable in this browser. Edit the transcript below, then choose AI Suggest Update.',
      );
      return;
    }
    this.stopPlayback();
    this.stopRecording();
    this.elapsed.set(0);
    this.error.set('');
    const capture = new Speech();
    this.recognition = capture;
    capture.lang = 'en-GB';
    capture.continuous = true;
    capture.interimResults = false;
    let captured = '';
    capture.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal !== false)
          captured += (captured ? ' ' : '') + event.results[i][0].transcript;
      }
      this.updateTranscript(captured);
    };
    capture.onerror = () => {
      this.listening.set(false);
      this.transcriptEditing.set(true);
      this.error.set('Recording stopped. Check microphone permission or edit the transcript.');
    };
    capture.onend = () => this.listening.set(false);
    try {
      capture.start();
      this.listening.set(true);
    } catch {
      this.transcriptEditing.set(true);
      this.error.set('The microphone could not start. You can edit the transcript instead.');
    }
  }
  private stopRecording() {
    if (this.recognition) {
      this.recognition.onresult = null;
      this.recognition.onerror = null;
      this.recognition.onend = null;
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }
    this.listening.set(false);
  }
  togglePlayback() {
    const synth = window.speechSynthesis;
    if (!synth || !(window as any).SpeechSynthesisUtterance) {
      this.notice.set(
        'Read-aloud playback is unavailable in this browser. The transcript is available as text.',
      );
      return;
    }
    if (this.playback() === 'playing') {
      synth.pause();
      this.playback.set('paused');
      return;
    }
    if (this.playback() === 'paused') {
      synth.resume();
      this.playback.set('playing');
      return;
    }
    this.startPlayback(this.elapsed() >= this.duration ? 0 : this.elapsed());
  }
  private startPlayback(seconds: number) {
    const synth = window.speechSynthesis;
    const Utterance = (window as any).SpeechSynthesisUtterance;
    if (!synth || !Utterance) return;
    this.stopPlayback();
    const text = this.transcript();
    const offset = Math.min(text.length - 1, Math.floor((text.length * seconds) / this.duration));
    const utterance = new Utterance(text.slice(Math.max(0, offset)));
    this.utterance = utterance;
    utterance.lang = 'en-GB';
    utterance.onend = () => {
      this.clearTicker();
      this.elapsed.set(this.duration);
      this.playback.set('stopped');
      this.utterance = null;
    };
    utterance.onerror = () => {
      this.clearTicker();
      this.playback.set('stopped');
      this.utterance = null;
      this.notice.set('Read-aloud playback stopped. You can read the transcript as text.');
    };
    this.elapsed.set(seconds);
    this.playback.set('playing');
    this.ticker = window.setInterval(() => {
      if (this.playback() === 'playing')
        this.elapsed.update((value) => Math.min(this.duration, value + 1));
    }, 1000);
    try {
      synth.speak(utterance);
    } catch {
      this.stopPlayback();
      this.notice.set('Read-aloud playback is unavailable. You can read the transcript as text.');
    }
  }
  seek(seconds: number) {
    const position = Math.max(0, Math.min(this.duration, Number(seconds) || 0));
    const playing = this.playback() === 'playing';
    this.stopPlayback();
    this.elapsed.set(position);
    if (playing && position < this.duration) this.startPlayback(position);
  }
  private clearTicker() {
    if (this.ticker !== undefined) {
      window.clearInterval(this.ticker);
      this.ticker = undefined;
    }
  }
  private stopPlayback() {
    this.clearTicker();
    if (this.utterance) {
      this.utterance.onend = null;
      this.utterance.onerror = null;
      window.speechSynthesis?.cancel();
      this.utterance = null;
    }
    this.playback.set('stopped');
  }
  time(seconds: number) {
    return (
      Math.floor(seconds / 60)
        .toString()
        .padStart(2, '0') +
      ':' +
      Math.floor(seconds % 60)
        .toString()
        .padStart(2, '0')
    );
  }
  save(complete: boolean) {
    if (!this.editable()) return;
    if (
      !planDate(this.lastReview) ||
      !planDate(this.section.review) ||
      this.lastReview > this.section.review
    ) {
      this.error.set('Enter valid last and next review dates in date order.');
      return;
    }
    if (complete && this.outcome === 'Not reviewed') {
      this.error.set('Select a review outcome before completing the section.');
      return;
    }
    if (
      complete &&
      this.section.fields['personalAiDraft'] &&
      !['Accepted', 'Rejected'].includes(this.decision())
    ) {
      this.error.set(
        'Accept, reject or regenerate the pending AI suggestion before completing the section.',
      );
      return;
    }
    this.section.fields['lastReview'] = this.lastReview;
    this.section.fields['reviewOutcome'] = this.outcome;
    this.action.emit(complete ? 'complete' : 'save');
  }
  ngOnDestroy() {
    this.stopRecording();
    this.stopPlayback();
  }
}
