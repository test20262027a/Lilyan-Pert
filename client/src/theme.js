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

/*
 * The theme the document is showing right now, mirrored into localStorage.
 *
 * `index.html` reads this synchronously in a head script before the first
 * paint, so a refresh (and the boot splash) already carry the business's real
 * appearance — the default palette is never painted first and replaced
 * afterwards. It is a cache, never a source of truth: the business record
 * stays authoritative and rewrites it on every load.
 *
 * `id` is the business the entry belongs to, so a theme remembered for one
 * business can be recognised as someone else's instead of being trusted.
 */
const CACHE_KEY = 'lilyan.theme.v1';

/*
 * The Android status-bar colour for a theme (meta[name="theme-color"]).
 *
 * Light mode paints the accent itself, so the system status bar carries the
 * business colour the staff picked. Dark mode keeps the same hue but brings it
 * down toward the night canvas: the bar then belongs to the dark interface and
 * the operating system's light status icons keep their contrast on it. Android
 * decides the icon colour from the bar's luminance, so the two modes are kept
 * far enough apart for that decision to come out right in both.
 */
function statusBarColor(primary, mode) {
  const match = /^#?([0-9a-f]{6})$/i.exec(String(primary || '').trim());
  if (!match) return PRESETS.midnight.primary;
  if (mode !== 'dark') return `#${match[1].toUpperCase()}`;
  // The night canvas is #0e1017; the bar keeps 45% of the accent in it.
  const dark = [0x0e, 0x10, 0x17];
  const value = parseInt(match[1], 16);
  const channels = [value >> 16 & 255, value >> 8 & 255, value & 255].map((light, index) =>
    Math.round(light * 0.45 + dark[index] * 0.55),
  );
  return `#${channels.map((n) => n.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

export function rememberTheme(theme, ownerId) {
  try {
    const mode = theme?.mode === 'dark' ? 'dark' : 'light';
    const primary = primaryFor(theme);
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        id: ownerId || null,
        mode,
        primary,
        ink: inkFor(primary),
        bar: statusBarColor(primary, mode),
      }),
    );
  } catch {
    /* Private mode: the first frame simply paints the neutral splash. */
  }
}

/**
 * The cached theme, or null when nothing usable was ever stored. Pass the
 * business it is being asked for: an entry remembered for another business is
 * not that business's appearance and is refused.
 */
export function cachedTheme(ownerId) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const theme = JSON.parse(raw);
    if (!theme || !theme.mode || !theme.primary) return null;
    if (ownerId && theme.id && theme.id !== ownerId) return null;
    return theme;
  } catch {
    return null;
  }
}

/**
 * Applies a business theme to the document root (light/dark + primary color)
 * and remembers it for the first frame of the next visit.
 */
export function applyTheme(theme, ownerId) {
  const root = document.documentElement;
  const mode = theme?.mode === 'dark' ? 'dark' : 'light';
  const primary = primaryFor(theme);
  root.dataset.theme = mode;
  root.style.setProperty('--primary', primary);
  // Foreground for every filled accent surface; the design tokens derive the
  // rest of the theme layer from these two values.
  root.style.setProperty('--primary-ink', inkFor(primary));
  // The Android status bar follows the theme live: no reload, no restart of the
  // installed app — the browser repaints its system bar from this meta.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', statusBarColor(primary, mode));
  rememberTheme({ mode, primary }, ownerId);
}

export function applyDirection(locale, rtl) {
  const root = document.documentElement;
  root.setAttribute('dir', rtl ? 'rtl' : 'ltr');
  root.setAttribute('lang', locale);
}
