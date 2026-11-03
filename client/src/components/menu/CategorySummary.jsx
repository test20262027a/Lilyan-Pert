import Icon from '../Icon';
import { useI18n } from '../../i18n';
import CategoryIdentityIcon from './CategoryIdentityIcon';
import StatLabel from './StatLabel';
import { fmtNumber } from '../../format';

/*
 * The single wide header card above the product grid: the selected category on
 * one side (its own icon and accent, bold name, supporting line) and the three
 * compact product counters on the other.
 *
 * The counters are one fixed three-column row — they never wrap and never stack,
 * because "Total / Active / Inactive" only reads correctly side by side. Each
 * counter puts its icon and figure on one line and its title on the next, so the
 * title gets the card's whole width: complete titles on a roomy card, their
 * concise forms in a narrow one and the shortest forms on phones — always
 * whole, never cut with an ellipsis.
 */
export default function CategorySummary({ icon, color, title, subtitle, stats }) {
  const { t, locale } = useI18n();

  const counters = [
    {
      kind: 'total',
      glyph: 'layers',
      value: stats.total,
      fullKey: 'menu_total_products',
      compactKey: 'menu_total_products_compact',
      shortKey: 'menu_total_products_short',
    },
    {
      kind: 'active',
      glyph: 'checkCircle',
      value: stats.active,
      fullKey: 'menu_active_products',
      compactKey: 'menu_active_products_compact',
      shortKey: 'menu_active_products_short',
    },
    {
      kind: 'inactive',
      glyph: 'xCircle',
      value: stats.inactive,
      fullKey: 'menu_inactive_products',
      compactKey: 'menu_inactive_products_compact',
      shortKey: 'menu_inactive_products_short',
    },
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
        {counters.map(({ kind, glyph, value, fullKey, compactKey, shortKey }) => (
          <span key={kind} className={`mpill mpill--${kind}`}>
            <span className="mpill__top">
              <Icon name={glyph} size={13} className="mpill__icon" />
              <span className="mpill__num">{fmtNumber(value, locale)}</span>
            </span>
            <StatLabel fullKey={fullKey} compactKey={compactKey} shortKey={shortKey} />
          </span>
        ))}
      </div>
    </header>
  );
}
