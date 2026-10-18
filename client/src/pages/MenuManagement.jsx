import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon';
import {
  Alert,
  ConfirmDialog,
  EmptyState,
  Field,
  Loading,
  Modal,
  Money,
  SectionCard,
  Select,
  Switch,
  Tabs,
  useToast,
} from '../components/ui';
import { localized, useI18n, LOCALES } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { del, get, post, put, uploadImage } from '../api';

const ICON_OPTIONS = [
  'coffee', 'utensils', 'book', 'tag', 'chart', 'sparkles', 'cart', 'star', 'table', 'layers',
];

const emptyCategory = () => ({
  name_ku: '', name_fa: '', name_ar: '', name_en: '',
  icon: 'utensils', sort_order: 0, active: true,
});

const emptyProduct = (categoryId) => ({
  name_ku: '', name_fa: '', name_ar: '', name_en: '',
  description_ku: '', description_fa: '', description_ar: '', description_en: '',
  price: '', category_id: categoryId || '', image_url: null, active: true, available: true, sort_order: 0,
});

function ImagePicker({ value, onChange, label, hint }) {
  const { t } = useI18n();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const pick = async (file) => {
    setBusy(true);
    try {
      const url = await uploadImage(file);
      onChange(url);
    } catch (err) {
      toast.error(err.message === 'IMAGE_TOO_LARGE' ? t('error_image_too_large') : t('error_invalid_image'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="field">
      <span className="field__label">{label}</span>
      {/* Preview keeps the whole image and its aspect ratio — no fixed frame. */}
      {value ? (
        <div className="image-preview image-preview--contain">
          <img src={value} alt="" />
        </div>
      ) : null}
      <div className="btn-row">
        <label className="btn btn--sm" style={{ cursor: 'pointer' }}>
          {busy ? <span className="spinner" /> : <Icon name="upload" size={15} />}
          {t('menu_upload_image')}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) pick(file);
            }}
          />
        </label>
        {value ? (
          <button type="button" className="btn btn--sm" onClick={() => onChange(null)}>
            <Icon name="trash" size={15} />
            {t('menu_remove_image')}
          </button>
        ) : null}
      </div>
      <span className="field__hint">{hint}</span>
    </div>
  );
}

function LocalizedFields({ values, onChange, labelPrefix, textarea = false }) {
  return (
    <div className="form-grid">
      {LOCALES.map((l) => (
        <Field key={l.code} label={`${labelPrefix} · ${l.label}`}>
          {textarea ? (
            <textarea
              className="textarea"
              dir={l.rtl ? 'rtl' : 'ltr'}
              value={values[`desc_${l.code}`] || ''}
              onChange={(e) => onChange(`desc_${l.code}`, e.target.value)}
            />
          ) : (
            <input
              className="input"
              dir={l.rtl ? 'rtl' : 'ltr'}
              value={values[l.code] || ''}
              onChange={(e) => onChange(l.code, e.target.value)}
            />
          )}
        </Field>
      ))}
    </div>
  );
}

