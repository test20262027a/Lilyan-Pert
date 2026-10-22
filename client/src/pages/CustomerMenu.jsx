import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Icon from '../components/Icon';
import {
  Badge,
  EmptyState,
  Loading,
  Modal,
  Money,
  SectionCard,
  useToast,
} from '../components/ui';
import { localized, useI18n, LOCALES } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { get, post } from '../api';
import { applyTheme } from '../theme';
import { fmtNumber, zoneFor } from '../format';
import CustomerAds from '../components/ads/CustomerAds';
import CustomerTopBar from '../components/customer/CustomerTopBar';
import CustomerHero from '../components/customer/CustomerHero';
import CustomerStats from '../components/customer/CustomerStats';
import CustomerHours from '../components/customer/CustomerHours';
import CustomerCategoryNav from '../components/customer/CustomerCategoryNav';
import CustomerProductCard from '../components/customer/CustomerProductCard';
import CustomerAbout from '../components/customer/CustomerAbout';
import CustomerContact from '../components/customer/CustomerContact';
import { appearanceOf } from '../components/menu/categoryIcons';
import '../customer.css';

const sessionKey = () => {
  let key = localStorage.getItem('lilyan.session');
  if (!key) {
    key = `s-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem('lilyan.session', key);
  }
  return key;
};

export default function CustomerMenu({ slug, adminMode = false }) {
  const params = useParams();
  const key = slug || params.key;
  const { t, locale, setLocale } = useI18n();
  const { user } = useAuth();
  const toast = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState(null);
  const [placed, setPlaced] = useState(null);
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState(null);
  const [tableId, setTableId] = useState('');

  const storageKey = `lilyan.cart.${key}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL(`/api/public/menu/${key}`, window.location.origin);
      // The in-store ordering menu is the "main" context; a public visitor is "qr".
      if (adminMode) url.searchParams.set('context', 'main');
      const tableToken = new URLSearchParams(window.location.search).get('table');
      if (tableToken) url.searchParams.set('table', tableToken);
      const res = await fetch(url.toString(), { credentials: 'include' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || 'ERROR');
      setData(payload);
      applyTheme(payload.business?.theme);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [key, adminMode]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      setCart(saved || {});
    } catch {
      setCart({});
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(cart));
  }, [cart, storageKey]);

  // Counts one view per browser session per day.
  useEffect(() => {
    if (!data || adminMode) return;
    post(`/public/views/${key}`, { session_key: sessionKey() }).catch(() => {});
  }, [data, key, adminMode]);

  /* Picking a category filters the list to it and brings it into view; the rail,
     the drawer and the chip strip all drive this one handler. */
  const selectCategory = (id) => {
    setActiveCat(id);
    if (!id) return;
    window.requestAnimationFrame(() => {
      document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const timeZone = zoneFor(locale, data?.business?.timezone);
  const currency = data?.business?.currency || 'IQD';

  const categories = data?.categories || [];
  /* Every category that still has a product, independent of the current
     selection — the rail, drawer and chips always list them all, so a guest can
     switch between categories (or back to "all") from any state. */
  const visibleCategories = useMemo(
    () => categories.filter((c) => (data?.products || []).some((p) => p.category_id === c.id)),
    [categories, data],
  );

  const products = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.products || []).filter((p) => {
      if (activeCat && p.category_id !== activeCat) return false;
      if (!q) return true;
      const cat = categories.find((c) => c.id === p.category_id);
      return ['name_en', 'name_ku', 'name_fa', 'name_ar'].some(
        (f) =>
          String(p[f] || '').toLowerCase().includes(q) ||
          String(cat?.[f.replace('name', 'name')] || '').toLowerCase().includes(q),
      );
    });
  }, [data, query, activeCat, categories]);

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => {
          const product = (data?.products || []).find((p) => p.id === id);
          if (!product) return null;
          const unit = product.promo_price ?? product.price;
          return { product, qty, unit: Number(unit), total: Number(unit) * qty };
        })
        .filter(Boolean),
    [cart, data],
  );
  const cartCount = cartLines.reduce((s, l) => s + l.qty, 0);
  const cartTotal = cartLines.reduce((s, l) => s + l.total, 0);

  const add = (product) => {
    setCart((c) => ({ ...c, [product.id]: (c[product.id] || 0) + 1 }));
  };
  const setQty = (product, qty) => {
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[product.id];
      else next[product.id] = qty;
      return next;
    });
  };

  const placeOrder = async ({ customer_name, customer_phone, notes, promotion_code }) => {
    setBusy(true);
    try {
      const items = cartLines.map((l) => ({ product_id: l.product.id, quantity: l.qty }));
      let res;
      if (adminMode) {
        const tableId = data?.table?.id || null;
        res = await post('/orders', { table_id: tableId, customer_name, customer_phone, notes, items });
        res = { order: res.order };
      } else {
        // The code is only a hint: the server re-reads the promotion and
        // recalculates the discount, so the amount is never taken from here.
        res = await post(`/public/orders/${key}`, {
          table_token: data?.table?.qr_token || null,
          // Only sent in the modes that allow choosing a table; the server
          // validates it against this business before attaching it.
          table_id: tableId || null,
          customer_name,
          customer_phone,
          notes,
          promotion_code: promotion_code ? promotion_code.trim() : null,
          items,
        });
      }
      setPlaced(res.order);
      setCart({});
      setCartOpen(false);
      toast.success(t('customer_menu_order_placed'));
    } catch (err) {
      if (err.code === 'MENU_DISABLED') toast.error(t('customer_menu_unavailable'));
      else if (err.code === 'ORDERING_DISABLED') toast.error(t('customer_ordering_disabled'));
      else if (err.code === 'INVALID_TABLE') toast.error(t('customer_table_invalid'));
      else if (err.code === 'PROMO_MIN_ORDER') toast.error(t('customer_promo_min_order'));
      else if (String(err.code || '').startsWith('PROMO_')) toast.error(t('customer_promo_invalid'));
      else toast.error(t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const submitReview = async ({ customer_name, rating, comment }) => {
    try {
      await post(`/public/reviews/${key}`, { customer_name, rating, comment });
      toast.success(t('customer_menu_review_thanks'));
      await load();
    } catch {
      toast.error(t('error_generic'));
    }
  };

  if (loading) return <Loading />;
  if (error || !data) {
    return (
      <div className="customer-shell" style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
        <EmptyState icon="alert" title={t('customer_menu_unavailable')} />
      </div>
    );
  }

  const biz = data.business;
  const brandName = localized(biz, 'name', locale) || biz.name;
  const menuTitle = biz.editable_text?.menu_title?.[locale] || t('customer_menu_brand');

  if (data.menu_disabled) {
    return (
      <div className="customer-shell" style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
        <EmptyState icon="alert" title={t('customer_menu_unavailable')} hint={brandName} />
      </div>
    );
  }

  const showAdminReturn =
    adminMode && biz.menu_settings?.show_admin_return !== false && biz.menu_settings?.show_customer_menu !== false;

  /*
   * The server resolves the Menu Settings for this context (main or qr), so the
   * guest only ever sees what the owner enabled there, and a missing payload
   * from an older API keeps every feature visible.
   */
  const features = data.menu?.features || {};
  const ordering = data.menu?.ordering || {};
  const showFeature = (name) => features[name] !== false;
  const allowAction = (name) => ordering[name] !== false;
  const tableMode = data.menu?.table_mode || 'qr';
  const cartEnabled = allowAction('cart');
  const checkoutEnabled = cartEnabled && allowAction('checkout');
  const orderingEnabled = checkoutEnabled && allowAction('order');
  /* In manual mode the guest always picks a table; the fallback mode only asks
     when the scanned QR did not identify one. */
  const needsTableChoice = !data.table && (tableMode === 'manual' || tableMode === 'qr_fallback');

  /*
   * The API ranks this business's best sellers from its own order history and
   * only sends them while the owner enabled the recommendation; each id is
   * resolved against the menu products that are actually sellable right now.
   */
  const bestProducts = (data.best_selling || [])
    .map((row) => products.find((p) => p.id === row.id))
    .filter(Boolean);

  /* The featured strip is likewise resolved from the business's own products. */
  const featuredProducts = (data.featured_ids || [])
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean);

  /*
   * Advertisements arrive already filtered by the API (enabled AND inside their
   * schedule) and ordered by priority; the placement decides where each strip
   * sits, so it never covers the category bar or the ordering controls.
   */
  const ads = data.advertisements || [];
  const adsBelowHeader = ads.filter((ad) => (ad.placement || 'below_header') === 'below_header');
  const adsMenuEnd = ads.filter((ad) => ad.placement === 'menu_end');

  /* A tap reveals the related product's category, the related category, or the
     stored http(s) destination. Nothing else is treated as a link. */
  const openAd = (ad) => {
    const product = ad.product_id ? (data.products || []).find((p) => p.id === ad.product_id) : null;
    const targetId = product?.category_id
      ? `cat-${product.category_id}`
      : ad.category_id
        ? `cat-${ad.category_id}`
        : null;
    const target = targetId ? document.getElementById(targetId) : null;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (ad.link_url && /^https?:\/\//i.test(ad.link_url)) {
      window.open(ad.link_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="customer-shell">
      <CustomerTopBar
        brandName={brandName}
        logoUrl={biz.logo_url}
        table={data.table}
        cartEnabled={cartEnabled}
        cartCount={cartCount}
        onCart={() => setCartOpen(true)}
        adminReturn={showAdminReturn}
      />

      <CustomerHero
        business={biz}
        brandName={brandName}
        menuTitle={menuTitle}
        table={data.table}
        hours={data.hours}
      />

      <main className="customer-body">
        {showFeature('search') ? (
          <div className="cui-search">
            <Icon name="search" size={18} />
            <input
              value={query}
              placeholder={t('customer_menu_search')}
              aria-label={t('customer_menu_search')}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        ) : null}

        {biz.editable_text?.welcome?.[locale] ? (
          <p className="cui-welcome">{biz.editable_text.welcome[locale]}</p>
        ) : null}

        <CustomerStats
          categories={visibleCategories.length}
          items={products.length}
          typeLabel={biz.business_type ? t(`settings_type_${biz.business_type}`) : ''}
        />

        <CustomerHours hours={data.hours} timeZone={timeZone} />

        <CustomerAds ads={adsBelowHeader} locale={locale} onOpen={openAd} />

        {featuredProducts.length > 0 ? (
          <section className="menu-section">
            <div className="cui-sec__head">
              <span className="cui-sec__icon">
                <Icon name="sparkles" size={17} />
              </span>
              <h2 className="cui-sec__title">{t('customer_menu_featured')}</h2>
              <span className="cui-sec__count">{fmtNumber(featuredProducts.length, locale)}</span>
            </div>
            <div className="cui-grid">
              {featuredProducts.map((p) => (
                <CustomerProductCard
                  key={p.id}
                  product={p}
                  categoryName={localized(categories.find((c) => c.id === p.category_id), 'name', locale)}
                  locale={locale}
                  currency={currency}
                  showPrices={showFeature('prices')}
                  canAdd={cartEnabled}
                  addLabel={t('customer_menu_add')}
                  promoLabel={t('customer_menu_promo')}
                  onAdd={add}
                  onOpen={showFeature('details') ? setDetail : undefined}
                />
              ))}
            </div>
          </section>
        ) : null}

        {bestProducts.length > 0 ? (
          <section className="menu-section">
            <div className="cui-sec__head">
              <span className="cui-sec__icon">
                <Icon name="trophy" size={17} />
              </span>
              <h2 className="cui-sec__title">{t('customer_menu_best_sellers')}</h2>
              <span className="cui-sec__count">{fmtNumber(bestProducts.length, locale)}</span>
            </div>
            <div className="cui-grid">
              {bestProducts.map((p) => (
                <CustomerProductCard
                  key={p.id}
                  product={p}
                  categoryName={localized(categories.find((c) => c.id === p.category_id), 'name', locale)}
                  locale={locale}
                  currency={currency}
                  showPrices={showFeature('prices')}
                  canAdd={cartEnabled}
                  addLabel={t('customer_menu_add')}
                  promoLabel={t('customer_menu_promo')}
                  badge={t('customer_menu_best_badge')}
                  onAdd={add}
                  onOpen={showFeature('details') ? setDetail : undefined}
                />
              ))}
            </div>
          </section>
        ) : null}

        <div className={`cui-order ${showFeature('categories') ? '' : 'is-plain'}`}>
          {showFeature('categories') ? (
            <CustomerCategoryNav
              categories={visibleCategories}
              activeCat={activeCat}
              onSelect={selectCategory}
            />
          ) : null}

          <div className="cui-feed">
            {products.length === 0 ? (
              <EmptyState icon="coffee" title={t('customer_menu_no_products')} />
            ) : (
              visibleCategories
                .filter((c) => products.some((p) => p.category_id === c.id))
                .map((c) => {
                  const items = products.filter((p) => p.category_id === c.id);
                  return (
                    <section className="menu-section" id={`cat-${c.id}`} key={c.id}>
                      <CategoryHeading category={c} count={items.length} />
                      <div className="cui-grid">
                        {items.map((p) => (
                          <CustomerProductCard
                            key={p.id}
                            product={p}
                            categoryName={localized(c, 'name', locale)}
                            locale={locale}
                            currency={currency}
                            showPrices={showFeature('prices')}
                            canAdd={cartEnabled}
                            addLabel={t('customer_menu_add')}
                            promoLabel={t('customer_menu_promo')}
                            onAdd={add}
                            onOpen={showFeature('details') ? setDetail : undefined}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })
            )}
          </div>
        </div>

        <CustomerAds ads={adsMenuEnd} locale={locale} onOpen={openAd} />

        <CustomerAbout text={localized(biz, 'description', locale) || biz.description || ''} />

        {showFeature('social') ? <CustomerContact business={biz} locale={locale} /> : null}

        <ReviewSection reviews={data.reviews || []} onSubmit={submitReview} timeZone={timeZone} />
      </main>

      {cartEnabled && cartCount > 0 && !placed ? (
        <div className="cart-bar">
          <div className="cart-bar__inner">
            <button className="btn btn--primary" style={{ flex: 1 }} onClick={() => setCartOpen(true)}>
              <Icon name="cart" size={17} />
              {t('customer_menu_view_order')} · {cartCount}
              <Money value={cartTotal} currency={currency} />
            </button>
          </div>
        </div>
      ) : null}

      {cartOpen ? (
        <CartModal
          lines={cartLines}
          currency={currency}
          busy={busy}
          canCheckout={checkoutEnabled}
          canOrder={orderingEnabled}
          tableMode={tableMode}
          tableMissing={!data.table && tableMode === 'qr'}
          needsTableChoice={needsTableChoice}
          tables={data.tables || []}
          tableId={tableId}
          onTable={setTableId}
          onClose={() => setCartOpen(false)}
          onQty={setQty}
          onClear={() => setCart({})}
          onSubmit={placeOrder}
        />
      ) : null}

      {detail ? (
        <ProductDetail
          product={detail}
          locale={locale}
          currency={currency}
          showPrices={showFeature('prices')}
          canAdd={cartEnabled}
          addLabel={t('customer_menu_add')}
          promoLabel={t('customer_menu_promo')}
          onAdd={add}
          onClose={() => setDetail(null)}
        />
      ) : null}

      {placed ? (
        <Modal
          title={t('customer_menu_order_placed')}
          onClose={() => setPlaced(null)}
          footer={
            <>
              <button className="btn" onClick={() => setPlaced(null)}>
                {t('action_close')}
              </button>
              {adminMode ? (
                <Link className="btn btn--primary" to={`/orders/${placed.id}`}>
                  <Icon name="eye" size={16} />
                  {t('customer_menu_view_order')}
                </Link>
              ) : null}
            </>
          }
        >
          <div className="receipt-center" style={{ padding: '10px 0' }}>
            <Icon name="check" size={34} />
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 8 }}>
              {t('customer_menu_order_number')}: #{placed.order_number}
            </div>
            <div style={{ marginTop: 6 }} className="badge badge--pending">
              {t(`status_${placed.status}`)}
            </div>
            <div style={{ marginTop: 12 }}>
              <Money value={placed.total} currency={currency} />
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

/* The heading over one category's products: its own identity glyph and accent,
   the localized name, and how many items it holds. */
function CategoryHeading({ category, count }) {
  const { t, locale } = useI18n();
  const appearance = appearanceOf(category);
  return (
    <div className="cui-sec__head">
      <span className="cui-cat-icon" style={{ '--cic': appearance.color }} aria-hidden="true">
        <Icon name={appearance.icon} size={17} />
      </span>
      <h2 className="cui-sec__title">{localized(category, 'name', locale)}</h2>
      <span className="cui-sec__count" title={t('customer_menu_items')}>
        {fmtNumber(count, locale)}
      </span>
    </div>
  );
}
function ReviewSection({ reviews, onSubmit, timeZone }) {
  const { t, locale } = useI18n();
  const [form, setForm] = useState({ customer_name: '', rating: 5, comment: '' });

  return (
    <SectionCard icon="star" iconClass="ic-amber" title={t('customer_menu_reviews')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {reviews.length === 0 ? <EmptyState icon="star" title={t('review_no_reviews')} /> : null}
        {reviews.slice(0, 6).map((r) => (
          <div key={r.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <strong style={{ fontSize: 13.5 }}>{r.customer_name || t('review_customer')}</strong>
              <span className="badge badge--pending">{r.rating}/5</span>
            </div>
            <p className="review-text" style={{ marginTop: 4 }}>{r.comment}</p>
          </div>
        ))}

        <div className="form-grid">
          <div className="field">
            <span className="field__label">{t('customer_menu_review_name')}</span>
            <input
              className="input"
              value={form.customer_name}
              onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
            />
          </div>
          <div className="field">
            <span className="field__label">{t('review_rating')}</span>
            <select
              className="select"
              value={form.rating}
              onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))}
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} / 5
                </option>
              ))}
            </select>
          </div>
          <div className="field span-2">
            <span className="field__label">{t('customer_menu_review_comment')}</span>
            <textarea
              className="textarea"
              value={form.comment}
              onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <button
            className="btn btn--primary btn--sm"
            onClick={async () => {
              await onSubmit(form);
              setForm({ customer_name: '', rating: 5, comment: '' });
            }}
            disabled={!form.comment.trim()}
          >
            <Icon name="check" size={15} />
            {t('customer_menu_review_submit')}
          </button>
        </div>
      </div>
    </SectionCard>
  );
}

function CartModal({
  lines,
  currency,
  busy,
  canCheckout,
  canOrder,
  tableMode,
  tableMissing,
  needsTableChoice,
  tables,
  tableId,
  onTable,
  onClose,
  onQty,
  onClear,
  onSubmit,
}) {
  const { t } = useI18n();
  const [form, setForm] = useState({ customer_name: '', customer_phone: '', notes: '', promotion_code: '' });
  const total = lines.reduce((s, l) => s + l.total, 0);
  // A mode that requires choosing a table cannot submit without one.
  const tableReady = !needsTableChoice || Boolean(tableId);
  const canSubmit = canOrder && tableReady;

  return (
    <Modal
      title={t('customer_menu_your_order')}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClear} disabled={busy || lines.length === 0}>
            <Icon name="trash" size={15} />
            {t('customer_menu_clear_cart')}
          </button>
          {canSubmit ? (
            <button className="btn btn--primary" onClick={() => onSubmit(form)} disabled={busy || lines.length === 0}>
              {busy ? <span className="spinner" /> : <Icon name="check" size={16} />}
              {t('customer_menu_place_order')}
            </button>
          ) : null}
        </>
      }
    >
      {lines.length === 0 ? (
        <EmptyState icon="cart" title={t('customer_menu_cart_empty')} />
      ) : (
        <>
          {lines.map((l) => (
            <div className="cart-line" key={l.product.id}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="product-name" style={{ fontSize: 13 }}>
                  {l.product[`name_${'en'}`] || l.product.name_en}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  <Money value={l.unit} currency={currency} />
                </div>
              </div>
              <span className="qty">
                <button onClick={() => onQty(l.product, l.qty - 1)} aria-label="minus">
                  <Icon name="chevronDown" size={14} />
                </button>
                <span>{l.qty}</span>
                <button onClick={() => onQty(l.product, l.qty + 1)} aria-label="plus">
                  <Icon name="plus" size={14} />
                </button>
              </span>
              <strong style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                <Money value={l.total} currency={currency} />
              </strong>
            </div>
          ))}

          {needsTableChoice ? (
            <div className="field" style={{ marginTop: 12 }}>
              <span className="field__label">{t('customer_table_select')}</span>
              <select className="select" value={tableId} onChange={(e) => onTable(e.target.value)}>
                <option value="">{t('customer_table_select_placeholder')}</option>
                {tables.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                    {row.zone ? ` · ${row.zone}` : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {tableMissing ? (
            <p className="cart-note">
              <Icon name="info" size={14} /> {t('customer_table_missing')}
            </p>
          ) : null}
          {!canCheckout ? (
            <p className="cart-note">
              <Icon name="info" size={14} /> {t('customer_checkout_disabled')}
            </p>
          ) : null}
          {canCheckout && !canOrder ? (
            <p className="cart-note">
              <Icon name="info" size={14} /> {t('customer_ordering_disabled')}
            </p>
          ) : null}

          {canCheckout ? (
          <div className="form-grid" style={{ marginTop: 12 }}>
            <div className="field">
              <span className="field__label">{t('label_customer_name')}</span>
              <input
                className="input"
                value={form.customer_name}
                onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
              />
            </div>
            <div className="field">
              <span className="field__label">{t('label_customer_phone')}</span>
              <input
                className="input"
                dir="ltr"
                value={form.customer_phone}
                onChange={(e) => setForm((f) => ({ ...f, customer_phone: e.target.value }))}
              />
            </div>
            <div className="field span-2">
              <span className="field__label">{t('customer_promo_code')}</span>
              <input
                className="input"
                dir="ltr"
                value={form.promotion_code}
                placeholder="SUMMER20"
                onChange={(e) => setForm((f) => ({ ...f, promotion_code: e.target.value }))}
              />
            </div>
            <div className="field span-2">
              <span className="field__label">{t('label_notes')}</span>
              <textarea
                className="textarea"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          ) : null}

          <div className="totals" style={{ marginTop: 14 }}>
            <div className="totals__row totals__row--grand">
              <span>{t('order_grand_total')}</span>
              <Money value={total} currency={currency} />
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}

/**
 * The product detail view opened by tapping a card while the owner kept
 * "Product details" enabled. It reads only the data the menu already sent.
 */
function ProductDetail({ product, locale, currency, showPrices, canAdd, addLabel, promoLabel, onAdd, onClose }) {
  const { t } = useI18n();
  const name = localized(product, 'name', locale);
  const description = localized(product, 'description', locale);

  return (
    <Modal
      title={name}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            {t('action_close')}
          </button>
          {canAdd ? (
            <button
              className="btn btn--primary"
              onClick={() => {
                onAdd(product);
                onClose();
              }}
            >
              <Icon name="plus" size={16} />
              {addLabel}
            </button>
          ) : null}
        </>
      }
    >
      <div className="product-detail">
        <div className="product-detail__media">
          {product.image_url ? (
            <img src={product.image_url} alt="" />
          ) : (
            <span className="product-detail__empty">
              <Icon name="coffee" size={30} />
            </span>
          )}
        </div>
        {description ? <p className="product-detail__desc">{description}</p> : null}
        {showPrices ? (
          <div className="product-detail__price">
            {product.promo_price ? (
              <span className="price-tag--old">
                <Money value={product.price} currency={currency} />
              </span>
            ) : null}
            <span className="price-tag">
              <Money value={product.promo_price ?? product.price} currency={currency} />
            </span>
            {product.promo_price ? (
              <Badge kind="pending">
                <Icon name="tag" size={11} />
                {promoLabel}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
