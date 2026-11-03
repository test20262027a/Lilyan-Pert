import { Fragment, useCallback, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { canSee } from '../nav/navConfig';
import { isStandalone } from '../../pwa';

/*
 * The navigation tree itself. Direct destinations are real links; an expandable
 * group is a real button with aria-expanded, so clicking a group toggle can
 * never navigate away. Labels come from the dictionaries, so switching language
 * re-renders the whole tree.
 *
 * On the collapsed icon rail there is no room for submenu rows, so a group
 * opens a compact flyout beside the rail instead — its destinations stay
 * reachable, keyboard included, and the rail itself never has to expand.
 *
 * Tooltips follow the rail's real state, not a CSS trick: only the icon-only
 * rail marks a row with `data-tip`, so the global TooltipLayer has nothing to
 * show while the labels are visible. Expanded rows carry no `title` either —
 * their own label is already on screen, and a second floating copy of it is
 * exactly the duplicate the tooltip layer would otherwise paint.
 */
export default function SidebarNav({
  items,
  roles,
  currentKey,
  collapsed,
  expandedGroup,
  onToggleGroup,
  previewHref,
  onNavigate,
}) {
  const { t } = useI18n();
  const [flyout, setFlyout] = useState(null);

  const closeFlyout = useCallback(() => setFlyout(null), []);
  const navigate = (event) => {
    closeFlyout();
    onNavigate?.(event);
  };

  // Escape and a click anywhere outside the flyout dismiss it without
  // navigating; the rail keeps the page the member is already on.
  useEffect(() => {
    if (!flyout) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeFlyout();
    };
    const onPointerDown = (event) => {
      if (!event.target.closest?.('.nav-item--group')) closeFlyout();
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [flyout, closeFlyout]);

  // Leaving the collapsed rail (or the page) closes an open flyout.
  useEffect(() => {
    if (!collapsed) closeFlyout();
  }, [collapsed, closeFlyout]);
  useEffect(() => closeFlyout(), [currentKey, closeFlyout]);

  const visible = items.filter((item) => canSee(item, roles));
  // The rail's three direct destinations (dashboard, orders, customer menu) sit
  // above the management block, which begins with the first expandable section.
  // That boundary is where the divider is drawn — derived from the tree itself,
  // so it follows every role/permission filter without hardcoding an index.
  const sectionsStart = visible.findIndex((item) => item.children);

  return visible.map((item, index) => {
    // The customer menu is a public page of this business — opened in its own
    // tab from a browser. Inside the installed app a new tab would leave the
    // standalone window and show a browser address bar, so there it opens in
    // the app itself (the customer panel carries a Back to Admin control).
    if (item.preview) {
      return (
        <a
          key={item.key}
          className="nav-link"
          href={previewHref || '#'}
          target={isStandalone() ? undefined : '_blank'}
          rel="noreferrer"
          data-tip={collapsed ? t(item.key) : undefined}
          data-tip-side="inline-end"
          onClick={(e) => {
            if (!previewHref) e.preventDefault();
            navigate(e);
          }}
        >
          <Icon name={item.icon} size={18} />
          <span className="nav-link__label">{t(item.key)}</span>
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
          data-tip={collapsed ? t(item.key) : undefined}
          data-tip-side="inline-end"
          onClick={navigate}
        >
          <Icon name={item.icon} size={18} />
          <span className="nav-link__label">{t(item.key)}</span>
        </NavLink>
      );
    }

    const children = item.children.filter((child) => canSee(child, roles));
    const isOpen = !collapsed && expandedGroup === item.key;
    const isFlyout = collapsed && flyout === item.key;
    const isCurrent = children.some((child) => child.key === currentKey);
    const panelId = `nav-panel-${item.key}`;
    // The first expandable section closes the three primary destinations
    // above it: a 1px raised, glowing rule (with a small centre diamond)
    // marks the boundary without adding a section heading.
    const startsSections = index === sectionsStart && index > 0;

    return (
      <Fragment key={item.key}>
        {startsSections ? (
          <span className="nav-divider" role="separator" aria-hidden="true">
            <span className="nav-divider__gem" />
          </span>
        ) : null}
        <div className="nav-item nav-item--group">
          <button
            type="button"
            className={`nav-link nav-group ${isOpen ? 'is-open' : ''} ${isCurrent ? 'is-current' : ''} ${
              isFlyout ? 'is-flyout' : ''
            }`}
            aria-expanded={collapsed ? isFlyout : isOpen}
            aria-controls={isOpen || isFlyout ? panelId : undefined}
            data-tip={collapsed && !isFlyout ? t(item.key) : undefined}
            data-tip-side="inline-end"
            onClick={() => {
              if (collapsed) {
                setFlyout((current) => (current === item.key ? null : item.key));
                return;
              }
              onToggleGroup(item);
            }}
          >
            <Icon name={item.icon} size={18} />
            <span className="nav-link__label">{t(item.key)}</span>
            <Icon name="chevronDown" size={14} className={`nav-group__caret ${isOpen ? 'is-open' : ''}`} />
          </button>

          {isOpen ? (
            <div className="nav-children" id={panelId}>
              {children.map((child) => (
                <NavLink
                  key={child.to}
                  to={child.to}
                  className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
                  onClick={navigate}
                >
                  {/* Submenu rows carry their own small outlined mark. */}
                  <Icon name={child.icon} size={16} className="nav-child-icon" />
                  <span className="nav-link__label">{t(child.key)}</span>
                  {child.danger ? <span className="nav-danger" aria-hidden="true" /> : null}
                </NavLink>
              ))}
            </div>
          ) : null}

          {/* Collapsed rail: the group's destinations in a flyout beside it. */}
          {isFlyout ? (
            <div className="nav-flyout" id={panelId} role="group" aria-label={t(item.key)}>
              <div className="nav-flyout__head">{t(item.key)}</div>
              {children.map((child) => (
                <NavLink
                  key={child.to}
                  to={child.to}
                  className={({ isActive }) => `nav-flyout__link ${isActive ? 'is-active' : ''}`}
                  onClick={navigate}
                >
                  <Icon name={child.icon} size={16} />
                  <span>{t(child.key)}</span>
                  {child.danger ? <span className="nav-danger" aria-hidden="true" /> : null}
                </NavLink>
              ))}
            </div>
          ) : null}
          </div>
        </Fragment>
      );
    });
}
