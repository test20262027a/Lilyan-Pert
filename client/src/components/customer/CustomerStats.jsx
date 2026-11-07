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
  /* The bar itself is a Menu Settings feature (main menu and QR menu each carry
     their own switch); this component only draws its three cells. The closed
     tint stays so a paused menu still reads at a glance. */
  const closed = Boolean(hours?.valid && !hours.is_open);

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
    {
      key: 'type',
      icon: 'store',
      tone: 'mint',
      text: true,
      value: typeLabel,
      label: t('settings_business_type'),
    },
  ];

  return (
    <div className={`cui-summary ${closed ? 'is-closed' : ''}`}>
      {tiles.map((tile) => (
        <div
          className={`cui-summary__item cui-summary__item--${tile.tone} ${tile.text ? 'cui-summary__item--text' : ''}`.trim()}
          key={tile.key}
        >
          <span className="cui-summary__icon">
            <Icon name={tile.icon} size={17} />
          </span>
          <span className="cui-summary__value">{tile.value}</span>
          {tile.label ? <span className="cui-summary__label">{tile.label}</span> : null}
        </div>
      ))}
    </div>
  );
}
