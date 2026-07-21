/**
 * chai.config.ts — this is the only file you need to edit.
 *
 * Every value below drives the page. See docs/CONFIG.md for the full field
 * reference, and docs/SETUP.md for the 15-minute walkthrough.
 *
 * ⚠️  Replace `creator.vpa` with YOUR UPI ID before deploying. The placeholder
 *     below is a valid *format*, so the schema accepts it — but a separate deploy
 *     check rejects it on purpose, so a fresh fork can never publish a page that
 *     points at nobody. Copy-paste the ID from your UPI app; do not type it.
 */

import { defineConfig } from './src/config/schema.ts';

export default defineConfig({
  creator: {
    name: 'Your Name',
    // ⚠️  YOUR UPI ID GOES HERE. Open your UPI app → profile → "UPI ID".
    vpa: 'yourname@bank',
    tagline: 'Building open-source tools ☕',
    // Drop a square image at public/avatar.png, or delete this line for an
    // initials avatar.
    // avatar: '/avatar.png',
    bio: 'I build **open-source** things and write about them. If something here saved you an afternoon, a chai is a lovely way to say thanks.',
    socials: [{ label: 'GitHub', url: 'https://github.com/your-handle' }],
  },

  // Your projects. Replace these with your own — delete the array (or leave it
  // empty) to hide the section entirely.
  works: [
    {
      title: 'My side project',
      description: 'A thing I built and wrote about',
      url: 'https://github.com/your-handle/my-project',
    },
  ],

  chai: {
    // Price of one chai, in whole rupees.
    basePrice: 50,
    // How many chai the one-tap chips offer: 1 × ₹50, 3 × ₹50, 5 × ₹50.
    presets: [1, 3, 5],
    allowCustomAmount: true,
    maxAmountWarning: 100000,
    // Attached to the payment when a donor leaves the message field empty.
    defaultNote: 'Chai for your work',
    allowDonorMessage: true,
  },

  theme: {
    mode: 'auto',
    accent: '#C4622D',
  },

  // Analytics is OFF by default: with no `analytics` block the page makes zero
  // network calls, ever. To turn it on, uncomment this and set VITE_POSTHOG_KEY
  // in your host's environment variables (see docs/SETUP.md).
  //
  // The `?.` is required, not stylistic: `import.meta.env` is undefined when the
  // config is loaded by the plain-Node build check.
  //
  // analytics: {
  //   provider: 'posthog',
  //   apiKey: import.meta.env?.VITE_POSTHOG_KEY,
  // },

  meta: {
    // Defaults to `Buy {creator.name} a chai` when omitted.
    description: 'Support my open-source work — 0% commission, direct UPI.',
    language: 'en',
  },
});
