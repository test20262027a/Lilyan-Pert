import { NavLink } from 'react-router-dom';
import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { canSee } from '../nav/navConfig';

/*
 * The navigation tree itself. Direct destinations are real links; an expandable
 * group is a real button with aria-expanded, so clicking a group toggle can
 * never navigate away. Labels come from the dictionaries, so switching language
 * re-renders the whole tree.
 */
export default function SidebarNav({
  items,
  roles,
  currentKey,
  collapsed,
  openGroups,
  onToggleGroup,
  previewHref,
  onNavigate,
}) {
  const { t } = useI18n();

  return items
    .filter((item) => canSee(item, roles))
    .map((item) => {
      // The customer menu is a public page of this business — opened in its own tab.
      if (item.preview) {
        return (
          <a
            key={item.key}
            className="nav-link"
            href={previewHref || '#'}
            target="_blank"
            rel="noreferrer"
            title={t(item.key)}
            onClick={(e) => {
              if (!previewHref) e.preventDefault();
              onNavigate();
            }}
          >
            <Icon name={item.icon} size={18} />
            <span>{t(item.key)}</span>
          </a>
        );
      }

      if (!item.children) {
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
            title={t(item.key)}
            onClick={onNavigate}
          >
            <Icon name={item.icon} size={18} />
            <span>{t(item.key)}</span>
          </NavLink>
        );
      }

      const children = item.children.filter((child) => canSee(child, roles));
      const isOpen = Boolean(openGroups[item.key]);
      const isCurrent = children.some((child) => child.key === currentKey);

      return (
        <div key={item.key}>
          <button
            type="button"
            className={`nav-link nav-group ${isOpen ? 'is-open' : ''} ${isCurrent ? 'is-current' : ''}`}
            aria-expanded={isOpen}
            title={t(item.key)}
            onClick={() => onToggleGroup(item)}
          >
            <Icon name={item.icon} size={18} />
            <span>{t(item.key)}</span>
            <Icon name="chevronDown" size={14} className={`nav-group__caret ${isOpen ? 'is-open' : ''}`} />
          </button>
          {isOpen && !collapsed ? (
            <div className="nav-children">
              {children.map((child) => (
                <NavLink
                  key={child.to}
                  to={child.to}
                  className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
                  title={t(child.key)}
                  onClick={onNavigate}
                >
                  {/* Submenu rows carry their own small outlined mark. */}
                  <Icon name={child.icon} size={16} className="nav-child-icon" />
                  <span>{t(child.key)}</span>
                  {child.danger ? <span className="nav-danger" aria-hidden="true" /> : null}
                </NavLink>
              ))}
            </div>
          ) : null}
        </div>
      );
    });
}
