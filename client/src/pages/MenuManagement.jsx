import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, EmptyState, Loading, useToast } from '../components/ui';
import PageHeroBanner from '../components/menu/PageHeroBanner';
import MenuToolbar from '../components/menu/MenuToolbar';
import CategoryPanel from '../components/menu/CategoryPanel';
import CategoryChips from '../components/menu/CategoryChips';
import CategoryDrawer from '../components/menu/CategoryDrawer';
import CategorySummary from '../components/menu/CategorySummary';
import Icon from '../components/Icon';
import ProductCard from '../components/menu/ProductCard';
import CategoryFormModal from '../components/menu/CategoryFormModal';
import ProductFormModal from '../components/menu/ProductFormModal';
import CategoryDeleteDetails from '../components/menu/CategoryDeleteDetails';
import { appearanceOf } from '../components/menu/categoryIcons';
import { catalogErrorText } from '../components/menu/errorText';
import DeleteConfirmationDialog from '../components/confirm/DeleteConfirmationDialog';
import { localized, useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { useBusiness } from '../context/BusinessContext';
import { del, get, post, put } from '../api';
import '../menu.css';

const emptyCategory = () => ({
  name_ku: '', name_fa: '', name_ar: '', name_en: '',
  icon: 'utensils', sort_order: 0, active: true,
});

const emptyProduct = (categoryId) => ({
  name_ku: '', name_fa: '', name_ar: '', name_en: '',
  description_ku: '', description_fa: '', description_ar: '', description_en: '',
  price: '', price_fa: '', price_en: '', calories: '', prep_minutes: '', tags: [],
  category_id: categoryId || '', image_url: null,
  active: true, available: true, featured: false, sort_order: 0,
});

/**
 * Menu Management — the administrative menu screen.
 *
 * Right (inline start): the category panel with its statistics and CRUD.
 * Left: the selected category's products as image-first cards.
 *
 * Search runs against the business's own records on the server (debounced) and
 * temporarily replaces both columns; clearing it restores the selected category.
 */
export default function MenuManagement() {
  const { t, locale } = useI18n();
  const { isManager } = useAuth();
  const { business } = useBusiness();
  const toast = useToast();
  const currency = business?.currency || 'IQD';

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [busy, setBusy] = useState(false);
  const [categoryModal, setCategoryModal] = useState(null);
  const [productModal, setProductModal] = useState(null);
  const [formError, setFormError] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [confirmError, setConfirmError] = useState(null);
  const [error, setError] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Measured height of the shared sticky header: the desktop rail and the
  // narrow-screen chip strip hang from it instead of a hardcoded offset.
  const [stickyTop, setStickyTop] = useState(0);

  const load = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([
        get('/catalog/categories'),
        get('/catalog/products'),
      ]);
      setCategories(c.categories || []);
      setProducts(p.products || []);
      setError(null);
    } catch (err) {
      setError(err.code || 'ERROR');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const header = document.querySelector('.hdr-wrap');
    if (!header) return undefined;
    const measure = () => setStickyTop(Math.round(header.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  // Leaving the drawer range (the rail returns, or the chip strip takes over)
  // dismisses the drawer instead of leaving it floating over the new layout.
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const range = window.matchMedia('(min-width: 768px) and (max-width: 1199px)');
    const onChange = (event) => {
      if (!event.matches) setDrawerOpen(false);
    };
    range.addEventListener('change', onChange);
    return () => range.removeEventListener('change', onChange);
  }, [drawerOpen]);

  // Keep a category selected; fall back to the first one when the current
  // selection disappears (for example after a delete).
  useEffect(() => {
    if (!categories.length) return;
    if (!categories.some((c) => c.id === selectedId)) setSelectedId(categories[0].id);
  }, [categories, selectedId]);

  // Debounced server-side search: names in every stored language, and products
  // of any category (their category is shown on the card).
  const activeQuery = query.trim();
  useEffect(() => {
    if (!activeQuery) {
      setResults(null);
      setSearching(false);
      return undefined;
    }
    let alive = true;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const data = await get(`/catalog/search?q=${encodeURIComponent(activeQuery)}`);
        if (alive) setResults({ categories: data.categories || [], products: data.products || [] });
      } catch {
        if (alive) setResults({ categories: [], products: [] });
      } finally {
        if (alive) setSearching(false);
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [activeQuery]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedId) || null,
    [categories, selectedId],
  );

  const selectedProducts = useMemo(
    () => products.filter((p) => p.category_id === selectedId),
    [products, selectedId],
  );

  const categoryStats = useMemo(() => {
    const active = categories.filter((c) => c.active).length;
    return { total: categories.length, active, inactive: categories.length - active };
  }, [categories]);

  const listCategories = results ? results.categories : categories;
  const listProducts = results ? results.products : selectedProducts;
  const productStats = useMemo(() => {
    const active = listProducts.filter((p) => p.active).length;
    return { total: listProducts.length, active, inactive: listProducts.length - active };
  }, [listProducts]);

  const saveCategory = async (values, id) => {
    setBusy(true);
    setFormError(null);
    try {
      if (id) await put(`/catalog/categories/${id}`, values);
      else await post('/catalog/categories', values);
      toast.success(t('state_saved'));
      setCategoryModal(null);
      await load();
    } catch (err) {
      setFormError(err.code);
    } finally {
      setBusy(false);
    }
  };

  const saveProduct = async (values, id) => {
    setBusy(true);
    setFormError(null);
    try {
      if (id) await put(`/catalog/products/${id}`, values);
      else await post('/catalog/products', values);
      toast.success(t('state_saved'));
      setProductModal(null);
      await load();
    } catch (err) {
      setFormError(err.code);
    } finally {
      setBusy(false);
    }
  };

  /*
   * Category removal is a cascade: the category and every product inside it are
   * deleted in one server transaction, decided from the database rather than
   * from what this page happens to be showing. The dialog stays open on failure
   * and shows the real reason, so a partial result is never reported as success.
   */
  const removeCategory = async (category) => {
    setBusy(true);
    setConfirmError(null);
    try {
      const result = await del(`/catalog/categories/${category.id}?cascade=1`);
      const removed = Number(result?.deleted?.products) || 0;
      toast.success(
        removed > 0
          ? t('menu_category_deleted_with_products', { name: category.name, count: removed })
          : t('menu_category_deleted', { name: category.name }),
      );
      setConfirm(null);
      // Refetch both lists: rows, product grid, counters and the heading all
      // follow the new state, and the selection falls back to a remaining row.
      await load();
    } catch (err) {
      setConfirmError(
        err.code === 'CATEGORY_ACTIVE_ORDERS'
          ? t('menu_category_active_orders', { count: err.detail })
          : err.code === 'CATEGORY_HAS_PRODUCTS'
            ? t('menu_category_has_products_message', { count: err.detail })
            : err.code === 'CATEGORY_DELETE_INCOMPLETE'
              ? t('menu_category_delete_incomplete')
              : catalogErrorText(err.code, t) || t('error_generic'),
      );
    } finally {
      setBusy(false);
    }
  };

  const removeProduct = async (id) => {
    setBusy(true);
    try {
      await del(`/catalog/products/${id}`);
      toast.success(t('state_saved'));
      setConfirm(null);
      await load();
    } catch {
      toast.error(t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  /*
   * A category delete always opens the shared confirmation dialog — a category
   * holding products is no longer refused, it is explained. The dialog shows the
   * record's own glyph and accent, and asks the server what the cascade would
   * really remove before the destructive button becomes available.
   */
  const openCategoryDelete = async (c) => {
    const appearance = appearanceOf(c);
    setConfirmError(null);
    setConfirm({
      kind: 'category',
      id: c.id,
      name: localized(c, 'name', locale),
      icon: appearance.icon,
      color: appearance.color,
      productCount: Number(c.product_count) || 0,
      impact: null,
      impactError: null,
    });
    try {
      const data = await get(`/catalog/categories/${c.id}/impact`);
      setConfirm((cur) => (cur && cur.id === c.id ? { ...cur, impact: data.impact } : cur));
    } catch (err) {
      setConfirm((cur) =>
        cur && cur.id === c.id ? { ...cur, impactError: err.code || 'ERROR' } : cur,
      );
    }
  };

  if (loading && !categories.length) return <Loading />;

  const selectedAppearance = selectedCategory ? appearanceOf(selectedCategory) : null;

  const summary = results
    ? {
        icon: 'search',
        color: '#7c5cf0',
        title: t('menu_search_results'),
        subtitle: activeQuery,
      }
    : selectedCategory
      ? {
          icon: selectedAppearance.icon,
          color: selectedAppearance.color,
          title: localized(selectedCategory, 'name', locale),
          subtitle: t('menu_products_hint'),
        }
      : null;

  const selectedName = selectedCategory ? localized(selectedCategory, 'name', locale) : '';

  // One selection, three presentations: the drawer hands the selection back and
  // dismisses itself so the products are immediately in view.
  const pickFromDrawer = (id) => {
    setSelectedId(id);
    setDrawerOpen(false);
  };

  const categoryPanel = (panelProps) => (
    <CategoryPanel
      categories={listCategories}
      stats={categoryStats}
      selectedId={selectedId}
      canManage={isManager}
      onEdit={(c) => {
        setFormError(null);
        setCategoryModal({ mode: 'edit', id: c.id, values: { ...c } });
      }}
      onDelete={openCategoryDelete}
      {...panelProps}
    />
  );

  return (
    <div
      className="menu-page"
      style={stickyTop ? { '--menu-sticky-top': `${stickyTop}px` } : undefined}
    >
      <PageHeroBanner icon="utensils" title={t('menu_page_title')} subtitle={t('menu_subtitle')} />

      <MenuToolbar
        query={query}
        onQuery={setQuery}
        searching={searching}
        canManage={isManager}
        onAddCategory={() => {
          setFormError(null);
          setCategoryModal({ mode: 'create', values: emptyCategory() });
        }}
        onAddProduct={() => {
          setFormError(null);
          setProductModal({ mode: 'create', values: emptyProduct(selectedId) });
        }}
      />

      {!isManager ? <Alert kind="warning">{t('user_view_only')}</Alert> : null}
      {error ? <Alert kind="error">{t('error_generic')}</Alert> : null}

      {/* Narrow screens: the same categories as a sticky chip strip. */}
      <CategoryChips
        categories={listCategories}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      <div className="mworkspace">
        {/* Desktop rail — sticky, and the only place the panel lives at width. */}
        {categoryPanel({ className: 'mpanel--sidebar', onSelect: setSelectedId })}

        <section className="mproducts">
          {/*
            Intermediate widths: the rail becomes an on-demand drawer. The glyph
            is the *action*, never the selected category's identity — a list while
            the navigation is closed, a close mark while it is open.
          */}
          <button
            type="button"
            className={`mcat-toggle ${drawerOpen ? 'is-open' : ''}`.trim()}
            onClick={() => setDrawerOpen((open) => !open)}
            aria-haspopup="dialog"
            aria-expanded={drawerOpen}
            aria-label={
              drawerOpen ? t('menu_categories_close') : t('menu_categories_open')
            }
            title={drawerOpen ? t('menu_categories_close') : t('menu_categories_open')}
          >
            <span className="mcat-toggle__glyph">
              <Icon name={drawerOpen ? 'close' : 'listFilter'} size={18} />
            </span>
            <span className="mcat-toggle__text">
              <span className="mcat-toggle__label">{t('menu_tab_categories')}</span>
              {selectedName ? <span className="mcat-toggle__current">{selectedName}</span> : null}
            </span>
          </button>

          {summary ? (
            <CategorySummary
              icon={summary.icon}
              color={summary.color}
              title={summary.title}
              subtitle={summary.subtitle}
              stats={productStats}
            />
          ) : null}

          {listProducts.length === 0 ? (
            <EmptyState
              icon={results ? 'search' : 'coffee'}
              title={results ? t('menu_no_search_results') : t('menu_no_products')}
            />
          ) : (
            <div className="mgrid">
              {listProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  currency={currency}
                  canManage={isManager}
                  categoryName={
                    results
                      ? localized(p, 'category_name', locale) || t('menu_uncategorized')
                      : localized(selectedCategory, 'name', locale)
                  }
                  onEdit={() => {
                    setFormError(null);
                    setProductModal({ mode: 'edit', id: p.id, values: { ...p } });
                  }}
                  onDelete={() =>
                    setConfirm({
                      kind: 'product',
                      id: p.id,
                      name: localized(p, 'name', locale),
                      image: p.image_url || null,
                      categoryName:
                        results
                          ? localized(p, 'category_name', locale) || t('menu_uncategorized')
                          : localized(selectedCategory, 'name', locale),
                    })
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {categoryModal ? (
        <CategoryFormModal
          modal={categoryModal}
          categories={categories}
          busy={busy}
          error={formError}
          onClose={() => setCategoryModal(null)}
          onSave={saveCategory}
        />
      ) : null}

      {productModal ? (
        <ProductFormModal
          modal={productModal}
          categories={categories}
          currency={currency}
          busy={busy}
          error={formError}
          onClose={() => setProductModal(null)}
          onSave={saveProduct}
        />
      ) : null}

      {confirm && confirm.kind === 'category' ? (
        <DeleteConfirmationDialog
          entityType="category"
          title={t('menu_delete_category_title')}
          description={
            (confirm.impact?.product_count ?? confirm.productCount) > 0
              ? t('menu_delete_category_cascade_question')
              : t('menu_delete_category_question')
          }
          entityName={confirm.name}
          entityIcon={confirm.icon}
          accent={confirm.color}
          entitySubtitle={
            confirm.productCount > 0
              ? t('menu_delete_category_preview_sub', { count: confirm.productCount })
              : undefined
          }
          confirmLabel={
            (confirm.impact?.product_count ?? confirm.productCount) > 0
              ? t('menu_delete_category_confirm_cascade')
              : t('menu_delete_category_confirm')
          }
          acknowledgeLabel={
            confirm.impact?.product_count > 0 ? t('menu_delete_category_ack') : undefined
          }
          // Nothing can be confirmed before the server has counted the impact —
          // an unknown scope must never become a destructive action.
          confirmDisabled={!confirm.impact || Boolean(confirm.impactError)}
          busy={busy}
          error={confirmError}
          onCancel={() => {
            setConfirm(null);
            setConfirmError(null);
          }}
          onConfirm={() => removeCategory(confirm)}
        >
          <CategoryDeleteDetails impact={confirm.impact} error={confirm.impactError} />
        </DeleteConfirmationDialog>
      ) : null}

      {confirm && confirm.kind === 'product' ? (
        <DeleteConfirmationDialog
          entityType="product"
          entityName={confirm.name}
          entityImage={confirm.image}
          entitySubtitle={confirm.categoryName}
          warning={t('menu_delete_product_hint')}
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => removeProduct(confirm.id)}
        />
      ) : null}

      <CategoryDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        {categoryPanel({ onSelect: pickFromDrawer })}
      </CategoryDrawer>
    </div>
  );
}
