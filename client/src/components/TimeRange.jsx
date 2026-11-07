import { useI18n } from '../i18n';
import './timeRange.css';

/*
 * Opening and closing time, in one row whose visual order follows the language.
 *
 * The row is a plain flex row and takes the page's own direction, so the first
 * slot — always the opening time — lands on the RIGHT in Kurdish, Persian and
 * Arabic and on the LEFT in English, with the separator between the two. Each
 * value is its own bidirectional island with `dir="ltr"`, so digits are never
 * re-ordered or reversed inside the row, and the stored schedule is never
 * touched: only the two slots move.
 *
 * The same component is used by every working-hours display, in the admin panel
 * and the ordering panel alike, so the two can never disagree.
 */
export default function TimeRange({ open, close, className = '' }) {
  const { dir } = useI18n();
  if (!open || !close) return null;

  return (
    <span className={`time-range ${className}`.trim()} dir={dir}>
      <span className="time-range__time" dir="ltr">
        {open}
      </span>
      <span className="time-range__sep" aria-hidden="true">
        –
      </span>
      <span className="time-range__time" dir="ltr">
        {close}
      </span>
    </span>
  );
}
