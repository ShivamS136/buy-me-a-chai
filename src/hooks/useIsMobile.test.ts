import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COARSE_POINTER_QUERY } from '../lib/device.ts';
import { useIsMobile } from './useIsMobile.ts';

/** A matchMedia whose `matches` can flip and notify, like a real pointer change. */
const installMatchMedia = () => {
  const state = { matches: false, listeners: new Set<() => void>() };
  const matchMedia = vi.fn((query: string) => ({
    matches: query === COARSE_POINTER_QUERY ? state.matches : false,
    media: query,
    addEventListener: (_: string, cb: () => void) => state.listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => state.listeners.delete(cb),
  }));
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: matchMedia });
  return {
    setCoarse(next: boolean) {
      state.matches = next;
      for (const cb of state.listeners) cb();
    },
  };
};

afterEach(() => {
  Reflect.deleteProperty(window, 'matchMedia');
  vi.restoreAllMocks();
});

describe('useIsMobile', () => {
  it('reflects the current pointer and re-renders when it changes', () => {
    const media = installMatchMedia();
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    // A mouse unplugged from a 2-in-1 (or devtools emulation) flips the pointer.
    act(() => media.setCoarse(true));
    expect(result.current).toBe(true);

    act(() => media.setCoarse(false));
    expect(result.current).toBe(false);
  });
});
