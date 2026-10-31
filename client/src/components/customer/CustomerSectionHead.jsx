import Icon from '../Icon';
import '../../customerSections.css';

/*
 * One section header for every card of the customer ordering panel — Featured
 * products, Best sellers, Advertisement, Working hours, About and Contact.
 *
 * It keeps a single short title: no descriptive sentence ever sits under it, so
 * the header always reads as one line. `tone` gives each section its own color
 * family (the tile's gradient plus a matching wash on the bar), which makes the
 * sections distinguishable at a glance while every header keeps the same
 * geometry — the same tile size, gap and trailing badge slot, so the icon stays
 * centred against its title in both directions.
 */
export default function CustomerSectionHead({
  icon,
  tone = 'mint',
  title,
  titleId,
  count,
  className = '',
  children,
}) {
  return (
    <header className={`cui-sect cui-sect--${tone} ${className}`.trim()}>
      <span className="cui-sect__icon" aria-hidden="true">
        <Icon name={icon} size={19} />
      </span>
      <h2 className="cui-sect__title" id={titleId}>
        {title}
      </h2>
      {count === undefined || count === null ? null : <span className="cui-count">{count}</span>}
      {children}
    </header>
  );
}
