import { useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import { appearanceOf } from '../menu/categoryIcons';
import './productMedia.css';

/*
 * The one place a product's picture is decided.
 *
 * Every surface that shows a product — the admin card, the guest/QR card and
 * the product sheet — renders this component, so all of them follow the same
 * priority:
 *
 *   1. the real photograph, untouched, in its original fitting;
 *   2. the product's OWN category glyph, as a raised 3D illustration in the
 *      category's saved identity colour (the same glyph Category Management
 *      assigns, so changing a category icon updates every product using it);
 *   3. a neutral `package` glyph only when the category is gone or carries no
 *      usable icon.
 *
 * An image is never confused with a missing one: a stored address starts in
 * `loading` (a quiet skeleton) and only becomes an error after the browser
 * really fails to decode it. A product with no address goes straight to
 * `missing`. The state is keyed by product id + address, so a recycled list
 * row or a swapped photo can never inherit another image's load event, and a
 * photo that later appears is restored automatically.
 */

/** The stored picture address, trimmed; anything unusable is no picture at all. */
export function productImageUrl(product) {
  const raw = typeof product === 'string' ? product : product?.image_url;
  if (typeof raw !== 'string') return '';
  return raw.trim();
}

const initialState = (src) => (src ? 'loading' : 'missing');

export default function ProductMedia({
  product,
  category,
  variant = 'customer-card',
  className = '',
  alt = '',
  muted = false,
  onStateChange,
}) {
  const src = productImageUrl(product);
  const identity = `${product?.id ?? ''}|${src}`;
  const [media, setMedia] = useState(() => ({ identity, state: initialState(src) }));

  /*
   * Derived, not effect-driven: the moment the identity changes the old load
   * result is discarded during the same render, so no frame ever shows the
   * previous product's picture or fallback.
   */
  if (media.identity !== identity) setMedia({ identity, state: initialState(src) });

  const state = media.state;
  const imgRef = useRef(null);

  /* Cached images can complete before React attaches its listeners. */
  useEffect(() => {
    if (state !== 'loading') return;
    const image = imgRef.current;
    if (!image || !image.complete) return;
    setMedia((prev) =>
      prev.identity === identity
        ? { identity, state: image.naturalWidth > 0 ? 'loaded' : 'error' }
        : prev,
    );
  }, [identity, state]);

  useEffect(() => {
    onStateChange?.(state === 'loaded');
  }, [state, onStateChange]);

  const hasCategoryIcon = Boolean(category?.icon);
  const appearance = hasCategoryIcon ? appearanceOf(category) : null;
  const glyph = appearance?.icon || 'package';
  const ink = appearance?.color || '';
  const fallback = state === 'missing' || state === 'error';

  const rootClass = [
    'pmedia',
    `pmedia--${variant}`,
    `is-${state}`,
    fallback && !hasCategoryIcon ? 'is-generic' : '',
    muted ? 'is-muted' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={rootClass}
      style={ink ? { '--pmedia-ink': ink } : undefined}
      data-state={state}
    >
      {src ? (
        <>
          {variant === 'product-modal' ? (
            <img
              className="pmedia__bg"
              src={src}
              alt=""
              aria-hidden="true"
              draggable="false"
            />
          ) : null}
          <img
            ref={imgRef}
            className="pmedia__img"
            src={src}
            alt={alt}
            draggable="false"
            loading={variant === 'product-modal' ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() =>
              setMedia((prev) => (prev.identity === identity ? { identity, state: 'loaded' } : prev))
            }
            onError={() =>
              setMedia((prev) => (prev.identity === identity ? { identity, state: 'error' } : prev))
            }
          />
        </>
      ) : null}

      {state === 'loading' ? <span className="pmedia__skeleton" aria-hidden="true" /> : null}

      {fallback ? (
        <span className="pmedia__fallback" aria-hidden="true">
          <span className="pmedia__glow" />
          <span className="pmedia__glyph">
            <Icon name={glyph} size={64} />
            <span className="pmedia__gloss" />
          </span>
        </span>
      ) : null}
    </span>
  );
}
