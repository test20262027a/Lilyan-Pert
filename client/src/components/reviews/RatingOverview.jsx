import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { fmtDigits, fmtNumber } from '../../format';
import RatingStars from './RatingStars';

/**
 * The full-width ratings overview: the average customer rating on the physical
 * right, the five-star distribution on the left.
 *
 * Every number comes from the API summary, which is computed over one
 * population (all reviews of this business), so the five counts always add up
 * to the total shown under the stars. Nothing here is estimated on the client.
 */
export default function RatingOverview({ summary, locale }) {
  const { t } = useI18n();
  const total = Number(summary?.total) || 0;
  const average = Number(summary?.average) || 0;
  const counts = summary?.counts || {};

  return (
    <section className="rv-overview" aria-label={t('review_title')}>
      <div className="rv-summary">
        <div className="rv-summary__value">{fmtDigits(total ? average.toFixed(1) : '0.0', locale)}</div>
        <RatingStars value={total ? average : 0} size={17} />
        <div className="rv-summary__count">
          {fmtNumber(total, locale)} {t(total === 1 ? 'review_count_one' : 'review_count')}
        </div>
      </div>

      <div className="rv-dist">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = Number(counts[star]) || 0;
          const percent = total ? Math.round((count / total) * 1000) / 10 : 0;
          return (
            <div className="rv-row" key={star}>
              <span className="rv-row__label">
                <Icon name="star" size={13} />
                <span>{fmtDigits(star, locale)}</span>
              </span>
              <span
                className="rv-row__track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(percent)}
                aria-label={`${star}/5 · ${fmtNumber(count, locale)}`}
              >
                <span className="rv-row__fill" style={{ width: `${percent}%` }} />
              </span>
              <span className="rv-row__count">{fmtNumber(count, locale)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
