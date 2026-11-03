import { useEffect, useState, useSyncExternalStore } from 'react';
import Icon from '../Icon';
import LilyanPertLoader from './LilyanPertLoader';
import { useI18n } from '../../i18n';
import { getLoadingSnapshot, isLoadingPending, subscribeLoading } from '../../loading';
import './globalLoader.css';

/* Exit is opacity only, and this is the only duration the overlay has. */
const EXIT_MS = 250;

/*
 * The one full-screen loading surface of Lilyan Pert.
 *
 * One instance, mounted once at the app root (main.jsx) and driven by the
 * global loading signal, so the same DOM node covers the whole boot: session,
 * business record, sign-in family brand and the customer menu. Its whole visual
 * is `LilyanPertLoader` at the full size — the same mark the section loaders
 * and the pre-paint splash draw — so no loading phase can show a different
 * loader, a different size or a different position.
 *
 * The overlay only adds the frosted backdrop, the fade-out (opacity, nothing
 * else) and, on a real failure, one line of text with its retry.
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
  const active = isLoading ?? globalVisible;

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
  /* The mark always follows the document's live accent (`--primary`), which is
     already the saved business theme before React runs and changes with it
     afterwards — so the ring can never keep an older theme's colour. Only a
     failure (or an explicitly supplied business theme) overrides it. */
  const accent = error ? '#e05252' : theme || '';

  return (
    <div
      className={`gbl ${showing ? '' : 'is-leaving'}`.trim()}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="gbl__stage" dir={dir}>
        <LilyanPertLoader
          variant="full"
          logoUrl={logoUrl}
          accent={accent || undefined}
          label={label}
          className={error ? 'is-error' : ''}
          decorative
        >
          {error ? (
            <span className="gbl__mark">
              <Icon name="alert" size={30} />
            </span>
          ) : null}
        </LilyanPertLoader>

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
