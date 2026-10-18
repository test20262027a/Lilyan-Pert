import { useCallback, useEffect, useState } from 'react';
import Icon from '../components/Icon';
import {
  Alert,
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
import { localized, useI18n } from '../i18n';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { del, get, post, put, uploadImage } from '../api';
import { fmtDate, zoneFor } from '../format';

const emptyAd = () => ({
  title_ku: '', title_fa: '', title_ar: '', title_en: '',
  subtitle_ku: '', subtitle_fa: '', subtitle_ar: '', subtitle_en: '',
  image_url: null, link_url: '', active: true, sort_order: 0,
});

const emptyPromotion = () => ({
  product_id: '', discount_type: 'percent', discount_value: 10,
  starts_at: '', ends_at: '', active: true,
  title_en: '', title_ku: '', title_fa: '', title_ar: '',
});

export default function Marketing() {
  const { t, locale } = useI18n();
  const { business } = useBusiness();
  const { isManager } = useAuth();
  const toast = useToast();
  const timeZone = zoneFor(locale, business?.timezone);
  const currency = business?.currency || 'IQD';

  const [tab, setTab] = useState('ads');
  const [ads, setAds] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [adModal, setAdModal] = useState(null);
  const [promoModal, setPromoModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, p, pr] = await Promise.all([
        get('/manage/ads'),
        get('/manage/promotions'),
        get('/catalog/products'),
      ]);
      setAds(a.ads || []);
      setPromotions(p.promotions || []);
      setProducts(pr.products || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveAd = async (values, id) => {
    setBusy(true);
    try {
      if (id) await put(`/manage/ads/${id}`, values);
      else await post('/manage/ads', values);
      toast.success(t('state_saved'));
      setAdModal(null);
      await load();
    } catch {
      toast.error(t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const savePromo = async (values, id) => {
    setBusy(true);
    try {
      const payload = {
        ...values,
        product_id: values.product_id || null,
        starts_at: values.starts_at || null,
        ends_at: values.ends_at || null,
      };
      if (id) await put(`/manage/promotions/${id}`, payload);
      else await post('/manage/promotions', payload);
      toast.success(t('state_saved'));
      setPromoModal(null);
      await load();
    } catch {
      toast.error(t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const removeAd = async (id) => {
    try {
      await del(`/manage/ads/${id}`);
      await load();
    } catch {
      toast.error(t('error_generic'));
    }
  };

  const removePromo = async (id) => {
    try {
      await del(`/manage/promotions/${id}`);
      await load();
    } catch {
      toast.error(t('error_generic'));
    }
  };

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <h1>{t('marketing_title')}</h1>
          <p>{t('marketing_subtitle')}</p>
        </div>
        <div className="page-head__actions">
          <button className="btn btn--sm" onClick={() => setAdModal({ values: emptyAd() })} disabled={!isManager}>
            <Icon name="plus" size={15} />
            {t('marketing_create_ad')}
          </button>
          <button className="btn btn--primary btn--sm" onClick={() => setPromoModal({ values: emptyPromotion() })} disabled={!isManager || products.length === 0}>
            <Icon name="plus" size={15} />
            {t('marketing_create_promotion')}
          </button>
        </div>
      </div>

      {!isManager ? <Alert kind="warning">{t('user_view_only')}</Alert> : null}

      <SectionCard
        icon="megaphone"
        iconClass="ic-coral"
        title={tab === 'ads' ? t('marketing_ads') : t('marketing_promotions')}
        actions={
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'ads', label: t('marketing_ads'), icon: 'image' },
              { value: 'promotions', label: t('marketing_promotions'), icon: 'tag' },
            ]}
          />
        }
      >
        {loading ? (
          <Loading />
        ) : tab === 'ads' ? (
          ads.length === 0 ? (
            <EmptyState icon="image" title={t('marketing_no_ads')} />
          ) : (
            /* One advertisement keeps one card's width and starts at the grid start. */
            <div className="ads-grid">
              {ads.map((ad) => (
                <div className="ad-card" key={ad.id}>
                  {ad.image_url ? <img className="ad-card__img" src={ad.image_url} alt="" loading="lazy" /> : null}
                  <div className="ad-card__scrim">
                    <div className="ad-card__title">{localized(ad, 'title', locale) || t('marketing_ads')}</div>
                    <div className="ad-card__sub">{localized(ad, 'subtitle', locale)}</div>
                    <div className="btn-row" style={{ marginTop: 8 }}>
                      <span className={`badge badge--${ad.active ? 'active' : 'inactive'}`}>
                        {ad.active ? t('label_active') : t('label_inactive')}
                      </span>
                      {isManager ? (
                        <>
                          <button className="btn btn--sm" onClick={() => setAdModal({ id: ad.id, values: { ...ad } })}>
                            <Icon name="pencil" size={13} />
                            {t('action_edit')}
                          </button>
                          <button className="btn btn--sm btn--danger-soft" onClick={() => removeAd(ad.id)}>
                            <Icon name="trash" size={13} />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : promotions.length === 0 ? (
          <EmptyState icon="tag" title={t('marketing_no_promotions')} />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t('label_name')}</th>
                  <th>{t('marketing_promotion_product')}</th>
                  <th>{t('marketing_discount_value')}</th>
                  <th>{t('marketing_starts_at')}</th>
                  <th>{t('marketing_ends_at')}</th>
                  <th>{t('label_status')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {promotions.map((p) => (
                  <tr key={p.id}>
                    <td>{localized(p, 'title', locale) || '—'}</td>
                    <td>{localized(p, 'product_name', locale) || t('marketing_all_products')}</td>
                    <td style={{ fontWeight: 700 }}>
                      {p.discount_type === 'percent' ? `${Number(p.discount_value)}%` : <Money value={p.discount_value} currency={currency} />}
                    </td>
                    <td>{p.starts_at ? fmtDate(p.starts_at, locale, timeZone, { short: true }) : '—'}</td>
                    <td>{p.ends_at ? fmtDate(p.ends_at, locale, timeZone, { short: true }) : '—'}</td>
                    <td>
                      <span className={`badge badge--${p.active ? 'active' : 'inactive'}`}>
                        {p.active ? t('label_active') : t('label_inactive')}
                      </span>
                    </td>
                    <td>
                      {isManager ? (
                        <div className="btn-row">
                          <button className="btn btn--sm" onClick={() => setPromoModal({ id: p.id, values: { ...p, starts_at: p.starts_at?.slice(0, 10) || '', ends_at: p.ends_at?.slice(0, 10) || '' } })}>
                            <Icon name="pencil" size={13} />
                          </button>
                          <button className="btn btn--sm btn--danger-soft" onClick={() => removePromo(p.id)}>
                            <Icon name="trash" size={13} />
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {adModal ? <AdForm modal={adModal} busy={busy} onClose={() => setAdModal(null)} onSave={saveAd} /> : null}
      {promoModal ? (
        <PromotionForm modal={promoModal} products={products} busy={busy} onClose={() => setPromoModal(null)} onSave={savePromo} />
      ) : null}
    </>
  );
}

function AdForm({ modal, busy, onClose, onSave }) {
  const { t } = useI18n();
  const toast = useToast();
  const [values, setValues] = useState({
    title_ku: modal.values.title_ku || '',
    title_fa: modal.values.title_fa || '',
    title_ar: modal.values.title_ar || '',
    title_en: modal.values.title_en || '',
    subtitle_ku: modal.values.subtitle_ku || '',
    subtitle_fa: modal.values.subtitle_fa || '',
    subtitle_ar: modal.values.subtitle_ar || '',
    subtitle_en: modal.values.subtitle_en || '',
    image_url: modal.values.image_url || null,
    link_url: modal.values.link_url || '',
    active: modal.values.active !== false,
  });

  return (
    <Modal
      title={modal.id ? t('marketing_edit_ad') : t('marketing_create_ad')}
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
      <div className="form-grid">
        {['en', 'ku', 'fa', 'ar'].map((code) => (
          <Field key={code} label={`${t('marketing_ad_title')} · ${code.toUpperCase()}`}>
            <input
              className="input"
              dir={code === 'en' ? 'ltr' : 'rtl'}
              value={values[`title_${code}`]}
              onChange={(e) => setValues((v) => ({ ...v, [`title_${code}`]: e.target.value }))}
            />
          </Field>
        ))}
        {['en', 'ku', 'fa', 'ar'].map((code) => (
          <Field key={`sub-${code}`} label={`${t('marketing_ad_subtitle')} · ${code.toUpperCase()}`}>
            <input
              className="input"
              dir={code === 'en' ? 'ltr' : 'rtl'}
              value={values[`subtitle_${code}`]}
              onChange={(e) => setValues((v) => ({ ...v, [`subtitle_${code}`]: e.target.value }))}
            />
          </Field>
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        <div className="field">
          <span className="field__label">{t('marketing_ad_image')}</span>
          {values.image_url ? (
            <div className="image-preview image-preview--contain">
              <img src={values.image_url} alt="" />
            </div>
          ) : null}
          <div className="btn-row">
            <label className="btn btn--sm" style={{ cursor: 'pointer' }}>
              <Icon name="upload" size={15} />
              {t('menu_upload_image')}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  try {
                    const url = await uploadImage(file);
                    setValues((v) => ({ ...v, image_url: url }));
                  } catch {
                    toast.error(t('error_invalid_image'));
                  }
                }}
              />
            </label>
            {values.image_url ? (
              <button className="btn btn--sm" onClick={() => setValues((v) => ({ ...v, image_url: null }))}>
                <Icon name="trash" size={15} />
                {t('menu_remove_image')}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="form-grid" style={{ marginTop: 14 }}>
        <Field label={t('marketing_ad_link')}>
          <input className="input" dir="ltr" value={values.link_url} onChange={(e) => setValues((v) => ({ ...v, link_url: e.target.value }))} />
        </Field>
        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 6 }}>
          <Switch
            checked={values.active}
            onChange={(v) => setValues((s) => ({ ...s, active: v }))}
            label={t('label_active')}
            ariaLabel={t('label_active')}
          />
        </div>
      </div>
    </Modal>
  );
}

function PromotionForm({ modal, products, busy, onClose, onSave }) {
  const { t, locale } = useI18n();
  const [values, setValues] = useState({
    product_id: modal.values.product_id || '',
    discount_type: modal.values.discount_type || 'percent',
    discount_value: modal.values.discount_value ?? 10,
    starts_at: modal.values.starts_at || '',
    ends_at: modal.values.ends_at || '',
    active: modal.values.active !== false,
    title_en: modal.values.title_en || '',
    title_ku: modal.values.title_ku || '',
    title_fa: modal.values.title_fa || '',
    title_ar: modal.values.title_ar || '',
  });

  return (
    <Modal
      title={modal.id ? t('marketing_edit_promotion') : t('marketing_create_promotion')}
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
      <div className="form-grid">
        <Field label={t('marketing_promotion_product')}>
          <Select
            value={values.product_id}
            onChange={(v) => setValues((s) => ({ ...s, product_id: v }))}
            options={products.map((p) => ({ value: p.id, label: localized(p, 'name', locale) }))}
          />
        </Field>
        <Field label={t('marketing_promotion_type')}>
          <Select
            value={values.discount_type}
            onChange={(v) => setValues((s) => ({ ...s, discount_type: v }))}
            options={[
              { value: 'percent', label: t('marketing_discount_percent') },
              { value: 'fixed', label: t('marketing_discount_fixed') },
            ]}
          />
        </Field>
        <Field label={t('marketing_discount_value')}>
          <input
            className="input"
            type="number"
            min="0"
            value={values.discount_value}
            onChange={(e) => setValues((s) => ({ ...s, discount_value: e.target.value }))}
          />
        </Field>
        <Field label={t('marketing_starts_at')}>
          <input className="input" type="date" value={values.starts_at} onChange={(e) => setValues((s) => ({ ...s, starts_at: e.target.value }))} />
        </Field>
        <Field label={t('marketing_ends_at')}>
          <input className="input" type="date" value={values.ends_at} onChange={(e) => setValues((s) => ({ ...s, ends_at: e.target.value }))} />
        </Field>
      </div>

      <div className="form-grid" style={{ marginTop: 14 }}>
        {['en', 'ku', 'fa', 'ar'].map((code) => (
          <Field key={code} label={`${t('label_name')} · ${code.toUpperCase()}`}>
            <input
              className="input"
              dir={code === 'en' ? 'ltr' : 'rtl'}
              value={values[`title_${code}`]}
              onChange={(e) => setValues((v) => ({ ...v, [`title_${code}`]: e.target.value }))}
            />
          </Field>
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        <Switch
          checked={values.active}
          onChange={(v) => setValues((s) => ({ ...s, active: v }))}
          label={t('label_active')}
          ariaLabel={t('label_active')}
        />
      </div>
    </Modal>
  );
}
