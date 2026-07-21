import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
// Parses chai.config.ts at module load and throws the formatted error on an invalid
// config, so `pnpm dev` surfaces it in Vite's overlay. Build-time enforcement is
// separate — see the chai-config-validator plugin in vite.config.ts.
import { config } from './config/config.ts';
import './index.css';
import { applyTheme } from './lib/theme.ts';

// `<title>`, `<html lang>` and a forced `data-theme` are baked into the served HTML
// by the chai-head plugin (flash-free, and visible to crawlers). This applies the
// accent override — which is purely visual, so runtime injection is fine — and
// re-affirms the mode. Must run after `import './index.css'` so the injected accent
// stylesheet lands after the base tokens and wins.
applyTheme(config.theme);

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root is missing from index.html');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
