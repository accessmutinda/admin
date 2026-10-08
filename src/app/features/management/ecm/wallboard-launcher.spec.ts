import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { WallboardLauncher } from './wallboard-launcher';

describe('Wallboard launch', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));
  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('requests full screen during the click before navigating', () => {
    const order: string[] = [];
    const fullscreen = vi.fn(() => {
      order.push('fullscreen');
      return Promise.resolve();
    });
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: fullscreen,
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockImplementation(() => {
      order.push('navigate');
      return Promise.resolve(true);
    });
    TestBed.inject(WallboardLauncher).open();
    expect(order).toEqual(['fullscreen', 'navigate']);
    expect(navigate).toHaveBeenCalledWith('/manage/ecm/wallboard');
    delete (document.documentElement as any).requestFullscreen;
  });

  it('opens TV mode when the browser denies full screen', async () => {
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: vi.fn(() => Promise.reject(new Error('Unavailable'))),
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    TestBed.inject(WallboardLauncher).open();
    await Promise.resolve();
    expect(navigate).toHaveBeenCalledWith('/manage/ecm/wallboard');
    delete (document.documentElement as any).requestFullscreen;
  });
});
