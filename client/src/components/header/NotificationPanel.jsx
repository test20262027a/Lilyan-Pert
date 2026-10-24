import { useState } from 'react';
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

/** Title + description of one notification, in the reader's language. */
function describe(item, t) {
  const category = categoryOf(item.type);

  // An order status change: order number, previous → new status, and who did it.
  if (item.type === 'status_change') {
    const number = item.order_number ? `#${item.order_number}` : item.title || '';
    const [from = '', to = ''] = String(item.body || '').split('>');
    const label = (status) => (status ? t(STATUS_KEYS[status] || `status_${status}`) : '');
    const move = [label(from), label(to)].filter(Boolean).join(' → ');
    return {
      title: [t('notif_order_status'), number].filter(Boolean).join(' · '),
      description: [move, item.actor_name].filter(Boolean).join(' · '),
    };
  }

  if (category === 'orders') {
    const number = item.order_number ? `#${item.order_number}` : '';
    return {
      title: [t('notif_order_new'), number].filter(Boolean).join(' · '),
      description: item.body || '',
    };
  }

  if (category === 'reviews') {
    return {
      title: [t('notif_review_new'), item.title].filter(Boolean).join(' · '),
      description: item.body || '',
    };
  }

  const [entity = '', action = ''] = String(item.body || '').split(':');
  const entityLabel = ENTITY_KEYS[entity] ? t(ENTITY_KEYS[entity]) : entity;
  const actionLabel = action ? t(`act_action_${action}`) : '';
  return {
    title: [entityLabel, actionLabel].filter(Boolean).join(' · '),
    description: item.title || '',
  };
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
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState('all');

  const visible =
    tab === 'all' ? items : tab === 'unread' ? items.filter((i) => !i.read_at) : lists[tab] || [];
  const time = (value) => relativeTime(value, locale, (d) => fmtDateTime(d, locale, timeZone));

  return (
    <div className="notif-panel" role="dialog" aria-label={t('dash_notifications')}>
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
            const { title, description } = describe(item, t);
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
                  <span className="notif-item__title">{title}</span>
                  {description ? <span className="notif-item__desc">{description}</span> : null}
                  <span className="notif-item__time">{time(item.created_at)}</span>
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
