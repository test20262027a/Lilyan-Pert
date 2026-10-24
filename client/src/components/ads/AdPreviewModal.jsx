import HeaderBackdrop from '../../headers/HeaderBackdrop';
import { useEffect } from 'react';
import Icon from '../Icon';
import { localized, useI18n } from '../../i18n';
import { fmtDateTime } from '../../format';

/*
 * Advertisement preview.
 *
 * Shows the stored advertisement exactly as the customer menu renders it (the
 * same `.ad-card` surface and scrim), together with the placement it belongs to,
 * its schedule and the destination a guest would get. It reads only — a preview
 * never changes the publication state and never records a public impression.
 */
export default function AdPreviewModal({ ad, locale, timeZone, onClose }) {
  const { t } = useI18n();

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const title = localized(ad, 'title', locale) || t('ads_title');
  const description = localized(ad, 'subtitle', locale);
  const product = localized(ad, 'product_name', locale);
  const category = localized(ad, 'category_name', locale);

  const destination = product
    ? t('ads_opens_product', { name: product })
    : category
      ? t('ads_opens_category', { name: category })
      : ad.link_url || t('ads_no_destination');

  const placement = t(`ads_placement_${ad.placement === 'menu_end' ? 'menu_end' : 'below_header'}`);

  return (
    <div
      className="adp-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className="adp" role="dialog" aria-modal="true" aria-label={t('ads_preview_title')}>
        <header className="adp__head">
          <HeaderBackdrop section="advertising" />
          <span className="adp__icon" aria-hidden="true">
            <Icon name="eye" size={18} />
          </span>
          <h2 className="adp__title">{t('ads_preview_title')}</h2>
          <button
            type="button"
            className="adp__close"
            onClick={onClose}
            aria-label={t('action_close')}
            title={t('action_close')}
          >
            <Icon name="close" size={16} />
          </button>
        </header>

        <div className="adp__body">
          <p className="adp__hint">{t('ads_preview_hint')}</p>

          <div className="adp__frame">
            <div className={`ad-card adp__adcard ${ad.image_url ? '' : 'is-plain'}`}>
              {ad.image_url ? <img className="ad-card__img" src={ad.image_url} alt="" /> : null}
              <div className="ad-card__scrim">
                <div className="ad-card__title">{title}</div>
                {description ? <div className="ad-card__sub">{description}</div> : null}
                <span className="adp__cta">{t('ads_view_offer')}</span>
              </div>
            </div>
          </div>

          <dl className="adp__meta">
            <div>
              <dt>{t('ads_placement')}</dt>
              <dd>{placement}</dd>
            </div>
            <div>
              <dt>{t('ads_start_date')}</dt>
              <dd>{ad.starts_at ? fmtDateTime(ad.starts_at, locale, timeZone) : t('ads_no_date')}</dd>
            </div>
            <div>
              <dt>{t('ads_end_date')}</dt>
              <dd>{ad.ends_at ? fmtDateTime(ad.ends_at, locale, timeZone) : t('ads_no_date')}</dd>
            </div>
            <div>
              <dt>{t('ads_preview_destination')}</dt>
              <dd className="adp__destination" dir="auto">
                {destination}
              </dd>
            </div>
          </dl>

          {ad.active === false ? <p className="adp__note">{t('ads_preview_inactive_note')}</p> : null}
        </div>

        <footer className="adp__foot">
          <button type="button" className="ad-cancel" onClick={onClose}>
            {t('action_close')}
          </button>
        </footer>
      </div>
    </div>
  );
}
