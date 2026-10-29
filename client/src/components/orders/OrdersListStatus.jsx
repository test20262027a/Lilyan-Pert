import { Fragment } from 'react';
import Icon from '../Icon';
import { fmtNumber } from '../../format';
import { useI18n } from '../../i18n';

/*
 * The orders list's status bar: the summary strip under the table or the phone
 * cards. It reports how many orders the list is showing out of the day's total
 * and, while a search spans every date, says so — plus the way to load the next
 * page.
 *
 * Purely presentational: the page owns the rows, so the strip can never
 * disagree with what is rendered above it. The numbers are the only wrapped
 * parts of the sentence, so each language keeps its own word order and an RTL
 * reading stays natural.
 */
export default function OrdersListStatus({
  shown,
  total,
  searching = false,
  hasMore = false,
  loading = false,
  onLoadMore,
}) {
  const { t, locale } = useI18n();
  const values = { shown: fmtNumber(shown, locale), total: fmtNumber(total, locale) };

  const sentence = t('order_showing')
    .split(/(\{\w+\})/)
    .filter(Boolean)
    .map((part, index) => {
      const token = /^\{(\w+)\}$/.exec(part);
      if (token && values[token[1]] !== undefined) {
        return (
          <span className="ofoot__num" key={index}>
            {values[token[1]]}
          </span>
        );
      }
      return <Fragment key={index}>{part}</Fragment>;
    });

  return (
    <div className="otable__foot">
      <div className="ofoot__group">
        <span className="ofoot__count" role="status" aria-live="polite">
          <span className="ofoot__count-icon" aria-hidden="true">
            <Icon name="receipt" size={13} />
          </span>
          <span className="ofoot__count-text">{sentence}</span>
        </span>
        {searching ? (
          <span className="ofoot__note">
            <Icon name="search" size={12} />
            {t('order_search_all_dates')}
          </span>
        ) : null}
      </div>
      {hasMore ? (
        <button
          type="button"
          className="btn btn--sm ofoot__more"
          onClick={onLoadMore}
          disabled={loading}
        >
          {loading ? <span className="spinner" /> : <Icon name="chevronDown" size={14} />}
          {t('order_load_more')}
        </button>
      ) : null}
    </div>
  );
}
