import { Component, ElementRef, input, output, signal, viewChildren } from '@angular/core';

@Component({
  selector: 'cv-otp-input',
  host: { class: 'block w-full' },
  template: `
    <div class="mx-auto flex max-w-[22.5rem] justify-center gap-2 sm:gap-3" (paste)="onPaste($event)">
      @for (i of indices; track i) {
        <input
          #box
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="1"
          class="h-14 w-0 min-w-0 max-w-12 flex-1 rounded-lg border border-line text-center text-xl font-semibold text-ink outline-none transition-all duration-150 hover:border-slate focus:scale-105 focus:border-teal focus:shadow-card focus:ring-2 focus:ring-teal/25"
          [value]="digits()[i]"
          (input)="onInput(i, $event)"
          (keydown)="onKeydown(i, $event)"
        />
      }
    </div>
  `,
})
export class OtpInput {
  readonly length = input(6);
  readonly valueChange = output<string>();
  readonly complete = output<string>();

  protected readonly digits = signal<string[]>(Array(this.length()).fill(''));
  protected readonly boxRefs = viewChildren<ElementRef<HTMLInputElement>>('box');
  protected readonly indices = Array.from({ length: this.length() }, (_, i) => i);

  reset(): void {
    this.digits.set(Array(this.length()).fill(''));
    this.boxRefs()[0]?.nativeElement.focus();
  }

  protected onInput(index: number, event: Event): void {
    const el = event.target as HTMLInputElement;
    const char = el.value.replace(/[^0-9]/g, '').slice(-1);
    const next = [...this.digits()];
    next[index] = char;
    this.digits.set(next);
    el.value = char;

    if (char && index < this.length() - 1) {
      this.boxRefs()[index + 1]?.nativeElement.focus();
    }
    this.emit();
  }

  protected onKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.digits()[index] && index > 0) {
      const next = [...this.digits()];
      next[index - 1] = '';
      this.digits.set(next);
      this.boxRefs()[index - 1]?.nativeElement.focus();
      event.preventDefault();
      this.emit();
    }
  }

  protected onPaste(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text') ?? '';
    const pasted = text.replace(/[^0-9]/g, '').slice(0, this.length()).split('');
    if (!pasted.length) {
      return;
    }
    event.preventDefault();
    const next = Array(this.length()).fill('');
    pasted.forEach((digit, i) => (next[i] = digit));
    this.digits.set(next);
    const lastIndex = Math.max(Math.min(pasted.length, this.length()) - 1, 0);
    this.boxRefs()[lastIndex]?.nativeElement.focus();
    this.emit();
  }

  private emit(): void {
    const value = this.digits().join('');
    this.valueChange.emit(value);
    if (value.length === this.length() && !value.includes('')) {
      this.complete.emit(value);
    }
  }
}
