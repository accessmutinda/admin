import { TestBed } from '@angular/core/testing';
import { CarePlanRichText, CareRichTextValue } from './care-plan-rich-text';
describe('Care-plan formatted fields', () => {
  function setup() {
    const fixture = TestBed.createComponent(CarePlanRichText);
    fixture.componentRef.setInput('label', 'Mobility situation');
    fixture.componentRef.setInput('text', 'Recorded wording');
    fixture.detectChanges();
    return fixture;
  }
  it('preserves the active editor DOM while emitting canonical text and formatting', () => {
    const fixture = setup();
    const editor = fixture.nativeElement.querySelector('.editor-content') as HTMLElement;
    let value: CareRichTextValue | undefined;
    fixture.componentInstance.valueChange.subscribe((v) => (value = v));
    editor.dispatchEvent(new Event('focus'));
    editor.innerHTML = '<b>Agreed wording</b>';
    const node = editor.firstChild;
    editor.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(editor.firstChild).toBe(node);
    expect(value).toEqual({ text: 'Agreed wording', html: '<b>Agreed wording</b>' });
  });
  it('sanitizes stored formatting and disables mutation on read-only versions', () => {
    const fixture = setup();
    fixture.componentRef.setInput('html', '<script>alert(1)</script><b>Recorded</b>');
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('script')).toBeNull();
    expect(fixture.nativeElement.querySelector('.editor-content b')).toBeTruthy();
    const emit = vi.spyOn(fixture.componentInstance.valueChange, 'emit');
    fixture.componentInstance.update(document.createElement('div'));
    expect(emit).not.toHaveBeenCalled();
    expect(
      fixture.nativeElement.querySelector('.editor-content').getAttribute('aria-readonly'),
    ).toBe('true');
  });
});
