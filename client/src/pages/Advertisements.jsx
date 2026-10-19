import { useCallback, useEffect, useState } from 'react';
import Icon from '../components/Icon';
import { Alert, ConfirmDialog, EmptyState, Loading, SectionCard, useToast } from '../components/ui';
import AdFormModal from '../components/ads/AdFormModal';
import { localized, useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { del, get, post, put } from '../api';

/*
 * Advertisements.
 *
 * One card per real advertisement of the signed-in business, with its stored
 * picture (served as a background so the card keeps its shape), its localized
 * title and subtitle and its active flag. The records come from `/manage/ads`,
 * scoped to the authenticated business by the API.
 */
export default function Advertisements() {
  const { t, locale } = useI18n();
  const { isManager } = useAuth();
  const toast = useToast();

  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get('/manage/ads');
      setAds(res.ads || []);
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

  const save = async (values, id) => {
    setBusy(true);
    try {
      if (id) await put(`/manage/ads/${id}`, values);
      else await post('/manage/ads', values);
      setModal(null);
      await load();
      toast.success(t('state_saved'));
    } catch {
      toast.error(t('error_generic'));
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
    <>
      <div className="page-head">
        <div className="page-head__text">
          <h1>{t('ads_title')}</h1>
          <p>{t('ads_subtitle')}</p>
        </div>
        <div className="page-head__actions">
          <button
            className="btn btn--primary btn--sm"
            onClick={() => setModal({ values: {} })}
            disabled={!isManager}
          >
            <Icon name="plus" size={15} />
            {t('marketing_create_ad')}
          </button>
        </div>
      </div>

      {!isManager ? <Alert kind="warning">{t('user_view_only')}</Alert> : null}

      <SectionCard icon="megaphone" iconClass="ic-coral" title={t('marketing_ads')}>
        {loading ? (
          <Loading />
        ) : failed ? (
          <Alert kind="error">
            {t('state_error')}{' '}
            <button type="button" className="btn btn--sm" onClick={load}>
              {t('action_retry')}
            </button>
          </Alert>
        ) : ads.length === 0 ? (
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
                        <button className="btn btn--sm" onClick={() => setModal({ id: ad.id, values: { ...ad } })}>
                          <Icon name="pencil" size={13} />
                          {t('action_edit')}
                        </button>
                        <button className="btn btn--sm btn--danger-soft" onClick={() => setConfirm(ad)}>
                          <Icon name="trash" size={13} />
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {modal ? (
        <AdFormModal modal={modal} busy={busy} onClose={() => setModal(null)} onSave={save} />
      ) : null}

      {confirm ? (
        <ConfirmDialog
          danger
          title={t('action_delete')}
          message={t('marketing_delete_ad_confirm')}
          confirmLabel={t('action_delete')}
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => remove(confirm)}
        />
      ) : null}
    </>
  );
}
