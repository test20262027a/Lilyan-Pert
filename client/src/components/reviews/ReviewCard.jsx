import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { fmtDateTime } from '../../format';
import RatingStars from './RatingStars';

/**
 * One customer review: name and stars on the physical right, timestamp and the
 * minimal red delete icon on the physical left, then the full review text.
 *
 * The text is never clamped or truncated — the card grows to fit it — and it is
 * rendered as a text node, so stored markup can never execute. The moderation
 * actions appear only on a review that still needs them, so an approved review
 * reads exactly like the reference card.
 */
export default function ReviewCard({ review, locale, timeZone, canManage, busy, onDelete, onModerate }) {
  const { t } = useI18n();
  const name = String(review.customer_name || '').trim() || t('review_customer');
  const needsModeration = review.status !== 'approved';

  return (
    <article className="rv-card">
      <div className="rv-card__head">
        <div className="rv-card__who">
          <span className="rv-card__name">{name}</span>
          {needsModeration ? (
            <span className={`rv-card__status is-${review.status}`}>{t(`review_${review.status}`)}</span>
          ) : null}
        </div>

        <div className="rv-card__aside">
          <time className="rv-card__date" dateTime={review.created_at || undefined}>
            {fmtDateTime(review.created_at, locale, timeZone)}
          </time>
          {canManage ? (
            <button
              type="button"
              className="rv-card__del"
              onClick={() => onDelete(review)}
              disabled={busy}
              title={t('review_delete_title')}
              aria-label={t('review_delete_title')}
            >
              <Icon name="trash" size={16} />
            </button>
          ) : null}
        </div>
      </div>

      <RatingStars value={review.rating} size={15} className="rv-card__stars" />

      {review.comment ? <p className="rv-card__text">{review.comment}</p> : null}

      {canManage && needsModeration ? (
        <div className="rv-card__mods">
          {review.status !== 'approved' ? (
            <button
              type="button"
              className="rv-mod rv-mod--ok"
              disabled={busy}
              onClick={() => onModerate(review.id, 'approved')}
            >
              <Icon name="check" size={13} />
              {t('review_approve')}
            </button>
          ) : null}
          {review.status !== 'rejected' ? (
            <button
              type="button"
              className="rv-mod"
              disabled={busy}
              onClick={() => onModerate(review.id, 'rejected')}
            >
              <Icon name="close" size={13} />
              {t('review_reject')}
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
