import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { zoneFor } from '../format';
import CustomerAds from '../components/ads/CustomerAds';

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
  const [stuck, setStuck] = useState(false);
  const [placed, setPlaced] = useState(null);
  const [busy, setBusy] = useState(false);
  const headerRef = useRef(null);

  const storageKey = `lilyan.cart.${key}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL(`/api/public/menu/${key}`, window.location.origin);
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
  }, [key]);

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

  /*
   * The category bar only becomes "stuck" (compact) once the main header has
   * scrolled out of view. It keeps its own space in the flow, so it can never
   * cover the product content.
   */
  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { rootMargin: '-8px 0px 0px 0px', threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [data]);

  const timeZone = zoneFor(locale, data?.business?.timezone);
  const currency = data?.business?.currency || 'IQD';

  const categories = data?.categories || [];
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
   * The API ranks this business's best sellers from its own order history and
   * only sends them while the owner enabled the recommendation; each id is
   * resolved against the menu products that are actually sellable right now.
   */
  const bestProducts = (data.best_selling || [])
    .map((row) => products.find((p) => p.id === row.id))
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
      <header className="customer-header" ref={headerRef}>
        <div className="customer-header__row">
          <div className="customer-header__brand">
            <span className="customer-header__logo">
              {biz.logo_url ? <img src={biz.logo_url} alt="" /> : brandName.slice(0, 2)}
            </span>
            <div className="customer-header__text">
              {/* Localized "Digital Menu + Business Name", kept on one line. */}
              <div className="customer-header__title" title={`${menuTitle} · ${brandName}`}>
                {menuTitle} · {brandName}
              </div>
              <div className="customer-header__sub">
                {data.table ? (
                  <span>
                    <Icon name="table" size={13} /> {data.table.name}
                  </span>
                ) : null}
                {biz.city ? <span>{biz.city}</span> : null}
              </div>
            </div>
          </div>
          <div className="customer-header__actions">
            <select
              className="ghost-btn"
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              aria-label={t('label_language')}
            >
              {LOCALES.map((l) => (
                <option key={l.code} value={l.code} style={{ color: '#111' }}>
                  {l.label}
                </option>
              ))}
            </select>
            <button className="ghost-btn" onClick={() => setCartOpen(true)} aria-label={t('customer_menu_cart')}>
              <Icon name="cart" size={18} />
              {cartCount > 0 ? <span style={{ fontWeight: 800 }}>{cartCount}</span> : null}
            </button>
          </div>
        </div>
      </header>

      <div className={`category-bar ${stuck ? 'is-stuck' : ''}`}>
        <div className="category-bar__scroll">
          <button
            className={`cat-pill ${!activeCat ? 'is-active' : ''}`}
            onClick={() => setActiveCat(null)}
          >
            {t('customer_menu_all')}
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={`cat-pill ${activeCat === c.id ? 'is-active' : ''}`}
              onClick={() => {
                setActiveCat(c.id);
                document.getElementById(`cat-${c.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              <Icon name={c.icon || 'utensils'} size={14} />
              {localized(c, 'name', locale)}
            </button>
          ))}
        </div>
      </div>

      <main className="customer-body">
        <div className="card card--pad">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Icon name="search" size={17} />
            <input
              className="input"
              value={query}
              placeholder={t('customer_menu_search')}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {biz.editable_text?.welcome?.[locale] ? (
            <p style={{ marginTop: 10, color: 'var(--muted)', fontSize: 13 }}>
              {biz.editable_text.welcome[locale]}
            </p>
          ) : null}
        </div>

        <CustomerAds ads={adsBelowHeader} locale={locale} onOpen={openAd} />

        {bestProducts.length > 0 ? (
          <section className="menu-section best-sellers">
            <h2 style={{ fontSize: 16, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="trophy" size={17} />
              {t('customer_menu_best_sellers')}
            </h2>
            <div className="menu-item-grid">
              {bestProducts.map((p) => (
                <MenuProduct
                  key={p.id}
                  product={p}
                  locale={locale}
                  currency={currency}
                  onAdd={add}
                  addLabel={t('customer_menu_add')}
                  promoLabel={t('customer_menu_promo')}
                />
              ))}
            </div>
          </section>
        ) : null}

        {products.length === 0 ? (
          <EmptyState icon="coffee" title={t('customer_menu_no_products')} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {categories
              .filter((c) => products.some((p) => p.category_id === c.id))
              .map((c) => (
                <section className="menu-section" id={`cat-${c.id}`} key={c.id}>
                  <h2 style={{ fontSize: 16, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name={c.icon || 'utensils'} size={17} />
                    {localized(c, 'name', locale)}
                  </h2>
                  <div className="menu-item-grid">
                    {products
                      .filter((p) => p.category_id === c.id)
                      .map((p) => (
                        <MenuProduct
                          key={p.id}
                          product={p}
                          locale={locale}
                          currency={currency}
                          onAdd={add}
                          addLabel={t('customer_menu_add')}
                          promoLabel={t('customer_menu_promo')}
                        />
                      ))}
                  </div>
                </section>
              ))}
          </div>
        )}

        <CustomerAds ads={adsMenuEnd} locale={locale} onOpen={openAd} />

        <ReviewSection reviews={data.reviews || []} onSubmit={submitReview} timeZone={timeZone} />

        <footer style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12.5, paddingBottom: 8 }}>
          {biz.phone ? (
            <div>
              <Icon name="phone" size={12} /> <span dir="ltr">{biz.phone}</span>
            </div>
          ) : null}
          {biz.socials && Object.keys(biz.socials).length ? (
            <div className="social-list" style={{ justifyContent: 'center', marginTop: 8 }}>
              {Object.entries(biz.socials).map(([network, url]) => (
                <a key={network} className={`social-link social-link--${network}`} href={url} target="_blank" rel="noreferrer" aria-label={network}>
                  <Icon name={network === 'website' ? 'globe' : 'link'} size={17} />
                </a>
              ))}
            </div>
          ) : null}
        </footer>
      </main>

      {cartCount > 0 && !placed ? (
        <div className="cart-bar">
          <div className="cart-bar__inner">
            <button className="btn btn--primary" style={{ flex: 1 }} onClick={() => setCartOpen(true)}>
              <Icon name="cart" size={17} />
              {t('customer_menu_view_order')} · {cartCount}
              <Money value={cartTotal} currency={currency} />
            </button>
            {showAdminReturn ? (
              <Link className="btn" to="/">
                <Icon name="arrowLeft" size={16} />
                {t('customer_menu_return_to_admin')}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {showAdminReturn && cartCount === 0 ? (
        <div className="cart-bar">
          <div className="cart-bar__inner">
            <Link className="btn btn--block" to="/">
              <Icon name="arrowLeft" size={16} />
              {t('customer_menu_return_to_admin')}
            </Link>
          </div>
        </div>
      ) : null}

      {cartOpen ? (
        <CartModal
          lines={cartLines}
          currency={currency}
          busy={busy}
          onClose={() => setCartOpen(false)}
          onQty={setQty}
          onClear={() => setCart({})}
          onSubmit={placeOrder}
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

function CartModal({ lines, currency, busy, onClose, onQty, onClear, onSubmit }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ customer_name: '', customer_phone: '', notes: '', promotion_code: '' });
  const total = lines.reduce((s, l) => s + l.total, 0);

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
          <button className="btn btn--primary" onClick={() => onSubmit(form)} disabled={busy || lines.length === 0}>
            {busy ? <span className="spinner" /> : <Icon name="check" size={16} />}
            {t('customer_menu_place_order')}
          </button>
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
 * One sellable product card. Shared by the regular category sections and the
 * best-selling strip, so both always offer the same price and add action.
 */
function MenuProduct({ product: p, locale, currency, onAdd, addLabel, promoLabel }) {
  return (
    <article className="menu-item">
      <span className="menu-item__thumb">
        {p.image_url ? <img src={p.image_url} alt="" loading="lazy" /> : <Icon name="coffee" size={22} />}
      </span>
      <div className="menu-item__info">
        {/* Product names stay fully visible on one line. */}
        <div className="product-name" title={localized(p, 'name', locale)}>
          {localized(p, 'name', locale)}
        </div>
        {localized(p, 'description', locale) ? (
          <div className="menu-item__desc">{localized(p, 'description', locale)}</div>
        ) : null}
        <div className="menu-item__foot">
          <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
            {p.promo_price ? (
              <span className="price-tag--old">
                <Money value={p.price} currency={currency} />
              </span>
            ) : null}
            <span className="price-tag">
              <Money value={p.promo_price ?? p.price} currency={currency} />
            </span>
            {p.promo_price ? (
              <Badge kind="pending">
                <Icon name="tag" size={11} />
                {promoLabel}
              </Badge>
            ) : null}
          </span>
          <button className="add-btn" onClick={() => onAdd(p)} aria-label={addLabel}>
            <Icon name="plus" size={19} />
          </button>
        </div>
      </div>
    </article>
  );
}
