import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import {
  Alert,
  EmptyState,
  Field,
  Loading,
  Modal,
  Money,
  SectionCard,
  Select,
  StatusBadge,
  Switch,
  useToast,
} from '../components/ui';
import { localized, useI18n } from '../i18n';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { get, post } from '../api';
import { fmtDateTime, fmtNumber, isoDay, zoneFor } from '../format';

const STATUSES = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];

export default function Orders() {
  const { t, locale } = useI18n();
  const { business } = useBusiness();
  const { isManager } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const timeZone = zoneFor(locale, business?.timezone);
  const currency = business?.currency || 'IQD';

  const [filters, setFilters] = useState({ status: 'all', date: '', from: '', to: '', receipt: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [tables, setTables] = useState([]);

  const receiptMode = Boolean(filters.receipt.trim());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'all') params.set('status', filters.status);
      if (receiptMode) {
        // Receipt search deliberately spans all dates.
        params.set('receipt', filters.receipt.trim());
      } else {
        if (filters.date) params.set('date', filters.date);
        if (filters.from) params.set('from', filters.from);
        if (filters.to) params.set('to', filters.to);
      }
      params.set('limit', '100');
      const res = await get(`/orders?${params.toString()}`);
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [filters, receiptMode]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const [p, tb] = await Promise.all([get('/catalog/products'), get('/manage/tables')]);
        setProducts(p.products || []);
        setTables(tb.tables || []);
      } catch {
        /* list stays empty; the create dialog still opens */
      }
    })();
  }, []);

  const setFilter = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }));

  const today = isoDay(new Date(), timeZone);

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <h1>{t('order_title')}</h1>
          <p>{receiptMode ? t('order_search_all_dates') : t('order_filter_date')}</p>
        </div>
        <div className="page-head__actions">
          <button className="btn" onClick={load} disabled={loading}>
            <Icon name="refresh" size={15} />
            {t('action_refresh')}
          </button>
          <button className="btn btn--primary" onClick={() => setCreateOpen(true)}>
            <Icon name="plus" size={15} />
            {t('order_new')}
          </button>
        </div>
      </div>

      <SectionCard icon="filter" iconClass="ic-blue" title={t('action_search')}>
        <div className="form-grid">
          <Field label={t('order_search_receipt')} hint={t('order_receipt_search_hint')}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Icon name="search" size={17} />
              <input
                className="input"
                value={filters.receipt}
                placeholder="#1001"
                onChange={(e) => setFilter('receipt')(e.target.value)}
              />
              {receiptMode ? (
                <button className="btn btn--sm" onClick={() => setFilter('receipt')('')} aria-label={t('action_clear')}>
                  <Icon name="close" size={15} />
                </button>
              ) : null}
            </div>
          </Field>
          <Field label={t('order_filter_status')}>
            <Select
              value={filters.status}
              onChange={setFilter('status')}
              options={[
                { value: 'all', label: t('label_all') },
                ...STATUSES.map((s) => ({ value: s, label: t(`status_${s}`) })),
              ]}
            />
          </Field>
          <Field label={t('order_filter_date')}>
            <input
              className="input"
              type="date"
              value={filters.date}
              disabled={receiptMode}
              onChange={(e) => setFilter('date')(e.target.value)}
            />
          </Field>
          <Field label={t('order_filter_from')}>
            <input
              className="input"
              type="date"
              value={filters.from}
              disabled={receiptMode}
              onChange={(e) => setFilter('from')(e.target.value)}
            />
          </Field>
          <Field label={t('order_filter_to')}>
            <input
              className="input"
              type="date"
              value={filters.to}
              disabled={receiptMode}
              onChange={(e) => setFilter('to')(e.target.value)}
            />
          </Field>
        </div>
        <div className="btn-row" style={{ marginTop: 12 }}>
          <button className="btn btn--sm" onClick={() => setFilters({ status: 'all', date: today, from: '', to: '', receipt: '' })}>
            {t('dash_revenue_today')}
          </button>
          <button className="btn btn--sm" onClick={() => setFilters({ status: 'all', date: '', from: '', to: '', receipt: '' })}>
            {t('action_clear_all')}
          </button>
        </div>
      </SectionCard>

      {data?.flow ? (
        <div className="stat-row">
          {STATUSES.map((s) => (
            <div className="stat" key={s}>
              <div className="stat__label">{t(`status_${s}`)}</div>
              <div className="stat__value">{fmtNumber(data.flow[s] || 0, locale)}</div>
            </div>
          ))}
        </div>
      ) : null}

      <SectionCard
        icon="receipt"
        iconClass="ic-purple"
        title={t('order_title')}
        subtitle={`${fmtNumber(data?.total || 0, locale)} ${t('label_records')}`}
      >
        {loading ? (
          <Loading />
        ) : (data?.orders || []).length === 0 ? (
          <EmptyState icon="receipt" title={t('order_no_orders')} />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t('order_number')}</th>
                  <th>{t('label_table')}</th>
                  <th>{t('label_customer')}</th>
                  <th>{t('order_grand_total')}</th>
                  <th>{t('label_status')}</th>
                  <th>{t('label_date')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.orders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 700 }}>#{o.order_number}</td>
                    <td>{o.table_name || '—'}</td>
                    <td>{o.customer_name || '—'}</td>
                    <td style={{ fontWeight: 700 }}>
                      <Money value={o.total} currency={currency} />
                    </td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(o.created_at, locale, timeZone)}</td>
                    <td>
                      <Link className="btn btn--sm" to={`/orders/${o.id}`}>
                        <Icon name="eye" size={14} />
                        {t('action_view')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {createOpen ? (
        <CreateOrderModal
          products={products}
          tables={tables}
          currency={currency}
          onClose={() => setCreateOpen(false)}
          onCreated={async (order) => {
            setCreateOpen(false);
            toast.success(t('order_created'));
            await load();
            navigate(`/orders/${order.id}`);
          }}
        />
      ) : null}

      {!isManager ? <Alert kind="warning">{t('user_view_only')}</Alert> : null}
    </>
  );
}

