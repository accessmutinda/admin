import { Component, input, output, signal } from '@angular/core';
export interface CareRichTextValue {
  text: string;
  html: string;
}
@Component({
  selector: 'cv-care-plan-rich-text',
  template: `<div class="rich-editor" [class.read-only]="disabled()">
      <div class="toolbar" role="toolbar" [attr.aria-label]="label() + ' formatting'">
        <select
          aria-label="Text style"
          [disabled]="disabled()"
          (change)="format(editor, 'formatBlock', $any($event.target).value)"
        >
          <option value="div">Normal</option>
          <option value="h3">Heading</option>
          <option value="p">Paragraph</option>
        </select>
        @for (tool of visibleTools; track tool[0]) {
          <button
            type="button"
            [attr.aria-label]="tool[1]"
            [title]="tool[1]"
            [disabled]="disabled()"
            (mousedown)="$event.preventDefault()"
            (click)="format(editor, tool[0])"
          >
            <span class="material-symbols-outlined" aria-hidden="true">{{ tool[2] }}</span>
          </button>
        }
        @if (compact()) {
          <button
            type="button"
            class="tool-end"
            aria-label="Copy text"
            title="Copy text"
            (click)="copy()"
          >
            <span class="material-symbols-outlined" aria-hidden="true">content_copy</span>
          </button>
        } @else {
          <button
            type="button"
            class="tool-end"
            [attr.aria-expanded]="guidanceOpen()"
            aria-label="Field guidance"
            title="Field guidance"
            (click)="guidanceOpen.set(!guidanceOpen())"
          >
            <span class="material-symbols-outlined" aria-hidden="true">info</span>
          </button>
        }
      </div>
      <div
        #editor
        class="editor-content"
        role="textbox"
        [attr.aria-label]="label()"
        aria-multiline="true"
        [attr.aria-readonly]="disabled()"
        [attr.contenteditable]="!disabled()"
        [innerHTML]="content"
        (focus)="focus()"
        (blur)="blur()"
        (input)="update(editor)"
      ></div>
    </div>
    @if (guidanceOpen()) {
      <p class="editor-guidance">{{ guidance() }}</p>
    }
    @if (copyStatus()) {
      <span class="copy-status" role="status">{{ copyStatus() }}</span>
    }`,
  styleUrl: './care-plan-rich-text.css',
})
export class CarePlanRichText {
  readonly label = input.required<string>();
  readonly text = input('');
  readonly html = input('');
  readonly disabled = input(false);
  readonly compact = input(false);
  readonly guidance = input(
    'Record the current situation, the person’s choices and the agreed support in clear, practical language.',
  );
  readonly valueChange = output<CareRichTextValue>();
  readonly guidanceOpen = signal(false);
  readonly copyStatus = signal('');
  private focused = false;
  private focusedContent = '';
  private readonly tools = [
    ['bold', 'Bold', 'format_bold'],
    ['italic', 'Italic', 'format_italic'],
    ['underline', 'Underline', 'format_underlined'],
    ['strikeThrough', 'Strikethrough', 'strikethrough_s'],
    ['insertUnorderedList', 'Bullet list', 'format_list_bulleted'],
    ['indent', 'Increase indent', 'format_indent_increase'],
    ['outdent', 'Decrease indent', 'format_indent_decrease'],
    ['removeFormat', 'Clear formatting', 'format_clear'],
    ['createLink', 'Insert link', 'link'],
  ];
  get visibleTools() {
    return this.compact() ? this.tools.slice(0, 4) : this.tools;
  }
  get content() {
    if (this.focused) return this.focusedContent;
    return (
      this.html() ||
      this.text()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>')
    );
  }
  focus() {
    this.focusedContent = this.content;
    this.focused = true;
  }
  blur() {
    this.focused = false;
  }
  update(editor: HTMLElement) {
    if (!this.disabled())
      this.valueChange.emit({
        text: editor.innerText ?? editor.textContent ?? '',
        html: editor.innerHTML,
      });
  }
  format(editor: HTMLElement, command: string, value?: string) {
    if (this.disabled()) return;
    editor.focus();
    if (command === 'createLink') {
      const entered = window.prompt(
        'Link address (https://, http://, mailto: or tel:)',
        'https://',
      );
      if (entered === null) return;
      try {
        const url = new URL(entered.trim());
        if (!['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol)) throw new Error();
        value = url.href;
      } catch {
        this.copyStatus.set('Enter a valid web, email or telephone link.');
        return;
      }
    }
    document.execCommand(command, false, value);
    this.update(editor);
  }
  async copy() {
    try {
      await navigator.clipboard.writeText(this.text());
      this.copyStatus.set('Text copied.');
    } catch {
      this.copyStatus.set('Select the text to copy it.');
    }
  }
}