export default function MenuManagement() {
  const { t, locale } = useI18n();
  const { isManager } = useAuth();
  const toast = useToast();

  const [tab, setTab] = useState('products');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [categoryModal, setCategoryModal] = useState(null);
  const [productModal, setProductModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, p, s] = await Promise.all([
        get('/catalog/categories'),
        get('/catalog/products'),
        get('/catalog/stats'),
      ]);
      setCategories(c.categories || []);
      setProducts(p.products || []);
      setStats(s);
    } catch (err) {
      setError(err.code || 'ERROR');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const q = query.trim().toLowerCase();
  const matches = (row, fields) =>
    !q || fields.some((f) => String(row[f] || '').toLowerCase().includes(q));

  const visibleCategories = useMemo(
    () => categories.filter((c) => matches(c, ['name_en', 'name_ku', 'name_fa', 'name_ar'])),
    [categories, q],
  );

  const visibleProducts = useMemo(
    () =>
      products.filter((p) => {
        if (categoryFilter && p.category_id !== categoryFilter) return false;
        // Combined search: product names AND their category names.
        return matches(p, [
          'name_en', 'name_ku', 'name_fa', 'name_ar',
          'category_name_en', 'category_name_ku', 'category_name_fa', 'category_name_ar',
        ]);
      }),
    [products, q, categoryFilter],
  );

  const saveCategory = async (values, id) => {
    setBusy(true);
    setError(null);
    try {
      if (id) await put(`/catalog/categories/${id}`, values);
      else await post('/catalog/categories', values);
      toast.success(t('state_saved'));
      setCategoryModal(null);
      await load();
    } catch (err) {
      setError(err.code);
    } finally {
      setBusy(false);
    }
  };

  const saveProduct = async (values, id) => {
    setBusy(true);
    setError(null);
    try {
      if (id) await put(`/catalog/products/${id}`, values);
      else await post('/catalog/products', values);
      toast.success(t('state_saved'));
      setProductModal(null);
      await load();
    } catch (err) {
      setError(err.code);
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

  if (loading && !products.length) return <Loading />;

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <h1>{t('menu_title')}</h1>
          <p>{t('menu_subtitle')}</p>
        </div>
        <div className="page-head__actions">
          <button className="btn btn--sm" onClick={() => setCategoryModal({ mode: 'create', values: emptyCategory() })} disabled={!isManager}>
            <Icon name="plus" size={15} />
            {t('menu_create_category')}
          </button>
          <button className="btn btn--primary btn--sm" onClick={() => setProductModal({ mode: 'create', values: emptyProduct() })} disabled={!isManager}>
            <Icon name="plus" size={15} />
            {t('menu_create_product')}
          </button>
        </div>
      </div>

      {!isManager ? <Alert kind="warning">{t('user_view_only')}</Alert> : null}
      {error ? <Alert kind="error">{t('error_generic')}</Alert> : null}

      {/* Statistics stay in one compact row on mobile. */}
      <SectionCard icon="chart" iconClass="ic-teal" title={t('menu_title')}>
        <div className="stat-row">
          <div className="stat">
            <div className="stat__label"><Icon name="layers" size={13} /> {t('menu_stats_categories')}</div>
            <div className="stat__value">{stats?.categories?.total ?? '—'}</div>
          </div>
          <div className="stat">
            <div className="stat__label"><Icon name="check" size={13} /> {t('menu_stats_active')}</div>
            <div className="stat__value">{stats?.categories?.active ?? '—'}</div>
          </div>
          <div className="stat">
            <div className="stat__label"><Icon name="close" size={13} /> {t('menu_stats_inactive')}</div>
            <div className="stat__value">{stats?.categories?.inactive ?? '—'}</div>
          </div>
          <div className="stat">
            <div className="stat__label"><Icon name="coffee" size={13} /> {t('menu_stats_products')}</div>
            <div className="stat__value">{stats?.products?.total ?? '—'}</div>
          </div>
          <div className="stat">
            <div className="stat__label"><Icon name="check" size={13} /> {t('menu_stats_active')}</div>
            <div className="stat__value">{stats?.products?.active ?? '—'}</div>
          </div>
          <div className="stat">
            <div className="stat__label"><Icon name="eye" size={13} /> {t('menu_stats_hidden')}</div>
            <div className="stat__value">{stats?.products?.hidden_by_category ?? '—'}</div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon="book"
        iconClass="ic-purple"
        title={tab === 'products' ? t('menu_tab_products') : t('menu_tab_categories')}
        actions={
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'products', label: t('menu_tab_products'), icon: 'coffee' },
              { value: 'categories', label: t('menu_tab_categories'), icon: 'layers' },
            ]}
          />
        }
      >
        <div className="form-grid" style={{ marginBottom: 14 }}>
          <Field label={t('action_search')}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Icon name="search" size={17} />
              <input
                className="input"
                value={query}
                placeholder={t('menu_search_placeholder')}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </Field>
          {tab === 'products' ? (
            <Field label={t('menu_product_category')}>
              <Select
                value={categoryFilter}
                onChange={setCategoryFilter}
                placeholder={t('menu_all_categories')}
                options={categories.map((c) => ({ value: c.id, label: localized(c, 'name', locale) }))}
              />
            </Field>
          ) : null}
        </div>

        {tab === 'categories' ? (
          visibleCategories.length === 0 ? (
            <EmptyState icon="layers" title={t('menu_no_categories')} />
          ) : (
            <div className="product-grid">
              {visibleCategories.map((c) => (
                <div className="product-card" key={c.id}>
                  <div className="product-card__top">
                    <span className="product-card__thumb">
                      <Icon name={c.icon || 'utensils'} size={20} />
                    </span>
                    <div className="product-card__info">
                      <div className="product-name" title={localized(c, 'name', locale)}>
                        {localized(c, 'name', locale)}
                      </div>
                      <div className="product-card__meta">
                        <span className="badge badge--active">
                          {c.product_active_count}/{c.product_count} {t('menu_stats_products')}
                        </span>
                        {/* Status is shown here but only changed inside the form. */}
                        <span className={`badge badge--${c.active ? 'active' : 'inactive'}`}>
                          {c.active ? t('label_active') : t('label_inactive')}
                        </span>
                      </div>
                    </div>
                  </div>
                  {isManager ? (
                    <div className="product-card__actions">
                      <button
                        className="btn btn--sm"
                        onClick={() => setCategoryModal({ mode: 'edit', id: c.id, values: { ...c } })}
                      >
                        <Icon name="pencil" size={14} /> {t('action_edit')}
                      </button>
                      <button
                        className="btn btn--sm btn--danger-soft"
                        onClick={() => setConfirm({ kind: 'category', id: c.id, name: localized(c, 'name', locale) })}
                      >
                        <Icon name="trash" size={14} /> {t('action_delete')}
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )
        ) : visibleProducts.length === 0 ? (
          <EmptyState icon="coffee" title={t('menu_no_products')} />
        ) : (
          <div className="product-grid">
            {visibleProducts.map((p) => (
              <div className="product-card" key={p.id}>
                <div className="product-card__top">
                  <span className="product-card__thumb">
                    {p.image_url ? <img src={p.image_url} alt="" loading="lazy" /> : <Icon name="coffee" size={20} />}
                  </span>
                  <div className="product-card__info">
                    <div className="product-name" title={localized(p, 'name', locale)}>
                      {localized(p, 'name', locale)}
                    </div>
                    <div className="product-card__meta">
                      <span className="product-card__price">
                        <Money value={p.price} currency="IQD" />
                      </span>
                    </div>
                  </div>
                </div>
                <div className="product-card__meta">
                  <span className={`badge badge--${p.active ? 'active' : 'inactive'}`}>
                    {p.active ? t('label_active') : t('label_inactive')}
                  </span>
                  {!p.available ? <span className="badge badge--cancelled">{t('menu_product_available')}</span> : null}
                  {p.category_id && p.category_active === false ? (
                    <span className="badge badge--inactive">{t('menu_stats_hidden')}</span>
                  ) : null}
                  <span className="chip">{localized(p, 'category_name', locale) || t('menu_uncategorized')}</span>
                </div>
                {isManager ? (
                  <div className="product-card__actions">
                    <button
                      className="btn btn--sm"
                      onClick={() => setProductModal({ mode: 'edit', id: p.id, values: { ...p } })}
                    >
                      <Icon name="pencil" size={14} /> {t('action_edit')}
                    </button>
                    <button
                      className="btn btn--sm btn--danger-soft"
                      onClick={() => setConfirm({ kind: 'product', id: p.id, name: localized(p, 'name', locale) })}
                    >
                      <Icon name="trash" size={14} /> {t('action_delete')}
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {categoryModal ? (
        <CategoryForm
          modal={categoryModal}
          busy={busy}
          onClose={() => setCategoryModal(null)}
          onSave={saveCategory}
        />
      ) : null}

      {productModal ? (
        <ProductForm
          modal={productModal}
          categories={categories}
          busy={busy}
          onClose={() => setProductModal(null)}
          onSave={saveProduct}
        />
      ) : null}

      {confirm ? (
        <ConfirmDialog
          title={confirm.kind === 'category' ? t('menu_confirm_delete_category') : t('menu_confirm_delete_product')}
          message={confirm.name}
          danger
          busy={busy}
          confirmLabel={t('action_delete')}
          onCancel={() => setConfirm(null)}
          onConfirm={() => (confirm.kind === 'category' ? removeCategory(confirm.id) : removeProduct(confirm.id))}
        />
      ) : null}
    </>
  );
}

function CategoryForm({ modal, busy, onClose, onSave }) {
  const { t } = useI18n();
  const [values, setValues] = useState({
    name_ku: modal.values.name_ku || '',
    name_fa: modal.values.name_fa || '',
    name_ar: modal.values.name_ar || '',
    name_en: modal.values.name_en || '',
    icon: modal.values.icon || 'utensils',
    sort_order: modal.values.sort_order ?? 0,
    active: modal.values.active !== false,
  });

  return (
    <Modal
      title={modal.mode === 'edit' ? t('menu_edit_category') : t('menu_create_category')}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>
            {t('action_cancel')}
          </button>
          <button className="btn btn--primary" onClick={() => onSave(values, modal.id)} disabled={busy}>
            {busy ? <span className="spinner" /> : <Icon name="check" size={16} />}
            {t('action_save')}
          </button>
        </>
      }
    >
      <LocalizedFields values={values} onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))} labelPrefix={t('menu_category_name')} />
      <div className="form-grid" style={{ marginTop: 14 }}>
        <Field label={t('menu_category_icon')}>
          <Select
            value={values.icon}
            onChange={(v) => setValues((s) => ({ ...s, icon: v }))}
            options={ICON_OPTIONS.map((i) => ({ value: i, label: i }))}
          />
        </Field>
        <Field label={t('label_sort_order')}>
          <input
            className="input"
            type="number"
            value={values.sort_order}
            onChange={(e) => setValues((s) => ({ ...s, sort_order: Number(e.target.value) }))}
          />
        </Field>
      </div>
      <div style={{ marginTop: 14 }}>
        <Switch
          checked={values.active}
          onChange={(v) => setValues((s) => ({ ...s, active: v }))}
          label={t('label_active')}
          ariaLabel={t('label_active')}
        />
        <div className="field__hint" style={{ marginTop: 6 }}>{t('menu_category_active_hint')}</div>
      </div>
    </Modal>
  );
}

function ProductForm({ modal, categories, busy, onClose, onSave }) {
  const { t } = useI18n();
  const [values, setValues] = useState({
    name_ku: modal.values.name_ku || '',
    name_fa: modal.values.name_fa || '',
    name_ar: modal.values.name_ar || '',
    name_en: modal.values.name_en || '',
    desc_ku: modal.values.description_ku || '',
    desc_fa: modal.values.description_fa || '',
    desc_ar: modal.values.description_ar || '',
    desc_en: modal.values.description_en || '',
    price: modal.values.price ?? '',
    category_id: modal.values.category_id || '',
    image_url: modal.values.image_url || null,
    active: modal.values.active !== false,
    available: modal.values.available !== false,
    sort_order: modal.values.sort_order ?? 0,
  });

  const payload = {
    name_ku: values.name_ku, name_fa: values.name_fa, name_ar: values.name_ar, name_en: values.name_en,
    description_ku: values.desc_ku, description_fa: values.desc_fa,
    description_ar: values.desc_ar, description_en: values.desc_en,
    price: Number(values.price) || 0,
    category_id: values.category_id || null,
    image_url: values.image_url,
    active: values.active,
    available: values.available,
    sort_order: values.sort_order,
  };

  return (
    <Modal
      title={modal.mode === 'edit' ? t('menu_edit_product') : t('menu_create_product')}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>
            {t('action_cancel')}
          </button>
          <button className="btn btn--primary" onClick={() => onSave(payload, modal.id)} disabled={busy}>
            {busy ? <span className="spinner" /> : <Icon name="check" size={16} />}
            {t('action_save')}
          </button>
        </>
      }
    >
      <>
        <LocalizedFields values={values} onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))} labelPrefix={t('menu_product_name')} />
        <div style={{ marginTop: 14 }}>
          <LocalizedFields
            values={values}
            textarea
            onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
            labelPrefix={t('menu_product_description')}
          />
        </div>
        <div className="form-grid" style={{ marginTop: 14 }}>
          <Field label={t('menu_product_price')}>
            <input
              className="input"
              type="number"
              min="0"
              step="250"
              value={values.price}
              onChange={(e) => setValues((s) => ({ ...s, price: e.target.value }))}
            />
          </Field>
          <Field label={t('menu_product_category')}>
            <Select
              value={values.category_id}
              onChange={(v) => setValues((s) => ({ ...s, category_id: v }))}
              placeholder={t('menu_uncategorized')}
              options={categories.map((c) => ({ value: c.id, label: c.name_en || c.name_ku }))}
            />
          </Field>
          <Field label={t('label_sort_order')}>
            <input
              className="input"
              type="number"
              value={values.sort_order}
              onChange={(e) => setValues((s) => ({ ...s, sort_order: Number(e.target.value) }))}
            />
          </Field>
        </div>

        <div style={{ marginTop: 14 }}>
          <ImagePicker
            label={t('menu_product_image')}
            hint={t('menu_image_hint')}
            value={values.image_url}
            onChange={(url) => setValues((s) => ({ ...s, image_url: url }))}
          />
        </div>

        <div style={{ marginTop: 10 }}>
          <div className="switch-row">
            <div className="switch-row__text">
              <div className="switch-row__title">{t('menu_product_active')}</div>
            </div>
            <Switch checked={values.active} onChange={(v) => setValues((s) => ({ ...s, active: v }))} ariaLabel={t('menu_product_active')} />
          </div>
          <div className="switch-row">
            <div className="switch-row__text">
              <div className="switch-row__title">{t('menu_product_available')}</div>
            </div>
            <Switch checked={values.available} onChange={(v) => setValues((s) => ({ ...s, available: v }))} ariaLabel={t('menu_product_available')} />
          </div>
        </div>
      </>
    </Modal>
  );
}
