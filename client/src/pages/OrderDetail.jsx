import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/Icon';
import { PrintPortal, ReceiptPaper, ReceiptPrintStyle } from '../components/Receipt';
import {
  Alert,
  Badge,
  EmptyState,
  Field,
  Loading,
  Modal,
  Money,
  SectionCard,
  Select,
  StatusBadge,
  useToast,
} from '../components/ui';
import DeleteConfirmationDialog from '../components/confirm/DeleteConfirmationDialog';
import OrderTableLabel from '../components/orders/OrderTableLabel';
import { localized, useI18n } from '../i18n';
import { useBusiness } from '../context/BusinessContext';
import { del, get, patch, post, put } from '../api';
import { fmtDateTime, zoneFor } from '../format';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Opened from the orders list, Back returns to that day and its filters;
  // a direct visit falls back to the plain list.
  const backTo = location.state?.from || '/orders';
  const { t, locale } = useI18n();
  const { business } = useBusiness();
  const toast = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [editItems, setEditItems] = useState(false);
  const [editMeta, setEditMeta] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [products, setProducts] = useState([]);

  const timeZone = zoneFor(locale, business?.timezone);
  const currency = data?.business?.currency || business?.currency || 'IQD';
  const order = data?.order;
  const locked = order ? ['completed', 'cancelled'].includes(order.status) : false;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get(`/orders/${id}`);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const res = await get('/catalog/products');
        setProducts(res.products || []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    const after = () => setPrinting(false);
    window.addEventListener('afterprint', after);
    return () => window.removeEventListener('afterprint', after);
  }, []);

  const changeStatus = async (status) => {
    setBusy(true);
    try {
      const res = await patch(`/orders/${id}/status`, { status });
      // The response is applied immediately, so a completed order locks its
      // controls without needing a page refresh.
      setData((d) => ({
        ...d,
        order: { ...d.order, ...res.order },
        allowed_transitions: {
          pending: ['preparing', 'cancelled'],
          preparing: ['ready', 'cancelled'],
          ready: ['completed', 'cancelled'],
          completed: [],
          cancelled: [],
        }[res.order.status] || [],
      }));
      toast.success(t('order_status_updated'));
      load();
    } catch (err) {
      toast.error(err.code === 'INVALID_STATUS_TRANSITION' ? t('error_invalid_transition') : t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const saveMeta = async (values) => {
    setBusy(true);
    try {
      const res = await patch(`/orders/${id}`, values);
      setData((d) => ({ ...d, order: res.order }));
      setEditMeta(false);
      toast.success(t('state_saved'));
    } catch (err) {
      toast.error(err.code === 'ORDER_COMPLETED_LOCKED' ? t('error_order_locked') : t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const saveItems = async (items, discount, discountPercent) => {
    setBusy(true);
    try {
      const res = await put(`/orders/${id}/items`, {
        items,
        discount,
        discount_type: discountPercent ? 'percent' : 'fixed',
      });
      setData((d) => ({ ...d, order: res.order }));
      setEditItems(false);
      toast.success(t('state_saved'));
      load();
    } catch (err) {
      toast.error(err.code === 'ORDER_COMPLETED_LOCKED' ? t('error_order_locked') : t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const doPrint = async () => {
    setBusy(true);
    try {
      // Records the print action (append-only audit) right when Print is pressed.
      await post(`/orders/${id}/print`, {});
      setPreview(false);
      setPrinting(true);
      setTimeout(() => window.print(), 80);
      await load();
    } catch {
      toast.error(t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const removeOrder = async () => {
    setBusy(true);
    try {
      await del(`/orders/${id}`);
      toast.success(t('state_saved'));
      navigate('/orders');
    } catch (err) {
      toast.error(err.code === 'ORDER_COMPLETED_LOCKED' ? t('error_order_locked') : t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return <Loading />;
  if (!data) return <Alert kind="error">{t('error_not_found')}</Alert>;

  const receiptData = { ...data, history: data.history };

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <h1>
            {t('order_number')} #{order.order_number}
          </h1>
          <p>
            {data.table?.name ? `${t('label_table')}: ${data.table.name} · ` : ''}
            {fmtDateTime(order.created_at, locale, timeZone)}
          </p>
        </div>
        <div className="page-head__actions">
          <Link className="btn btn--sm btn--dir-icon" to={backTo}>
            <Icon name="arrowLeft" size={15} />
            {t('action_back')}
          </Link>
          <button className="btn btn--sm" onClick={() => setPreview(true)} disabled={busy}>
            <Icon name="eye" size={15} />
            {t('order_receipt_preview')}
          </button>
          {!locked ? (
            <button className="btn btn--primary btn--sm" onClick={doPrint} disabled={busy}>
              <Icon name="print" size={15} />
              {t('order_print')}
            </button>
          ) : (
            <button className="btn btn--sm" onClick={doPrint} disabled={busy}>
              <Icon name="print" size={15} />
              {t('order_print')}
            </button>
          )}
        </div>
      </div>

      {locked ? (
        <Alert kind="warning" icon="alert">
          {order.status === 'completed' ? t('order_completed_lock_hint') : t('order_locked')}
        </Alert>
      ) : null}

      <div className="grid grid--2">
        <SectionCard
          icon="receipt"
          iconClass="ic-purple"
          title={t('order_details')}
          actions={<StatusBadge status={order.status} />}
        >
          <div className="totals">
            <div className="totals__row">
              <span>{t('label_customer')}</span>
              <span>{order.customer_name || '—'}</span>
            </div>
            <div className="totals__row">
              <span>{t('label_customer_phone')}</span>
              <span dir="ltr">{order.customer_phone || '—'}</span>
            </div>
            <div className="totals__row">
              <span>{t('label_table')}</span>
              <span>
                <OrderTableLabel name={data.table?.name} source={order.table_source} />
              </span>
            </div>
            <div className="totals__row">
              <span>{t('order_changed_by')}</span>
              <span>{data.order.created_by_name || t('label_customer')}</span>
            </div>
            <div className="totals__row">
              <span>{t('label_notes')}</span>
              <span>{order.notes || '—'}</span>
            </div>
          </div>
          <div className="btn-row" style={{ marginTop: 14 }}>
            <button className="btn btn--sm" onClick={() => setEditMeta(true)} disabled={locked || busy}>
              <Icon name="pencil" size={14} />
              {t('action_edit')}
            </button>
            {order.status !== 'completed' ? (
              <button className="btn btn--sm btn--danger-soft" onClick={() => setConfirmDelete(true)} disabled={busy}>
                <Icon name="trash" size={14} />
                {t('action_delete')}
              </button>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard icon="refresh" iconClass="ic-teal" title={t('order_change_status')}>
          {(data.allowed_transitions || []).length === 0 ? (
            <EmptyState icon="check" title={t('order_completed_lock_hint')} />
          ) : (
            <div className="btn-row">
              {data.allowed_transitions.map((status) => (
                <button
                  key={status}
                  className={`btn btn--sm ${status === 'cancelled' ? 'btn--danger-soft' : 'btn--primary'}`}
                  disabled={busy || locked}
                  onClick={() => changeStatus(status)}
                >
                  <Icon name={status === 'cancelled' ? 'close' : 'check'} size={14} />
                  {t(`status_${status}`)}
                </button>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        icon="coffee"
        iconClass="ic-coral"
        title={t('order_items')}
        actions={
          <button className="btn btn--sm" onClick={() => setEditItems(true)} disabled={locked || busy}>
            <Icon name="pencil" size={14} />
            {t('order_edit_items')}
          </button>
        }
      >
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t('order_items')}</th>
                <th>{t('label_quantity')}</th>
                <th>{t('label_price')}</th>
                <th>{t('label_total')}</th>
              </tr>
            </thead>
            <tbody>
              {(data.items || []).map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.quantity}</td>
                  <td>
                    <Money value={item.unit_price} currency={currency} />
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    <Money value={item.line_total} currency={currency} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="totals" style={{ marginTop: 14, maxWidth: 320, marginInlineStart: 'auto' }}>
          <div className="totals__row">
            <span>{t('order_subtotal')}</span>
            <Money value={order.subtotal} currency={currency} />
          </div>
          {Number(order.discount) > 0 ? (
            <div className="totals__row">
              <span>{t('order_discount')}</span>
              <span>
                -<Money value={order.discount} currency={currency} />
              </span>
            </div>
          ) : null}
          {Number(order.tax) > 0 ? (
            <div className="totals__row">
              <span>{t('order_tax')}</span>
              <Money value={order.tax} currency={currency} />
            </div>
          ) : null}
          {Number(order.service_charge) > 0 ? (
            <div className="totals__row">
              <span>{t('order_service')}</span>
              <Money value={order.service_charge} currency={currency} />
            </div>
          ) : null}
          <div className="totals__row totals__row--grand">
            <span>{t('order_grand_total')}</span>
            <Money value={order.total} currency={currency} />
          </div>
        </div>
      </SectionCard>

      <div className="grid grid--2">
        <SectionCard icon="refresh" iconClass="ic-blue" title={t('order_audit')}>
          {(data.history || []).length === 0 ? (
            <EmptyState icon="refresh" title={t('dash_no_status_changes')} />
          ) : (
            (data.history || []).map((h) => (
              <div className="rank-row" key={h.id}>
                <span className="rank-row__name">
                  {h.from_status ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <StatusBadge status={h.from_status} />
                      <Icon name="arrowRight" size={13} />
                      <StatusBadge status={h.to_status} />
                    </span>
                  ) : (
                    <StatusBadge status={h.to_status} />
                  )}
                </span>
                <span className="rank-row__value">
                  {h.changed_by_name || '—'} · {fmtDateTime(h.changed_at, locale, timeZone)}
                </span>
              </div>
            ))
          )}
        </SectionCard>

        <SectionCard icon="print" iconClass="ic-slate" title={t('order_print_events')}>
          {(data.prints || []).length === 0 ? (
            <EmptyState icon="print" title={t('order_printed_never')} />
          ) : (
            (data.prints || []).map((p) => (
              <div className="rank-row" key={p.id}>
                <span className="rank-row__name">
                  <Badge kind="active">
                    <Icon name="print" size={12} />
                    {t('receipt_printed_by')}
                  </Badge>
                </span>
                <span className="rank-row__value">
                  {p.printed_by_name || '—'} · {fmtDateTime(p.printed_at, locale, timeZone)}
                </span>
              </div>
            ))
          )}
        </SectionCard>
      </div>

      {preview ? (
        <Modal
          title={t('order_receipt_preview')}
          onClose={() => setPreview(false)}
          footer={
            <>
              <button className="btn" onClick={() => setPreview(false)}>
                {t('action_close')}
              </button>
              <button className="btn btn--primary" onClick={doPrint} disabled={busy}>
                <Icon name="print" size={16} />
                {t('order_print')}
              </button>
            </>
          }
        >
          <ReceiptPaper data={receiptData} locale={locale} t={t} showChangeInfo />
        </Modal>
      ) : null}

      {editMeta ? (
        <EditMetaModal
          order={order}
          busy={busy}
          onClose={() => setEditMeta(false)}
          onSave={saveMeta}
        />
      ) : null}

      {editItems ? (
        <EditItemsModal
          items={data.items || []}
          products={products}
          discount={order.discount}
          currency={currency}
          busy={busy}
          onClose={() => setEditItems(false)}
          onSave={saveItems}
        />
      ) : null}

      {confirmDelete ? (
        <DeleteConfirmationDialog
          entityType="order"
          entityName={`#${order.order_number}`}
          busy={busy}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={removeOrder}
        />
      ) : null}

      {/* The printed receipt: one continuous flow, audit info per the setting. */}
      {printing ? (
        <PrintPortal>
          {/* Paper width, scale and margins come from the saved print settings. */}
          <ReceiptPrintStyle settings={data.business?.receipt_settings} />
          <ReceiptPaper data={receiptData} locale={locale} t={t} showChangeInfo />
        </PrintPortal>
      ) : null}
    </>
  );
}

function EditMetaModal({ order, busy, onClose, onSave }) {
  const { t } = useI18n();
  const [values, setValues] = useState({
    customer_name: order.customer_name || '',
    customer_phone: order.customer_phone || '',
    notes: order.notes || '',
  });
  return (
    <Modal
      title={t('action_edit')}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>
            {t('action_cancel')}
          </button>
          <button className="btn btn--primary" onClick={() => onSave(values)} disabled={busy}>
            {busy ? <span className="spinner" /> : <Icon name="check" size={16} />}
            {t('action_save')}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label={t('label_customer_name')}>
          <input className="input" value={values.customer_name} onChange={(e) => setValues((v) => ({ ...v, customer_name: e.target.value }))} />
        </Field>
        <Field label={t('label_customer_phone')}>
          <input className="input" dir="ltr" value={values.customer_phone} onChange={(e) => setValues((v) => ({ ...v, customer_phone: e.target.value }))} />
        </Field>
        <Field label={t('label_notes')} className="span-2">
          <textarea className="textarea" value={values.notes} onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))} />
        </Field>
      </div>
    </Modal>
  );
}

function EditItemsModal({ items, products, discount, currency, busy, onClose, onSave }) {
  const { t, locale } = useI18n();
  const activeProducts = products.filter((p) => p.active && p.available);
  const [lines, setLines] = useState(
    items.map((i) => ({ product_id: i.product_id || '', quantity: i.quantity })),
  );
  const [discountValue, setDiscountValue] = useState(discount);
  const [percent, setPercent] = useState(false);

  const priceOf = (id) => Number(products.find((p) => p.id === id)?.price || 0);
  const subtotal = lines.reduce((s, l) => s + priceOf(l.product_id) * (Number(l.quantity) || 0), 0);

  return (
    <Modal
      title={t('order_edit_items')}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>
            {t('action_cancel')}
          </button>
          <button
            className="btn btn--primary"
            disabled={busy}
            onClick={() =>
              onSave(
                lines.filter((l) => l.product_id).map((l) => ({ product_id: l.product_id, quantity: Number(l.quantity) })),
                Number(discountValue) || 0,
                percent,
              )
            }
          >
            {busy ? <span className="spinner" /> : <Icon name="check" size={16} />}
            {t('action_save')}
          </button>
        </>
      }
    >
      {lines.map((line, idx) => (
        <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <Select
            value={line.product_id}
            onChange={(v) => setLines((l) => l.map((x, i) => (i === idx ? { ...x, product_id: v } : x)))}
            placeholder={t('order_select_product')}
            options={activeProducts.map((p) => ({ value: p.id, label: localized(p, 'name', locale) }))}
          />
          <input
            className="input"
            type="number"
            min="1"
            style={{ width: 90 }}
            value={line.quantity}
            onChange={(e) => setLines((l) => l.map((x, i) => (i === idx ? { ...x, quantity: e.target.value } : x)))}
          />
          <button
            className="btn btn--icon btn--danger-soft"
            onClick={() => setLines((l) => l.filter((_, i) => i !== idx))}
            aria-label={t('action_delete')}
          >
            <Icon name="trash" size={15} />
          </button>
        </div>
      ))}
      <button className="btn btn--sm" onClick={() => setLines((l) => [...l, { product_id: '', quantity: 1 }])}>
        <Icon name="plus" size={14} />
        {t('order_add_item')}
      </button>

      <div className="form-grid" style={{ marginTop: 14 }}>
        <Field label={t('order_discount')}>
          <input
            className="input"
            type="number"
            min="0"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
          />
        </Field>
        <Field label={t('marketing_promotion_type')}>
          <Select
            value={percent ? 'percent' : 'fixed'}
            onChange={(v) => setPercent(v === 'percent')}
            options={[
              { value: 'fixed', label: t('marketing_discount_fixed') },
              { value: 'percent', label: t('marketing_discount_percent') },
            ]}
          />
        </Field>
      </div>

      <div className="totals" style={{ marginTop: 12 }}>
        <div className="totals__row">
          <span>{t('order_subtotal')}</span>
          <Money value={subtotal} currency={currency} />
        </div>
      </div>
    </Modal>
  );
}
