import { useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import { useI18n } from '../../i18n';

/*
 * Compact row status control: the current localized status plus the statuses
 * the server said this order may move to (`allowed_transitions`, which is empty
 * for completed and cancelled orders — so the control locks itself the moment an
 * order completes). The change itself is validated again on the backend.
 *
 * The menu is positioned fixed from the trigger's rectangle, so the table's
 * scroll container can never clip it.
 */
export default function StatusMenu({ order, busy, onSelect }) {
  const { t, dir } = useI18n();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);

  const options = order.allowed_transitions || [];
  const locked = options.length === 0;

  useEffect(() => {
    if (!open) return undefined;
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      setPos(
        dir === 'rtl'
          ? { top: rect.bottom + 6, left: rect.left }
          : { top: rect.bottom + 6, right: Math.max(8, window.innerWidth - rect.right) },
      );
    }

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
  }, [open, dir]);

  return (
    <span className="ostatus" ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        className={`ostatus__btn ostatus__btn--${order.status} ${locked ? 'is-locked' : ''}`}
        aria-haspopup={locked ? undefined : 'menu'}
        aria-expanded={locked ? undefined : open}
        disabled={locked || busy}
        title={locked ? t('order_status_locked') : t('order_change_status')}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ostatus__text">{t(`status_${order.status}`)}</span>
        {busy ? (
          <span className="spinner ostatus__spinner" />
        ) : locked ? null : (
          <Icon name="chevronDown" size={13} className={`ostatus__caret ${open ? 'is-open' : ''}`} />
        )}
      </button>

      {open && pos ? (
        <div className="ostatus__menu" role="menu" style={pos}>
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
