import { useSectionHeader } from './useSectionHeader';
import './sectionHeader.css';

/*
 * The decorative picture + readability scrim of a header. Drop it as the first
 * child of any header surface (the host gets `isolation: isolate`, see the
 * stylesheet); it never carries text and never takes pointer events.
 *
 * ONE layer: `art` is the picture itself, stretched across the whole header
 * box (100% x 100%, see the stylesheet) so the complete artwork fills the
 * header edge to edge at every size — never cropped, never letterboxed, and
 * with no blurred margin copy behind it to expose a seam.
 *
 * It paints the section's own file over its fallback (a second
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
      <span className="sh-bg__art" />
    </span>
  );
}