function CreateOrderModal({ products, tables, currency, onClose, onCreated }) {
  const { t, locale } = useI18n();
  const [tableId, setTableId] = useState('');
  const [lines, setLines] = useState([{ product_id: '', quantity: 1 }]);
  const [customer, setCustomer] = useState('');
  const [notes, setNotes] = useState('');
  const [discountPercent, setDiscountPercent] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const activeProducts = products.filter((p) => p.active && p.available);
  const priceOf = (id) => Number(products.find((p) => p.id === id)?.price || 0);
  const subtotal = lines.reduce((sum, l) => sum + priceOf(l.product_id) * (Number(l.quantity) || 0), 0);
  const discountValue = discountPercent ? (subtotal * Number(discount || 0)) / 100 : Number(discount || 0);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await post('/orders', {
        table_id: tableId || null,
        customer_name: customer || null,
        notes: notes || null,
        discount: Number(discount) || 0,
        discount_type: discountPercent ? 'percent' : 'fixed',
        items: lines
          .filter((l) => l.product_id && Number(l.quantity) > 0)
          .map((l) => ({ product_id: l.product_id, quantity: Number(l.quantity) })),
      });
      await onCreated(res.order);
    } catch (err) {
      setError(err.code);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={t('order_new')}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>
            {t('action_cancel')}
          </button>
          <button className="btn btn--primary" onClick={submit} disabled={busy}>
            {busy ? <span className="spinner" /> : <Icon name="check" size={16} />}
            {t('action_create')}
          </button>
        </>
      }
    >
      {error ? <Alert kind="error">{t('error_generic')}</Alert> : null}
      <div className="form-grid" style={{ marginTop: error ? 12 : 0 }}>
        <Field label={t('label_table')}>
          <Select
            value={tableId}
            onChange={setTableId}
            placeholder={t('label_none')}
            options={tables.map((tb) => ({ value: tb.id, label: tb.name }))}
          />
        </Field>
        <Field label={t('label_customer_name')}>
          <input className="input" value={customer} onChange={(e) => setCustomer(e.target.value)} />
        </Field>
      </div>

      <div style={{ marginTop: 14 }}>
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
              onClick={() => setLines((l) => (l.length === 1 ? l : l.filter((_, i) => i !== idx)))}
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
      </div>

      <div className="form-grid" style={{ marginTop: 14 }}>
        <Field label={t('order_discount')}>
          <input
            className="input"
            type="number"
            min="0"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
        </Field>
        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 8 }}>
          <Switch
            checked={discountPercent}
            onChange={setDiscountPercent}
            label={t('marketing_discount_percent')}
            ariaLabel={t('marketing_discount_percent')}
          />
        </div>
        <Field label={t('label_notes')} className="span-2">
          <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>

      <div className="totals" style={{ marginTop: 14 }}>
        <div className="totals__row">
          <span>{t('order_subtotal')}</span>
          <Money value={subtotal} currency={currency} />
        </div>
        {discountValue > 0 ? (
          <div className="totals__row">
            <span>{t('order_discount')}</span>
            <span>-<Money value={discountValue} currency={currency} /></span>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
