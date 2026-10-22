import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { fmtNumber } from '../../format';

/*
 * The summary strip under the search field: one long card split by soft
 * dividers, exactly like the reference. Every value is real — the number of
 * active categories and sellable items the API just sent, and the trading state
 * the server resolved against the saved working hours (falling back to the
 * business type when no schedule is valid today).
 */
export default function CustomerStats({ categories, items, typeLabel, hours }) {
  const { t, locale } = useI18n();
  const open = hours?.valid ? hours.is_open : null;

  const tiles = [
    {
      key: 'categories',
      icon: 'grid',
      tone: 'blue',
      value: fmtNumber(categories, locale),
      label: t('customer_menu_categories'),
    },
    {
      key: 'items',
      icon: 'utensils',
      tone: 'amber',
      value: fmtNumber(items, locale),
      label: t('customer_menu_items'),
    },
    open !== null
      ? {
          key: 'status',
          icon: 'clock',
          tone: open ? 'mint' : 'rose',
          value: open ? t('dash_open_now') : t('dash_closed_now'),
          label: typeLabel || t('settings_business_type'),
        }
      : typeLabel
        ? {
            key: 'type',
            icon: 'store',
            tone: 'mint',
            value: typeLabel,
            label: t('settings_business_type'),
          }
        : null,
  ].filter(Boolean);

  return (
    <div className={`cui-summary ${open === false ? 'is-closed' : ''}`}>
      {tiles.map((tile) => (
        <div className={`cui-summary__item cui-summary__item--${tile.tone}`} key={tile.key}>
          <span className="cui-summary__icon">
            <Icon name={tile.icon} size={17} />
          </span>
          <span className="cui-summary__value">{tile.value}</span>
          <span className="cui-summary__label">{tile.label}</span>
        </div>
      ))}
    </div>
  );
}
