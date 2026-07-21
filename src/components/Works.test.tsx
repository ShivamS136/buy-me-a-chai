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

  it('links each work from its title and shows the description beside it', () => {
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

  /**
   * The title carries the link, not the row (ADR-036) — so the description text is
   * selectable and sits *outside* the anchor. Asserting it is not a link descendant
   * is what stops a future refactor from re-wrapping the row and silently
   * reintroducing the nested-anchor problem.
   */
  it('keeps the description outside the link', () => {
    render(
      <Works works={[{ title: 'Tashn', description: 'A tracker', url: 'https://tashn.app' }]} />,
    );

    const link = screen.getByRole('link', { name: strings.externalLink('Tashn') });
    expect(link).toHaveTextContent('Tashn');
    expect(link).not.toHaveTextContent('A tracker');
  });

  /**
   * `whitespace-pre-line` is the only thing that makes the line breaks `block()`
   * permits actually render, and jsdom applies no CSS — so the class is asserted
   * directly. Without it a multi-line description silently collapses to one run-on.
   */
  it('preserves line breaks in a multi-line description', () => {
    render(
      <Works
        works={[
          {
            title: 'Multi',
            url: 'https://example.com',
            description: 'First line.\nSecond line.',
          },
        ]}
      />,
    );

    const paragraph = screen.getByText(/First line\./);
    expect(paragraph).toHaveTextContent('Second line.');
    expect(paragraph).toHaveClass('whitespace-pre-line');
  });

  it('omits the image when a work has none', () => {
    const { container } = render(
      <Works works={[{ title: 'No image', url: 'https://example.com' }]} />,
    );
    expect(container.querySelector('img')).toBeNull();
  });
});
