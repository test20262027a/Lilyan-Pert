import Icon from '../Icon';
import '../../customerSections.css';

/*
 * One section header for every card of the customer ordering panel — Featured
 * products, Best sellers, Advertisement, Working hours, About and Contact.
 *
 * Three clearly separated zones keep the bar easy to scan: the 3D colour tile,
 * the title (with an optional one-line subtitle), and a trailing aside that
 * holds the item count or a state pill. `tone` gives each section its own
 * colour family — the tile gradient, the bar wash, the rule and the count pill
 * all follow it — so the sections are distinguishable at a glance while every
 * header keeps the same geometry, gap and aside slot in both directions.
 */
export default function CustomerSectionHead({
  icon,
  tone = 'mint',
  title,
  titleId,
  count,
  subtitle,
  className = '',
  children,
}) {
  const hasCount = count !== undefined && count !== null;

  return (
    <header className={`cui-sect cui-sect--${tone} ${className}`.trim()}>
      <span className="cui-sect__icon" aria-hidden="true">
        <Icon name={icon} size={20} />
      </span>

      <div className="cui-sect__text">
        <h2 className="cui-sect__title" id={titleId}>
          {title}
        </h2>
        {subtitle ? <p className="cui-sect__sub">{subtitle}</p> : null}
      </div>

      {hasCount || children ? (
        <span className="cui-sect__aside">
          {hasCount ? <span className="cui-count">{count}</span> : null}
          {children}
        </span>
      ) : null}
    </header>
  );
}
