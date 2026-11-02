/**
 * Installation and display-mode wiring.
 *
 * The installed app is a real PWA, not a browser shortcut: `/manifest.webmanifest`
 * declares `display: "standalone"` with `/` as both start URL and scope, so
 * Android Chrome installs it as its own application with no address bar, and
 * every in-app route stays inside the installed window.
 *
 * Registering the service worker at startup is the other half of installability —
 * the browser only offers a genuine installation for a site that already owns a
 * worker — and it also means push notifications can be enabled without a reload.
 * Registration failures are ignored on purpose: the panel works without it.
 */
export function registerServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (!window.isSecureContext) return;

  const register = () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

/**
 * True only when the page really runs inside an installed application window.
 * It reflects the browser's own answer, so a normal browser tab is never dressed
 * up as an installed app; CSS can key on `[data-display-mode='standalone']`.
 */
export function applyDisplayMode() {
  const standalone =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = typeof navigator !== 'undefined' && navigator.standalone === true;
  document.documentElement.dataset.displayMode =
    standalone || iosStandalone ? 'standalone' : 'browser';
}
