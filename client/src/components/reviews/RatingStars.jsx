import Icon from '../Icon';

/**
 * Solid green rating stars.
 *
 * `value` may be fractional: every star is filled by its own share of the
 * average (a 4.8 average fills four stars and 80% of the fifth), so the drawing
 * never claims a rating the stored reviews do not support.
 */
export default function RatingStars({ value = 0, size = 16, className = '' }) {
  const rating = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <span className={`rv-stars ${className}`.trim()} aria-label={`${rating.toFixed(1)} / 5`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.max(0, Math.min(1, rating - (star - 1)));
        return (
          <span className="rv-stars__slot" key={star} style={{ width: size, height: size }}>
            <span className="rv-stars__base" aria-hidden="true">
              <Icon name="star" size={size} />
            </span>
            {fill > 0 ? (
              <span
                className="rv-stars__fill"
                style={{ width: `${fill * 100}%` }}
                aria-hidden="true"
              >
                <Icon name="star" size={size} />
              </span>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}
