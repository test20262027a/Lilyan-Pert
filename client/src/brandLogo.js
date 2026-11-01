/*
 * The brand mark the loader draws, kept in one place.
 *
 * The loader must show the business's real logo — not a new mark — as early as
 * possible, including on the very first frame after a refresh, before the
 * business record has been fetched. The URL the business saved is therefore
 * remembered locally whenever it is known; every consumer (page boot, admin
 * shell, customer menu) hands it to the same helper, so the loader looks
 * identical everywhere and never flashes a different picture in between.
 *
 * Nothing is recoloured or cropped here: the saved artwork is shown as-is, and
 * `/favicon.svg` (the application's own transparent-safe mark) is only the
 * fallback while a logo is missing or temporarily unreachable.
 */

const KEY = 'lilyan.brand.logo.v1';

export const FALLBACK_LOGO = '/favicon.svg';

export function rememberBrandLogo(url) {
  try {
    if (url) localStorage.setItem(KEY, url);
    else localStorage.removeItem(KEY);
  } catch {
    /* Private mode: the logo simply isn't remembered across refreshes. */
  }
}

export function brandLogoUrl(preferred) {
  if (preferred) return preferred;
  try {
    return localStorage.getItem(KEY) || FALLBACK_LOGO;
  } catch {
    return FALLBACK_LOGO;
  }
}
