import { useCallback, useEffect, useState } from 'react';
import Icon from '../components/Icon';
import { Alert, EmptyState, Loading, useToast } from '../components/ui';
import DeleteConfirmationDialog from '../components/confirm/DeleteConfirmationDialog';
import PageHeroBanner from '../components/menu/PageHeroBanner';
import AdsArtwork from '../components/ads/AdsArtwork';
import AdCard from '../components/ads/AdCard';
import AdFormModal from '../components/ads/AdFormModal';
import AdPreviewModal from '../components/ads/AdPreviewModal';
import { adErrorText } from '../components/ads/errorText';
import { localized, useI18n } from '../i18n';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { del, get, post, put } from '../api';
import { zoneFor } from '../format';
import '../menu.css';
import '../ads.css';

/*
 * Advertisements.
 *
 * The illustrated banner (with Add Advertisement inside it) and the three-column
 * grid of one card per real advertisement of the signed-in business: picture or
 * mint placeholder, state badge, localized title and description, schedule,
 * related menu product or category, and the Preview / Edit / Delete footer.
 *
 * Every record comes from `/manage/ads`, scoped to the authenticated business by
 * the API, and every write goes back through the same business-scoped routes.
 * The public visibility rule is not decided here: the customer menu only ever
 * receives advertisements that are enabled AND inside their schedule.
 */

/** The four localized title / description pairs, trimmed, empty as null. */
function localizedPayload(values) {
  const payload = {};
  for (const code of ['ku', 'fa', 'ar', 'en']) {
    const title = String(values[`title_${code}`] || '').trim();
    const text = String(values[`subtitle_${code}`] || '').trim();
    payload[`title_${code}`] = title || null;
    payload[`subtitle_${code}`] = text || null;
  }
  return payload;
}

export default function Advertisements() {
  const { t, locale } = useI18n();
  const { business } = useBusiness();
  const { isManager } = useAuth();
  const toast = useToast();
  const timeZone = zoneFor(locale, business?.timezone);

  const [ads, setAds] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(null);
  const [preview, setPreview] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [formError, setFormError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, catalog, cats] = await Promise.all([
        get('/manage/ads'),
        get('/catalog/products'),
        get('/catalog/categories'),
      ]);
      setAds(list.ads || []);
      setProducts(catalog.products || []);
      setCategories(cats.categories || []);
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
    setModal({ values: {} });
  };

  const openEdit = (ad) => {
    setFormError(null);
    setModal({ id: ad.id, values: { ...ad } });
  };

  const save = async (values, id) => {
    setBusy(true);
    setFormError(null);
    try {
      const payload = {
        ...localizedPayload(values),
        image_url: values.image_url || null,
        link_url: values.link_url || null,
        category_id: values.category_id || null,
        product_id: values.product_id || null,
        starts_at: values.starts_at || null,
        ends_at: values.ends_at || null,
        placement: values.placement,
        priority: values.priority === '' ? 0 : Number(values.priority),
        active: values.active !== false,
      };
      if (id) await put(`/manage/ads/${id}`, payload);
      else await post('/manage/ads', payload);
      setModal(null);
      await load();
      toast.success(t('state_saved'));
    } catch (err) {
      // The dialog stays open with the entered values and an accurate message.
      setFormError(err?.code || 'ERROR');
      toast.error(adErrorText(err?.code, t) || t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (ad) => {
    setBusy(true);
    try {
      await del(`/manage/ads/${ad.id}`);
      setConfirm(null);
      await load();
      toast.success(t('state_saved'));
    } catch {
      toast.error(t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ads-page">
      <PageHeroBanner
        icon="megaphone"
        title={t('ads_title')}
        subtitle={t('ads_subtitle')}
        art={<AdsArtwork />}
      >
        <button type="button" className="ad-add" onClick={openCreate} disabled={!isManager}>
          <span className="ad-add__label">{t('ads_add')}</span>
          <span className="ad-add__dot" aria-hidden="true">
            <Icon name="plus" size={15} />
          </span>
        </button>
      </PageHeroBanner>

      {!isManager ? <Alert kind="warning">{t('user_view_only')}</Alert> : null}

      {loading ? (
        <div className="ads-loading">
          <Loading />
        </div>
      ) : failed ? (
        <Alert kind="error">
          {t('state_error')}{' '}
          <button type="button" className="btn btn--sm" onClick={load}>
            {t('action_retry')}
          </button>
        </Alert>
      ) : ads.length === 0 ? (
        <EmptyState icon="megaphone" title={t('ads_empty')} hint={t('ads_empty_hint')} />
      ) : (
        <div className="ad-grid">
          {ads.map((ad) => (
            <AdCard
              key={ad.id}
              ad={ad}
              locale={locale}
              timeZone={timeZone}
              canManage={isManager}
              onPreview={setPreview}
              onEdit={openEdit}
              onDelete={(row) => setConfirm(row)}
            />
          ))}
        </div>
      )}

      {modal ? (
        <AdFormModal
          modal={modal}
          products={products}
          categories={categories}
          timeZone={timeZone}
          busy={busy}
          error={formError}
          onClose={() => setModal(null)}
          onSave={save}
        />
      ) : null}

      {preview ? (
        <AdPreviewModal
          ad={preview}
          locale={locale}
          timeZone={timeZone}
          onClose={() => setPreview(null)}
        />
      ) : null}

      {confirm ? (
        <DeleteConfirmationDialog
          entityType="ad"
          entityName={localized(confirm, 'title', locale) || t('ads_title')}
          entityImage={confirm.image_url || null}
          entitySubtitle={
            [localized(confirm, 'product_name', locale), localized(confirm, 'category_name', locale)]
              .filter(Boolean)
              .join(' · ') || undefined
          }
          warning={t('marketing_delete_ad_confirm')}
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => remove(confirm)}
        />
      ) : null}
    </div>
  );
}
