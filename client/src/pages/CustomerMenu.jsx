import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import Icon from '../components/Icon';
import { EmptyState, Money, useToast } from '../components/ui';
import GlobalBrandedLoader from '../components/brand/GlobalBrandedLoader';
import { rememberBrandLogo } from '../brandLogo';
import { beginLoading, endLoading } from '../loading';
import { localized, useI18n, LOCALES } from '../i18n';
import { currencyForLanguage, productPrice, setLanguageSettings } from '../languages';
import { useAuth } from '../context/AuthContext';
import { get, post } from '../api';
import { applyTheme } from '../theme';
import { fmtNumber, zoneFor } from '../format';
import CustomerAds from '../components/ads/CustomerAds';
import CustomerTopBar from '../components/customer/CustomerTopBar';
import CustomerHero from '../components/customer/CustomerHero';
import CustomerStickyHeader from '../components/customer/CustomerStickyHeader';
import CustomerStats from '../components/customer/CustomerStats';
import CustomerHours from '../components/customer/CustomerHours';
import CustomerCategoryNav from '../components/customer/CustomerCategoryNav';
import CustomerProductCard from '../components/customer/CustomerProductCard';
import CustomerCarousel from '../components/customer/CustomerCarousel';
import ProductDetailModal from '../components/customer/ProductDetailModal';
import CustomerAbout from '../components/customer/CustomerAbout';
import CustomerPanel from '../components/customer/CustomerPanel';
import CustomerContact from '../components/customer/CustomerContact';
import CartPanel from '../components/customer/CartPanel';
import OrderSuccessModal from '../components/customer/OrderSuccessModal';
import ReviewModal from '../components/customer/ReviewModal';
import CustomerClosedNotice from '../components/customer/CustomerClosedNotice';
import AnimatedBackToTop from '../components/backToTop/AnimatedBackToTop';
import useOpeningStatus from '../hooks/useOpeningStatus';
import useDocumentMetadata from '../hooks/useDocumentMetadata';
import useLanguageAvailability from '../hooks/useLanguageAvailability';
import '../customer.css';
import '../customerAvailability.css';

