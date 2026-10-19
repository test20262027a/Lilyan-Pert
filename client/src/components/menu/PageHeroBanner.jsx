import Icon from '../Icon';
import MenuArtwork from './MenuArtwork';

/*
 * The reusable page hero used above every management section.
 *
 * Three independent layers:
 *   1. the artwork — decorative, `aria-hidden`, never carries UI text,
 *   2. the section identity — icon container, page title, subtitle,
 *   3. the control cluster (optional children).
 *
 * The picture is the only swappable part: pass `image` (a final header picture)
 * or a different `art` node and nothing else on the page moves, because the
 * artwork only ever fills the flexible middle column. Titles and controls stay
 * separate from the decorative image.
 */
export default function PageHeroBanner({ icon, title, subtitle, art, image, imageAlt = '', children }) {
  return (
    <section className="mhero">
      <div className="mhero__identity">
        <span className="mhero__icon">
          <Icon name={icon} size={24} />
        </span>
        <div className="mhero__text">
          <h1 className="mhero__title">{title}</h1>
          {subtitle ? <p className="mhero__sub">{subtitle}</p> : null}
        </div>
      </div>

      <div className="mhero__art" aria-hidden="true">
        {image ? <img className="mhero__image" src={image} alt={imageAlt} /> : art || <MenuArtwork />}
      </div>

      {children ? <div className="mhero__controls">{children}</div> : null}
    </section>
  );
}
