import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LOGIN_HISTORY, TRUSTED_DEVICES } from '../../../core/auth/fixtures';
import { LoginHistory } from './login-history';

describe('Compact login activity', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [LoginHistory], providers: [provideRouter([])] });
  });

  const loadedView = async () => {
    const fixture = TestBed.createComponent(LoginHistory);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 500));
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  };

  it('keeps activity under the active security tab and preserves each event field', async () => {
    const fixture = await loadedView();
    const root: HTMLElement = fixture.nativeElement;
    const tab = root.querySelector('nav a[aria-current="page"]')!;
    expect(tab.getAttribute('href')).toBe('/account/security/login-history');
    expect(root.querySelector('nav a')!.getAttribute('href')).toBe('/account/security');
    const rows = root.querySelectorAll('.activity-events tbody tr');
    expect(rows).toHaveLength(LOGIN_HISTORY.length);
    for (const [index, row] of Array.from(rows).entries()) {
      expect(
        Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent!.trim()),
      ).toEqual([
        LOGIN_HISTORY[index].dateTime,
        LOGIN_HISTORY[index].location,
        LOGIN_HISTORY[index].device,
        LOGIN_HISTORY[index].method,
        LOGIN_HISTORY[index].status,
      ]);
    }
    const devices = root.querySelectorAll('.activity-devices tbody tr');
    expect(devices).toHaveLength(TRUSTED_DEVICES.length);
    for (const [index, row] of Array.from(devices).entries()) {
      const cells = row.querySelectorAll('td');
      expect(cells).toHaveLength(4);
      expect(cells[0].textContent).toContain(TRUSTED_DEVICES[index].name);
      expect(cells[1].textContent!.trim()).toBe(TRUSTED_DEVICES[index].detail);
      expect(cells[2].textContent!.trim()).toBe(TRUSTED_DEVICES[index].addedOn);
    }
  });

  it('requires confirmation, supports cancel and displays an empty devices table after revocation', async () => {
    const before = JSON.stringify({ events: LOGIN_HISTORY, devices: TRUSTED_DEVICES });
    const fixture = await loadedView();
    const root: HTMLElement = fixture.nativeElement;
    const rows = () => root.querySelectorAll('.activity-devices tbody tr');
    rows()[0].querySelector<HTMLButtonElement>('.activity-action')!.click();
    fixture.detectChanges();
    expect(rows()).toHaveLength(TRUSTED_DEVICES.length);
    expect(rows()[0].classList.contains('activity-revoke-pending')).toBe(true);
    rows()[0].querySelector<HTMLButtonElement>('.secondary')!.click();
    fixture.detectChanges();
    expect(rows()[0].classList.contains('activity-revoke-pending')).toBe(false);
    for (const device of TRUSTED_DEVICES) {
      root.querySelector<HTMLButtonElement>(`button[aria-label="Revoke ${device.name}"]`)!.click();
      fixture.detectChanges();
      root
        .querySelector<HTMLButtonElement>(`button[aria-label="Confirm revoke ${device.name}"]`)!
        .click();
      fixture.detectChanges();
    }
    expect(root.querySelector('.activity-devices .empty-cell')!.textContent).toContain(
      'No trusted devices',
    );
    expect(root.querySelectorAll('.activity-events tbody tr')).toHaveLength(LOGIN_HISTORY.length);
    expect(JSON.stringify({ events: LOGIN_HISTORY, devices: TRUSTED_DEVICES })).toBe(before);
  });
});
