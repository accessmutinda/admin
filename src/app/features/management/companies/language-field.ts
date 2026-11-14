import { Component, effect, input, output, signal } from '@angular/core';
import { WORLD_LANGUAGES } from './world-languages';

const LANGUAGE_LIMIT = 80;
const RESULT_LIMIT = 50;

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase();
}

const LANGUAGE_INDEX = WORLD_LANGUAGES.map((name) => ({ name, key: fold(name) }));

@Component({
  selector: 'cv-language-field',
  host: {
    class: 'language-field',
    '[class.open]': 'open()',
    '(focusout)': 'blur($event)',
  },
  templateUrl: './language-field.html',
  styleUrl: './language-field.css',
})
export class LanguageField {
  readonly inputId = input.required<string>();
  readonly name = input('');
  readonly value = input('');
  readonly required = input(false);
  readonly invalid = input(false);
  readonly describedBy = input('');
  readonly valueChange = output<string>();
  protected readonly query = signal('');
  protected readonly open = signal(false);
  protected readonly active = signal(0);
  private focused = false;

  constructor() {
    effect(() => {
      const value = this.value();
      if (!this.focused) this.query.set(value);
    });
  }

  protected listId(): string {
    return this.inputId() + '-results';
  }

  protected readonly matches = signal<readonly string[]>([]);
  protected readonly canAdd = signal(false);

  protected type(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.query.set(query);
    this.open.set(true);
    this.active.set(0);
    this.refresh(query);
  }

  protected focus(): void {
    this.focused = true;
    this.open.set(true);
    this.refresh(this.query());
  }

  protected blur(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget instanceof Node && event.currentTarget.contains(next))
      return;
    this.focused = false;
    this.open.set(false);
    this.query.set(this.value());
  }

  protected key(event: KeyboardEvent): void {
    const options = this.options();
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.open.set(true);
      if (!options.length) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      this.active.update((index) => (index + step + options.length) % options.length);
      return;
    }
    if (event.key === 'Enter' && this.open()) {
      event.preventDefault();
      const choice = options[this.active()];
      if (choice) this.commit(choice.value);
      return;
    }
    if (event.key === 'Escape') {
      this.open.set(false);
      this.query.set(this.value());
    }
  }

  protected choose(value: string, event: Event): void {
    event.preventDefault();
    this.commit(value);
  }

  protected activeId(): string | null {
    const choice = this.options()[this.active()];
    return choice ? `${this.inputId()}-option-${this.active()}` : null;
  }

  protected options(): { value: string; label: string; add: boolean }[] {
    const options = this.matches().map((name) => ({ value: name, label: name, add: false }));
    if (this.canAdd()) {
      const name = this.query().trim().replace(/\s+/g, ' ');
      options.push({ value: name, label: `Add “${name}”`, add: true });
    }
    return options;
  }

  private commit(value: string): void {
    this.query.set(value);
    this.open.set(false);
    this.focused = false;
    this.valueChange.emit(value);
  }

  private refresh(query: string): void {
    const term = fold(query.trim());
    if (!term) {
      this.matches.set([]);
      this.canAdd.set(false);
      return;
    }
    const starts: string[] = [];
    const contains: string[] = [];
    for (const language of LANGUAGE_INDEX) {
      if (language.key.startsWith(term)) starts.push(language.name);
      else if (language.key.includes(term) && contains.length < 20) contains.push(language.name);
      if (starts.length === RESULT_LIMIT) break;
    }
    this.matches.set([...starts, ...contains].slice(0, RESULT_LIMIT));
    const exact = LANGUAGE_INDEX.some((language) => language.key === term);
    const name = query.trim().replace(/\s+/g, ' ');
    this.canAdd.set(!exact && name.length >= 2 && name.length <= LANGUAGE_LIMIT);
  }
}
