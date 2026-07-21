import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App.tsx';
import { MAKER, MAKER_PROJECT } from './project.ts';
import { strings } from './strings.ts';

/**
 * Page-assembly smoke test (P0.2, P0.10): the example config drives a page with the
 * right landmarks, a locked-brand masthead, a skip link straight to payment, and the
 * template links in both masthead and footer. The individual sections have their own
 * unit tests; this one guards the wiring and the landmark contract.
 */
describe('App', () => {
  it('assembles masthead, identity, payment and footer behind proper landmarks', () => {
    render(<App />);

    expect(screen.getByRole('link', { name: strings.skipToPayment })).toHaveAttribute(
      'href',
      '#chai-pay',
    );

    // The masthead is the banner and carries the locked wordmark; the creator name is
    // the page's single h1; main and contentinfo complete the landmark set.
    expect(screen.getByRole('banner')).toHaveTextContent(strings.brandName);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();

    // The payment card is present; the repo is credited in the footer (and linked
    // as the masthead CTA), and the maker support link lives in the footer only.
    expect(screen.getByRole('heading', { name: strings.paymentCardTitle })).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: strings.externalLink(strings.poweredBy(MAKER_PROJECT.name)),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: strings.externalLink(strings.supportMaker(MAKER.name)) }),
    ).toBeInTheDocument();
  });
});
