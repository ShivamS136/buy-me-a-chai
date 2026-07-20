import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UpiQr } from '../hooks/useUpiIntent.ts';
import type { UpiError, UpiIntent } from '../lib/upi.ts';
import { strings, upiErrorStrings } from '../strings.ts';
import { PayZone } from './PayZone.tsx';

// The device branch and the clipboard are the two seams under test — mock both so
// each layout is deterministic and no real Clipboard API is touched.
vi.mock('../hooks/useIsMobile.ts', () => ({ useIsMobile: vi.fn() }));
vi.mock('../lib/clipboard.ts', () => ({ copyText: vi.fn() }));
const { useIsMobile } = await import('../hooks/useIsMobile.ts');
const { copyText } = await import('../lib/clipboard.ts');

const INTENT: UpiIntent = {
  uri: 'upi://pay?pa=shivam@okaxis&pn=Shivam&am=150.00&cu=INR',
  vpa: 'shivam@okaxis',
  name: 'Shivam',
  amount: '150.00',
  note: '',
  exceedsSoftCap: false,
};

const QR: UpiQr = {
  svgDataUrl: 'data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C/svg%3E',
  toPngDataUrl: () => 'data:image/png;base64,AAAA',
};

const setMobile = (mobile: boolean): void => {
  vi.mocked(useIsMobile).mockReturnValue(mobile);
};

beforeEach(() => {
  vi.mocked(copyText).mockResolvedValue(true);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('PayZone — shared', () => {
  it('prompts for an amount when nothing is payable and there are no errors', () => {
    setMobile(false);
    render(<PayZone intent={null} errors={[]} qr={null} />);

    expect(screen.getByText(strings.amountPrompt)).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /UPI QR code/ })).not.toBeInTheDocument();
  });

  it('shows creator-config errors instead of the amount prompt', () => {
    setMobile(false);
    const errors: UpiError[] = [{ code: 'VPA_INVALID_FORMAT', message: 'dev', field: 'vpa' }];
    render(<PayZone intent={null} errors={errors} qr={null} />);

    expect(screen.getByText(upiErrorStrings.VPA_INVALID_FORMAT)).toBeInTheDocument();
    expect(screen.queryByText(strings.amountPrompt)).not.toBeInTheDocument();
  });

  it('shows the resolved amount and VPA together so donors can verify', () => {
    setMobile(false);
    render(<PayZone intent={INTENT} errors={[]} qr={QR} />);
    expect(screen.getByText(strings.payingTo('150', 'shivam@okaxis'))).toBeInTheDocument();
  });
});

describe('PayZone — desktop', () => {
  beforeEach(() => setMobile(false));

  it('leads with the QR and offers Copy UPI ID beneath it', () => {
    render(<PayZone intent={INTENT} errors={[]} qr={QR} />);
    expect(screen.getByRole('img', { name: /UPI QR code for shivam@okaxis/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: strings.copyUpiId })).toBeInTheDocument();
    // The deeplink is mobile-only (P0.6).
    expect(screen.queryByRole('link', { name: strings.payWithUpiApp })).not.toBeInTheDocument();
  });

  it('copies the VPA and confirms with a toast (P0.7)', async () => {
    const user = userEvent.setup();
    render(<PayZone intent={INTENT} errors={[]} qr={QR} />);

    await user.click(screen.getByRole('button', { name: strings.copyUpiId }));

    expect(copyText).toHaveBeenCalledWith('shivam@okaxis');
    expect(await screen.findByText(strings.copyConfirmation('150'))).toBeInTheDocument();
  });

  it('warns and still offers copy when the toast copy fails', async () => {
    vi.mocked(copyText).mockResolvedValue(false);
    const user = userEvent.setup();
    render(<PayZone intent={INTENT} errors={[]} qr={QR} />);

    await user.click(screen.getByRole('button', { name: strings.copyUpiId }));
    expect(await screen.findByText(strings.copyFailed)).toBeInTheDocument();
  });

  it('degrades to a note where the QR would be, keeping copy available', () => {
    // qr === null is the over-capacity case; the copy path must not depend on it.
    render(<PayZone intent={INTENT} errors={[]} qr={null} />);
    expect(screen.getByText(strings.qrUnavailable)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: strings.copyUpiId })).toBeInTheDocument();
  });
});

describe('PayZone — mobile', () => {
  beforeEach(() => setMobile(true));

  it('leads with the deeplink pointed at the exact intent URI (P0.6)', () => {
    render(<PayZone intent={INTENT} errors={[]} qr={QR} />);
    const link = screen.getByRole('link', { name: strings.payWithUpiApp });
    expect(link).toHaveAttribute('href', INTENT.uri);
    expect(screen.getByText(strings.payWithUpiAppHint)).toBeInTheDocument();
  });

  it('keeps Copy UPI ID visible as a peer path (hard rule 3)', () => {
    render(<PayZone intent={INTENT} errors={[]} qr={QR} />);
    expect(screen.getByRole('button', { name: strings.copyUpiId })).toBeInTheDocument();
  });

  it('hides the QR behind an accordion and reveals it on demand', async () => {
    const user = userEvent.setup();
    render(<PayZone intent={INTENT} errors={[]} qr={QR} />);

    const toggle = screen.getByRole('button', { name: new RegExp(strings.showQr) });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('img', { name: /UPI QR code/ })).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('img', { name: /UPI QR code/ })).toBeInTheDocument();
    expect(screen.getByText(strings.showQrHint)).toBeInTheDocument();
  });

  it('surfaces the fallback callout when the deeplink likely failed (P0.6)', () => {
    vi.useFakeTimers();
    try {
      render(<PayZone intent={INTENT} errors={[]} qr={QR} />);
      const link = screen.getByRole('link', { name: strings.payWithUpiApp });
      // Stop jsdom from trying to navigate to the upi:// scheme.
      link.addEventListener('click', (event) => event.preventDefault());

      fireEvent.click(link);
      expect(screen.queryByText(strings.deeplinkFallbackCallout)).not.toBeInTheDocument();

      // The page never went hidden → the intent almost certainly did not open.
      act(() => vi.advanceTimersByTime(1500));
      expect(screen.getByText(strings.deeplinkFallbackCallout)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
