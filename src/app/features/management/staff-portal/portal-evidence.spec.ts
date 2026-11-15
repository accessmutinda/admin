import { TestBed } from '@angular/core/testing';
import { PortalEvidence } from './portal-evidence';

describe('Staff evidence scan status', () => {
  it.each([
    ['quarantined', 'Scanning'],
    ['rejected', 'File blocked'],
    ['infected', 'File blocked'],
  ])('withholds %s files and explains why downloads are disabled', async (state, label) => {
    const fixture = TestBed.createComponent(PortalEvidence);
    const file = { id: 'file', name: 'guidance.pdf', size: 2048, content: '', state };
    const download = vi.fn();
    fixture.componentRef.setInput('files', [file]);
    fixture.componentRef.setInput('downloadHandler', download);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.evidence-file button').disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(label);
    await fixture.componentInstance['download'](file);
    expect(download).not.toHaveBeenCalled();
  });

  it('enables the clean file after its scan and still respects download permission', async () => {
    const fixture = TestBed.createComponent(PortalEvidence);
    const file = {
      id: 'file',
      name: 'guidance.pdf',
      size: 2048,
      content: '',
      state: 'quarantined',
    };
    const download = vi.fn().mockResolvedValue(undefined);
    fixture.componentRef.setInput('files', [file]);
    fixture.componentRef.setInput('downloadHandler', download);
    fixture.detectChanges();
    const clean = { ...file, state: 'clean' };
    fixture.componentRef.setInput('files', [clean]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.evidence-file button').disabled).toBe(false);
    fixture.nativeElement.querySelector('.evidence-file button').click();
    await fixture.whenStable();
    expect(download).toHaveBeenCalledWith(clean);
    fixture.componentRef.setInput('downloadEnabled', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.evidence-file button').disabled).toBe(true);
  });
});
