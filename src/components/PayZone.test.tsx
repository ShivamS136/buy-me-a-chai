import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UpiQr } from '../hooks/useUpiIntent.ts';
import type { UpiError, UpiIntent } from '../lib/upi.ts';
import { strings, upiErrorStrings } from '../strings.ts';
import { PayZone } from './PayZone.tsx';

// The device branch, the clipboard and the file download are the seams under test —
// mock all three so each layout is deterministic and no real Clipboard/anchor is
// touched. Analytics is mocked for the same reason: the pay zone is where all three
// `pay_clicked` methods originate.
vi.mock('../hooks/useIsMobile.ts', () => ({ useIsMobile: vi.fn() }));
vi.mock('../lib/clipboard.ts', () => ({ copyText: vi.fn() }));
vi.mock('../lib/download.ts', () => ({ downloadDataUrl: vi.fn() }));
vi.mock('../analytics/index.ts', () => ({ track: vi.fn() }));
const { useIsMobile } = await import('../hooks/useIsMobile.ts');
const { copyText } = await import('../lib/clipboard.ts');
const { downloadDataUrl } = await import('../lib/download.ts');
const { track } = await import('../analytics/index.ts');

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

describe('PayZone — empty and error states', () => {
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
});

// The layout is now one shape on every device (ADR-046); only the experimental
// deeplink is mobile-only. Run the shared assertions against both branches.
describe.each([
  { label: 'desktop', mobile: false },
  { label: 'mobile', mobile: true },
])('PayZone — $label', ({ mobile }) => {
  beforeEach(() => setMobile(mobile));

  it('shows the resolved amount and VPA together so donors can verify', () => {
    render(<PayZone intent={INTENT} errors={[]} qr={QR} />);
    expect(screen.getByText(strings.payingTo('150', 'shivam@okaxis'))).toBeInTheDocument();
  });

  it('leads with the QR, always visible (ADR-046)', () => {
    render(<PayZone intent={INTENT} errors={[]} qr={QR} />);
    expect(screen.getByRole('img', { name: /UPI QR code for shivam@okaxis/ })).toBeInTheDocument();
  });

  it('puts Copy UPI ID and Save QR in one row, Copy before Save', () => {
    render(<PayZone intent={INTENT} errors={[]} qr={QR} />);
    const copy = screen.getByRole('button', { name: strings.copyUpiId });
    const save = screen.getByRole('button', { name: strings.qrDownload });
    // Save follows Copy in the DOM → same order the donor reads them left to right.
    expect(copy.compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('copies the VPA and confirms with a toast (P0.7)', async () => {
    const user = userEvent.setup();
    render(<PayZone intent={INTENT} errors={[]} qr={QR} />);

    await user.click(screen.getByRole('button', { name: strings.copyUpiId }));

    expect(copyText).toHaveBeenCalledWith('shivam@okaxis');
    expect(await screen.findByText(strings.copyConfirmation('150'))).toBeInTheDocument();
  });

  it('warns and still offers copy when the clipboard write fails', async () => {
    vi.mocked(copyText).mockResolvedValue(false);
    const user = userEvent.setup();
    render(<PayZone intent={INTENT} errors={[]} qr={QR} />);

    await user.click(screen.getByRole('button', { name: strings.copyUpiId }));
    expect(await screen.findByText(strings.copyFailed)).toBeInTheDocument();
  });

  it('saves the QR PNG under the generated filename, encoding only on click (P0.5)', async () => {
    const toPngDataUrl = vi.fn(() => 'data:image/png;base64,AAAA');
    const user = userEvent.setup();
    render(<PayZone intent={INTENT} errors={[]} qr={{ ...QR, toPngDataUrl }} />);

    // Encoding eagerly would rebuild ~14 KB of base64 on every keystroke.
    expect(toPngDataUrl).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: strings.qrDownload }));
    expect(downloadDataUrl).toHaveBeenCalledWith(
      'data:image/png;base64,AAAA',
      'chai-shivam-okaxis-150.png',
    );
  });

  it('degrades to a note where the QR would be, keeping Copy but dropping Save QR', () => {
    // qr === null is the over-capacity case; the copy path must not depend on it,
    // and Save QR has nothing to save.
    render(<PayZone intent={INTENT} errors={[]} qr={null} />);
    expect(screen.getByText(strings.qrUnavailable)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: strings.copyUpiId })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: strings.qrDownload })).not.toBeInTheDocument();
  });
});

describe('PayZone — the experimental deeplink (mobile only)', () => {
  it('offers a quiet, caveated deeplink pointed at the exact intent URI on mobile', () => {
    setMobile(true);
    render(<PayZone intent={INTENT} errors={[]} qr={QR} />);

    const link = screen.getByRole('link', { name: /Pay directly/ });
    expect(link).toHaveAttribute('href', INTENT.uri);
    expect(screen.getByText(strings.payDirectlyWarning)).toBeInTheDocument();
  });

  it('never shows the deeplink on desktop, where a upi:// link is a no-op', () => {
    setMobile(false);
    render(<PayZone intent={INTENT} errors={[]} qr={QR} />);

    expect(screen.queryByRole('link', { name: /Pay directly/ })).not.toBeInTheDocument();
    expect(screen.queryByText(strings.payDirectlyWarning)).not.toBeInTheDocument();
  });
});

describe('PayZone — analytics (P0.11)', () => {
  it('reports the deeplink tap on mobile', () => {
    setMobile(true);
    render(<PayZone intent={INTENT} errors={[]} qr={QR} />);
    const link = screen.getByRole('link', { name: /Pay directly/ });
    // Stop jsdom from trying to navigate to the upi:// scheme.
    link.addEventListener('click', (event) => event.preventDefault());

    link.click();

    expect(track).toHaveBeenCalledExactlyOnceWith({
      name: 'pay_clicked',
      method: 'deeplink',
      amount: 150,
    });
  });

  it('reports a copy on either device', async () => {
    for (const mobile of [true, false]) {
      setMobile(mobile);
      const { unmount } = render(<PayZone intent={INTENT} errors={[]} qr={QR} />);
      await userEvent.click(screen.getByRole('button', { name: strings.copyUpiId }));

      expect(track).toHaveBeenCalledExactlyOnceWith({
        name: 'pay_clicked',
        method: 'copy_vpa',
        amount: 150,
      });
      vi.mocked(track).mockClear();
      unmount();
    }
  });

  it('reports a QR download', async () => {
    setMobile(false);
    render(<PayZone intent={INTENT} errors={[]} qr={QR} />);
    await userEvent.click(screen.getByRole('button', { name: strings.qrDownload }));

    expect(track).toHaveBeenCalledExactlyOnceWith({
      name: 'pay_clicked',
      method: 'qr_download',
      amount: 150,
    });
  });

  it('never emits a qr_view — the QR is always on screen (ADR-047)', () => {
    setMobile(true);
    render(<PayZone intent={INTENT} errors={[]} qr={QR} />);

    expect(screen.getByRole('img', { name: /UPI QR code/ })).toBeInTheDocument();
    expect(track).not.toHaveBeenCalled();
  });
});
