/**
 * Copies text to the clipboard (P0.7), returning whether it succeeded.
 *
 * The one clipboard-touching module, kept as a mockable seam like `download.ts`
 * (ADR-004) so components test the copy *flow* without stubbing browser APIs.
 * Nothing here touches the network — the VPA never leaves the device.
 *
 * Two paths, in order:
 *  1. The async Clipboard API — the modern, permissioned path.
 *  2. A hidden `<textarea>` + `document.execCommand('copy')` — deprecated but the
 *     only synchronous fallback, and the one that still works in the insecure
 *     contexts (plain `http://`, some in-app WebViews) where the async API is
 *     absent or rejects. DESIGN.md calls for exactly this select-all fallback.
 */

const legacyCopy = (text: string): boolean => {
  if (typeof document === 'undefined') return false;

  const area = document.createElement('textarea');
  area.value = text;
  area.readOnly = true;
  area.setAttribute('aria-hidden', 'true');
  // Kept on-screen but invisible: iOS Safari will not select a truly off-screen
  // node, and `display:none`/`hidden` cannot be selected at all.
  area.style.position = 'fixed';
  area.style.top = '0';
  area.style.left = '0';
  area.style.opacity = '0';
  area.style.pointerEvents = 'none';
  document.body.appendChild(area);
  area.focus();
  area.select();

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }
  area.remove();
  return copied;
};

export const copyText = async (text: string): Promise<boolean> => {
  const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
  if (clipboard && typeof clipboard.writeText === 'function') {
    try {
      await clipboard.writeText(text);
      return true;
    } catch {
      // Insecure context or a denied permission — fall through to the legacy path.
    }
  }
  return legacyCopy(text);
};
