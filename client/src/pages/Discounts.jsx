import { useCallback, useEffect, useState } from 'react';
import Icon from '../components/Icon';
import { Alert, ConfirmDialog, EmptyState, Loading, useToast } from '../components/ui';
import PageHeroBanner from '../components/menu/PageHeroBanner';
import PromotionsArtwork from '../components/promotions/PromotionsArtwork';
import PromotionCard from '../components/promotions/PromotionCard';
import PromotionFormModal from '../components/promotions/PromotionFormModal';
import { promotionsErrorText } from '../components/promotions/errorText';
import { useI18n } from '../i18n';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { del, get, post, put } from '../api';
import { zoneFor } from '../format';
import '../menu.css';
import '../promotions.css';

/*
 * Promotions & Discounts.
 *
 * The illustrated banner (with Add Promotion inside it) and the responsive grid
 * of one card per real promotion of the signed-in business: the product it
 * applies to, the discount itself, the validity window and how many redemptions
 * are left.
 *
 * Every record comes from `/manage/promotions`, which the API scopes to the
 * authenticated business, and every write goes back through the same
 * business-scoped routes — the discount is recalculated again on the server at
 * checkout, so nothing here is trusted for the money.
 */
export default function Discounts() {
  const { t, locale } = useI18n();
  const { business } = useBusiness();
  const { isManager } = useAuth();
  const toast = useToast();
  const timeZone = zoneFor(locale, business?.timezone);
  const currency = business?.currency || 'IQD';

  const [promotions, setPromotions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [formError, setFormError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, catalog] = await Promise.all([get('/manage/promotions'), get('/catalog/products')]);
      setPromotions(list.promotions || []);
      setProducts(catalog.products || []);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setFormError(null);
    setModal({ values: { discount_type: 'percent', discount_value: 10, active: true } });
  };

  const openEdit = (promotion) => {
    setFormError(null);
    setModal({
      id: promotion.id,
      values: {
        ...promotion,
        // The date inputs need a bare day, while the API stores full timestamps.
        starts_at: promotion.starts_at ? String(promotion.starts_at).slice(0, 10) : '',
        ends_at: promotion.ends_at ? String(promotion.ends_at).slice(0, 10) : '',
        max_uses: promotion.max_uses ?? '',
      },
    });
  };

  const save = async (values, id) => {
    setBusy(true);
    setFormError(null);
    try {
      const payload = {
        ...values,
        product_id: values.product_id || null,
        starts_at: values.starts_at || null,
        ends_at: values.ends_at || null,
        max_uses: values.max_uses === '' ? null : values.max_uses,
      };
      if (id) await put(`/manage/promotions/${id}`, payload);
      else await post('/manage/promotions', payload);
      setModal(null);
      await load();
      toast.success(t('state_saved'));
    } catch (err) {
      setFormError(err?.code || 'ERROR');
      toast.error(promotionsErrorText(err?.code, t) || t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (promotion) => {
    setBusy(true);
    try {
      await del(`/manage/promotions/${promotion.id}`);
      setConfirm(null);
      await load();
      toast.success(t('state_saved'));
    } catch {
      toast.error(t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const productOf = (promotion) =>
    promotion.product_id ? products.find((p) => p.id === promotion.product_id) : undefined;

  return (
    <div className="promos-page">
      <PageHeroBanner
        icon="tag"
        title={t('disc_title')}
        subtitle={t('disc_subtitle')}
        art={<PromotionsArtwork />}
      >
        <button
          type="button"
          className="promo-add"
          onClick={openCreate}
          disabled={!isManager || products.length === 0}
          title={products.length === 0 ? t('disc_no_products_hint') : t('disc_add')}
        >
          <span className="promo-add__dot" aria-hidden="true">
            <Icon name="plus" size={15} />
          </span>
          <span className="promo-add__label">{t('disc_add')}</span>
        </button>
      </PageHeroBanner>

      {!isManager ? <Alert kind="warning">{t('user_view_only')}</Alert> : null}

      {loading ? (
        <div className="promo-loading">
          <Loading />
        </div>
      ) : failed ? (
        <Alert kind="error">
          {t('state_error')}{' '}
          <button type="button" className="btn btn--sm" onClick={load}>
            {t('action_retry')}
          </button>
        </Alert>
      ) : promotions.length === 0 ? (
        <EmptyState
          icon="tag"
          title={t('disc_empty')}
          hint={products.length === 0 ? t('disc_no_products_hint') : t('disc_empty_hint')}
        />
      ) : (
        <div className="promo-grid">
          {promotions.map((promotion) => (
            <PromotionCard
              key={promotion.id}
              promotion={promotion}
              product={productOf(promotion)}
              currency={currency}
              locale={locale}
              timeZone={timeZone}
              canManage={isManager}
              onEdit={openEdit}
              onDelete={(row) => setConfirm(row)}
            />
          ))}
        </div>
      )}

      {modal ? (
        <PromotionFormModal
          modal={modal}
          products={products}
          busy={busy}
          error={formError}
          onClose={() => setModal(null)}
          onSave={save}
        />
      ) : null}

      {confirm ? (
        <ConfirmDialog
          danger
          title={t('action_delete')}
          message={t('disc_delete_confirm')}
          confirmLabel={t('action_delete')}
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => remove(confirm)}
        />
      ) : null}
    </div>
  );
}
