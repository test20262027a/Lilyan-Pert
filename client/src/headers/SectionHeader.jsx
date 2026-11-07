import Icon from '../components/Icon';
import HeaderBackdrop from './HeaderBackdrop';
import { useSectionHeader } from './useSectionHeader';
import './sectionHeader.css';

/*
 * The shared header for modals and drawers: section picture, glass icon tile,
 * title and subtitle. The close control is positioned by the dialog itself on
 * the opposite corner, and the inline padding reserves room for it.
 */
export default function SectionHeader({ section, icon, title, subtitle, titleId }) {
  const header = useSectionHeader(section);
  return (
    <header className="sh-head">
      <HeaderBackdrop section={section} />
      <span className="sh-head__icon" aria-hidden="true">
        <Icon name={icon || header.icon} size={20} />
      </span>
      <div className="sh-head__text">
        <div className="sh-head__title" id={titleId}>{title}</div>
        {subtitle ? <div className="sh-head__sub">{subtitle}</div> : null}
      </div>
    </header>
  );
}
