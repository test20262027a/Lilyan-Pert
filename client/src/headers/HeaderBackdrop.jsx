import { useSectionHeader } from './useSectionHeader';
import './sectionHeader.css';

/*
 * The decorative picture + readability scrim of a header. Drop it as the first
 * child of any header surface (the host gets `isolation: isolate`, see the
 * stylesheet); it never carries text and never takes pointer events.
 */
export default function HeaderBackdrop({ section, className = '' }) {
  const { image } = useSectionHeader(section);
  return <span className={`sh-bg ${className}`.trim()} style={{ '--sh-img': `url(${image})` }} aria-hidden="true" />;
}
