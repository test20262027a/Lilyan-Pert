import { useEffect, useState, useSyncExternalStore } from 'react';
import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { brandLogoUrl, brandLogoSnapshot, NEUTRAL_LOGO, subscribeBrandLogo } from '../../brandLogo';
import { cachedTheme } from '../../theme';
import { getLoadingSnapshot, isLoadingPending, subscribeLoading } from '../../loading';
import './globalLoader.css';

/* Exit is opacity only, and this is the only duration the loader has. */
const EXIT_MS = 250;

/*
 * The one loading surface of Lilyan Pert.
 *
 * One instance, mounted once at the app root (main.jsx) and driven by the
 * global loading signal, so the same DOM node covers the whole boot: session,
 * business record, sign-in family brand and the customer menu. Nothing about it
 * is variant, size or route dependent — a failure is the only thing that adds a
 * second row, and even then the ring keeps its own 144px box.
 *
 * Composition: ONE fixed 144x144 relative box (`.gbl__orbit`) holding every
 * layer — the theme-coloured ambient glow, the rotating progress halo, the
 * light sweep and the transparent logo — each pinned with
 * `position: absolute; inset: 0; margin: auto`. The logo therefore shares the
 * exact centre of the ring and can never leave it, in any language, direction,
 * breakpoint or loading phase. There is no caption, percentage or dot row: the
 * ring and the logo are the whole surface.
 *
 * It never remounts and never resizes: entering, finishing, a theme arriving or
 * a second job starting only changes classes and CSS custom properties, and the
 * only exit motion is the overlay's opacity going 1 -> 0 before it is removed.
 *
 * Colour is the theme already on the document (applied before React and by the
 * pre-paint cache in index.html); with no resolved theme it stays neutral
 * instead of flashing a preset hue and then repainting.
 */
export default function GlobalBrandedLoader({
  isLoading,
  theme,
  message,
  error = null,
  onRetry,
  logoUrl,
}) {
  const { t, dir } = useI18n();
  const globalVisible = useSyncExternalStore(subscribeLoading, getLoadingSnapshot, getLoadingSnapshot);
  /* The business logo is resolved before and independently of authentication;
     subscribing here means a logo that arrives while this overlay is already up
     is swapped in place, without a remount or a second loader. */
  const rememberedLogo = useSyncExternalStore(subscribeBrandLogo, brandLogoSnapshot, brandLogoSnapshot);
  const active = isLoading ?? globalVisible;
  const [broken, setBroken] = useState(false);

  /* Keep the node mounted for the fade-out, then let it go completely — no
     invisible overlay is ever left holding the pointer. */
  const [mounted, setMounted] = useState(Boolean(active) || Boolean(error));
  useEffect(() => {
    if (active) {
      setMounted(true);
      return undefined;
    }
    if (!mounted) return undefined;
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [active, mounted]);

  /* An error is a state to read, not a state that fades away: only a finished
     load may play the exit, so a failure never paints invisible. */
  const showing = active || Boolean(error);

  /* The splash in index.html paints this same mark on the very first frame. It
     is dropped the instant this overlay paints — an identical composition — or
     as soon as nothing is loading, so a fast boot never shows it over content. */
  useEffect(() => {
    if (showing) {
      document.getElementById('boot-splash')?.remove();
      return undefined;
    }
    const timer = window.setTimeout(() => {
      if (!isLoadingPending()) document.getElementById('boot-splash')?.remove();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [showing]);

  if (!mounted && !error) return null;

  const label = error ? t('state_error') : message || t('state_loading');
  const src = broken ? NEUTRAL_LOGO : brandLogoUrl(logoUrl || rememberedLogo);
  /* A newly resolved logo gets its own chance to load after an unreachable one
     was remembered. */
  useEffect(() => {
    setBroken(false);
  }, [src]);
  /* The accent the document is already showing: an explicit theme, or the one
     the pre-paint cache applied. No cache and no theme means "neutral". */
  const accent = theme || cachedTheme()?.primary || '';

  return (
    <div
      className={`gbl ${showing ? '' : 'is-leaving'}`.trim()}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div
        className={`gbl__stage ${error ? 'is-error' : ''}`.trim()}
        data-tone={accent ? 'theme' : 'neutral'}
        style={accent ? { '--gbl-accent': accent } : undefined}
        dir={dir}
      >
        {/* Ring, glow, reflection and logo share this one fixed box. */}
        <div className="gbl__orbit">
          <span className="gbl__ambient" aria-hidden="true" />
          <span className="gbl__halo" aria-hidden="true">
            <svg viewBox="0 0 100 100" focusable="false">
              <circle className="gbl__halo-track" cx="50" cy="50" r="45" />
              <circle className="gbl__halo-arc" cx="50" cy="50" r="45" />
            </svg>
          </span>
          <span className="gbl__sweep" aria-hidden="true" />
          <span className="gbl__logo">
            {error ? (
              <span className="gbl__mark">
                <Icon name="alert" size={30} />
              </span>
            ) : (
              <img
                src={src}
                alt=""
                decoding="async"
                draggable="false"
                onError={() => setBroken(true)}
              />
            )}
          </span>
        </div>

        {/* A failure must stay understandable: one line and its retry. */}
        {error ? (
          <div className="gbl__error">
            <span className="gbl__message">{message || t('state_error')}</span>
            {onRetry ? (
              <button type="button" className="gbl__retry" onClick={onRetry}>
                <Icon name="refresh" size={14} />
                {t('action_retry')}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
