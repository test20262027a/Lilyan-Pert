import Icon from '../Icon';
import './sectionCardHeader.css';

/*
 * The header band of a section card.
 *
 * One shared shape for every section of the account screens: a raised semantic
 * icon tile, the localized title (with an optional subtitle) and an optional
 * control slot at the inline end. The band is drawn INSIDE the card it heads —
 * it inherits the card's own top corners and squares off at the seam below — so
 * header and body always read as one plate, never as two stacked boxes.
 *
 * `tone` carries the meaning from the existing semantic palette: `info` (blue),
 * `success` (green), `danger` (red) and `amber` (secondary management). The
 * whole row follows the document direction, so in RTL the icon starts at the
 * right edge exactly as it starts at the left edge in LTR.
 */
export default function SectionCardHeader({ icon, title, subtitle, tone = 'info', aside }) {
  return (
    <header className={`sch sch--${tone}`}>
      {icon ? (
        <span className="sch__icon" aria-hidden="true">
          <Icon name={icon} size={16} />
        </span>
      ) : null}
      <span className="sch__text">
        <h3 className="sch__title">{title}</h3>
        {subtitle ? <p className="sch__subtitle">{subtitle}</p> : null}
      </span>
      {aside ? <span className="sch__aside">{aside}</span> : null}
    </header>
  );
}
