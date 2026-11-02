import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { PLAN_FIELDS, PlanVersion } from './care-plan.models';
import { RotaClient } from '../rota/rota.models';

@Component({
  selector: 'cv-care-plan-about-me',
  imports: [FormsModule, DatePipe],
  templateUrl: './care-plan-about-me.html',
  styleUrl: './care-plan-about-me.css',
})
export class CarePlanAboutMe {
  readonly plan = input.required<PlanVersion>();
  readonly client = input.required<RotaClient>();
  readonly editable = input(false);
  readonly manager = input(false);
  readonly canCopy = input(false);
  readonly completed = input(0);
  readonly actor = input('Care manager');
  readonly action = output<string>();
  readonly panel = signal('');
  readonly photoError = signal('');
  note = '';
  readonly details = [
    ['name', 'Full name', 'text', 'required'],
    ['preferred', 'Preferred name', 'text', ''],
    ['dob', 'Date of birth', 'date', 'required'],
    ['nhs', 'NHS number', 'text', ''],
    ['clientId', 'Client ID', 'text', ''],
    ['address', 'Address', 'text', 'required'],
    ['postcode', 'Postcode', 'text', 'required'],
    ['phone', 'Telephone (home)', 'tel', ''],
    ['mobile', 'Mobile', 'tel', ''],
    ['email', 'Email', 'email', ''],
  ];
  readonly supportFields = PLAN_FIELDS.filter(([key]) => !['situation', 'changes'].includes(key));
  readonly stories = [
    ['situation', 'Tell us about yourself'],
    ['background', 'Background and history'],
    ['family', 'Family & relationships'],
    ['culture', 'Culture & religion'],
    ['lifestyle', 'Interests and hobbies'],
    ['matters', 'What matters most to me'],
  ];
  readonly visibility = [
    {
      key: 'staff' as const,
      label: 'Show to Staff (Carers)',
      hint: 'Visible on mobile app for assigned carers.',
      icon: 'person',
    },
    {
      key: 'family' as const,
      label: 'Show to Family Portal',
      hint: 'Visible to authorised family members.',
      icon: 'group',
    },
    {
      key: 'inspector' as const,
      label: 'Show to Inspector Portal',
      hint: 'Visible to inspectors.',
      icon: 'verified_user',
    },
  ];
  get section() {
    return this.plan().sections[0];
  }
  get photo() {
    return this.plan().details['aboutPhoto'] ?? this.client().file?.photo ?? '';
  }
  value(key: string) {
    return (
      this.plan().details[key] ??
      (
        {
          clientId: this.client().reference,
          postcode: this.client().postcode,
          mobile: this.client().file?.details['mobile'] || '',
        } as Record<string, string>
      )[key] ??
      ''
    );
  }
  change(key: string, value: string) {
    if (!this.editable()) return;
    this.plan().details[key] = value;
    this.plan().confirmed = false;
    this.section.complete = false;
  }
  storyChange(key: string, value: string) {
    if (!this.editable()) return;
    this.section.fields[key] = value;
    this.section.complete = false;
  }
  get contacts() {
    const source = this.client().file?.contacts || [];
    return [
      { title: 'GP', icon: 'medical_services', record: source.find((c) => c.type === 'GP') },
      { title: 'Next of Kin', icon: 'person', record: source.find((c) => c.nextOfKin) },
      {
        title: 'Social Worker',
        icon: 'groups',
        record: source.find((c) => /social worker/i.test(c.relationship)),
      },
      {
        title: 'District Nurse',
        icon: 'clinical_notes',
        record: source.find((c) => /district nurse/i.test(c.relationship)),
      },
      {
        title: 'Other Health Professional',
        icon: 'diversity_1',
        record: source.find(
          (c) => c.type === 'Professional' && !/social worker|district nurse/i.test(c.relationship),
        ),
      },
      {
        title: 'Pharmacy',
        icon: 'local_pharmacy',
        record: source.find((c) => c.type === 'Pharmacy'),
      },
    ];
  }
  get history() {
    return this.plan().events.filter(
      (e) => e.detail.includes('About Me') || e.detail.includes('\"field\":\"details\"'),
    );
  }
  get updated() {
    return this.history.at(-1);
  }
  togglePanel(value: string) {
    this.panel.set(this.panel() === value ? '' : value);
  }
  addNote() {
    if (!this.editable() || !this.note.trim()) return;
    const at = new Date().toISOString();
    this.section.fields['internalNotes'] = [
      this.section.fields['internalNotes'],
      `${at} · ${this.actor()}\n${this.note.trim()}`,
    ]
      .filter(Boolean)
      .join('\n\n');
    this.plan().events.push({
      at,
      by: this.actor(),
      action: 'Internal note added',
      detail: 'About Me: manager-only note added.',
    });
    this.note = '';
    this.action.emit('save');
  }
  async upload(event: Event) {
    const target = event.target as HTMLInputElement,
      file = target.files?.[0];
    this.photoError.set('');
    if (!file || !this.editable()) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
      this.photoError.set('Choose a JPG, PNG or WebP photo up to 1 MB.');
      target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => this.change('aboutPhoto', String(reader.result));
    reader.onerror = () => this.photoError.set('Photo could not be read. Please try again.');
    reader.readAsDataURL(file);
  }
  readonly tools = [
    ['bold', 'Bold', 'format_bold'],
    ['italic', 'Italic', 'format_italic'],
    ['underline', 'Underline', 'format_underlined'],
    ['insertUnorderedList', 'Bullet list', 'format_list_bulleted'],
    ['insertOrderedList', 'Numbered list', 'format_list_numbered'],
    ['outdent', 'Decrease indent', 'format_indent_decrease'],
    ['indent', 'Increase indent', 'format_indent_increase'],
    ['undo', 'Undo', 'undo'],
    ['redo', 'Redo', 'redo'],
    ['removeFormat', 'Clear formatting', 'format_clear'],
  ];
  private introductionFocused = false;
  private introductionDisplay = '';
  startIntroduction() {
    this.introductionDisplay = this.introductionHtml;
    this.introductionFocused = true;
  }
  finishIntroduction() {
    this.introductionFocused = false;
  }
  get introductionHtml() {
    if (this.introductionFocused) return this.introductionDisplay;
    const details = this.plan().details;
    if (
      details['aboutIntroductionText'] === this.section.fields['situation'] &&
      details['aboutIntroductionHtml']
    )
      return details['aboutIntroductionHtml'];
    return (this.section.fields['situation'] || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }
  updateIntroduction(editor: HTMLElement) {
    if (!this.editable()) return;
    const text = editor.innerText ?? editor.textContent ?? '';
    this.storyChange('situation', text);
    this.plan().details['aboutIntroductionText'] = text;
    this.plan().details['aboutIntroductionHtml'] = editor.innerHTML;
  }
  format(editor: HTMLElement, command: string) {
    if (!this.editable()) return;
    editor.focus();
    document.execCommand(command, false);
    this.updateIntroduction(editor);
  }
  async printSection() {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF();
    let y = 18;
    const line = (text: string, heading = false) => {
      pdf.setFontSize(heading ? 13 : 10);
      for (const row of pdf.splitTextToSize(text, 178)) {
        if (y > 280) {
          pdf.addPage();
          y = 18;
        }
        pdf.text(row, 16, y);
        y += 5;
      }
      y += 3;
    };
    line(`${this.client().name} · About Me`, true);
    line(`Care plan v${this.plan().version} · ${this.plan().status}`);
    for (const [key, label] of this.details) line(`${label}: ${this.value(key) || 'Not recorded'}`);
    line(`Preferred language: ${this.value('language') || 'Not recorded'}`);
    for (const [key, label] of this.stories) {
      line(label, true);
      line(this.section.fields[key] || 'Not recorded');
    }
    line(`Review due: ${this.section.review}`);
    pdf.save('care-plan-about-me.pdf');
  }
}
