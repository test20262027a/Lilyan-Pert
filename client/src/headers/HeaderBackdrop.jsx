import { useSectionHeader } from './useSectionHeader';
import './sectionHeader.css';

/*
 * The decorative picture + readability scrim of a header. Drop it as the first
 * child of any header surface (the host gets `isolation: isolate`, see the
 * stylesheet); it never carries text and never takes pointer events.
 *
 * Two layers of the same picture: `wash` is a blurred full-bleed copy that
 * colours the header's edges, and `art` is the picture itself, painted across
 * the whole header box (100% x 100%, see the stylesheet) so no part of the
 * artwork is ever cropped.
 *
 * Both layers paint the section's own file over its fallback (a second
 * `background-image` entry). A picture that is not in /public/headers yet is
 * simply not painted, so the fallback underneath shows instead — no fetch
 * error, no flash, no blank header.
 */
export default function HeaderBackdrop({ section, className = '' }) {
  const { image, fallback } = useSectionHeader(section);
  const style = { '--sh-img': `url(${image})` };
  if (fallback && fallback !== image) style['--sh-alt'] = `url(${fallback})`;
  return (
    <span className={`sh-bg ${className}`.trim()} style={style} aria-hidden="true">
      <span className="sh-bg__wash" />
      <span className="sh-bg__art" />
    </span>
  );
}
