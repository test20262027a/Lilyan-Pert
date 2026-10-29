import { useLayoutEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import { Spinner } from '../ui';
import { useI18n } from '../../i18n';
import { fmtDateTime } from '../../format';
import { CATEGORY_TABS, categoryOf, compactCount, relativeTime } from '../../notifications';
import { ENTITY_KEYS } from '../activity/activityMeta';

/*
 * Notification panel anchored to the header bell.
 *
 * Every row is a real notification row from the backend feed; tabs only filter
 * what is already loaded and never change a stored category or read state.
 * Clicking a row marks that one notification read and then follows the same
 * route check as the sidebar — a notification never grants access the member
 * does not already have.
 *
 * Width is content-aware: the panel measures itself against its own text
 * (long Kurdish / Persian / Arabic names, three-digit counts, long order
 * numbers) and is then clamped to the viewport — never a second fixed width.
 * Placement is measured too, so the panel flips above the bell and slides
 * inside the viewport instead of being clipped by it.
 */

const TONE_ICON = {
  orders: { icon: 'receipt', tone: 'purple' },
  reviews: { icon: 'star', tone: 'gold' },
  activities: { icon: 'info', tone: 'red' },
};

/** A status transition reads better with the status glyph than a generic one. */
const iconOf = (item) => (item.type === 'status_change' ? 'refresh' : TONE_ICON[categoryOf(item.type)].icon);

const STATUS_KEYS = {
  pending: 'status_pending',
  preparing: 'status_preparing',
  ready: 'status_ready',
  completed: 'status_completed',
  cancelled: 'status_cancelled',
};

/** The stored order number, as a chip that stays left-to-right in every language. */
const numberOf = (item) => {
  if (item.order_number) return `#${item.order_number}`;
  return /^#\d+/.exec(item.title || '')?.[0] || '';
};

/** Title, badges and description of one notification, in the reader's language. */
function describe(item, t) {
  const category = categoryOf(item.type);
  const number = numberOf(item);

  // An order status change: order number, previous → new status, and who did it.
  if (item.type === 'status_change') {
    const [from = '', to = ''] = String(item.body || '').split('>');
    const label = (status) => (status ? t(STATUS_KEYS[status] || `status_${status}`) : '');
    const move = [label(from), label(to)].filter(Boolean).join(' → ');
    return {
      title: t('notif_order_status'),
      number,
      status: label(to),
      description: [move, item.actor_name].filter(Boolean).join(' · '),
    };
  }

  if (category === 'orders') {
    return {
      title: t('notif_order_new'),
      number,
      // The stored body is the table or the customer the order came from.
      customer: item.body || '',
    };
  }

  if (category === 'reviews') {
    return {
      title: t('notif_review_new'),
      number,
      description: [item.title, item.body].filter(Boolean).join(' · '),
    };
  }

  const [entity = '', action = ''] = String(item.body || '').split(':');
  const entityLabel = ENTITY_KEYS[entity] ? t(ENTITY_KEYS[entity]) : entity;
  const actionLabel = action ? t(`act_action_${action}`) : '';
  return {
    title: [entityLabel, actionLabel].filter(Boolean).join(' · '),
    number,
    description: item.title || '',
  };
}

/**
 * Keeps the panel fully visible: it slides horizontally inside the viewport,
 * opens above the bell when there is no room below, and caps its height to the
 * space that is actually left. The list scrolls inside; header and tabs never
 * scroll away.
 */
function usePanelPlacement(anchorRef, deps) {
  const panelRef = useRef(null);
  const [box, setBox] = useState(null);

  useLayoutEffect(() => {
    const anchorEl = anchorRef?.current?.querySelector('button') || anchorRef?.current;
    if (!anchorEl) return undefined;
    const panel = panelRef.current;
    let width = 0;

    const place = () => {
      const el = panelRef.current;
      if (!el) return;
      const rect = anchorEl.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const margin = vw <= 640 ? 10 : 16;
      const gap = 10;

      // Clamp horizontally against the real panel width, so a long notification
      // can never push the panel past either edge.
      const w = el.offsetWidth || width;
      const rtl = getComputedStyle(document.documentElement).direction === 'rtl';
      const preferred = rtl ? rect.left : rect.right - w;
      const left = Math.min(Math.max(preferred, margin), Math.max(margin, vw - w - margin));

      const below = vh - rect.bottom - gap - margin;
      const above = rect.top - gap - margin;
      const openUp = below < 300 && above > below;
      const maxHeight = Math.max(180, Math.floor(openUp ? above : below));

      setBox(
        openUp
          ? { left, top: 'auto', bottom: Math.round(vh - rect.top + gap), maxHeight }
          : { left, top: Math.round(rect.bottom + gap), bottom: 'auto', maxHeight },
      );
      width = w;
    };

    place();
    // Only a width change can invalidate the placement; reacting to height
    // changes would fight the max-height this hook applies itself.
    const observer = new ResizeObserver(() => {
      if (panel && panel.offsetWidth !== width) place();
    });
    if (panel) observer.observe(panel);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorRef, ...deps]);

  return [panelRef, box];
}

export default function NotificationPanel({
  items,
  lists,
  unread,
  loading,
  failed,
  canOpen,
  onOpenItem,
  onMarkAll,
  locale,
  timeZone,
  anchorRef,
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState('all');

  const visible =
    tab === 'all' ? items : tab === 'unread' ? items.filter((i) => !i.read_at) : lists[tab] || [];
  const time = (value) => relativeTime(value, locale, (d) => fmtDateTime(d, locale, timeZone));
  const [panelRef, box] = usePanelPlacement(anchorRef, [tab, visible.length, locale]);

  return (
    <div
      ref={panelRef}
      className="notif-panel"
      role="dialog"
      aria-label={t('dash_notifications')}
      style={
        box
          ? { left: box.left, top: box.top, bottom: box.bottom, maxHeight: box.maxHeight }
          : { visibility: 'hidden', left: 0, top: 0 }
      }
    >
      <div className="notif-panel__head">
        <span className="notif-panel__title">
          <span className="notif-panel__title-icon" aria-hidden="true">
            <Icon name="bell" size={15} />
          </span>
          {t('dash_notifications')}
        </span>
        <button
          type="button"
          className="notif-panel__markall"
          onClick={onMarkAll}
          disabled={!unread.total}
        >
          {t('notif_mark_all')}
        </button>
      </div>

      <div className="notif-panel__tabs" role="tablist" aria-label={t('dash_notifications')}>
        {CATEGORY_TABS.map((key) => {
          const count = key === 'all' || key === 'unread' ? unread.total : unread[key] || 0;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={`notif-tab ${tab === key ? 'is-active' : ''}`}
              onClick={() => setTab(key)}
            >
              <span className="notif-tab__label">{t(`notif_tab_${key}`)}</span>
              {count > 0 ? <span className="notif-tab__count">{compactCount(count)}</span> : null}
            </button>
          );
        })}
      </div>

      <div className="notif-panel__list">
        {failed ? (
          <div className="notif-empty">
            <span className="notif-empty__icon notif-empty__icon--error" aria-hidden="true">
              <Icon name="alert" size={26} />
            </span>
            <p className="notif-empty__text">{t('notif_load_failed')}</p>
          </div>
        ) : loading && visible.length === 0 ? (
          <div className="notif-empty">
            <Spinner size={22} />
          </div>
        ) : visible.length === 0 ? (
          <div className="notif-empty">
            <span className="notif-empty__icon" aria-hidden="true">
              <Icon name="bell" size={30} />
            </span>
            <p className="notif-empty__text">{t(`notif_empty_${tab}`)}</p>
          </div>
        ) : (
          visible.map((item) => {
            const category = categoryOf(item.type);
            const visual = { ...TONE_ICON[category], icon: iconOf(item) };
            const { title, number, status, customer, description } = describe(item, t);
            const allowed = canOpen(item);
            return (
              <button
                key={item.id}
                type="button"
                className={`notif-item notif-item--${visual.tone} ${item.read_at ? '' : 'is-unread'}`}
                onClick={() => onOpenItem(item, allowed)}
                title={allowed ? undefined : t('notif_no_access')}
              >
                <span className="notif-item__icon" aria-hidden="true">
                  <Icon name={visual.icon} size={16} />
                </span>
                <span className="notif-item__body">
                  <span className="notif-item__title">
                    <span className="notif-item__title-text">{title}</span>
                    {number ? (
                      // An order number is left-to-right in every language, so
                      // its digits and # keep their order inside RTL text.
                      <span className="notif-item__chip notif-item__chip--num" dir="ltr">
                        {number}
                      </span>
                    ) : null}
                  </span>
                  {status ? (
                    <span className="notif-item__chips">
                      <span className="notif-item__chip notif-item__chip--status">{status}</span>
                    </span>
                  ) : null}
                  {customer ? <span className="notif-item__desc">{customer}</span> : null}
                  {description ? <span className="notif-item__desc">{description}</span> : null}
                  <span className="notif-item__time">
                    <span>{time(item.created_at)}</span>
                    <span className="notif-item__sep" aria-hidden="true">·</span>
                    <bdi>{fmtDateTime(item.created_at, locale, timeZone)}</bdi>
                  </span>
                </span>
                {item.read_at ? null : <span className="notif-item__dot" aria-hidden="true" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
