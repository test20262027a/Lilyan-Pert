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
import CartPanel from '../components/customer/CartPanel';
import ReviewModal from '../components/customer/ReviewModal';
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
  /* One review sheet for the whole page: the reviews card and the contact grid
     open the same form. */
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);

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

  /*
   * Picking a category filters the grid. The strip stays where it is, so the
   * products are only brought back into view when the guest has already
   * scrolled past them — never a jump on every tap.
   */
  const selectCategory = (id, { reveal = false } = {}) => {
    setActiveCat(id);
    window.requestAnimationFrame(() => {
      const grid = document.getElementById('cui-products');
      if (!grid) return;
      if (reveal || grid.getBoundingClientRect().top < 0) {
        grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
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

  const sendReview = async (form) => {
    setReviewBusy(true);
    try {
      await submitReview(form);
    } finally {
      setReviewBusy(false);
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

  /* A tap narrows the grid to the related product's category, to the related
     category, or opens the stored http(s) destination. Nothing else is a link. */
  const openAd = (ad) => {
    const product = ad.product_id ? (data.products || []).find((p) => p.id === ad.product_id) : null;
    const categoryId = product?.category_id || ad.category_id || null;
    if (categoryId) {
      selectCategory(categoryId, { reveal: true });
      return;
    }
    if (ad.link_url && /^https?:\/\//i.test(ad.link_url)) {
      window.open(ad.link_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="customer-shell">
      {/* The banner carries its own controls, so the page opens edge to edge
          exactly like the reference: basket on one side, language/admin on the
          other, logo floating in the middle. */}
      <CustomerHero business={biz} brandName={brandName} menuTitle={menuTitle} table={data.table}>
        <CustomerTopBar
          cartEnabled={cartEnabled}
          cartCount={cartCount}
          onCart={() => setCartOpen(true)}
          adminReturn={showAdminReturn}
        />
      </CustomerHero>

      <main className="customer-body">
        {/* Search, summary strip and working hours share one centred column,
            so the banner stays wide while the controls below it read as a
            single, calm vertical rhythm. */}
        <div className="cui-head">
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
            categories={categories.length}
            items={(data.products || []).length}
            typeLabel={biz.business_type ? t(`settings_type_${biz.business_type}`) : ''}
            hours={data.hours}
          />

          <CustomerHours hours={data.hours} timeZone={timeZone} />
        </div>

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

        <div className="cui-order">
          {showFeature('categories') ? (
            <CustomerCategoryNav
              categories={visibleCategories}
              activeCat={activeCat}
              onSelect={selectCategory}
            />
          ) : null}

          {/*
           * One continuous grid: searching and picking a category narrow the
           * same list instead of jumping between separate per-category blocks.
           */}
          <div className="cui-feed" id="cui-products">
            {products.length === 0 ? (
              <EmptyState icon="coffee" title={t('customer_menu_no_products')} />
            ) : (
              <div className="cui-grid">
                {products.map((p) => (
                  <CustomerProductCard
                    key={p.id}
                    product={p}
                    categoryName={localized(categories.find((c) => c.id === p.category_id), 'name', locale)}
                    locale={locale}
                    currency={currency}
                    showPrices={showFeature('prices')}
                    canAdd={cartEnabled}
                    addLabel={t('customer_menu_add_to_cart')}
                    promoLabel={t('customer_menu_promo')}
                    onAdd={add}
                    onOpen={showFeature('details') ? setDetail : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <CustomerAds ads={adsMenuEnd} locale={locale} onOpen={openAd} />

        <CustomerAbout text={localized(biz, 'description', locale) || biz.description || ''} />

        {showFeature('social') ? (
          <CustomerContact business={biz} locale={locale} onReview={() => setReviewOpen(true)} />
        ) : null}

        <ReviewSection
          reviews={data.reviews || []}
          onSubmit={sendReview}
          busy={reviewBusy}
          open={reviewOpen}
          onOpen={() => setReviewOpen(true)}
          onClose={() => setReviewOpen(false)}
        />
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
        <CartPanel
          menuKey={key}
          lines={cartLines}
          currency={currency}
          locale={locale}
          busy={busy}
          canCheckout={checkoutEnabled}
          canOrder={orderingEnabled}
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

/*
 * The public review block: the reviews the API already published, plus the one
 * control that opens the illustrated review sheet. The form itself lives in
 * ReviewModal — nothing here invents a review or a success state.
 */
function ReviewSection({ reviews, onSubmit, busy, open, onOpen, onClose }) {
  const { t } = useI18n();

  return (
    <section className="cui-block">
      <header className="cui-block__head">
        <span className="cui-block__icon">
          <Icon name="star" size={16} />
        </span>
        <h2>{t('customer_menu_reviews')}</h2>
      </header>

      {reviews.length === 0 ? (
        <p className="cui-about__text">{t('review_no_reviews')}</p>
      ) : (
        <ul className="cui-reviews">
          {reviews.slice(0, 6).map((r) => (
            <li key={r.id}>
              <div className="cui-reviews__head">
                <strong>{r.customer_name || t('review_customer')}</strong>
                <span className="cui-reviews__score">
                  <Icon name="star" size={12} />
                  {r.rating}/5
                </span>
              </div>
              {r.comment ? <p>{r.comment}</p> : null}
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="cui-review__cta" onClick={onOpen}>
        <span className="cui-review__ctaicon">
          <Icon name="star" size={16} />
        </span>
        <span>{t('customer_menu_write_review')}</span>
      </button>

      {open ? <ReviewModal busy={busy} onClose={onClose} onSubmit={onSubmit} /> : null}
    </section>
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
