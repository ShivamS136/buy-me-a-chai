import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ChaiWork } from '../config/schema.ts';
import { strings } from '../strings.ts';
import { Works } from './Works.tsx';

describe('Works', () => {
  it('renders nothing when there are no works', () => {
    const { container } = render(<Works works={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders each work as one external link carrying its title and description', () => {
    const works: readonly ChaiWork[] = [
      {
        title: 'Tashn',
        description: 'Workplace foosball tracker',
        url: 'https://tashn.app',
        image: '/works/tashn.png',
      },
    ];
    const { container } = render(<Works works={works} />);

    expect(screen.getByRole('heading', { name: strings.worksHeading })).toBeInTheDocument();
    const link = screen.getByRole('link', { name: strings.externalLink('Tashn') });
    expect(link).toHaveAttribute('href', 'https://tashn.app');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText('Workplace foosball tracker')).toBeInTheDocument();
    expect(container.querySelector('img')?.getAttribute('src')).toContain('works/tashn.png');
  });

  it('omits the image when a work has none', () => {
    const { container } = render(
      <Works works={[{ title: 'No image', url: 'https://example.com' }]} />,
    );
    expect(container.querySelector('img')).toBeNull();
  });
});
