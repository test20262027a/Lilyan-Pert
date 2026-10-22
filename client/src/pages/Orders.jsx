import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon';
import {
  Alert,
  EmptyState,
  Field,
  Loading,
  Modal,
  Money,
  Select,
  Switch,
  useToast,
} from '../components/ui';
import { localized, useI18n } from '../i18n';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { get, patch, post } from '../api';
import { fmtDay, fmtNumber, isoDay, zoneFor } from '../format';
import useMediaQuery from '../hooks/useMediaQuery';
import OrdersBanner from '../components/orders/OrdersBanner';
import DateNav from '../components/orders/DateNav';
import OrdersToolbar from '../components/orders/OrdersToolbar';
import OrdersTable from '../components/orders/OrdersTable';
import OrdersCards from '../components/orders/OrdersCards';
import '../orders.css';

/* The application's own authoritative status model — one list, no duplicates. */
const STATUSES = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
const PAGE_SIZE = 25;
/** Quiet refresh so a new order or a status change shows up without a reload. */
const POLL_MS = 15000;

export default function Orders() {
  const { t, locale } = useI18n();
  const { business } = useBusiness();
  const { isManager } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  /*
   * The list view can be linked to (`/orders?date=…&status=…&q=…`) — that is
   * what the row links hand back when an order is opened and closed again.
   */
  const [urlParams] = useSearchParams();
  const timeZone = zoneFor(locale, business?.timezone);
  const currency = business?.currency || 'IQD';
  // Phones get the compact cards; tablets and up keep the seven-column table.
  const compact = useMediaQuery('(max-width: 720px)');

  const [day, setDay] = useState(() => urlParams.get('date') || isoDay(new Date(), timeZone));
  const [status, setStatus] = useState(() => urlParams.get('status') || 'all');
  const [query, setQuery] = useState(() => urlParams.get('q') || '');
  const [search, setSearch] = useState(() => (urlParams.get('q') || '').trim());
  const [pages, setPages] = useState(1);

  const [list, setList] = useState({ orders: [], total: 0, loading: true, error: null });
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [tables, setTables] = useState([]);

  const searching = Boolean(search);

  /*
   * Debounced search: the query only reaches the API once typing pauses.
   * Enter flushes it immediately instead of waiting for the timer.
   */
  const applySearch = useCallback(() => {
    setSearch(query.trim());
    setPages(1);
  }, [query]);

  useEffect(() => {
    const id = setTimeout(applySearch, 250);
    return () => clearTimeout(id);
  }, [applySearch]);


  /*
   * Receipt search deliberately ignores the selected date and looks across
   * every order of this business; clearing it restores the day view.
   */
  const requestQuery = useMemo(() => {
    const p = new URLSearchParams();
    if (searching) p.set('receipt', search);
    else p.set('date', day);
    if (status !== 'all') p.set('status', status);
    p.set('limit', String(PAGE_SIZE * pages));
    return p.toString();
  }, [day, search, searching, status, pages]);

  const reqRef = useRef(0);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      const id = ++reqRef.current;
      if (!silent) setList((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await get(`/orders?${requestQuery}`);
        // A newer request already answered — never let a stale one overwrite it.
        if (id !== reqRef.current) return;
        setList({ orders: res.orders || [], total: res.total || 0, loading: false, error: null });
      } catch (err) {
        if (id !== reqRef.current) return;
        setList((s) => ({ ...s, loading: false, error: err.code || 'REQUEST_FAILED' }));
      }
    },
    [requestQuery],
  );

  // "Load more" keeps the rows already on screen; a filter change replaces them.
  useEffect(() => {
    load({ silent: loadingMore });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  useEffect(() => {
    setLoadingMore(false);
  }, [list]);

  // Live refresh of the same query (replaced, never appended, so no duplicates).
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') load({ silent: true });
    };
    const timer = setInterval(tick, POLL_MS);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', tick);
    };
  }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const [p, tb] = await Promise.all([get('/catalog/products'), get('/manage/tables')]);
        setProducts(p.products || []);
        setTables(tb.tables || []);
      } catch {
        /* the list stays empty; the create dialog still opens */
      }
    })();
  }, []);

  const changeDay = (value) => {
    setDay(value);
    setPages(1);
  };
  const changeStatus = (value) => {
    setStatus(value);
    setPages(1);
  };

  const loadMore = () => {
    setLoadingMore(true);
    // The request runs on the next render, once the larger page size applies.
    setPages((p) => p + 1);
  };

  /** Real, authorized status transition. The backend validates it again. */
  const changeOrderStatus = async (order, next) => {
    setBusyId(order.id);
    try {
      const res = await patch(`/orders/${order.id}/status`, { status: next });
      const updated = { ...res.order, allowed_transitions: res.allowed_transitions || [] };
      toast.success(t('order_status_updated'));
      setList((s) => {
        const stillMatches = status === 'all' || updated.status === status;
        if (!stillMatches) {
          return { ...s, orders: s.orders.filter((o) => o.id !== order.id), total: Math.max(0, s.total - 1) };
        }
        return { ...s, orders: s.orders.map((o) => (o.id === order.id ? { ...o, ...updated } : o)) };
      });
      load({ silent: true });
    } catch (err) {
      toast.error(
        err.code === 'INVALID_STATUS_TRANSITION'
          ? t('error_invalid_transition')
          : err.code === 'ORDER_COMPLETED_LOCKED'
            ? t('error_order_locked')
            : t('error_generic'),
      );
      load({ silent: true });
    } finally {
      setBusyId(null);
    }
  };

  const { orders, total } = list;
  const hasMore = orders.length < total;

  /* Handed to the row links so opening an order and coming back keeps the view. */
  const backTo = (() => {
    const p = new URLSearchParams();
    p.set('date', day);
    if (status !== 'all') p.set('status', status);
    if (query.trim()) p.set('q', query.trim());
    return `/orders?${p.toString()}`;
  })();
  const linkState = useMemo(() => ({ from: backTo }), [backTo]);

  const listProps = {
    orders,
    currency,
    timeZone,
    busyId,
    linkState,
    onStatusChange: changeOrderStatus,
  };

  return (
    <div className="orders">
      <OrdersBanner
        icon="cart"
        title={t('order_title')}
        subtitle={fmtDay(day, locale, timeZone, { weekday: true })}
      >
        <DateNav value={day} onChange={changeDay} timeZone={timeZone} />
      </OrdersBanner>

      <OrdersToolbar
        query={query}
        onQueryChange={setQuery}
        onSearch={applySearch}
        status={status}
        onStatusChange={changeStatus}
        statuses={STATUSES}
      />

      {list.error ? (
        <Alert kind="error">
          {t('error_generic')}
          <button className="btn btn--sm" onClick={() => load()} disabled={list.loading}>
            <Icon name="refresh" size={14} />
            {t('action_retry')}
          </button>
        </Alert>
      ) : null}

      <div className="otable-wrap">
        {list.loading ? (
          <div className="olist__state">
            <Loading />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState icon="receipt" title={t('order_no_orders')} hint={t('order_no_orders_hint')} />
        ) : compact ? (
          <div className="ocards">
            <OrdersCards {...listProps} />
          </div>
        ) : (
          <OrdersTable {...listProps} />
        )}

        {orders.length > 0 ? (
          <div className="otable__foot">
            <span>{t('order_showing', { shown: fmtNumber(orders.length, locale), total: fmtNumber(total, locale) })}</span>
            {searching ? (
              <span className="ofoot__note">
                <Icon name="search" size={13} />
                {t('order_search_all_dates')}
              </span>
            ) : null}
            <span className="ofoot__spacer" />
            {hasMore ? (
              <button
                type="button"
                className="btn btn--sm"
                onClick={loadMore}
                disabled={loadingMore || list.loading}
              >
                {loadingMore ? <span className="spinner" /> : <Icon name="chevronDown" size={14} />}
                {t('order_load_more')}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {!isManager ? <Alert kind="warning">{t('user_view_only')}</Alert> : null}

      {createOpen ? (
        <CreateOrderModal
          products={products}
          tables={tables}
          currency={currency}
          onClose={() => setCreateOpen(false)}
          onCreated={async (order) => {
            setCreateOpen(false);
            toast.success(t('order_created'));
            await load({ silent: true });
            navigate(`/orders/${order.id}`);
          }}
        />
      ) : null}
    </div>
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
            <span>
              -<Money value={discountValue} currency={currency} />
            </span>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
