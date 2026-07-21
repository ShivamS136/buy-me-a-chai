import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ChaiCreator } from '../config/schema.ts';
import { strings } from '../strings.ts';
import { Profile } from './Profile.tsx';

const base: ChaiCreator = { name: 'Asha Rao', vpa: 'asha@okaxis', socials: [] };

describe('Profile', () => {
  it('renders the creator name as the page h1 with the tagline', () => {
    render(<Profile creator={{ ...base, tagline: 'Chai pe charcha?' }} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Asha Rao' })).toBeInTheDocument();
    expect(screen.getByText('Chai pe charcha?')).toBeInTheDocument();
  });

  it('falls back to an initials disc when no avatar is set', () => {
    const { container } = render(<Profile creator={base} />);
    expect(screen.getByText('AR')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  it('renders the avatar resolved against the base when set', () => {
    const { container } = render(<Profile creator={{ ...base, avatar: '/avatar.png' }} />);
    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).toContain('avatar.png');
    // Decorative — the name h1 is the accessible identity.
    expect(img?.getAttribute('alt')).toBe('');
  });

  it('renders social links with a new-tab accessible name and safe rel', () => {
    render(
      <Profile
        creator={{
          ...base,
          socials: [
            { label: 'GitHub', url: 'https://github.com/asha' },
            { label: 'LinkedIn', url: 'https://linkedin.com/in/asha' },
          ],
        }}
      />,
    );

    const github = screen.getByRole('link', { name: strings.externalLink('GitHub') });
    expect(github).toHaveAttribute('href', 'https://github.com/asha');
    expect(github).toHaveAttribute('target', '_blank');
    expect(github).toHaveAttribute('rel', 'noopener noreferrer');
    // Unmapped brand still renders, still labelled (the generic globe path).
    expect(
      screen.getByRole('link', { name: strings.externalLink('LinkedIn') }),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: strings.socialsLabel })).toBeInTheDocument();
  });

  it('omits the socials nav entirely when there are none', () => {
    render(<Profile creator={base} />);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
