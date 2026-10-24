import { useEffect, useId, useRef, useState } from 'react';
import HeaderBackdrop from '../../headers/HeaderBackdrop';
import { createPortal } from 'react-dom';
import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { ReviewArtwork } from './CustomerArtwork';
import '../../customerModals.css';

/*
 * The customer review form, as a premium sheet with the illustrated banner the
 * menu's other modals use.
 *
 * The stars are a real radio group: five labels, each one filling every star up
 * to itself, reachable with the keyboard and readable by a screen reader. The
 * submit handler is the page's existing public review call — this component
 * never invents a review or a success state of its own.
 */
export default function ReviewModal({ busy, onClose, onSubmit }) {
  const { t } = useI18n();
  const titleId = useId();
  const sheetRef = useRef(null);
  const closeRef = useRef(null);
  const [form, setForm] = useState({ customer_name: '', rating: 5, comment: '' });
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus?.();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const nodes = Array.from(
        sheetRef.current?.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) || [],
      ).filter((node) => node.offsetParent !== null);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSend = form.rating > 0 && !busy && !sent;

  const send = async () => {
    if (!canSend) return;
    setSent(true);
    try {
      await onSubmit(form);
      onClose?.();
    } finally {
      setSent(false);
    }
  };

  return createPortal(
    <div
      className="cui-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose?.();
      }}
    >
      <div className="cui-sheet cui-sheet--review" ref={sheetRef} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="cui-sheet__art">
          <HeaderBackdrop section="customer-review" className="sh-bg--cart" />
          <ReviewArtwork />
          <span className="cui-sheet__artbar">
            <span className="cui-sheet__badge cui-sheet__badge--star" aria-hidden="true">
              <Icon name="star" size={18} />
            </span>
            <h2 className="cui-sheet__title" id={titleId}>
              {t('customer_menu_write_review')}
            </h2>
          </span>
          <button
            ref={closeRef}
            type="button"
            className="cui-sheet__close"
            onClick={onClose}
            aria-label={t('action_close')}
            title={t('action_close')}
          >
            <Icon name="close" size={16} />
          </button>
        </header>

        <div className="cui-sheet__body">
          <p className="cui-review__label">{t('customer_review_your_rating')}</p>
          <div className="cui-stars" role="radiogroup" aria-label={t('review_rating')}>
            {[1, 2, 3, 4, 5].map((star) => {
              const on = star <= form.rating;
              return (
                <button
                  key={star}
                  type="button"
                  role="radio"
                  aria-checked={on && star === form.rating}
                  aria-label={`${star} / 5`}
                  className={`cui-stars__btn ${on ? 'is-on' : ''}`}
                  onClick={() => setForm((f) => ({ ...f, rating: star }))}
                >
                  <Icon name="star" size={30} />
                </button>
              );
            })}
          </div>

          <label className="cui-field">
            <span className="cui-field__label">
              <Icon name="user" size={14} />
              {t('customer_menu_review_name')}
            </span>
            <input
              className="cui-input"
              value={form.customer_name}
              onChange={(event) => setForm((f) => ({ ...f, customer_name: event.target.value }))}
            />
          </label>

          <label className="cui-field">
            <span className="cui-field__label">
              <Icon name="message" size={14} />
              {t('customer_menu_review_comment')}
            </span>
            <textarea
              className="cui-input cui-input--area"
              rows={5}
              value={form.comment}
              onChange={(event) => setForm((f) => ({ ...f, comment: event.target.value }))}
            />
          </label>
        </div>

        <footer className="cui-sheet__foot">
          <button type="button" className="cui-submit" onClick={send} disabled={!canSend || !form.comment.trim()}>
            {busy || sent ? <span className="spinner" /> : <Icon name="send" size={17} />}
            <span>{t('customer_menu_review_submit')}</span>
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
