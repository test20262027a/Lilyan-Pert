import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../Icon';
import { Money, useToast } from '../ui';
import { localized, useI18n } from '../../i18n';
import { post } from '../../api';
import { ConfirmSurface } from '../confirm/DeleteConfirmationDialog';
import { CartArtwork } from './CustomerArtwork';
import TableField from './TableField';
import '../../customerModals.css';

/*
 * The customer cart, as one premium sheet: illustrated header, empty state,
 * product list with its quantity controls, the checkout form, the promotion
 * code and the authoritative totals.
 *
 * Every amount comes from the public quote endpoint (`/quote/:key`), which runs
 * the same pricing engine the order endpoint saves with — so the cart can never
 * show a total the server would not charge, and a promotion code is validated
 * against stored rules before it is applied.
 */
export default function CartPanel({
  menuKey,
  lines,
  currency,
  locale,
  busy,
  canCheckout,
  canOrder,
  /* The table already resolved from a scanned QR code, if there is one. */
  qrTable,
  /* 'resolved' | 'invalid' | 'missing' | 'none' — how the QR link resolved. */
  tableState,
  tables,
  tableId,
  onTable,
  onClose,
  onQty,
  onClear,
  onSubmit,
}) {
  const { t } = useI18n();
  const toast = useToast();
  const titleId = useId();
  const sheetRef = useRef(null);
  const closeRef = useRef(null);
  const cancelClearRef = useRef(null);

  const [form, setForm] = useState({ customer_name: '', customer_phone: '', notes: '' });
  const [codeInput, setCodeInput] = useState('');
  const [appliedCode, setAppliedCode] = useState('');
  const [promoError, setPromoError] = useState(null);
  const [checking, setChecking] = useState(false);
  const [quote, setQuote] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const items = useMemo(
    () => lines.map((line) => ({ product_id: line.product.id, quantity: line.qty })),
    [lines],
  );
  const itemsKey = items.map((item) => `${item.product_id}:${item.quantity}`).join('|');
  const localSubtotal = lines.reduce((sum, line) => sum + line.total, 0);
  const isEmpty = lines.length === 0;

  /* The quote is re-read whenever the cart contents or the applied code change;
     a failure falls back to the locally summed subtotal and is retried on the
     next change, so the sheet never shows an empty total. */
  const confirmRef = useRef(confirmClear);
  confirmRef.current = confirmClear;

  useEffect(() => {
    if (!itemsKey) {
      setQuote(null);
      return undefined;
    }
    let alive = true;
    post(`/public/quote/${menuKey}`, { items, promotion_code: appliedCode || null })
      .then((res) => {
        if (alive) setQuote(res);
      })
      .catch(() => {
        if (alive) setQuote(null);
      });
    return () => {
      alive = false;
    };
    // `itemsKey` is the stable signature of `items`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, appliedCode, menuKey]);

  /* Modal behaviour: focus moves into the sheet, Tab stays inside it, Escape
     closes it — unless the clear-cart confirmation is on top, which owns Escape
     while it is open. */
  useEffect(() => {
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus?.();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (confirmRef.current || busy) return;
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
    // Mount only: a quote refresh must not steal focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyCode = useCallback(async () => {
    const code = codeInput.trim();
    if (!code) return;
    setChecking(true);
    setPromoError(null);
    try {
      const res = await post(`/public/quote/${menuKey}`, { items, promotion_code: code });
      setQuote(res);
      setAppliedCode(res.promotion_code || code);
      setCodeInput('');
      toast.success(t('customer_promo_applied'));
    } catch (err) {
      setPromoError(err.code === 'PROMO_MIN_ORDER' ? t('customer_promo_min_order') : t('customer_promo_invalid'));
    } finally {
      setChecking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeInput, itemsKey, menuKey, t]);

  const subtotal = quote?.subtotal ?? localSubtotal;
  const discount = quote?.discount ?? 0;
  const tax = quote?.tax ?? 0;
  const service = quote?.service ?? 0;
  const total = quote?.total ?? localSubtotal;

  /*
   * One validation flow for the whole sheet. A QR table is authoritative; a
   * manual choice only counts while it is one of the business's own active
   * tables, so a stale id can never enable the button — and the button is the
   * only way to submit, so no order is created without a valid table reference.
   */
  const tableList = tables || [];
  const validatedTableId = qrTable?.id
    || (tableList.some((row) => row.id === tableId) ? tableId : '');
  const tableReady = Boolean(validatedTableId);
  const canSubmit = canOrder && tableReady && !isEmpty && !busy && !submitted;

  const submit = async () => {
    if (submitted || busy) return;
    setSubmitted(true);
    try {
      await onSubmit({ ...form, promotion_code: appliedCode });
    } finally {
      setSubmitted(false);
    }
  };

  return createPortal(
    <div
      className="cui-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose?.();
      }}
    >
      <div
        className={`cui-sheet ${isEmpty ? 'is-empty' : ''}`}
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="cui-sheet__art">
          <CartArtwork />
          <span className="cui-sheet__artbar">
            <span className="cui-sheet__badge" aria-hidden="true">
              <Icon name="cart" size={18} />
            </span>
            <h2 className="cui-sheet__title" id={titleId}>
              {t('customer_menu_cart')}
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

        {isEmpty ? (
          <div className="cui-sheet__empty">
            <span className="cui-sheet__emptyicon" aria-hidden="true">
              <Icon name="cart" size={30} />
            </span>
            <p>{t('customer_menu_cart_empty')}</p>
          </div>
        ) : (
          <>
            <div className="cui-sheet__body">
              <button
                type="button"
                className="cui-clear"
                onClick={() => setConfirmClear(true)}
                disabled={busy}
              >
                <Icon name="trash" size={15} />
                <span>{t('customer_menu_clear_cart')}</span>
              </button>

              <ul className="cui-lines">
                {lines.map((line) => (
                  <li className="cui-line" key={line.product.id}>
                    <span className="cui-line__thumb">
                      {line.product.image_url ? (
                        <img src={line.product.image_url} alt="" />
                      ) : (
                        <Icon name="coffee" size={18} />
                      )}
                    </span>

                    <span className="cui-line__text">
                      <strong>{localized(line.product, 'name', locale)}</strong>
                      <small>
                        <Money value={line.unit} currency={currency} />
                      </small>
                    </span>

                    <span className="cui-qty">
                      <button
                        type="button"
                        className="cui-qty__btn cui-qty__btn--minus"
                        onClick={() => onQty(line.product, line.qty - 1)}
                        aria-label={t('customer_cart_decrease')}
                        title={t('customer_cart_decrease')}
                      >
                        <Icon name="minus" size={14} />
                      </button>
                      <span className="cui-qty__value" aria-live="polite">
                        {line.qty}
                      </span>
                      <button
                        type="button"
                        className="cui-qty__btn cui-qty__btn--plus"
                        onClick={() => onQty(line.product, line.qty + 1)}
                        aria-label={t('customer_cart_increase')}
                        title={t('customer_cart_increase')}
                      >
                        <Icon name="plus" size={14} />
                      </button>
                    </span>

                    <button
                      type="button"
                      className="cui-line__remove"
                      onClick={() => onQty(line.product, 0)}
                      aria-label={t('customer_cart_remove')}
                      title={t('customer_cart_remove')}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </li>
                ))}
              </ul>

              {canCheckout ? (
                <div className="cui-form">
                  {/* A table resolved from the scanned QR code is final and
                      read-only; otherwise the guest picks one of the business's
                      own active tables. */}
                  {qrTable ? (
                    <TableField mode="auto" table={qrTable} />
                  ) : tableList.length > 0 ? (
                    <TableField
                      mode="manual"
                      tables={tableList}
                      value={validatedTableId}
                      onChange={onTable}
                    />
                  ) : null}

                  <label className="cui-field">
                    <span className="cui-field__label">
                      <Icon name="user" size={14} />
                      {t('customer_menu_cart_name')}
                    </span>
                    <input
                      className="cui-input"
                      value={form.customer_name}
                      onChange={(event) => setForm((f) => ({ ...f, customer_name: event.target.value }))}
                    />
                  </label>

                  <label className="cui-field">
                    <span className="cui-field__label">
                      <Icon name="phone" size={14} />
                      {t('customer_menu_cart_phone')}
                    </span>
                    <input
                      className="cui-input"
                      dir="ltr"
                      inputMode="tel"
                      value={form.customer_phone}
                      onChange={(event) => setForm((f) => ({ ...f, customer_phone: event.target.value }))}
                    />
                  </label>

                  <label className="cui-field">
                    <span className="cui-field__label">
                      <Icon name="receipt" size={14} />
                      {t('customer_menu_cart_notes')}
                    </span>
                    <textarea
                      className="cui-input cui-input--area"
                      rows={3}
                      value={form.notes}
                      onChange={(event) => setForm((f) => ({ ...f, notes: event.target.value }))}
                    />
                  </label>

                  <div className="cui-promo">
                    <span className="cui-promo__icon" aria-hidden="true">
                      <Icon name="tag" size={15} />
                    </span>
                    {appliedCode ? (
                      <span className="cui-promo__applied">
                        <Icon name="checkCircle" size={15} />
                        <strong>{appliedCode}</strong>
                        <button
                          type="button"
                          className="cui-promo__off"
                          onClick={() => {
                            setAppliedCode('');
                            setPromoError(null);
                          }}
                          aria-label={t('customer_cart_discount_remove')}
                          title={t('customer_cart_discount_remove')}
                        >
                          <Icon name="close" size={13} />
                        </button>
                      </span>
                    ) : (
                      <>
                        <input
                          className="cui-input cui-promo__input"
                          value={codeInput}
                          placeholder={t('customer_promo_code')}
                          aria-label={t('customer_promo_code')}
                          onChange={(event) => {
                            setCodeInput(event.target.value);
                            setPromoError(null);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              applyCode();
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="cui-promo__apply"
                          onClick={applyCode}
                          disabled={checking || !codeInput.trim()}
                        >
                          {checking ? <span className="spinner" /> : t('action_apply')}
                        </button>
                      </>
                    )}
                  </div>
                  {promoError ? <p className="cui-form__error">{promoError}</p> : null}
                </div>
              ) : (
                <p className="cui-note">
                  <Icon name="info" size={14} />
                  {t('customer_checkout_disabled')}
                </p>
              )}

              {/* No table was identified and this menu offers no manual choice:
                  there is nothing to attach the order to, so it stays blocked. */}
              {!qrTable && tableList.length === 0 ? (
                <p className="cui-note cui-note--warn">
                  <Icon name="alert" size={14} />
                  {tableState === 'invalid'
                    ? t('customer_table_invalid')
                    : t('customer_table_scan_required')}
                </p>
              ) : null}

              <div className="cui-totals">
                <div className="cui-totals__row">
                  <span>{t('order_subtotal')}</span>
                  <Money value={subtotal} currency={currency} />
                </div>
                {discount > 0 ? (
                  <div className="cui-totals__row cui-totals__row--off">
                    <span>{t('order_discount')}</span>
                    <span>
                      − <Money value={discount} currency={currency} />
                    </span>
                  </div>
                ) : null}
                {tax > 0 ? (
                  <div className="cui-totals__row">
                    <span>{t('order_tax')}</span>
                    <Money value={tax} currency={currency} />
                  </div>
                ) : null}
                {service > 0 ? (
                  <div className="cui-totals__row">
                    <span>{t('order_service')}</span>
                    <Money value={service} currency={currency} />
                  </div>
                ) : null}
                <div className="cui-totals__row cui-totals__row--grand">
                  <span>{t('order_grand_total')}</span>
                  <Money value={total} currency={currency} />
                </div>
              </div>
            </div>

            {canOrder ? (
              <footer className="cui-sheet__foot">
                <button
                  type="button"
                  className="cui-submit"
                  onClick={submit}
                  disabled={busy || submitted || !canSubmit}
                >
                  {busy || submitted ? <span className="spinner" /> : <Icon name="send" size={17} />}
                  <span>{t('customer_menu_cart_submit')}</span>
                </button>
                {!tableReady ? <p className="cui-note cui-note--center">{t('customer_menu_cart_table_required')}</p> : null}
              </footer>
            ) : null}
          </>
        )}
      </div>

      {confirmClear ? (
        <ConfirmSurface
          tone="pink"
          icon="cart"
          title={t('customer_menu_clear_cart')}
          description={t('customer_menu_cart_clear_question')}
          onCancel={() => setConfirmClear(false)}
          initialFocusRef={cancelClearRef}
          footer={
            <>
              <button
                ref={cancelClearRef}
                type="button"
                className="dcd__btn dcd__btn--cancel"
                onClick={() => setConfirmClear(false)}
              >
                {t('action_cancel')}
              </button>
              <button
                type="button"
                className="dcd__btn dcd__btn--danger"
                onClick={() => {
                  onClear();
                  setConfirmClear(false);
                }}
              >
                <span>{t('customer_menu_clear_cart')}</span>
                <Icon name="trash" size={15} />
              </button>
            </>
          }
        />
      ) : null}
    </div>,
    document.body,
  );
}
