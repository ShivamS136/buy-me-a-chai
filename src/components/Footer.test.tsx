import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MAKER, MAKER_PROJECT } from '../project.ts';
import { strings } from '../strings.ts';
import { Footer } from './Footer.tsx';

describe('Footer', () => {
  it('credits the project repo and discloses where money goes', () => {
    render(<Footer />);

    const link = screen.getByRole('link', {
      name: strings.externalLink(strings.poweredBy(MAKER_PROJECT.name)),
    });
    // Referral params are appended, so the repo URL is the href's prefix.
    expect(link.getAttribute('href')).toContain(MAKER_PROJECT.repoUrl);
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText(strings.footerDisclosure)).toBeInTheDocument();
  });

  it('carries the maker support link as a safe new-tab external link', () => {
    render(<Footer />);

    const support = screen.getByRole('link', {
      name: strings.externalLink(strings.supportMaker(MAKER.name)),
    });
    expect(support.getAttribute('href')).toContain(MAKER.supportUrl);
    expect(support).toHaveAttribute('target', '_blank');
    expect(support).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
