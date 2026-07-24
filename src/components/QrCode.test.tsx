import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { strings } from '../strings.ts';
import { QrCode } from './QrCode.tsx';

const PROPS = {
  svgDataUrl: 'data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C/svg%3E',
  alt: 'UPI QR code for shivam@okaxis, amount ₹150',
};

describe('QrCode', () => {
  it('renders the QR with the VPA and amount as its text alternative', () => {
    // The alt text is the QR's fallback for screen readers and for donors whose
    // images fail — it must carry what the symbol encodes (DESIGN.md a11y).
    render(<QrCode {...PROPS} />);
    const image = screen.getByRole('img', { name: PROPS.alt });
    expect(image).toHaveAttribute('src', PROPS.svgDataUrl);
  });

  it('captions the QR with the apps it works in', () => {
    render(<QrCode {...PROPS} />);
    expect(screen.getByText(strings.qrCaption)).toBeInTheDocument();
  });
});
