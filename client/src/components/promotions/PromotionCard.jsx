import Icon from '../Icon';
import { Money } from '../ui';
import { localized, useI18n } from '../../i18n';
import { fmtDate } from '../../format';

/*
 * One promotion card: what the discount is, which product it applies to, how
 * many redemptions are left and the real validity window. Every figure comes
 * from the stored record — nothing is estimated on the client.
 */
export default function PromotionCard({ promotion, product, currency, locale, timeZone, canManage, onEdit, onDelete }) {
  const { t } = useI18n();

  const now = Date.now();
  const starts = promotion.starts_at ? new Date(promotion.starts_at).getTime() : null;
  const ends = promotion.ends_at ? new Date(promotion.ends_at).getTime() : null;
  const limit = promotion.max_uses === null || promotion.max_uses === undefined ? null : Number(promotion.max_uses);
  const used = Number(promotion.used_count) || 0;
  const exhausted = limit !== null && used >= limit;

  /* The state shown on the badge is derived, not stored: an exhausted or
     out-of-window promotion is not actually applied at checkout. */
  let state = 'inactive';
  if (!promotion.active) state = 'inactive';
  else if (exhausted) state = 'exhausted';
  else if (ends && ends < now) state = 'expired';
  else if (starts && starts > now) state = 'scheduled';
  else state = 'active';

  const value =
    promotion.discount_type === 'percent' ? (
      <>{Number(promotion.discount_value)}%</>
    ) : (
      <Money value={promotion.discount_value} currency={currency} />
    );

  return (
    <article className="promo-card">
      <header className="promo-card__head">
        <span className="promo-card__mark">
          <Icon name="tag" size={18} />
        </span>
        <div className="promo-card__title">
          <h3>{localized(promotion, 'title', locale) || t('marketing_promotions')}</h3>
          <span className="promo-card__product">
            {localized(promotion, 'product_name', locale) || t('marketing_all_products')}
          </span>
        </div>
        <span className={`badge badge--${state === 'active' ? 'active' : state === 'scheduled' ? 'pending' : 'inactive'}`}>
          {t(`disc_state_${state}`)}
        </span>
      </header>

      <div className="promo-card__value">{value}</div>

      <div className="promo-card__meta">
        <span>
          <Icon name="calendar" size={13} />
          {promotion.starts_at ? fmtDate(promotion.starts_at, locale, timeZone, { short: true }) : '—'}
        </span>
        <span>
          <Icon name="arrowRight" size={13} className="icon--dir" />
          {promotion.ends_at ? fmtDate(promotion.ends_at, locale, timeZone, { short: true }) : '—'}
        </span>
      </div>

      {/* Redemptions: the bar only exists when the promotion actually has a cap. */}
      <div className="promo-card__usage">
        {limit === null ? (
          <span className="chip">
            <Icon name="refresh" size={12} /> {t('disc_unlimited')}
          </span>
        ) : (
          <>
            <div className="promo-card__usage-row">
              <span>{t('disc_used_of')}</span>
              <strong>
                {used} / {limit}
              </strong>
            </div>
            <div className="promo-bar">
              <span className="promo-bar__fill" style={{ width: `${Math.min(100, Math.round((used / limit) * 100))}%` }} />
            </div>
            <div className="promo-card__usage-row">
              <span>{t('disc_remaining')}</span>
              <strong>{Math.max(0, limit - used)}</strong>
            </div>
          </>
        )}
      </div>

      {product ? (
        <div className="promo-card__foot">
          <span className="chip">
            <Icon name="utensils" size={12} />
            {localized(product, 'name', locale)}
          </span>
        </div>
      ) : null}

      {canManage ? (
        <div className="promo-card__actions">
          <button className="btn btn--sm" onClick={() => onEdit(promotion)}>
            <Icon name="pencil" size={14} />
            {t('action_edit')}
          </button>
          <button className="btn btn--sm btn--danger-soft" onClick={() => onDelete(promotion)}>
            <Icon name="trash" size={14} />
            {t('action_delete')}
          </button>
        </div>
      ) : null}
    </article>
  );
}
