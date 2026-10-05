import { TestBed } from '@angular/core/testing';
import { OtpInput } from './otp-input';

describe('OtpInput completion', () => {
  function setup() {
    const fixture = TestBed.createComponent(OtpInput);
    fixture.detectChanges();
    const values: string[] = [];
    fixture.componentInstance.complete.subscribe((value) => values.push(value));
    const inputs = Array.from(
      fixture.nativeElement.querySelectorAll('input'),
    ) as HTMLInputElement[];
    return { fixture, values, inputs };
  }
  function type(input: HTMLInputElement, value: string) {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  it('completes only after all six digits and supports retry after reset', () => {
    const { fixture, inputs, values } = setup();
    inputs.slice(0, 5).forEach((input, i) => type(input, String(i + 1)));
    expect(values).toEqual([]);
    type(inputs[5], '6');
    expect(values).toEqual(['123456']);
    fixture.componentInstance.reset();
    fixture.detectChanges();
    inputs.forEach((input) => type(input, '9'));
    expect(values).toEqual(['123456', '999999']);
  });
  it('clears typed digits when verification rejects the completed code immediately', () => {
    const { fixture, inputs } = setup();
    fixture.componentInstance.complete.subscribe(() => fixture.componentInstance.reset());
    inputs.forEach((input) => type(input, '0'));
    fixture.detectChanges();
    expect(inputs.map((input) => input.value)).toEqual(['', '', '', '', '', '']);
  });
  it('does not complete a code containing an empty position', () => {
    const { inputs, values } = setup();
    inputs.slice(1).forEach((input) => type(input, '1'));
    expect(values).toEqual([]);
  });
  it('accepts a pasted code, discards non-digits and emits completion once', () => {
    const { fixture, values } = setup();
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: { getData: () => '123 456' } });
    fixture.nativeElement.querySelector('[role=group]').dispatchEvent(event);
    expect(values).toEqual(['123456']);
    expect(event.defaultPrevented).toBe(true);
  });
});
