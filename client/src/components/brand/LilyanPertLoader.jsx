import { useState, useSyncExternalStore } from 'react';
import { brandLogoUrl, brandLogoSnapshot, NEUTRAL_LOGO, subscribeBrandLogo } from '../../brandLogo';
import { useI18n } from '../../i18n';
import './lilyanPertLoader.css';

/*
 * THE loading mark of Lilyan Pert — one composition, every loading state.
 *
 * A fixed, square 1:1 box holds four layers that all share one centre:
 *   .lpl__glow   soft theme light behind the ring (inside the box, never beyond)
 *   .lpl__track  the quiet translucent ring and its bevel
 *   .lpl__spin   the glossy illuminated arc + its moving reflection (rotates)
 *   .lpl__logo   the business's own artwork, completely still
 *
 * Nothing here has a size, scale or position animation: the ring turns, the
 * light breathes, and the logo never moves, shrinks or rotates. That is what
 * keeps the mark identical in every state, so handing one loading phase to the
 * next (or to the pre-paint splash in index.html, which draws the same
 * geometry) can never shift, resize or jump.
 *
 * Colour is the active theme: `--primary`, live, unless an explicit `accent` is
 * given (the failure state).
 */

const SIZES = { full: 160, section: 100, compact: 44 };

export default function LilyanPertLoader({
  variant = 'full',
  size,
  logoUrl,
  accent,
  label,
  decorative = false,
  className = '',
  children,
}) {
  const { t } = useI18n();
  const remembered = useSyncExternalStore(subscribeBrandLogo, brandLogoSnapshot, brandLogoSnapshot);
  /* The URL that failed, not a boolean: a later, valid logo must still draw. */
  const [failedSrc, setFailedSrc] = useState('');

  const pixels = size || SIZES[variant] || SIZES.full;
  const candidate = brandLogoUrl(logoUrl || remembered);
  const src = failedSrc && failedSrc === candidate ? NEUTRAL_LOGO : candidate;
  const text = label || t('state_loading');

  return (
    <div
      className={`lpl lpl--${variant}${className ? ` ${className}` : ''}`}
      style={{
        '--lpl-size': `${pixels}px`,
        ...(accent ? { '--lpl-accent': accent } : null),
      }}
      {...(decorative
        ? { 'aria-hidden': 'true' }
        : { role: 'status', 'aria-live': 'polite', 'aria-label': text })}
    >
      <span className="lpl__orbit">
        <span className="lpl__glow" aria-hidden="true" />
        <span className="lpl__track" aria-hidden="true" />
        <span className="lpl__spin" aria-hidden="true">
          <span className="lpl__arc" />
          <span className="lpl__sheen" />
        </span>
        {children || (
          <img
            className="lpl__logo"
            src={src}
            alt=""
            decoding="async"
            draggable="false"
            onError={() => setFailedSrc(candidate)}
          />
        )}
      </span>
    </div>
  );
}
