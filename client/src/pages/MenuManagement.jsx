import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon';
import { Alert, ConfirmDialog, EmptyState, Loading, Modal, useToast } from '../components/ui';
import PageHeroBanner from '../components/menu/PageHeroBanner';
import MenuToolbar from '../components/menu/MenuToolbar';
import CategoryPanel from '../components/menu/CategoryPanel';
import CategorySummary from '../components/menu/CategorySummary';
import ProductCard from '../components/menu/ProductCard';
import CategoryFormModal from '../components/menu/CategoryFormModal';
import ProductFormModal from '../components/menu/ProductFormModal';
import { categoryGlyph, categoryToneClass } from '../components/menu/categoryIcons';
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
  const [blocked, setBlocked] = useState(null);
  const [error, setError] = useState(null);

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

  const removeCategory = async (id) => {
    setBusy(true);
    try {
      await del(`/catalog/categories/${id}`);
      toast.success(t('state_saved'));
      setConfirm(null);
      await load();
    } catch (err) {
      toast.error(err.code === 'CATEGORY_HAS_PRODUCTS' ? t('menu_category_has_products') : t('error_generic'));
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

  const openCategoryDelete = (c) => {
    // A category holding products is never deleted silently — the consequence
    // is explained and the products must be moved or removed first.
    if (c.product_count > 0) setBlocked(c);
    else setConfirm({ kind: 'category', id: c.id, name: localized(c, 'name', locale) });
  };

  if (loading && !categories.length) return <Loading />;

  const summary = results
    ? {
        icon: 'search',
        toneClass: 'mtone--purple',
        title: t('menu_search_results'),
        subtitle: activeQuery,
      }
    : selectedCategory
      ? {
          icon: categoryGlyph(selectedCategory.icon),
          toneClass: categoryToneClass(selectedCategory.icon),
          title: localized(selectedCategory, 'name', locale),
          subtitle: t('menu_products_hint'),
        }
      : null;

  return (
    <div className="menu-page">
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

      <div className="mworkspace">
        <CategoryPanel
          categories={listCategories}
          stats={categoryStats}
          selectedId={selectedId}
          canManage={isManager}
          onSelect={setSelectedId}
          onEdit={(c) => {
            setFormError(null);
            setCategoryModal({ mode: 'edit', id: c.id, values: { ...c } });
          }}
          onDelete={openCategoryDelete}
        />

        <section className="mproducts">
          {summary ? (
            <CategorySummary
              icon={summary.icon}
              toneClass={summary.toneClass}
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
                    setConfirm({ kind: 'product', id: p.id, name: localized(p, 'name', locale) })
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

      {confirm ? (
        <ConfirmDialog
          title={confirm.kind === 'category' ? t('menu_confirm_delete_category') : t('menu_confirm_delete_product')}
          message={
            <>
              {confirm.name}
              <br />
              <span style={{ fontSize: 12.5 }}>
                {confirm.kind === 'category' ? t('menu_delete_category_hint') : t('menu_delete_product_hint')}
              </span>
            </>
          }
          danger
          busy={busy}
          confirmLabel={t('action_delete')}
          onCancel={() => setConfirm(null)}
          onConfirm={() => (confirm.kind === 'category' ? removeCategory(confirm.id) : removeProduct(confirm.id))}
        />
      ) : null}

      {blocked ? (
        <Modal
          title={t('menu_category_locked_title')}
          onClose={() => setBlocked(null)}
          footer={
            <button className="btn btn--primary" onClick={() => setBlocked(null)}>
              {t('action_close')}
            </button>
          }
        >
          <div className="alert alert--warning" style={{ marginBottom: 10 }}>
            <Icon name="alert" size={17} />
            <span>
              {localized(blocked, 'name', locale)} · {blocked.product_count} {t('menu_stats_products')}
            </span>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-soft)' }}>
            {t('menu_category_has_products_message', { count: blocked.product_count })}
          </p>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 8 }}>{t('menu_delete_category_hint')}</p>
        </Modal>
      ) : null}
    </div>
  );
}
