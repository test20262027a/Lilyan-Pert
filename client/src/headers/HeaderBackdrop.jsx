import { useSectionHeader } from './useSectionHeader';
import './sectionHeader.css';

/*
 * The decorative picture + readability scrim of a header. Drop it as the first
 * child of any header surface (the host gets `isolation: isolate`, see the
 * stylesheet); it never carries text and never takes pointer events.
 *
 * Two layers of the same picture: `wash` is a blurred full-bleed copy that
 * fills whatever the header's shape leaves over, and `art` is the picture
 * itself, sized by the host's fit rule (`--sh-fit`, see the stylesheet).
 *
 * Both layers paint the section's own file over its fallback (a second
 * `background-image` entry). A picture that is not in /public/headers yet is
 * simply not painted, so the fallback underneath shows instead — no fetch
 * error, no flash, no blank header.
 *
 * `fit` overrides the host default: 'cover' fills the surface (page banners and
 * modal heads), 'contain' keeps a whole composition (tall, narrow sheets).
 */
export default function HeaderBackdrop({ section, className = '', fit }) {
  const { image, fallback } = useSectionHeader(section);
  const style = { '--sh-img': `url(${image})` };
  if (fallback && fallback !== image) style['--sh-alt'] = `url(${fallback})`;
  if (fit) style['--sh-fit'] = fit;
  return (
    <span className={`sh-bg ${className}`.trim()} style={style} aria-hidden="true">
      <span className="sh-bg__wash" />
      <span className="sh-bg__art" />
    </span>
  );
}
