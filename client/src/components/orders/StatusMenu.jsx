import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import { useI18n } from '../../i18n';

/*
 * Compact row status control: one square button carrying the order's own status
 * colour and a dropdown chevron — never the status word, so every button in the
 * Actions column is the same size in every language. The statuses it offers are
 * the server's `allowed_transitions` (empty for completed and cancelled orders,
 * so the control locks itself the moment an order completes) and the change
 * itself is validated again on the backend. The status name stays available to
 * screen readers through the label.
 *
 * The menu is positioned fixed from the trigger's measured rectangle, so neither
 * the table's scroll container nor a phone card can clip it. It is then clamped
 * inside the viewport with a real edge padding and flips above the button when
 * the space below is too small — on a phone the last order's menu opens upward
 * instead of running off the bottom of the screen.
 */

/* Space always kept between the panel and the viewport edge, and between the
   panel and its trigger. */
const EDGE = 12;
const GAP = 6;

/* Laid out but not yet painted: the first frame is measured before it is shown,
   so the panel never appears at the wrong place and then jumps. */
const MEASURING = { top: 0, left: 0, visibility: 'hidden' };

export default function StatusMenu({ order, busy, onSelect }) {
  const { t, dir } = useI18n();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const options = order.allowed_transitions || [];
  const locked = options.length === 0;

  /* Placement, measured rather than estimated: the panel is laid out hidden,
     its real size is read, and the coordinates are clamped on both axes. Side
     first — it opens inward from the trigger, then slides back inside the
     viewport — and then the side that has the room: below the button normally,
     above it when there is not enough space underneath. */
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const btn = btnRef.current?.getBoundingClientRect();
    const menu = menuRef.current;
    if (!btn || !menu) return;

    const vw = document.documentElement.clientWidth || window.innerWidth;
    const vh = window.innerHeight;
    const w = menu.offsetWidth;
    const h = menu.offsetHeight;

    const preferredLeft = dir === 'rtl' ? btn.right - w : btn.left;
    const maxLeft = Math.max(EDGE, vw - EDGE - w);
    const left = Math.min(Math.max(preferredLeft, EDGE), maxLeft);

    const below = btn.bottom + GAP;
    const above = btn.top - GAP - h;
    const top = below + h > vh - EDGE && above >= EDGE ? above : below;
    const maxTop = Math.max(EDGE, vh - EDGE - h);

    setPos({ top: Math.min(Math.max(top, EDGE), maxTop), left });
  }, [open, dir, options.length]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    const close = () => setOpen(false);

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  return (
    <span className="ostatus" ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        className={`ostatus__btn ostatus__btn--${order.status} ${locked ? 'is-locked' : ''}`}
        aria-haspopup={locked ? undefined : 'menu'}
        aria-expanded={locked ? undefined : open}
        aria-label={
          locked
            ? `${t('order_status_locked')} · ${t(`status_${order.status}`)}`
            : `${t('order_change_status')} · ${t(`status_${order.status}`)}`
        }
        disabled={locked || busy}
        title={locked ? t('order_status_locked') : t('order_change_status')}
        onClick={() => setOpen((v) => !v)}
      >
        {busy ? (
          <span className="spinner ostatus__spinner" />
        ) : locked ? (
          <Icon name="lock" size={15} className="ostatus__icon" />
        ) : (
          <Icon name="chevronDown" size={16} className={`ostatus__icon ostatus__caret ${open ? 'is-open' : ''}`} />
        )}
      </button>

      {open ? (
        <div
          ref={menuRef}
          className="ostatus__menu"
          role="menu"
          style={pos ? { top: pos.top, left: pos.left } : MEASURING}
        >
          {options.map((value) => (
            <button
              key={value}
              type="button"
              role="menuitem"
              className={`ostatus__item ostatus__item--${value}`}
              onClick={() => {
                setOpen(false);
                onSelect(value);
              }}
            >
              <span className={`ostatus__dot ostatus__dot--${value}`} />
              {t(`status_${value}`)}
            </button>
          ))}
        </div>
      ) : null}
    </span>
  );
}
