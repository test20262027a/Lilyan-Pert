import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HeaderBackdrop from '../../../headers/HeaderBackdrop';
import Icon from '../../Icon';
import { Loading, Money, StatusBadge, useToast } from '../../ui';
import { PrintableReceipt, printReady } from '../../Receipt';
import OrdersArtwork from '../OrdersArtwork';
import ManualDiscountCard from './ManualDiscountCard';
import DiscardChangesDialog from '../../confirm/DiscardChangesDialog';
import OrderEditPanel, { ORDER_EDIT_FORM_ID } from './OrderEditPanel';
import OrderStatusControl from './OrderStatusControl';
import OrderActivityTimeline from './OrderActivityTimeline';
import { localized, useI18n } from '../../../i18n';
import { useAuth } from '../../../context/AuthContext';
import { useBusiness } from '../../../context/BusinessContext';
import { get, patch, post, put } from '../../../api';
import { fmtDateTime, fmtDigits, zoneFor } from '../../../format';
import './orderDetails.css';

/*
 * The Order Details modal — the only order screen in the admin panel.
 *
 * It opens over whatever list the order was picked from (dashboard, orders
 * management, a notification) and reads the same `/orders/:id` payload the old
 * standalone page used. Everything an administrator may do happens right here,
 * without leaving the page: status changes, the manual discount, editing the
 * customer details and the item list, and the receipt print.
 *
 * Closing never loses work silently: a typed-but-unapplied discount asks first,
 * and an open editor is cancelled before the modal itself closes.
 */
