import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDeeplinkAttempt } from './useDeeplinkAttempt.ts';

/** Drive `document.visibilityState` and fire the event `useDeeplinkAttempt` watches. */
const setVisibility = (state: DocumentVisibilityState): void => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('useDeeplinkAttempt', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setVisibility('visible');
  });
  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(document, 'visibilityState');
  });

  const attempt = (uri = 'upi://pay?pa=a@ok&am=150.00') =>
    renderHook(({ current }) => useDeeplinkAttempt(current, 1500), {
      initialProps: { current: uri },
    });

  it('flags a likely failure when the page never lost visibility', () => {
    const { result } = attempt();
    expect(result.current.likelyFailed).toBe(false);

    act(() => result.current.markAttempt());
    act(() => vi.advanceTimersByTime(1500));

    expect(result.current.likelyFailed).toBe(true);
  });

  it('stays silent when the page went hidden — the app opened', () => {
    const { result } = attempt();

    act(() => result.current.markAttempt());
    act(() => setVisibility('hidden'));
    act(() => vi.advanceTimersByTime(1500));

    expect(result.current.likelyFailed).toBe(false);
  });

  it('treats a window blur as the app taking over (Android intent hand-off)', () => {
    const { result } = attempt();

    act(() => result.current.markAttempt());
    act(() => window.dispatchEvent(new Event('blur')));
    act(() => vi.advanceTimersByTime(1500));

    expect(result.current.likelyFailed).toBe(false);
  });

  it('does not flag before the window elapses', () => {
    const { result } = attempt();

    act(() => result.current.markAttempt());
    act(() => vi.advanceTimersByTime(1400));

    expect(result.current.likelyFailed).toBe(false);
  });

  it('clears the callout on its own when the amount changes the URI', () => {
    const { result, rerender } = attempt('upi://pay?pa=a@ok&am=150.00');

    act(() => result.current.markAttempt());
    act(() => vi.advanceTimersByTime(1500));
    expect(result.current.likelyFailed).toBe(true);

    // A new payable target is a fresh attempt — failure was recorded for the old URI.
    rerender({ current: 'upi://pay?pa=a@ok&am=300.00' });
    expect(result.current.likelyFailed).toBe(false);
  });

  it('restarts the watch when tapped again, discarding a prior verdict', () => {
    const { result } = attempt();

    act(() => result.current.markAttempt());
    act(() => vi.advanceTimersByTime(1500));
    expect(result.current.likelyFailed).toBe(true);

    // Second tap: this time the app opens, so the stale failure must drop.
    act(() => result.current.markAttempt());
    act(() => setVisibility('hidden'));
    act(() => vi.advanceTimersByTime(1500));
    expect(result.current.likelyFailed).toBe(false);
  });

  it('tears down its timer and listeners on unmount', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { result, unmount } = attempt();
    act(() => result.current.markAttempt());

    unmount();
    expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });
});
