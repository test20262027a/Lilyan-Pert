export const PRESETS = {
  /* The golden amber identity the brand shipped with, offered as "Default". */
  default: { label: 'Default', primary: '#D9A227' },
  midnight: { label: 'Midnight', primary: '#7C67E4' },
  sunset: { label: 'Sunset', primary: '#F2784B' },
  forest: { label: 'Forest', primary: '#16A34A' },
  ocean: { label: 'Ocean', primary: '#0EA5E9' },
  rose: { label: 'Rose', primary: '#E11D74' },
  amber: { label: 'Amber', primary: '#D97706' },
};

export const DEFAULT_THEME = {
  mode: 'light',
  preset: 'midnight',
  primary: PRESETS.midnight.primary,
};

export function primaryFor(theme) {
  if (!theme) return PRESETS.midnight.primary;
  if (theme.primary) return theme.primary;
  return PRESETS[theme.preset]?.primary || PRESETS.midnight.primary;
}

/**
 * The readable ink for a filled accent surface.
 *
 * A filled button (and every label, icon and badge drawn on it) is meant to be
 * white on a colour: the saturated blues, purples, greens, corals and roses the
 * presets offer all carry white. Only a genuinely pale accent — the golden
 * "Default" preset or a light amber — needs near-black ink, or its label
 * disappears into the surface.
 *
 * The split is therefore a luminance threshold rather than "whichever contrast
 * ratio is numerically higher": the pure ratio comparison flipped the ocean
 * blue (and the sunset coral) to near-black, which is why icons inside the blue
 * action buttons read as dark, off-brand glyphs.
 */
const DARK_INK_MAX_LUMINANCE = 0.35;

function inkFor(hex) {
  const match = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!match) return '#ffffff';
  const value = parseInt(match[1], 16);
  const [r, g, b] = [value >> 16 & 255, value >> 8 & 255, value & 255].map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // White on every saturated accent; near-black only on a pale one.
  return luminance <= DARK_INK_MAX_LUMINANCE ? '#ffffff' : '#171a12';
}

/** Applies a business theme to the document root (light/dark + primary color). */
export function applyTheme(theme) {
  const root = document.documentElement;
  const mode = theme?.mode === 'dark' ? 'dark' : 'light';
  const primary = primaryFor(theme);
  root.dataset.theme = mode;
  root.style.setProperty('--primary', primary);
  // Foreground for every filled accent surface; the design tokens derive the
  // rest of the theme layer from these two values.
  root.style.setProperty('--primary-ink', inkFor(primary));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', primary);
}

export function applyDirection(locale, rtl) {
  const root = document.documentElement;
  root.setAttribute('dir', rtl ? 'rtl' : 'ltr');
  root.setAttribute('lang', locale);
}
