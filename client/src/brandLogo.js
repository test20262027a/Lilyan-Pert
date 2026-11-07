/*
 * The brand mark the loader draws, kept in one place.
 *
 * The loader must show the business's real logo — not a new mark — as early as
 * possible, including on the very first frame after a refresh, before the
 * business record has been fetched. Three things make that work:
 *
 *  1. ONE public request. `/api/public/brand` is the login-safe branding
 *     payload (name, logo, theme — no private data). It is fetched once at
 *     startup, before any authenticated call, and every screen that needs it
 *     (`main.jsx` preload, the sign-in family) reuses the same promise instead
 *     of issuing its own request.
 *  2. A remembered URL. Whenever the logo is known it is written to storage and
 *     the in-memory store, so the next visit paints it on the very first frame.
 *  3. A subscription. The loader listens here, so a logo that arrives while the
 *     overlay is already up swaps in place — no reload, no second loader.
 *
 * Nothing is recoloured or cropped: the saved artwork is shown as-is.
 * `NEUTRAL_LOGO` is only the placeholder for the moment before any real logo is
 * known or when the saved one cannot be fetched — never the app's own icon, so
 * a business mark is never replaced by a generic application glyph.
 */

const KEY = 'lilyan.brand.logo.v1';

/** Transparent soft neutral disc: holds the loader's geometry, claims no brand. */
export const NEUTRAL_LOGO = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 88"><circle cx="44" cy="44" r="26" fill="#98a1b3" fill-opacity="0.16"/><circle cx="44" cy="44" r="14" fill="#98a1b3" fill-opacity="0.12"/></svg>',
)}`;

/* The tab icon's mark is a different concern (client/src/favicon.js). */

/* ------------------------------------------------------------------ store -- */

const listeners = new Set();
let remembered = read();

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return '';
    /* Older builds stored the bare URL; both shapes are still readable. */
    if (raw[0] !== '{') return raw;
    const saved = JSON.parse(raw);
    return typeof saved?.url === 'string' ? saved.url : '';
  } catch {
    return '';
  }
}

function emit() {
  for (const listener of listeners) listener();
}

/** The URL the business last saved, or '' when nothing is remembered yet. */
export function brandLogoSnapshot() {
  return remembered;
}

export function subscribeBrandLogo(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Records the business's logo. Called by the public bootstrap (before login)
 * and by the business record (after login, with the owning id), so a changed
 * logo replaces the remembered one immediately and every listener repaints.
 */
export function rememberBrandLogo(url, businessId = null) {
  const next = typeof url === 'string' ? url.trim() : '';
  if (next === remembered) {
    if (next) preloadBrandLogo(next);
    return;
  }
  remembered = next;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify({ url: next, businessId: businessId || null }));
    else localStorage.removeItem(KEY);
  } catch {
    /* Private mode: the logo simply isn't remembered across refreshes. */
  }
  if (next) preloadBrandLogo(next);
  emit();
}

/** Warms the HTTP cache so the logo is already decoded on the next paint. */
export function preloadBrandLogo(url) {
  if (!url) return;
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
  } catch {
    /* Nothing to warm; the <img> below still requests it once. */
  }
}

/**
 * The logo to draw: an explicit URL wins, otherwise the remembered one, and the
 * neutral placeholder is the last resort instead of the application icon.
 */
export function brandLogoUrl(preferred) {
  const url = (typeof preferred === 'string' && preferred.trim()) || remembered;
  return url || NEUTRAL_LOGO;
}

/* -------------------------------------------------- public brand bootstrap -- */

let brandPromise = null;

/**
 * `/api/public/brand` — the sign-in-safe branding payload, fetched once per
 * page load. Failure is not cached, so a later caller may retry.
 */
export function loadPublicBrand() {
  if (!brandPromise) {
    /* Bounded: a request that never answers must not pin this promise forever,
       so a later caller can try again instead of inheriting a hang. */
    const abort = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = abort ? window.setTimeout(() => abort.abort(), 8000) : null;
    brandPromise = fetch('/api/public/brand', {
      credentials: 'include',
      headers: { Accept: 'application/json' },
      signal: abort?.signal,
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('BRAND_UNAVAILABLE'))))
      .then((brand) => {
        rememberBrandLogo(brand?.logo_url);
        return brand;
      })
      .catch((err) => {
        brandPromise = null;
        throw err;
      })
      .finally(() => {
        if (timer) window.clearTimeout(timer);
      });
  }
  return brandPromise;
}

/**
 * Starts the brand request before React mounts, so the logo is on its way while
 * the first frame paints and is drawn by the time the overlay is up.
 */
export function bootstrapBrand() {
  loadPublicBrand().catch(() => {
    /* Offline or the endpoint is down: the neutral placeholder holds the
       loader's layout until a real logo is available. */
  });
}
