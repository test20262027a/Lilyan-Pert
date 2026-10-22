import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { fmtNumber } from '../../format';

/*
 * The three-figure summary strip under the search field. Every value is real:
 * the number of categories and sellable items the API just sent, and the
 * business type the owner stored. Nothing is shown when the owner left it empty.
 */
export default function CustomerStats({ categories, items, typeLabel }) {
  const { t, locale } = useI18n();

  const tiles = [
    { key: 'categories', icon: 'layers', tone: 'blue', value: fmtNumber(categories, locale), label: t('customer_menu_categories') },
    { key: 'items', icon: 'coffee', tone: 'mint', value: fmtNumber(items, locale), label: t('customer_menu_items') },
    typeLabel
      ? { key: 'type', icon: 'store', tone: 'amber', value: typeLabel, label: t('settings_business_type') }
      : null,
  ].filter(Boolean);

  return (
    <div className={`cui-stats ${tiles.length === 2 ? 'is-two' : ''}`}>
      {tiles.map((tile) => (
        <div className={`cui-stat cui-stat--${tile.tone}`} key={tile.key}>
          <span className="cui-stat__icon">
            <Icon name={tile.icon} size={17} />
          </span>
          <span className="cui-stat__value">{tile.value}</span>
          <span className="cui-stat__label">{tile.label}</span>
        </div>
      ))}
    </div>
  );
}
