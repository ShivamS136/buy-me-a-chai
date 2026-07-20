import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText } from './clipboard.ts';

/**
 * Two paths: the async Clipboard API and the `execCommand` fallback. jsdom
 * provides neither, so each is installed explicitly. `execCommand` is defined
 * (not spied) because jsdom does not implement it at all.
 */

const setClipboard = (value: unknown): void => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value });
};

const setExecCommand = (impl: () => boolean): ReturnType<typeof vi.fn> => {
  const fn = vi.fn(impl);
  Object.defineProperty(document, 'execCommand', { configurable: true, value: fn });
  return fn;
};

afterEach(() => {
  Reflect.deleteProperty(navigator, 'clipboard');
  Reflect.deleteProperty(document, 'execCommand');
  vi.restoreAllMocks();
});

describe('copyText', () => {
  it('writes through the async Clipboard API when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    await expect(copyText('shivam@okaxis')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('shivam@okaxis');
  });

  it('falls back to execCommand when the async API rejects (insecure context)', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    setClipboard({ writeText });
    const exec = setExecCommand(() => true);

    await expect(copyText('shivam@okaxis')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalled();
    expect(exec).toHaveBeenCalledWith('copy');
    // The temporary textarea must not survive the copy.
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('uses the legacy path when there is no Clipboard API at all', async () => {
    setClipboard(undefined);
    const exec = setExecCommand(() => true);

    await expect(copyText('shivam@okaxis')).resolves.toBe(true);
    expect(exec).toHaveBeenCalledWith('copy');
  });

  it('reports failure when the legacy copy command is rejected by the browser', async () => {
    setClipboard(undefined);
    setExecCommand(() => false);

    await expect(copyText('shivam@okaxis')).resolves.toBe(false);
  });

  it('reports failure — without throwing — when execCommand itself throws', async () => {
    setClipboard(undefined);
    setExecCommand(() => {
      throw new Error('blocked');
    });

    await expect(copyText('shivam@okaxis')).resolves.toBe(false);
    expect(document.querySelector('textarea')).toBeNull();
  });
});
