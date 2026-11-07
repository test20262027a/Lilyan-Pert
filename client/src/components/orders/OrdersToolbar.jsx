import Icon from '../Icon';
import { useI18n } from '../../i18n';

/*
 * White filter bar: the search field (physical right in RTL) and the compact
 * status filters next to it. The status values are the application's own
 * authoritative ones — this component never invents its own codes.
 *
 * The search looks receipts up by number only; the whole container (`.lilyan-
 * search`) carries the focus treatment, so the icon, the field and the clear
 * button read as one control instead of the field alone lighting up.
 */
export default function OrdersToolbar({ query, onQueryChange, onSearch, status, onStatusChange, statuses }) {
  const { t } = useI18n();

  return (
    <div className="otoolbar">
      <div className="osearch lilyan-search">
        <span className="lilyan-search__icon">
          <Icon name="search" size={15} />
        </span>
        <input
          className="osearch__input lilyan-search__input"
          type="text"
          inputMode="text"
          value={query}
          placeholder={t('order_search_receipt')}
          aria-label={t('order_search_receipt')}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            // Enter searches now; it never reloads the page.
            if (e.key === 'Enter') {
              e.preventDefault();
              onSearch?.();
            }
          }}
        />
        {query ? (
          <button
            type="button"
            className="osearch__clear lilyan-search__clear"
            onClick={() => onQueryChange('')}
            aria-label={t('action_clear')}
            title={t('action_clear')}
          >
            <Icon name="close" size={14} />
          </button>
        ) : null}
      </div>

      <div className="ofilters" role="group" aria-label={t('order_filter_status')}>
        {['all', ...statuses].map((value) => (
          <button
            key={value}
            type="button"
            className={`ofilter ${status === value ? 'is-active' : ''}`}
            aria-pressed={status === value}
            onClick={() => onStatusChange(value)}
          >
            {value === 'all' ? t('label_all') : t(`status_${value}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
