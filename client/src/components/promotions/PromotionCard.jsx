import Icon from '../Icon';
import { Money } from '../ui';
import { localized, useI18n } from '../../i18n';
import { fmtDate } from '../../format';

/*
 * One promotion card, in the order the design asks for it: status badge,
 * code + value, discount-type icon, usage numbers, progress, remaining uses,
 * the validity window and the two actions.
 *
 * Every figure is the stored record's own — nothing is estimated on the client.
 * The badge is derived, because an exhausted or out-of-window promotion is not
 * actually redeemed at checkout.
 */
export default function PromotionCard({ promotion, currency, locale, timeZone, canManage, onEdit, onDelete }) {
  const { t } = useI18n();

  const now = Date.now();
  const starts = promotion.starts_at ? new Date(promotion.starts_at).getTime() : null;
  const ends = promotion.ends_at ? new Date(promotion.ends_at).getTime() : null;
  const limit = promotion.max_uses === null || promotion.max_uses === undefined ? null : Number(promotion.max_uses);
  const used = Number(promotion.used_count) || 0;
  const exhausted = limit !== null && used >= limit;

  let state = 'active';
  if (!promotion.active) state = 'inactive';
  else if (exhausted) state = 'exhausted';
  else if (ends && ends < now) state = 'expired';
  else if (starts && starts > now) state = 'scheduled';

  const isPercent = promotion.discount_type === 'percent';
  const code = promotion.code || localized(promotion, 'title', locale) || '—';
  const progress = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const remaining = limit === null ? null : Math.max(0, limit - used);

  return (
    <article className="promo-card">
      <header className="promo-card__head">
        <span className={`promo-card__mark ${isPercent ? 'is-percent' : 'is-fixed'}`} aria-hidden="true">
          <Icon name={isPercent ? 'percent' : 'banknote'} size={21} />
        </span>

        <div className="promo-card__ident">
          <div className="promo-card__code" title={code}>
            {code}
          </div>
          <div className="promo-card__value">
            {isPercent ? `${Number(promotion.discount_value)}%` : <Money value={promotion.discount_value} currency={currency} />}
          </div>
        </div>

        <span className={`promo-pill promo-pill--${state}`}>
          <span className="promo-pill__dot" aria-hidden="true" />
          {t(`disc_state_${state}`)}
        </span>
      </header>

      <div className="promo-card__usage">
        <div className="promo-card__line">
          <span className="promo-card__label">
            <Icon name="users" size={14} />
            {t('disc_used_of')}
          </span>
          <strong>{limit === null ? `${used} / ${t('disc_unlimited')}` : `${used} / ${limit}`}</strong>
        </div>

        {limit === null ? null : (
          <div className="promo-bar">
            <span className="promo-bar__fill" style={{ width: `${progress}%` }} />
          </div>
        )}

        <div className="promo-card__line">
          <span className="promo-card__label">
            <Icon name="clock" size={14} />
            {t('disc_remaining')}
          </span>
          <strong>{remaining === null ? t('disc_unlimited') : remaining}</strong>
        </div>
      </div>

      {promotion.starts_at || promotion.ends_at ? (
        <div className="promo-card__dates">
          {promotion.starts_at ? (
            <div className="promo-card__date">
              <Icon name="calendar" size={14} />
              <span>{t('disc_starts_at')}</span>
              <strong>{fmtDate(promotion.starts_at, locale, timeZone, { short: true })}</strong>
            </div>
          ) : null}
          {promotion.ends_at ? (
            <div className="promo-card__date">
              <Icon name="calendar" size={14} />
              <span>{t('disc_ends_at')}</span>
              <strong>{fmtDate(promotion.ends_at, locale, timeZone, { short: true })}</strong>
            </div>
          ) : null}
        </div>
      ) : null}

      {canManage ? (
        <div className="promo-card__foot">
          <button type="button" className="promo-edit" onClick={() => onEdit(promotion)}>
            <Icon name="pencil" size={15} />
            {t('action_edit')}
          </button>
          <button
            type="button"
            className="promo-delete"
            onClick={() => onDelete(promotion)}
            aria-label={t('action_delete')}
            title={t('action_delete')}
          >
            <Icon name="trash" size={16} />
          </button>
        </div>
      ) : null}
    </article>
  );
}
