import { TestBed } from '@angular/core/testing';
import { LanguageField } from './language-field';

describe('Language field', () => {
  function create(value = '') {
    const fixture = TestBed.createComponent(LanguageField);
    fixture.componentRef.setInput('inputId', 'input-primaryLanguage');
    fixture.componentRef.setInput('value', value);
    fixture.detectChanges();
    return fixture;
  }

  it('searches living languages and can add a name that is not listed', () => {
    const fixture = create();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'swah';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Swahili');
    expect(text).toContain('Add “swah”');
    const added: string[] = [];
    fixture.componentInstance.valueChange.subscribe((value) => added.push(value));
    input.value = 'Household signing';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('li') as HTMLElement).dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true }),
    );
    expect(added).toEqual(['Household signing']);
  });

  it('selects the catalogue name when the search matches exactly', () => {
    const fixture = create('English');
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('English');
    input.dispatchEvent(new Event('focus'));
    input.value = 'british sign';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const option = [...fixture.nativeElement.querySelectorAll('li')].find((item) =>
      (item.textContent ?? '').includes('British Sign Language'),
    ) as HTMLElement;
    const added: string[] = [];
    fixture.componentInstance.valueChange.subscribe((value) => added.push(value));
    option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(added).toEqual(['British Sign Language']);
  });
});
