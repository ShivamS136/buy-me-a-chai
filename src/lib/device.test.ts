import { afterEach, describe, expect, it, vi } from 'vitest';
import { COARSE_POINTER_QUERY, isMobileDevice, subscribeMobile } from './device.ts';

/**
 * jsdom ships neither `matchMedia` nor `navigator.userAgentData`, which is exactly
 * the ladder `device.ts` walks — so each test installs only the signals it means to
 * exercise and the teardown removes them, leaving the next test at the bare floor.
 */

interface FakeMql {
  matches: boolean;
  readonly listeners: Set<() => void>;
}

const installMatchMedia = (coarse: boolean): FakeMql => {
  const mql: FakeMql = { matches: coarse, listeners: new Set() };
  const matchMedia = vi.fn((query: string) => ({
    matches: query === COARSE_POINTER_QUERY ? mql.matches : false,
    media: query,
    addEventListener: (_: string, cb: () => void) => mql.listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => mql.listeners.delete(cb),
  }));
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: matchMedia });
  return mql;
};

const setUserAgent = (ua: string): void => {
  Object.defineProperty(navigator, 'userAgent', { configurable: true, get: () => ua });
};

const setUserAgentData = (value: unknown): void => {
  Object.defineProperty(navigator, 'userAgentData', { configurable: true, value });
};

afterEach(() => {
  // Delete reverts each shadowed property to its jsdom prototype default.
  Reflect.deleteProperty(window, 'matchMedia');
  Reflect.deleteProperty(navigator, 'userAgent');
  Reflect.deleteProperty(navigator, 'userAgentData');
  vi.restoreAllMocks();
});

describe('isMobileDevice', () => {
  it('trusts the client hint when it positively reports mobile', () => {
    setUserAgentData({ mobile: true });
    // Even against a desktop pointer, a positive client hint settles it.
    installMatchMedia(false);
    expect(isMobileDevice()).toBe(true);
  });

  it('does not settle on a false client hint — a tablet still reads as mobile', () => {
    // userAgentData.mobile is false on tablets; the coarse pointer must decide.
    setUserAgentData({ mobile: false });
    installMatchMedia(true);
    expect(isMobileDevice()).toBe(true);
  });

  it('reads a coarse primary pointer as mobile', () => {
    installMatchMedia(true);
    expect(isMobileDevice()).toBe(true);
  });

  it('reads a fine primary pointer as desktop', () => {
    installMatchMedia(false);
    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
    expect(isMobileDevice()).toBe(false);
  });

  it('falls back to the UA when neither client hint nor matchMedia exists', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile');
    expect(isMobileDevice()).toBe(true);
  });

  it('reads a desktop UA as desktop in the fallback path', () => {
    setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    expect(isMobileDevice()).toBe(false);
  });
});

describe('subscribeMobile', () => {
  it('registers a pointer-change listener and unsubscribes cleanly', () => {
    const mql = installMatchMedia(false);
    const onChange = vi.fn();

    const unsubscribe = subscribeMobile(onChange);
    expect(mql.listeners.size).toBe(1);

    // The store notifies on a real pointer change (mouse plugged into a tablet).
    for (const cb of mql.listeners) cb();
    expect(onChange).toHaveBeenCalledTimes(1);

    unsubscribe();
    expect(mql.listeners.size).toBe(0);
  });

  it('is an inert no-op when matchMedia is absent', () => {
    const unsubscribe = subscribeMobile(vi.fn());
    // Nothing to subscribe to, and tearing down must not throw.
    expect(() => unsubscribe()).not.toThrow();
  });
});
