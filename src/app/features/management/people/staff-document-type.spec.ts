import { TestBed } from '@angular/core/testing';
import { StaffDocumentType } from './staff-document-type';

describe('Staff document type picker', () => {
  function open(value = 'Other Records') {
    const fixture = TestBed.createComponent(StaffDocumentType);
    fixture.componentRef.setInput('value', value);
    const changed = vi.fn();
    fixture.componentInstance.typeChange.subscribe(changed);
    fixture.detectChanges();
    return { fixture, changed };
  }
  it('offers specific document types and preserves existing saved labels', async () => {
    const { fixture, changed } = open('Employment & HR');
    await fixture.whenStable();
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    expect(select.value).toBe('Employment & HR');
    expect(select.textContent).toContain('Employment contract');
    select.value = 'Employment contract';
    select.dispatchEvent(new Event('change'));
    expect(changed).toHaveBeenCalledWith('Employment contract');
  });
  it('accepts a custom type and requires a nonblank name', async () => {
    const { fixture, changed } = open();
    await fixture.whenStable();
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    select.value = '__custom__';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.disabled).toBe(true);
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.value = '  Signed consent form  ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    button.click();
    expect(changed).toHaveBeenCalledWith('Signed consent form');
  });
  it('disables changes while saving or when access is read-only', async () => {
    const { fixture, changed } = open();
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    await fixture.whenStable();
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    expect(select.disabled).toBe(true);
    select.value = 'Passport';
    select.dispatchEvent(new Event('change'));
    expect(changed).not.toHaveBeenCalled();
  });
});
