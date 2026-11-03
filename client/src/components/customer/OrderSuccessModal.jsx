import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Money } from '../ui';
import { useI18n } from '../../i18n';
import { fmtDigits } from '../../format';
import Emoji3D, { ORDER_EMOJI_IDS } from './Emoji3D';
import BurningFuseTimer from '../notifications/BurningFuseTimer';
import useOrderNotification from '../../hooks/useOrderNotification';
import './orderSuccess.css';

/*
 * The order-success card: a small frosted-glass panel that confirms the order
 * the API actually saved. It is mounted only after the server answered with
 * the created order, so it can show the real number, status and total.
 *
 * It has no close button by design — it leaves on the SHARED 3-second deadline
 * of its order event, the same `notificationLifecycle` record the small alert
 * at the top of the screen joins, so the two always burn down together and
 * disappear in one coordinated transition. Nothing pauses it: hovering, moving
 * the pointer across it, focusing it or re-rendering never moves the deadline.
 * Escape and a tap on the dimmed area still dismiss it by hand, and dismissing
 * never touches the order.
 *
 * Every confirmation draws a different celebration illustration through a
 * shuffle bag kept in sessionStorage: nothing repeats until the set is spent,
 * and a reshuffle never opens with the picture that just showed.
 */

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
  const cardRef = useRef(null);

  /* One dismissal path: the shared deadline, Escape and the dimmed area all
     close the card immediately — no exit animation holds the overlay open. */
  const dismiss = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const record = useOrderNotification(
    order?.id || null,
    dismiss,
  );

  /* Focus moves onto the card (never trapped) and Escape dismisses it. */
  useEffect(() => {
    const opener = document.activeElement;
    cardRef.current?.focus?.({ preventScroll: true });
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      dismiss();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, [dismiss]);

  const status = order?.status || 'pending';

  return createPortal(
    <div
      className="osx-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <div className="osx-card" ref={cardRef} role="status" aria-live="polite" tabIndex={-1}>
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

        {/* The same burning fuse as the small alert, on the same deadline. */}
        <BurningFuseTimer
          expiresAt={record?.expiresAt}
          durationMs={record?.durationMs}
          variant="popup"
          className="osx-fuse"
        />
      </div>
    </div>,
    document.body,
  );
}
