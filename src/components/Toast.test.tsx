import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Toast } from './Toast.tsx';

describe('Toast', () => {
  it('mounts a polite live region even with nothing to say', () => {
    // The region must be present before the message arrives, so the assistive
    // announcement fires on the content change rather than on the region appearing.
    render(<Toast toast={null} />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toBeEmptyDOMElement();
  });

  it('renders the current message', () => {
    render(<Toast toast={{ text: 'UPI ID copied', id: 1 }} />);
    expect(screen.getByText('UPI ID copied')).toBeInTheDocument();
  });
});
