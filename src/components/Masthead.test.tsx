import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MAKER_PROJECT } from '../project.ts';
import { strings } from '../strings.ts';
import { Masthead } from './Masthead.tsx';

describe('Masthead', () => {
  it('renders the locked brand wordmark inside the page banner', () => {
    render(<Masthead />);

    expect(screen.getByRole('banner')).toHaveTextContent(strings.brandName);
  });

  it('carries only referral-tagged "create your page" CTAs, and no support link', () => {
    render(<Masthead />);
    const banner = screen.getByRole('banner');

    // Two responsive variants render — a labelled pill at `lg`+ and a bare glyph
    // below it — but only one is ever displayed. Both are the same CTA, and it sells
    // the template, so both point at the use-this-template flow.
    const ctas = within(banner).getAllByRole('link', {
      name: strings.externalLink(strings.createYourPage),
    });
    expect(ctas.length).toBeGreaterThan(0);
    for (const cta of ctas) {
      expect(cta.getAttribute('href')).toContain(MAKER_PROJECT.templateUrl);
      expect(cta).toHaveAttribute('rel', 'noopener noreferrer');
    }
    // The labelled variant carries the visible text.
    expect(ctas.some((cta) => cta.textContent?.includes(strings.createYourPage))).toBe(true);

    // Every masthead link is that CTA — the support link is footer-only.
    expect(within(banner).getAllByRole('link')).toHaveLength(ctas.length);
  });

  it('keeps the wordmark a logotype, not a heading', () => {
    // The creator's name downstream is the page's single h1; the wordmark must not
    // introduce a competing heading.
    render(<Masthead />);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