const sessionKey = () => {
  let key = localStorage.getItem('lilyan.session');
  if (!key) {
    key = `s-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem('lilyan.session', key);
  }
  return key;
};

/*
 * The business name in the language the guest is reading.
 *
 * The ordering is explicit: the active language's saved name, then the
 * business's own default language, then the main name — so a menu whose
 * translation was left empty still shows a real name instead of a blank header.
 */
function businessNameIn(business, locale, fallback) {
  const read = (code) => (code ? String(business?.[`name_${code}`] || '').trim() : '');
  return read(locale) || read(fallback) || business?.name || '';
}

export default function CustomerMenu({ slug, adminMode = false, tableToken: scannedToken }) {
  const params = useParams();
  const key = slug || params.key;
  /*
   * The scanned table token decides the ordering context with the server: a
   * menu carrying one is a QR table session. Read from the router, not from a
   * one-off `window.location` look, so switching to (or away from) a table link
   * inside the running app re-reads the menu instead of keeping the previous
   * context — which is also what keeps the admin return control honest.
   */
  const { search } = useLocation();
  /* A short `/t/<token>` link hands the token in directly (the page resolves the
     business first); the longer `/m/<slug>?table=<token>` form — what already
     printed codes carry — still reads it from the address. Same token, same QR
     context, so neither link can drift from the other. */
  const tableToken = scannedToken || new URLSearchParams(search).get('table') || '';
  const { t, locale, languageSettings } = useI18n();
  const { user, can } = useAuth();
  const toast = useToast();

  const [data, setData] = useState(null);
  /* The guest's tab carries this menu's section and the business's own name. */
  useDocumentMetadata(data?.business);
  /* Menu Settings owns the enabled languages; a switch made while this panel is
     open arrives here without a reload, on both the main and customer menus. */
  useLanguageAvailability(key);
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
  /* One order at a time — see `placeOrder`. */
  const placingRef = useRef(false);
  /* True once the banner has scrolled away: the compact header takes over. */
  const [barred, setBarred] = useState(false);
  const heroRef = useRef(null);

  const storageKey = `lilyan.cart.${key}`;

  const load = useCallback(async ({ silent = false } = {}) => {
    /* First read only: a background re-read (a tab coming back, an admin
       editing the menu) never takes the screen over. */
    if (!silent) {
      setLoading(true);
      beginLoading('menu');
    }
    try {
      const url = new URL(`/api/public/menu/${key}`, window.location.origin);
      // The in-store ordering menu is the "main" context; a public visitor is "qr".
      if (adminMode) url.searchParams.set('context', 'main');
      if (tableToken) url.searchParams.set('table', tableToken);
      const res = await fetch(url.toString(), { credentials: 'include' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || 'ERROR');
      /*
       * The menu payload carries the owner's saved Language Management — the one
       * source of truth — and feeds it into the shared store, so the language
       * selector offers exactly the enabled languages and a language the owner
       * just disabled falls back to the configured default immediately.
       */
      setLanguageSettings(payload.language_settings);
      /* A retry that succeeds must clear the earlier failure, or the page would
         keep showing the error over perfectly good data. */
      setError(null);
      /* Appearance is written to the document before the menu is handed to
         React, so the first painted frame of the panel is already themed. */
      applyTheme(payload.business?.theme, payload.business?.id);
      setData(payload);
      /* The loader on this page and in the admin shell draws this same logo, so
         it is remembered for the next boot instead of being fetched again. */
      rememberBrandLogo(payload.business?.logo_url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      if (!silent) endLoading('menu');
    }
  }, [key, adminMode, tableToken]);

  useEffect(() => {
    load();
  }, [load]);

  /*
   * Menu Settings and the featured flags are saved on the server, so the menu
   * re-reads them — without a spinner or losing the cart — whenever the guest
   * comes back to this tab. That is how an Admin change reaches an open Customer
   * Panel: a section appears or disappears with the next look at the page.
   */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') load({ silent: true });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  /*
   * A menu left open keeps up with Menu Settings on its own: a quiet re-read
   * every 30 seconds brings a section in or takes it out, refreshes the
   * category product counts and picks up a feature the owner just switched —
   * with no spinner, no reload and no loss of cart, search or table state.
   */
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load({ silent: true });
    }, 30000);
    return () => clearInterval(timer);
  }, [load]);

  /*
   * The compact header appears when the banner leaves the viewport. An
   * IntersectionObserver drives that once per crossing, instead of a scroll
   * listener that would re-render the whole page on every frame.
   */
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || !data || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setBarred(!entry.isIntersecting),
      /* The top inset matches the compact bar, so the switch happens exactly
         when the banner has slid behind it. */
      { rootMargin: '-64px 0px 0px 0px', threshold: 0 },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, [data]);

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

  /*
   * A manually chosen table belongs to the order being placed, never to the
   * guest as a preference: nothing is stored and nothing is restored, so every
   * fresh order starts with no table selected and the selector shows its
   * placeholder again. A table saved by an older build is dropped here instead
   * of resurfacing. A QR session is unaffected — its table is resolved from the
   * scanned token on the server, not from this state.
   */
  useEffect(() => {
    localStorage.removeItem(`lilyan.table.${key}`);
  }, [key]);

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
  /* One order is one currency: the ordering language's own (Kurdish/Arabic IQD,
     Persian TOMAN — never Rial — and English USD). Nothing is converted. */
  const businessCurrency = data?.business?.currency || 'IQD';
  const currency = currencyForLanguage(locale, businessCurrency);

  /*
   * Whether the business is taking orders right now, re-read on the business's
   * own clock every 30 seconds — so a menu left open across the opening minute
   * re-enables itself, and one left open past closing pauses itself, with no
   * reload. Everything ordering-related hangs off this one verdict.
   */
  const opening = useOpeningStatus(data?.business?.working_hours, data?.business?.timezone);

  const categories = data?.categories || [];
  /* The card's no-photo fallback draws the product's own category glyph, and
     the QR menu simply scales it a touch smaller than the in-store panel. */
  const categoryOf = (p) => categories.find((c) => c.id === p.category_id);
  const mediaVariant = data?.menu?.context === 'main' ? 'customer-card' : 'qr-card';
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
          /*
           * Every line is re-priced from the active language's own saved amount,
           * so switching language recalculates the whole cart instead of keeping
           * the previous language's money. A line with no price in this language
           * stays listed but is marked unavailable and cannot be checked out.
           */
          const price = productPrice(product, locale, businessCurrency);
          const unit = price.valid ? price.amount : null;
          return { product, qty, unit, total: unit === null ? 0 : unit * qty, valid: price.valid };
        })
        .filter(Boolean),
    [cart, data, locale, businessCurrency],
  );
  const cartCount = cartLines.reduce((s, l) => s + l.qty, 0);
  const cartTotal = cartLines.reduce((s, l) => s + l.total, 0);
  /* A line the current language cannot price blocks checkout — never a silent
     charge in another language's currency. */
  const cartBlocked = cartLines.some((line) => !line.valid);

  const add = (product) => {
    // Only a product with a real price in the active language may be ordered.
    if (!productPrice(product, locale, businessCurrency).valid) return;
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
  /* One step down; the last unit removes the line, so a count can never go
     below zero and the card returns to its Add to Cart state. */
  const removeOne = (product) => setQty(product, (cart[product.id] || 0) - 1);

  /*
   * One order per tap. The lock is a ref, so it closes before React re-renders
   * the disabled button — a double click or a second submit event in the same
   * frame can never create two orders. It reports whether the order was really
   * saved, which is what lets the form reset itself on success alone: on any
   * failure the cart, the table and everything typed stay exactly as they were.
   */
  const placeOrder = async ({ customer_name, customer_phone, notes, promotion_code }) => {
    // A line without a price in this language can never be sent to the server.
    if (cartBlocked || placingRef.current) return false;
    placingRef.current = true;
    setBusy(true);
    try {
      const items = cartLines.map((l) => ({ product_id: l.product.id, quantity: l.qty }));
      let res;
      if (adminMode) {
        // The main ordering menu has no QR link, so the table is the one the
        // guest picked in the form. The language is sent too, so the server
        // prices the order in the currency the guest is reading.
        res = await post('/orders', {
          table_id: tableId || null,
          customer_name,
          customer_phone,
          notes,
          items,
          language: locale,
        });
        res = { order: res.order };
      } else {
        // The code is only a hint: the server re-reads the promotion and
        // recalculates the discount, so the amount is never taken from here.
        res = await post(`/public/orders/${key}`, {
          // The ordering context this menu was served in, so the server reads
          // the same Admin ordering policy the guest was shown.
          context: data?.menu?.context === 'main' ? 'main' : 'qr',
          table_token: data?.table?.qr_token || null,
          // Only sent in the modes that allow choosing a table; the server
          // validates it against this business before attaching it.
          table_id: tableId || null,
          customer_name,
          customer_phone,
          notes,
          promotion_code: promotion_code ? promotion_code.trim() : null,
          // The server re-validates that this language is still enabled and that
          // every product really has a price in it before saving the order.
          language: locale,
          items,
        });
      }
      setPlaced(res.order);
      setCart({});
      setCartOpen(false);
      /*
       * The backend confirmed the order, so the table this order was placed at
       * is spent: it is cleared here, which returns the selector to its
       * placeholder and requires a new choice for the next order. A QR table is
       * never cleared — it identifies the guest's table for the whole session —
       * and a failed submission keeps both the table and the cart for a retry.
       */
      if (!data?.table) setTableId('');
      toast.success(t('customer_menu_order_placed'));
      // The sheet and the page both stay mounted: only this form's own state
      // was reset above — no reload, no navigation, nothing remounted.
      return true;
    } catch (err) {
      if (err.code === 'MENU_DISABLED') toast.error(t('customer_menu_unavailable'));
      else if (err.code === 'PRICES_HIDDEN') toast.error(t('customer_prices_hidden'));
      else if (err.code === 'ORDERING_DISABLED') toast.error(t('customer_ordering_disabled'));
      else if (err.code === 'INVALID_TABLE') toast.error(t('customer_table_invalid'));
      else if (err.code === 'PROMO_MIN_ORDER') toast.error(t('customer_promo_min_order'));
      else if (err.code === 'LANGUAGE_UNAVAILABLE' || err.code === 'PRODUCT_PRICE_UNAVAILABLE') {
        toast.error(t('customer_menu_price_unavailable'));
      } else if (String(err.code || '').startsWith('PROMO_')) toast.error(t('customer_promo_invalid'));
      else toast.error(t('error_generic'));
      return false;
    } finally {
      placingRef.current = false;
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

  /* The menu is genuinely loading, so the shared loader is told so explicitly —
     left to the global signal it would render nothing here, and the guest would
     see the first-paint splash until it is timed out. */
  /* The wait is shown by the app's one root overlay — this page renders no
     loader of its own, so nothing can switch size or position mid-load. */
  if (loading) return null;
  if (error || !data) {
    /* A real failure: the same branded surface turns into a localised error with
       a retry, so the guest is never left watching an endless animation. */
    return (
      <GlobalBrandedLoader
        isLoading={false}
        error={error || 'ERROR'}
        message={t('customer_menu_unavailable')}
        onRetry={() => {
          setError(null);
          load();
        }}
      />
    );
  }

  const biz = data.business;
  /* The banner heading follows the guest's language, then the business's own
     default language, then the main name. */
  /* The fallback name follows the store, so a default language the owner just
     changed is honoured without waiting for the full payload to reload. */
  const brandName = businessNameIn(
    biz,
    locale,
    languageSettings?.default_language || data.language_settings?.default_language,
  );
  /* The owner's saved welcome line, shown under the name when it exists. */
  const welcome = biz.editable_text?.welcome?.[locale] || '';

  if (data.menu_disabled) {
    return (
      <div className="customer-shell" style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
        <EmptyState icon="alert" title={t('customer_menu_unavailable')} hint={brandName} />
      </div>
    );
  }

  /* The way back into the admin panel belongs to the MAIN ordering menu, and
     that menu is the same address whether it is opened from the admin panel or
     typed directly — so the decision is taken from the payload the server
     resolved plus the live session, never from the route that led here, a
     referrer or navigation history. A menu carrying a scanned table token is
     the `qr` context, so a QR ordering session never shows the control, not
     even to an admin signed in on that device. The user must also hold the
     permission the admin routes check, and the owner must have left the return
     control enabled. Nothing renders until this payload is here, so the button
     cannot flash in during load or a route change. */
  const showAdminReturn =
    data.menu?.context === 'main'
    && !tableToken
    && Boolean(user)
    && can('dashboard.view')
    && biz.menu_settings?.show_admin_return !== false
    && biz.menu_settings?.show_customer_menu !== false;

  /*
   * The server resolves the Menu Settings for this context (main or qr), so the
   * guest only ever sees what the owner enabled there, and a missing payload
   * from an older API keeps every feature visible.
   */
  const features = data.menu?.features || {};
  const ordering = data.menu?.ordering || {};
  const showFeature = (name) => features[name] !== false;
  const allowAction = (name) => ordering[name] !== false;
  /*
   * Product prices are the guest's consent to pay: while the owner hides them,
   * every price is removed, every add/quantity control is locked and the order
   * can neither be checked out nor submitted. The server applies the same rule
   * before it writes an order, so this can never be bypassed from the client.
   */
  const priceVisible = showFeature('prices');
  const cartEnabled = allowAction('cart');
  const addAllowed = cartEnabled && priceVisible;
  const checkoutEnabled = cartEnabled && allowAction('checkout') && priceVisible;
  const orderingEnabled = checkoutEnabled && allowAction('order') && priceVisible;
  /*
   * The ordering panel is live only while the business is actually trading. The
   * pause is the saved Working Hours verdict — closed, not open yet, an off day
   * or no usable schedule — never the stock state of a product, and it switches
   * every ordering control off at once.
   */
  const orderingLive = !opening.closed;
  const cartLive = cartEnabled && orderingLive;
  const checkoutLive = checkoutEnabled && orderingLive;
  const orderingLiveEnabled = orderingEnabled && orderingLive;
  /*
   * Table identification. A scanned QR token is resolved on the server and
   * arrives as `data.table`: that table is final and is shown read-only. When no
   * table was identified the order form offers the business's own active tables
   * — that is the main ordering menu's normal mode, and the configured manual
   * fallback of the QR menu (the server only sends the list then). With neither,
   * no valid table exists and submission stays blocked.
   */
  const tables = data.tables || [];
  const qrTable = data.table || null;
  /* What the header badge shows: a scanned table is final, otherwise the guest's
     own pick from the ordering form — and nothing at all until one exists. */
  const shownTable = qrTable || tables.find((row) => row.id === tableId) || null;
  const shownTableMode = qrTable ? 'auto' : 'manual';

  /*
   * The API ranks this business's best sellers from its own order history and
   * only sends them while the owner enabled the recommendation. Each id is
   * resolved against the WHOLE menu — never the category- or search-filtered
   * `products` list — so this section stays a global sales ranking and does not
   * change when the guest picks a category.
   */
  const bestProducts = (data.best_selling || [])
    .map((row) => (data.products || []).find((p) => p.id === row.id))
    .filter(Boolean);

  /*
   * Featured / special products. Two independent inputs decide this section:
   *   1. the owner's own "Featured products" feature for this menu context —
   *      switched off, the whole section (header, counter, carousel, arrows)
   *      is not rendered at all, so no empty container or spacing is left;
   *   2. the business's saved featured flags, which the API has already filtered
   *      to products that are still active and available.
   * It is resolved against the WHOLE menu — never the category- or
   * search-filtered list — so picking a category cannot change this strip, its
   * count or its order.
   */
  const featuredProducts = showFeature('featured')
    ? (data.featured_ids || [])
        .map((id) => (data.products || []).find((p) => p.id === id))
        .filter(Boolean)
    : [];

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
    <div className={`customer-shell ${barred ? 'is-barred' : ''}`}>
      {/* The compact header reads the same cart, language and admin state as the
          banner's own row — one set of controls, two visual states. */}
      <CustomerStickyHeader visible={barred}>
        <CustomerTopBar
          variant="bar"
          cartEnabled={cartEnabled}
          cartDisabled={!orderingLive}
          cartCount={cartCount}
          onCart={() => orderingLive && setCartOpen(true)}
          adminReturn={showAdminReturn}
          brand={{ name: brandName, logoUrl: biz.logo_url }}
        />
      </CustomerStickyHeader>

      {/* The banner carries its own controls, so the page opens edge to edge
          exactly like the reference: basket on one side, language/admin on the
          other, logo floating in the middle. */}
      <CustomerHero
        business={biz}
        brandName={brandName}
        welcome={welcome}
        table={shownTable}
        tableMode={shownTableMode}
        heroRef={heroRef}
      >
        <CustomerTopBar
          cartEnabled={cartEnabled}
          cartDisabled={!orderingLive}
          cartCount={cartCount}
          onCart={() => orderingLive && setCartOpen(true)}
          adminReturn={showAdminReturn}
        />
      </CustomerHero>

      <main className="customer-body">
        {/* Why ordering is paused, stated once at the top of the ordering panel,
            with the day and the saved hours beside it. */}
        {orderingLive ? null : <CustomerClosedNotice status={opening} timeZone={timeZone} />}

        {/* A table the owner switched off is not a broken link: the guest is at
            a real table whose ordering is paused, and is told exactly that. */}
        {data.table_state === 'inactive' ? (
          <div className="cui-table-off" role="status">
            <span className="cui-table-off__ico" aria-hidden="true">
              <Icon name="alert" size={18} />
            </span>
            <span className="cui-table-off__text">
              <strong>{t('table_unavailable_title')}</strong>
              <small>{t('table_unavailable_hint')}</small>
            </span>
          </div>
        ) : null}

        {/* Search, summary strip and working hours share one centred column,
            so the banner stays wide while the controls below it read as a
            single, calm vertical rhythm. */}
        <div className="cui-head">
          {showFeature('search') ? (
            <div className={`cui-search ${orderingLive ? '' : 'is-disabled'}`.trim()}>
              <Icon name="search" size={18} />
              <input
                value={query}
                placeholder={t('customer_menu_search')}
                aria-label={t('customer_menu_search')}
                disabled={!orderingLive}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          ) : null}

          {/* The summary bar is its own feature, switched independently for the
              main ordering menu and the QR table menu; when it is off nothing
              is reserved for it, so the menu below closes the gap. */}
          {showFeature('summary') ? (
            <CustomerStats
              categories={categories.length}
              items={(data.products || []).length}
              typeLabel={biz.business_type ? t(`settings_type_${biz.business_type}`) : ''}
              hours={data.hours}
            />
          ) : null}

          {/* Working hours and the open/closed verdict are two independent
              settings: a menu can show its hours without the status pill, or
              the pill without the hours card. */}
          {showFeature('hours') ? (
            <CustomerHours
              hours={data.hours}
              timeZone={timeZone}
              status={opening}
              showStatus={showFeature('status')}
            />
          ) : null}
        </div>

        {showFeature('ads') ? (
          <CustomerAds ads={adsBelowHeader} locale={locale} onOpen={orderingLive ? openAd : undefined} />
        ) : null}

        {featuredProducts.length > 0 ? (
          <CustomerPanel
            className="cui-panel--products"
            icon="award"
            tone="amber"
            title={t('customer_menu_featured')}
            count={fmtNumber(featuredProducts.length, locale)}
          >
            <CustomerCarousel
              count={featuredProducts.length}
              capacity={{ desktop: 4, tablet: 2, mobile: 1 }}
              disabled={!orderingLive}
            >
              {featuredProducts.map((p) => (
                <CustomerProductCard
                  key={p.id}
                  product={p}
                  category={categoryOf(p)}
                  variant={mediaVariant}
                  categoryName={localized(categoryOf(p), 'name', locale)}
                  locale={locale}
                  currency={currency}
                  showPrices={priceVisible}
                  canAdd={addAllowed}
                  addLabel={t('customer_menu_add')}
                  promoLabel={t('customer_menu_promo')}
                  quantity={cart[p.id] || 0}
                  disabled={!orderingLive}
                  onAdd={add}
                  onDecrease={removeOne}
                  onOpen={showFeature('details') ? setDetail : undefined}
                />
              ))}
            </CustomerCarousel>
          </CustomerPanel>
        ) : null}

        {bestProducts.length > 0 ? (
          <CustomerPanel
            className="cui-panel--products"
            icon="trophy"
            tone="violet"
            title={t('customer_menu_best_sellers')}
            count={fmtNumber(bestProducts.length, locale)}
          >
            <CustomerCarousel
              count={bestProducts.length}
              capacity={{ desktop: 4, tablet: 2, mobile: 1 }}
              disabled={!orderingLive}
            >
              {bestProducts.map((p) => (
                <CustomerProductCard
                  key={p.id}
                  product={p}
                  category={categoryOf(p)}
                  variant={mediaVariant}
                  categoryName={localized(categoryOf(p), 'name', locale)}
                  locale={locale}
                  currency={currency}
                  showPrices={priceVisible}
                  canAdd={addAllowed}
                  addLabel={t('customer_menu_add')}
                  promoLabel={t('customer_menu_promo')}
                  badge={t('customer_menu_best_badge')}
                  quantity={cart[p.id] || 0}
                  disabled={!orderingLive}
                  onAdd={add}
                  onDecrease={removeOne}
                  onOpen={showFeature('details') ? setDetail : undefined}
                />
              ))}
            </CustomerCarousel>
          </CustomerPanel>
        ) : null}

        <div className="cui-order">
          {/* The category strip is pure navigation: without it every product
              still appears in the grid below, under no category filter. */}
          {showFeature('categories') ? (
            <CustomerCategoryNav
              categories={visibleCategories}
              activeCat={activeCat}
              onSelect={selectCategory}
              showCounts={showFeature('product_count')}
              allCount={(data.products || []).length}
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
                    category={categoryOf(p)}
                    variant={mediaVariant}
                    categoryName={localized(categoryOf(p), 'name', locale)}
                    locale={locale}
                    currency={currency}
                    showPrices={priceVisible}
                    canAdd={addAllowed}
                    addLabel={t('customer_menu_add_to_cart')}
                    promoLabel={t('customer_menu_promo')}
                    quantity={cart[p.id] || 0}
                    disabled={!orderingLive}
                    onAdd={add}
                    onDecrease={removeOne}
                    onOpen={showFeature('details') ? setDetail : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {showFeature('ads') ? <CustomerAds ads={adsMenuEnd} locale={locale} onOpen={openAd} /> : null}

        {showFeature('about') ? (
          <CustomerAbout text={localized(biz, 'description', locale) || biz.description || ''} />
        ) : null}

        {showFeature('social') ? (
          <CustomerContact business={biz} locale={locale} onReview={() => setReviewOpen(true)} />
        ) : null}

        {/* The reviews themselves now live only in the Admin Panel: the public
            menu keeps the one review entry point of the contact grid, whose form
            still posts to the same endpoint and refreshes the saved reviews. */}
        {reviewOpen ? (
          <ReviewModal
            busy={reviewBusy}
            onClose={() => setReviewOpen(false)}
            onSubmit={sendReview}
          />
        ) : null}
      </main>

      {cartEnabled && cartCount > 0 && !placed ? (
        <div className="cart-bar">
          <div className="cart-bar__inner">
            <button className="btn btn--primary" style={{ flex: 1 }} onClick={() => setCartOpen(true)}>
              <Icon name="cart" size={17} />
              {t('customer_menu_view_order')} · {cartCount}
              {priceVisible ? <Money value={cartTotal} currency={currency} /> : null}
            </button>
          </div>
        </div>
      ) : null}

      {/* Guests get the floating control here; the admin ordering panel is
          already inside the admin shell, which renders it once for the page. */}
      {adminMode ? null : <AnimatedBackToTop />}

      {cartOpen ? (
        <CartPanel
          menuKey={key}
          lines={cartLines}
          currency={currency}
          locale={locale}
          language={locale}
          hasUnavailable={cartBlocked}
          pricesHidden={!priceVisible}
          busy={busy}
          canCheckout={checkoutEnabled}
          canOrder={orderingEnabled}
          qrTable={qrTable}
          tableState={data.table_state || 'none'}
          context={data.menu?.context === 'main' ? 'main' : 'qr'}
          tables={tables}
          tableId={tableId}
          onTable={setTableId}
          onClose={() => setCartOpen(false)}
          onQty={setQty}
          onClear={() => setCart({})}
          onSubmit={placeOrder}
        />
      ) : null}

      {detail ? (
        <ProductDetailModal
          product={detail}
          category={categories.find((c) => c.id === detail.category_id)}
          currency={currency}
          showPrices={priceVisible}
          canAdd={addAllowed}
          addLabel={t('customer_menu_add_to_cart')}
          promoLabel={t('customer_menu_promo')}
          quantity={cart[detail.id] || 0}
          onAdd={add}
          onDecrease={removeOne}
          onClose={() => setDetail(null)}
        />
      ) : null}

      {/* Opens only on a confirmed order: `placed` is the record the API
          returned after saving it, never the click that started the request.
          The order carries the currency it was actually saved in. */}
      {placed ? (
        <OrderSuccessModal
          key={placed.id}
          order={placed}
          currency={placed.currency || currency}
          onClose={() => setPlaced(null)}
        />
      ) : null}
    </div>
  );
}
