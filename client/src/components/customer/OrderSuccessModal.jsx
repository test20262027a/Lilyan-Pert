import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Money } from '../ui';
import { useI18n } from '../../i18n';
import { fmtDigits } from '../../format';
import Emoji3D, { ORDER_EMOJI_IDS } from './Emoji3D';
import './orderSuccess.css';

/*
 * The order-success card: a small frosted-glass panel that confirms the order
 * the API actually saved. It is mounted only after the server answered with
 * the created order, so it can show the real number, status and total.
 *
 * It has no close button by design — it leaves on its own after ~5.5s, or the
 * moment the guest taps the dimmed area, and Escape works for keyboards. The
 * countdown pauses while the pointer is over the card or focus is inside it,
 * so nobody loses the details mid-read, and dismissing never touches the order.
 *
 * Every confirmation draws a different celebration illustration through a
 * shuffle bag kept in sessionStorage: nothing repeats until the set is spent,
 * and a reshuffle never opens with the picture that just showed.
 */

const HOLD_MS = 5500;
const EXIT_MS = 240;
const BAG_KEY = 'lilyan.order.emoji';

function shuffle(ids) {
  const bag = [...ids];
  for (let i = bag.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

/** The next illustration of the bag, without ever repeating the previous one. */
function takeEmoji() {
  let saved = null;
  try {
    saved = JSON.parse(sessionStorage.getItem(BAG_KEY) || 'null');
  } catch {
    saved = null;
  }
  const last = typeof saved?.last === 'string' ? saved.last : null;
  let bag = Array.isArray(saved?.bag) ? saved.bag.filter((id) => ORDER_EMOJI_IDS.includes(id)) : [];

  if (!bag.length) {
    bag = shuffle(ORDER_EMOJI_IDS);
    /* A fresh bag must never start with the picture that just left. */
    if (bag.length > 1 && bag[0] === last) {
      const swapWith = 1 + Math.floor(Math.random() * (bag.length - 1));
      [bag[0], bag[swapWith]] = [bag[swapWith], bag[0]];
    }
  }

  const pick = bag.shift();
  try {
    sessionStorage.setItem(BAG_KEY, JSON.stringify({ bag, last: pick }));
  } catch {
    /* Private mode: the bag just lives for this card. */
  }
  return pick;
}

export default function OrderSuccessModal({ order, currency, onClose }) {
  const { t, locale } = useI18n();
  const [emoji] = useState(takeEmoji);
  const [paused, setPaused] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const cardRef = useRef(null);
  /* The card focuses itself so keyboards land on the announcement; that first
     focus must not count as "the guest is reading" and freeze the timer. */
  const autoFocusRef = useRef(false);
  const closedRef = useRef(false);
  const leftRef = useRef(HOLD_MS);
  const startedRef = useRef(0);

  const dismiss = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    setLeaving(true);
    window.setTimeout(() => onClose?.(), EXIT_MS);
  }, [onClose]);

  /* The countdown: paused time is returned to the clock, so hovering or
     tabbing into the card never eats into the reading time. */
  useEffect(() => {
    if (paused || leaving) return undefined;
    startedRef.current = Date.now();
    const timer = window.setTimeout(dismiss, leftRef.current);
    return () => {
      window.clearTimeout(timer);
      leftRef.current = Math.max(0, leftRef.current - (Date.now() - startedRef.current));
    };
  }, [paused, leaving, dismiss]);

  /* Focus moves onto the card (never trapped) and Escape dismisses it. */
  useEffect(() => {
    const opener = document.activeElement;
    autoFocusRef.current = true;
    cardRef.current?.focus?.({ preventScroll: true });
    const clearAuto = window.setTimeout(() => {
      autoFocusRef.current = false;
    }, 80);
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      dismiss();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(clearAuto);
      document.removeEventListener('keydown', onKeyDown);
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, [dismiss]);

  const status = order?.status || 'pending';

  return createPortal(
    <div
      className={`osx-overlay ${leaving ? 'is-leaving' : ''}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <div
        className="osx-card"
        ref={cardRef}
        role="status"
        aria-live="polite"
        tabIndex={-1}
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        onFocus={() => {
          if (!autoFocusRef.current) setPaused(true);
        }}
        onBlur={() => setPaused(false)}
      >
        <span className="osx-sheen" aria-hidden="true" />

        <span className="osx-emoji">
          <Emoji3D id={emoji} size={96} />
        </span>
        <span className="osx-spark osx-spark--a" aria-hidden="true" />
        <span className="osx-spark osx-spark--b" aria-hidden="true" />
        <span className="osx-spark osx-spark--c" aria-hidden="true" />

        <h2 className="osx-title">{t('customer_menu_order_placed')}</h2>
        <p className="osx-note">{t('customer_menu_order_placed_hint')}</p>

        <div className="osx-facts">
          <span className="osx-number">
            <span className="osx-number__label">{t('customer_menu_order_number')}</span>
            <strong className="osx-number__value" dir="ltr">
              #{fmtDigits(order?.order_number, locale)}
            </strong>
          </span>
          <span className={`osx-status osx-status--${status}`}>{t(`status_${status}`)}</span>
        </div>

        <div className="osx-total">
          <span>{t('order_grand_total')}</span>
          <strong>
            <Money value={order?.total ?? 0} currency={currency} />
          </strong>
        </div>

        <span className="osx-progress" data-paused={paused || leaving ? 'true' : 'false'} aria-hidden="true">
          <span className="osx-progress__fill" />
        </span>
      </div>
    </div>,
    document.body,
  );
}
