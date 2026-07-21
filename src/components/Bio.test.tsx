import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Bio } from './Bio.tsx';

describe('Bio', () => {
  it('renders bold, italics and an external link from the markdown subset', () => {
    render(<Bio bio="I build **open** and _honest_ things — see [repo](https://github.com/x)." />);

    expect(screen.getByText('open').tagName).toBe('STRONG');
    expect(screen.getByText('honest').tagName).toBe('EM');

    const link = screen.getByRole('link', { name: 'repo' });
    expect(link).toHaveAttribute('href', 'https://github.com/x');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders one paragraph per newline-separated block', () => {
    render(<Bio bio={'first line\n\nsecond line'} />);
    expect(screen.getByText('first line')).toBeInTheDocument();
    expect(screen.getByText('second line')).toBeInTheDocument();
  });

  it('renders nothing when the bio is empty after trimming', () => {
    const { container } = render(<Bio bio="   " />);
    expect(container).toBeEmptyDOMElement();
  });
});
