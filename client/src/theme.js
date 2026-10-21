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

/** Applies a business theme to the document root (light/dark + primary color). */
export function applyTheme(theme) {
  const root = document.documentElement;
  const mode = theme?.mode === 'dark' ? 'dark' : 'light';
  root.dataset.theme = mode;
  root.style.setProperty('--primary', primaryFor(theme));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', primaryFor(theme));
}

export function applyDirection(locale, rtl) {
  const root = document.documentElement;
  root.setAttribute('dir', rtl ? 'rtl' : 'ltr');
  root.setAttribute('lang', locale);
}
