import { useState, useSyncExternalStore } from 'react';
import { brandLogoUrl, brandLogoSnapshot, NEUTRAL_LOGO, subscribeBrandLogo } from '../../brandLogo';
import { useI18n } from '../../i18n';
import './lilyanPertLoader.css';

/*
 * THE loading mark of Lilyan Pert — one composition, every loading state.
 *
 * A fixed, square 1:1 box holds the mark, all layers sharing one centre:
 *   .lpl__glow   soft theme light behind the ring (inside the box, never beyond)
 *   .lpl__track  the quiet translucent ring band
 *   .lpl__spin   the polished three-tone arc + its travelling glint (rotates)
 *   .lpl__shade  ONE overhead light over the whole band — lit on top, deep
 *                underneath — which is what makes the ring read as a raised
 *                glass torus instead of a flat stroke
 *   .lpl__rim    the bright hairline catching the top outer edge
 *   .lpl__glass  the clear, barely-there glass disc the logo sits on
 *   .lpl__logo   the business's own artwork, completely still
 *
 * Only `.lpl__spin` moves, and only by transform. The shading layers sit above
 * it and never move, so the light comes from the same place in every frame and
 * at every moment of the rotation. Nothing has a size, scale or position
 * animation: handing one loading phase to the next (or to the pre-paint splash
 * in index.html, which draws the same geometry) can never shift, resize or jump.
 *
 * Colour is the active theme: `--primary`, live, and only once the document
 * carries a known appearance (`data-theme-source`) — until then the mark is a
 * neutral glass disc with no coloured ring, never a stock or previous palette.
 * All three ring tones are mixed from that one value in CSS, so they can only
 * ever change together. An explicit `accent` (the failure state) is set inline
 * and wins.
 */

const SIZE_TOKENS = { sm: 44, md: 104, lg: 164 };
const VARIANT_SIZES = { full: 160, fullscreen: 160, section: 104, compact: 44, inline: 44 };

/* Older names the app already uses (`fullscreen`, `inline`) map to the same
   two shapes, so callers can use either vocabulary. */
const VARIANT_ALIASES = { fullscreen: 'full', inline: 'compact' };

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

  const kind = VARIANT_ALIASES[variant] || variant;
  const pixels =
    typeof size === 'number' ? size : SIZE_TOKENS[size] || VARIANT_SIZES[kind] || VARIANT_SIZES.full;
  const candidate = brandLogoUrl(logoUrl || remembered);
  const src = failedSrc && failedSrc === candidate ? NEUTRAL_LOGO : candidate;
  const text = label || t('state_loading');

  return (
    <div
      className={`lpl lpl--${kind}${className ? ` ${className}` : ''}`}
      style={{
        '--lpl-size': `${pixels}px`,
        ...(accent ? { '--lpl-accent': accent } : null),
      }}
      {...(decorative
        ? { 'aria-hidden': 'true' }
        : { role: 'status', 'aria-live': 'polite', 'aria-label': text })}
    >
      <span className="lpl__visual">
        <span className="lpl__glow" aria-hidden="true" />
        <span className="lpl__track" aria-hidden="true" />
        <span className="lpl__spin" aria-hidden="true">
          <span className="lpl__arc" />
          <span className="lpl__glint" />
        </span>
        <span className="lpl__shade" aria-hidden="true" />
        <span className="lpl__rim" aria-hidden="true" />
        <span className="lpl__glass" aria-hidden="true" />
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