export default function OrderDetailsModal({ orderId, onClose, onChanged }) {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const { business } = useBusiness();
  const toast = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [products, setProducts] = useState([]);
  const [discountDirty, setDiscountDirty] = useState(false);
  const [editDirty, setEditDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmEditDiscard, setConfirmEditDiscard] = useState(false);
  const bodyRef = useRef(null);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const res = await get(`/orders/${orderId}`);
        setData(res);
        setFailed(false);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [orderId],
  );

  useEffect(() => {
    load();
  }, [load]);

  /* The modal owns the page while it is open, exactly like the shared Modal. */
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  /* Each mode opens at the top — the body is the only scroll area. */
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [editing]);

  useEffect(() => {
    const after = () => setPrinting(false);
    window.addEventListener('afterprint', after);
    return () => window.removeEventListener('afterprint', after);
  }, []);

  const order = data?.order;
  const items = data?.items || [];
  const currency = order?.currency || data?.business?.currency || business?.currency || 'IQD';
  const timeZone = zoneFor(locale, business?.timezone || data?.business?.timezone);
  const locked = order ? ['completed', 'cancelled'].includes(order.status) : false;
  const canEdit = can('orders.edit');
  // A receipt belongs to a finished order, and an edit window closes on it.
  const completed = order?.status === 'completed';
  const canPrint = completed && can('orders.print');

  const editHint = !canEdit
    ? t('od_cannot_edit')
    : completed
      ? t('od_completed_locked')
      : locked
        ? t('od_cannot_edit')
        : t('od_edit');
  const printHint = !completed ? t('od_print_locked') : can('orders.print') ? t('od_print') : t('od_no_permission');

  /* Leaves Edit Mode for the details view in the same modal — never a page. */
  const exitEdit = useCallback(() => {
    setEditing(false);
    setEditDirty(false);
  }, []);

  const requestClose = useCallback(() => {
    if (discountDirty) setConfirmDiscard(true);
    // An open editor is cancelled first — never closed together with the modal.
    else if (editing) {
      if (editDirty) setConfirmEditDiscard(true);
      else exitEdit();
    } else onClose();
  }, [discountDirty, editing, editDirty, exitEdit, onClose]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose]);

  const handleDirty = useCallback((next) => setDiscountDirty(next), []);
  const handleEditDirty = useCallback((next) => setEditDirty(next), []);

  /* Cancel returns to the details view; a form with edits asks first. */
  const cancelEdit = useCallback(() => {
    if (editDirty) setConfirmEditDiscard(true);
    else exitEdit();
  }, [editDirty, exitEdit]);

  const refresh = async () => {
    await load({ silent: true });
    onChanged?.();
  };

  const changeStatus = async (status) => {
    setBusy(true);
    try {
      await patch(`/orders/${orderId}/status`, { status });
      toast.success(t('order_status_updated'));
      await refresh();
    } catch (err) {
      toast.error(
        err.code === 'INVALID_STATUS_TRANSITION' ? t('error_invalid_transition') : t('error_generic'),
      );
      await load({ silent: true });
    } finally {
      setBusy(false);
    }
  };

  const applyDiscount = async ({ type, value }) => {
    setBusy(true);
    try {
      await patch(`/orders/${orderId}/discount`, { type, value });
      setDiscountDirty(false);
      toast.success(t('od_discount_applied'));
      await refresh();
    } catch (err) {
      toast.error(
        err.code === 'MANUAL_DISCOUNT_COUPON'
          ? t('od_coupon_lock')
          : err.code === 'DISCOUNT_TOO_LARGE'
            ? t('od_discount_too_large')
            : err.code === 'INVALID_DISCOUNT' || err.code === 'INVALID_DISCOUNT_TYPE'
              ? t('od_discount_invalid')
              : err.code === 'ORDER_COMPLETED_LOCKED' || err.code === 'ORDER_CANCELLED_LOCKED'
                ? t('error_order_locked')
                : t('error_generic'),
      );
    } finally {
      setBusy(false);
    }
  };

  const removeDiscount = async () => {
    setBusy(true);
    try {
      await patch(`/orders/${orderId}/discount`, { remove: true });
      setDiscountDirty(false);
      toast.success(t('od_discount_removed'));
      await refresh();
    } catch (err) {
      toast.error(
        err.code === 'ORDER_COMPLETED_LOCKED' || err.code === 'ORDER_CANCELLED_LOCKED'
          ? t('error_order_locked')
          : t('error_generic'),
      );
    } finally {
      setBusy(false);
    }
  };

  const doPrint = async () => {
    setBusy(true);
    try {
      // The same append-only print audit the standalone page writes.
      await post(`/orders/${orderId}/print`, {});
      /*
       * Re-read the order before it is printed, so the paper always carries the
       * latest saved values (and the print record just written) instead of the
       * payload captured when the modal opened.
       */
      setData(await get(`/orders/${orderId}`));
      setPrinting(true);
    } catch (err) {
      toast.error(err?.code === 'ORDER_NOT_COMPLETED' ? t('od_print_locked') : t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  /*
   * The paper prints only once it is paint-ready — fonts resolved, logo decoded
   * — so the printer receives exactly the receipt the preview draws.
   */
  useEffect(() => {
    if (!printing) return undefined;
    const done = () => setPrinting(false);
    window.addEventListener('afterprint', done);
    let cancelled = false;
    printReady().then(() => {
      if (!cancelled) window.print();
    });
    return () => {
      cancelled = true;
      window.removeEventListener('afterprint', done);
    };
  }, [printing]);

  /* The item editor needs the catalog; it is fetched the first time it opens. */
  const startEditing = () => {
    setEditDirty(false);
    setEditing(true);
    if (products.length) return;
    get('/catalog/products')
      .then((res) => setProducts(res.products || []))
      .catch(() => {
        /* the editor still opens; only adding lines needs the catalog */
      });
  };

  /*
   * One save for the editor: customer details through `PATCH /orders/:id`, the
   * item list only when it changed through `PUT /orders/:id/items`. The fresh
   * payload lands before Edit Mode closes, so the details view it returns to
   * already shows the new values. A failure leaves the form open with
   * everything the administrator typed.
   */
  const saveEdit = async (meta, items) => {
    setBusy(true);
    try {
      await patch(`/orders/${orderId}`, meta);
      if (items) await put(`/orders/${orderId}/items`, { items });
      await refresh();
      exitEdit();
      toast.success(t('od_edit_saved'));
    } catch (err) {
      toast.error(
        err.code === 'ORDER_COMPLETED_LOCKED' || err.code === 'ORDER_CANCELLED_LOCKED'
          ? t('error_order_locked')
          : t('error_generic'),
      );
    } finally {
      setBusy(false);
    }
  };

  const tableName = useMemo(() => {
    const table = data?.table;
    if (!table) return '';
    return localized(table, 'name', locale) || table.name || '';
  }, [data, locale]);

  const tableSource =
    order?.table_source === 'qr'
      ? t('od_table_qr')
      : order?.table_source === 'manual'
        ? t('od_table_manual')
        : null;

  const manualAmount = Number(order?.manual_discount_amount) || 0;

  return (
    <div
      className="odm-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <section className="odm" role="dialog" aria-modal="true" aria-label={t('od_title')}>
        <header className="odm__head">
          <HeaderBackdrop section="orders" />
          <div className="odm__art" aria-hidden="true">
            <OrdersArtwork />
          </div>
          <div className="odm__head-row">
            <span className="odm__head-icon">
              <Icon name="receipt" size={19} />
            </span>
            <div className="odm__head-text">
              <h2 className="odm__title">
                {editing && !locked && canEdit ? t('od_edit') : t('od_title')}
              </h2>
              {order ? <p className="odm__subtitle">#{fmtDigits(order.order_number, locale)}</p> : null}
            </div>
          </div>
          <button
            type="button"
            className="odm__close"
            onClick={requestClose}
            aria-label={t('action_close')}
            title={t('action_close')}
          >
            <Icon name="close" size={17} />
          </button>
        </header>

        <div className="odm__body" ref={bodyRef}>
          {loading && !data ? (
            <div className="odm__state">
              <Loading />
            </div>
          ) : failed || !order ? (
            <div className="odm__state">
              <Icon name="alert" size={22} />
              <p>{t('error_not_found')}</p>
            </div>
          ) : editing && !locked && canEdit ? (
            /* Edit Mode — only the fields the administrator may change. */
            <OrderEditPanel
              order={order}
              items={items}
              products={products}
              busy={busy}
              onSubmit={saveEdit}
              onDirtyChange={handleEditDirty}
            />
          ) : (
            <div className="odm-details">
              {/* 1 — order number, status, dates */}
              <div className="odm-identity">
                <div className="odm-identity__main">
                  <span className="odm-identity__label">{t('order_number')}</span>
                  <strong className="odm-identity__no">#{fmtDigits(order.order_number, locale)}</strong>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <div className="odm-dates">
                <span>
                  <Icon name="calendar" size={12} />
                  {t('od_created')} · {fmtDateTime(order.created_at, locale, timeZone)}
                </span>
                <span>
                  <Icon name="clock" size={12} />
                  {t('od_updated')} · {fmtDateTime(order.updated_at, locale, timeZone)}
                </span>
              </div>

              {locked ? (
                <div className="odm-note odm-note--warning">
                  <Icon name="lock" size={14} />
                  {order.status === 'completed' ? t('order_completed_lock_hint') : t('order_locked')}
                </div>
              ) : null}

              {/* 2 — the customer this order belongs to */}
              <section className="odm-card">
                <header className="odm-card__head">
                  <span className="odm-card__icon">
                    <Icon name="users" size={16} />
                  </span>
                  <h3 className="odm-card__title">{t('label_customer')}</h3>
                </header>
                <div className="odm-customer">
                  <div className="odm-customer__row">
                    <span>{t('label_customer_name')}</span>
                    <strong>{order.customer_name || '—'}</strong>
                  </div>
                  <div className="odm-customer__row">
                    <span>{t('label_customer_phone')}</span>
                    <strong dir="ltr">{order.customer_phone || '—'}</strong>
                  </div>
                  {order.notes ? (
                    <div className="odm-customer__row">
                      <span>{t('label_notes')}</span>
                      <strong className="odm-customer__notes">{order.notes}</strong>
                    </div>
                  ) : null}
                </div>
              </section>

              {/* 3 — table */}
              <div className={`odm-card odm-table ${tableName ? '' : 'is-neutral'}`}>
                <span className="odm-table__icon">
                  <Icon name="table" size={18} />
                </span>
                <div className="odm-table__text">
                  <span className="odm-table__label">{t('od_table')}</span>
                  <strong className="odm-table__name">{tableName || t('od_no_table')}</strong>
                  {tableSource ? <span className="odm-table__source">{tableSource}</span> : null}
                </div>
              </div>

              {/* 4 — ordered items */}
              <section className="odm-card">
                <header className="odm-card__head">
                  <span className="odm-card__icon">
                    <Icon name="coffee" size={16} />
                  </span>
                  <h3 className="odm-card__title">{t('od_products')}</h3>
                  <span className="odm-card__count">{items.length}</span>
                </header>
                <ul className="odm-items">
                  {items.map((item) => (
                    <li className="odm-item" key={item.id}>
                      <span className="odm-item__thumb">
                        {item.product_image ? (
                          <img src={item.product_image} alt="" loading="lazy" />
                        ) : (
                          <Icon name="coffee" size={17} />
                        )}
                      </span>
                      <div className="odm-item__main">
                        <span className="odm-item__name">{item.name}</span>
                        <span className="odm-item__meta">
                          {item.quantity} × <Money value={item.unit_price} currency={currency} />
                        </span>
                        {item.notes ? <span className="odm-item__note">{item.notes}</span> : null}
                      </div>
                      <span className="odm-item__total">
                        <Money value={item.line_total} currency={currency} />
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* 5 — manual discount */}
              <ManualDiscountCard
                key={`${order.manual_discount_type}-${order.manual_discount_amount}`}
                order={order}
                business={data.business}
                currency={currency}
                canEdit={canEdit}
                busy={busy}
                onApply={applyDiscount}
                onRemove={removeDiscount}
                onDirtyChange={handleDirty}
              />

              {/* 6 — financial summary */}
              <section className="odm-card odm-summary">
                <header className="odm-card__head">
                  <span className="odm-card__icon">
                    <Icon name="wallet" size={16} />
                  </span>
                  <h3 className="odm-card__title">{t('od_summary')}</h3>
                </header>
                <div className="odm-summary__row">
                  <span>{t('order_subtotal')}</span>
                  <Money value={order.subtotal} currency={currency} />
                </div>
                {order.promotion_code ? (
                  <div className="odm-summary__row">
                    <span className="odm-summary__tag">
                      <Icon name="tag" size={12} />
                      {t('od_coupon_applied')} · {order.promotion_code}
                    </span>
                    <span className="odm-summary__minus">
                      −<Money value={order.discount} currency={currency} />
                    </span>
                  </div>
                ) : null}
                {!order.promotion_code && manualAmount > 0 ? (
                  <div className="odm-summary__row">
                    <span className="odm-summary__tag">
                      <Icon name="percent" size={12} />
                      {t('od_manual_discount')}
                      {order.manual_discount_type === 'percent'
                        ? ` · ${Number(order.manual_discount_value) || 0}%`
                        : ''}
                    </span>
                    <span className="odm-summary__minus">
                      −<Money value={manualAmount} currency={currency} />
                    </span>
                  </div>
                ) : null}
                {Number(order.tax) > 0 ? (
                  <div className="odm-summary__row">
                    <span>{t('order_tax')}</span>
                    <Money value={order.tax} currency={currency} />
                  </div>
                ) : null}
                {Number(order.service_charge) > 0 ? (
                  <div className="odm-summary__row">
                    <span>{t('order_service')}</span>
                    <Money value={order.service_charge} currency={currency} />
                  </div>
                ) : null}
                <div className="odm-summary__grand">
                  <span>{t('order_grand_total')}</span>
                  <strong>
                    <Money value={order.total} currency={currency} />
                  </strong>
                </div>
              </section>

              {/* 7 — status workflow (same endpoint, restyled only) */}
              <section className="odm-card">
                <header className="odm-card__head">
                  <span className="odm-card__icon">
                    <Icon name="refresh" size={16} />
                  </span>
                  <h3 className="odm-card__title">{t('od_status')}</h3>
                </header>
                <OrderStatusControl
                  order={order}
                  transitions={data.allowed_transitions || []}
                  busy={busy}
                  onChange={changeStatus}
                />
              </section>

              {/* 8 — real activity */}
              <section className="odm-card">
                <header className="odm-card__head">
                  <span className="odm-card__icon">
                    <Icon name="history" size={16} />
                  </span>
                  <h3 className="odm-card__title">{t('od_activity')}</h3>
                </header>
                <OrderActivityTimeline
                  order={order}
                  history={data.history || []}
                  prints={data.prints || []}
                  discounts={data.discount_history || []}
                  currency={currency}
                  timeZone={timeZone}
                />
              </section>
            </div>
          )}
        </div>

        <footer className="odm__foot">
          {editing && !locked && canEdit ? (
            /*
             * Edit Mode footer — Cancel then Save in the DOM, so Save sits on
             * the physical right in English and on the left in Kurdish, Persian
             * and Arabic without a second rule.
             */
            <>
              <button
                type="button"
                className="odm__foot-btn odm__foot-btn--cancel"
                onClick={cancelEdit}
                disabled={busy}
              >
                <Icon name="close" size={15} />
                {t('action_cancel')}
              </button>
              <button
                type="submit"
                form={ORDER_EDIT_FORM_ID}
                className="odm__foot-btn odm__foot-btn--primary"
                disabled={busy}
              >
                {busy ? <span className="spinner" /> : <Icon name="check" size={15} />}
                {t('od_save_changes')}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="odm__foot-btn"
                onClick={startEditing}
                disabled={!order || locked || !canEdit || busy || editing}
                title={editHint}
                aria-disabled={!order || locked || !canEdit || busy || editing}
              >
                <Icon name="pencil" size={15} />
                {t('od_edit')}
              </button>
              <button
                type="button"
                className="odm__foot-btn odm__foot-btn--primary"
                onClick={doPrint}
                disabled={!order || busy || !canPrint}
                title={printHint}
                aria-disabled={!order || busy || !canPrint}
              >
                {busy && canPrint ? <span className="spinner" /> : <Icon name="print" size={15} />}
                {t('od_print')}
              </button>
            </>
          )}
        </footer>
      </section>

      <DiscardChangesDialog
        open={confirmDiscard}
        title={t('od_unsaved_title')}
        description={t('od_unsaved_message')}
        confirmLabel={t('od_discard')}
        onContinue={() => setConfirmDiscard(false)}
        onDiscard={() => {
          setConfirmDiscard(false);
          onClose?.();
        }}
      />

      {/* Unsaved edits: discarding returns to the details view, never closes. */}
      <DiscardChangesDialog
        open={confirmEditDiscard}
        title={t('od_edit_unsaved_title')}
        description={t('od_edit_unsaved_message')}
        confirmLabel={t('od_discard')}
        cancelLabel={t('od_keep_editing')}
        onContinue={() => setConfirmEditDiscard(false)}
        onDiscard={() => {
          setConfirmEditDiscard(false);
          exitEdit();
        }}
      />

      {/* The receipt payload is the order alone — activity stays on screen. */}
      {printing && data ? (
        <PrintableReceipt
          settings={data.business?.receipt_settings}
          data={{
            ...data,
            // The receipt prints the currency the order was really saved in.
            business: { ...data.business, currency },
          }}
          locale={locale}
        />
      ) : null}
    </div>
  );
}
