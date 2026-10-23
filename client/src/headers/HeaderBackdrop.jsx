import { useSectionHeader } from './useSectionHeader';
import './sectionHeader.css';

/*
 * The decorative picture + readability scrim of a header. Drop it as the first
 * child of any header surface (the host gets `isolation: isolate`, see the
 * stylesheet); it never carries text and never takes pointer events.
 *
 * Two layers of the same picture: `wash` is a blurred full-bleed copy that
 * fills whatever the header's shape leaves over, and `art` shows the complete
 * composition (never cropped) centred on top of it.
 */
export default function HeaderBackdrop({ section, className = '' }) {
  const { image } = useSectionHeader(section);
  return (
    <span className={`sh-bg ${className}`.trim()} style={{ '--sh-img': `url(${image})` }} aria-hidden="true">
      <span className="sh-bg__wash" />
      <span className="sh-bg__art" />
    </span>
  );
}
