import Icon from '../Icon';
import OrdersArtwork from './OrdersArtwork';

/*
 * The Orders page hero. Three independent layers:
 *
 *   1. the artwork (decorative, `aria-hidden`, never carries UI text),
 *   2. the section identity — icon container, page title and the selected date,
 *   3. the control cluster (date navigation, actions).
 *
 * The artwork is the only swappable part: pass a different node as `art` — or
 * replace OrdersArtwork — when the official banner image arrives. The title,
 * the date and the controls keep their positions either way, because the
 * picture only ever fills the flexible middle column.
 */
export default function OrdersBanner({ icon = 'cart', title, subtitle, art, children }) {
  return (
    <section className="obanner">
      <div className="obanner__identity">
        <span className="obanner__icon">
          <Icon name={icon} size={22} />
        </span>
        <div className="obanner__text">
          <h1 className="obanner__title">{title}</h1>
          {subtitle ? <div className="obanner__sub">{subtitle}</div> : null}
        </div>
      </div>

      <div className="obanner__art" aria-hidden="true">
        {art || <OrdersArtwork />}
      </div>

      <div className="obanner__controls">{children}</div>
    </section>
  );
}
