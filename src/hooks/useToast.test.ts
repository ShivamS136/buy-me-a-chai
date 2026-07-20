import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useToast } from './useToast.ts';

describe('useToast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows a message and clears it after the duration', () => {
    const { result } = renderHook(() => useToast(1000));
    expect(result.current.toast).toBeNull();

    act(() => result.current.showToast('copied'));
    expect(result.current.toast?.text).toBe('copied');

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.toast).toBeNull();
  });

  it('re-announces an identical message by bumping its id', () => {
    // A live region only speaks on content change, so "copied" twice must be a
    // new node — a fresh id is what forces the re-mount.
    const { result } = renderHook(() => useToast(1000));

    act(() => result.current.showToast('copied'));
    const first = result.current.toast?.id;

    act(() => result.current.showToast('copied'));
    expect(result.current.toast?.id).toBe((first ?? 0) + 1);
  });

  it('resets the dismiss timer when a new toast interrupts the old one', () => {
    const { result } = renderHook(() => useToast(1000));

    act(() => result.current.showToast('first'));
    act(() => vi.advanceTimersByTime(600));
    act(() => result.current.showToast('second'));

    // 600ms after the first would have dismissed it; the second restarts the clock.
    act(() => vi.advanceTimersByTime(600));
    expect(result.current.toast?.text).toBe('second');

    act(() => vi.advanceTimersByTime(400));
    expect(result.current.toast).toBeNull();
  });

  it('cancels a pending timer on unmount', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { result, unmount } = renderHook(() => useToast(1000));
    act(() => result.current.showToast('copied'));

    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });
});
