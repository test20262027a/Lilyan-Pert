import Icon from '../Icon';
import { useI18n } from '../../i18n';
import CategoryIdentityIcon from './CategoryIdentityIcon';

/*
 * The single wide header card above the product grid: the selected category on
 * one side (its own icon and accent, bold name, supporting line) and the three
 * compact product counters on the other.
 *
 * The counters are one fixed three-column row — they never wrap and never stack,
 * because "Total / Active / Inactive" only reads correctly side by side. On
 * narrow screens the labels switch to their short localized form while the
 * numbers stay whole and fully visible.
 */
export default function CategorySummary({ icon, color, title, subtitle, stats }) {
  const { t } = useI18n();

  const counters = [
    ['total', 'layers', stats.total, 'menu_total_products', 'menu_total_products_short'],
    ['active', 'checkCircle', stats.active, 'menu_active_products', 'menu_active_products_short'],
    ['inactive', 'xCircle', stats.inactive, 'menu_inactive_products', 'menu_inactive_products_short'],
  ];

  return (
    <header className="msummary">
      <div className="msummary__identity">
        <CategoryIdentityIcon icon={icon} color={color} size={46} variant="raised" />
        <div className="msummary__text">
          <div className="msummary__title">{title}</div>
          <div className="msummary__sub">{subtitle}</div>
        </div>
      </div>

      <div className="msummary__stats">
        {counters.map(([kind, glyph, value, longKey, shortKey]) => (
          <span key={kind} className={`mpill mpill--${kind}`}>
            <Icon name={glyph} size={13} className="mpill__icon" />
            <span className="mpill__num">{value}</span>
            <span className="mpill__label mpill__label--full">{t(longKey)}</span>
            <span className="mpill__label mpill__label--short">{t(shortKey)}</span>
          </span>
        ))}
      </div>
    </header>
  );
}
