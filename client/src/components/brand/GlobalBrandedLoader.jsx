import { useEffect, useState, useSyncExternalStore } from 'react';
import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { brandLogoUrl, FALLBACK_LOGO } from '../../brandLogo';
import { cachedTheme } from '../../theme';
import { getLoadingSnapshot, subscribeLoading } from '../../loading';
import './globalLoader.css';

/*
 * The one loading surface of Lilyan Pert.
 *
 * It is built from the business's own saved logo — never a new mark and never a
 * plate behind it — and draws in four cheap layers that all share ONE square
 * box (`.gbl__orbit`): a theme-coloured ambient glow, a rotating progress halo,
 * the transparent logo breathing in the exact centre of that halo, and a light
 * sweep behind it. The indicator and the localised line sit below the ring.
 * Because every layer is pinned to the same box with `margin: auto`, the logo
 * can never drift out of the ring — in any language, at any size or direction.
 *
 * Colour is the theme that is already applied to the document. When no theme
 * has ever been resolved on this device there is nothing correct to show, so
 * the loader stays neutral instead of flashing a preset hue and then repainting.
 *
 * Where it appears is decided by real state, never by a page reload:
 *  - `isLoading` from the caller, or
 *  - the global loading signal (`loading.js`), which counts every critical
 *    bootstrap job so the overlay only leaves when all of them are done.
 *
 * Short work never flashes it (the store applies a show delay and a minimum
 * visible time), and an initialisation failure turns it into a localised error
 * state with a retry, so a genuine failure is never hidden behind an animation.
 */
export default function GlobalBrandedLoader({
  isLoading,
  variant = 'overlay',
  size,
  theme,
  message,
  overlay,
  error = null,
  onRetry,
  logoUrl,
}) {
  const { t, dir } = useI18n();
  const globalVisible = useSyncExternalStore(subscribeLoading, getLoadingSnapshot, getLoadingSnapshot);
  const active = isLoading ?? globalVisible;
  const isOverlay = overlay ?? variant === 'overlay';
  const [broken, setBroken] = useState(false);

  /* The dependency-free splash in index.html paints the same mark on the first
     frame, before React exists. The real loader replaces it as soon as it is on
     screen, so the two never overlap and no second reload is needed. */
  useEffect(() => {
    document.getElementById('boot-splash')?.remove();
  }, []);

  /* Keep the node mounted for the fade-out, then let it go completely — no
     invisible overlay is ever left holding the pointer. */
  const [mounted, setMounted] = useState(Boolean(active) || Boolean(error));
  useEffect(() => {
    if (active) {
      setMounted(true);
      return undefined;
    }
    if (!mounted) return undefined;
    const timer = window.setTimeout(() => setMounted(false), 260);
    return () => window.clearTimeout(timer);
  }, [active, mounted]);

  if (!mounted && !error) return null;

  /* An error is a state to read, not a state that fades away: only a finished
     load may play the exit animation, so a failure never paints invisible. */
  const showing = active || Boolean(error);
  const label = error ? t('state_error') : message || t('state_loading');
  const src = broken ? FALLBACK_LOGO : brandLogoUrl(logoUrl);
  /* The accent the document is already showing: an explicit theme, or the one
     the pre-paint cache applied. No cache and no theme means "neutral". */
  const accent = theme || cachedTheme()?.primary || '';

  const stage = (
    <div
      className={`gbl__stage ${error ? 'is-error' : ''}`.trim()}
      data-size={size || 'auto'}
      data-tone={accent ? 'theme' : 'neutral'}
      style={accent ? { '--gbl-accent': accent } : undefined}
      dir={dir}
    >
      {/* Ring, glow, reflection and logo share this one box and its centre. */}
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
      ) : (
        <div className="gbl__footer">
          <span className="gbl__dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="gbl__message">{message || t('state_loading')}</span>
        </div>
      )}
    </div>
  );

  if (!isOverlay) {
    return (
      <div className={`gbl gbl--inline ${showing ? '' : 'is-leaving'}`.trim()} role="status" aria-live="polite" aria-label={label}>
        {stage}
      </div>
    );
  }

  return (
    <div className={`gbl ${showing ? '' : 'is-leaving'}`.trim()} role="status" aria-live="polite" aria-label={label}>
      {stage}
    </div>
  );
}
