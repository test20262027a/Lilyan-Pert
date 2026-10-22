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
 * The readable ink for a filled accent surface. A saturated purple or blue
 * carries white text; a light gold or amber needs dark text, so the choice is
 * made from the colour's relative luminance instead of assuming white.
 */
function inkFor(hex) {
  const match = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!match) return '#ffffff';
  const value = parseInt(match[1], 16);
  const [r, g, b] = [value >> 16 & 255, value >> 8 & 255, value & 255].map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Whichever of white / near-black contrasts more with the accent.
  return 1.05 / (luminance + 0.05) >= (luminance + 0.05) / 0.05 ? '#ffffff' : '#171a12';
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
