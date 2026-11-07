import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../Icon';
import { useToast } from '../ui';
import { useI18n } from '../../i18n';
import { fmtDigits } from '../../format';
import { useBusiness } from '../../context/BusinessContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import { compactCount, priorityOf } from '../../notifications';
import NotificationPanel from './NotificationPanel';

/*
 * Bell + panel.
 *
 * The feed itself lives in NotificationsProvider at the application root, so
 * this component only renders what that one listener already loaded — the
 * badge and the panel can never disagree, and an order that arrives while the
 * administrator is on another page updates this bell without a remount.
 *
 * The badge and the bell button behind it both take ONE colour, chosen by
 * priority — green while new orders are unread, gold once only reviews are,
 * coral once only activity is. Nothing is shown once everything has been read.
 */
export default function NotificationBell() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const { business } = useBusiness();
  const { can } = useAuth();
  const { items, lists, unread, loading, failed, refresh, markAll, markRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const priority = useMemo(() => priorityOf(unread), [unread]);
  // 99+ is three characters wide; it gets a tighter figure so the circle holds.
  const count = compactCount(priority.total);

  // Opening the panel reads the newest rows, so a notification created while
  // this tab was in the background is here the moment it is looked at.
  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const markAllRead = async () => {
    try {
      await markAll();
    } catch {
      toast.error(t('error_generic'));
    }
  };

  /** Follows the same permission the target route enforces. */
  const canOpen = (item) => {
    if (item.type === 'review') return can('reviews.view');
    if (item.type === 'activity') return can('activity.view');
    // A status change belongs to the order it changed.
    return can('orders.view');
  };

  const openItem = async (item, allowed) => {
    setOpen(false);
    if (!item.read_at) {
      try {
        await markRead(item.id);
      } catch {
        /* the row stays unread, which is the honest state */
      }
    }
    if (!allowed) {
      toast.error(t('notif_no_access'));
      return;
    }
    if (item.type === 'review') navigate('/reviews');
    else if (item.type === 'activity') navigate('/activity');
    // The order opens in the details modal on the orders list.
    else if (item.order_id) navigate(`/orders?order=${item.order_id}`);
    else navigate('/orders');
  };

  return (
    <span className="hdr-bell" ref={wrapRef}>
      <button
        type="button"
        className={`hdr-btn hdr-bell__btn ${priority.tone !== 'none' ? `is-alert is-${priority.tone}` : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={
          priority.total
            ? `${t('dash_notifications')} (${priority.total})`
            : t('dash_notifications')
        }
        title={t('dash_notifications')}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="bell" size={18} />
        {priority.total > 0 ? (
          <span
            className={`hdr-bell__badge hdr-bell__badge--${priority.tone} ${
              count.length > 2 ? 'hdr-bell__badge--compact' : ''
            }`}
            aria-hidden="true"
          >
            {fmtDigits(count, locale)}
          </span>
        ) : null}
      </button>

      {open ? (
        <NotificationPanel
          items={items}
          lists={lists}
          unread={unread}
          loading={loading}
          failed={failed}
          canOpen={canOpen}
          onOpenItem={openItem}
          onMarkAll={markAllRead}
          locale={locale}
          timeZone={business?.timezone}
          anchorRef={wrapRef}
        />
      ) : null}
    </span>
  );
}
