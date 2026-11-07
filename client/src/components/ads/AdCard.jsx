import Icon from '../Icon';
import { localized, useI18n } from '../../i18n';
import { fmtDate } from '../../format';

/** Effective state of an advertisement: enabled, inside its schedule, or not. */
function adState(ad) {
  if (ad.active === false) return 'inactive';
  const now = Date.now();
  const start = ad.starts_at ? new Date(ad.starts_at).getTime() : null;
  const end = ad.ends_at ? new Date(ad.ends_at).getTime() : null;
  if (start && start > now) return 'scheduled';
  if (end && end < now) return 'expired';
  return 'active';
}

/*
 * One advertisement card: the stored picture (or its pale mint placeholder),
 * the state badge over the media, the localized title with its status pill, the
 * description, the schedule row, the related menu product or category and the
 * Preview / Edit / Delete footer.
 *
 * The state shown is derived from the real record — an enabled advertisement
 * whose window has ended reads as expired, because the customer menu hides it.
 */
export default function AdCard({ ad, locale, timeZone, canManage, onPreview, onEdit, onDelete }) {
  const { t } = useI18n();
  const state = adState(ad);
  const stateLabel = t(`ads_state_${state}`);
  const title = localized(ad, 'title', locale) || t('ads_title');
  const description = localized(ad, 'subtitle', locale);

  const product = localized(ad, 'product_name', locale);
  const category = localized(ad, 'category_name', locale);

  return (
    <article className={`ad2-card is-${state}`}>
      <div className="ad2-card__media">
        {ad.image_url ? (
          <img className="ad2-card__img" src={ad.image_url} alt="" loading="lazy" />
        ) : (
          <div className="ad2-card__placeholder" aria-hidden="true">
            <Icon name="megaphone" size={26} />
          </div>
        )}
        <span className={`ad2-card__media-badge is-${state}`}>{stateLabel}</span>
      </div>

      <div className="ad2-card__body">
        <div className="ad2-card__titlerow">
          <h3 className="ad2-card__title" title={title}>
            {title}
          </h3>
          <span className={`ad2-state is-${state}`}>
            <i className="ad2-state__dot" aria-hidden="true" />
            {stateLabel}
          </span>
        </div>

        {description ? (
          <p className="ad2-card__desc" title={description}>
            {description}
          </p>
        ) : (
          <p className="ad2-card__desc ad2-card__desc--empty">{t('ads_no_description')}</p>
        )}

        <div className="ad2-card__dates">
          <Icon name="calendar" size={14} />
          <span className={ad.starts_at ? '' : 'is-muted'}>
            {ad.starts_at ? fmtDate(ad.starts_at, locale, timeZone, { short: true }) : t('ads_no_date')}
          </span>
          <span className="ad2-card__arrow" aria-hidden="true">→</span>
          <span className={ad.ends_at ? '' : 'is-muted'}>
            {ad.ends_at ? fmtDate(ad.ends_at, locale, timeZone, { short: true }) : t('ads_no_date')}
          </span>
        </div>

        <div className="ad2-card__related">
          <Icon name={product ? 'package' : 'grid'} size={14} />
          <span className="ad2-card__related-label">{product || category || t('ads_no_related')}</span>
        </div>
      </div>

      <div className="ad2-card__foot">
        <button type="button" className="ad2-btn ad2-btn--preview" onClick={() => onPreview(ad)}>
          <Icon name="eye" size={14} />
          {t('ads_preview')}
        </button>
        {canManage ? (
          <>
            <button type="button" className="ad2-btn ad2-btn--edit" onClick={() => onEdit(ad)}>
              <Icon name="pencil" size={14} />
              {t('action_edit')}
            </button>
            <button type="button" className="ad2-btn ad2-btn--delete" onClick={() => onDelete(ad)}>
              <Icon name="trash" size={14} />
              {t('action_delete')}
            </button>
          </>
        ) : null}
      </div>
    </article>
  );
}
