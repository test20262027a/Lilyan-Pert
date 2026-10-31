import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../Icon';
import { useToast } from '../ui';
import { useI18n } from '../../i18n';
import { fmtDigits } from '../../format';
import { useBusiness } from '../../context/BusinessContext';
import { useAuth } from '../../context/AuthContext';
import { get, post } from '../../api';
import { playSound } from '../../sound';
import { compactCount, priorityOf } from '../../notifications';
import NotificationPanel from './NotificationPanel';

/*
 * Bell + panel. The list, the three unread counts and the alert sound all come
 * from the backend feed, so nothing here is faked client-side.
 *
 * The badge colour is derived, never chosen: purple while any order
 * notification is unread, gold once only reviews remain, red once only
 * activities remain, and no badge at all when everything has been read.
 */
const POLL_MS = 20000;
const EMPTY_COUNTS = { orders: 0, reviews: 0, activities: 0, total: 0 };

export default function NotificationBell() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const { business } = useBusiness();
  const { can } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [lists, setLists] = useState({ orders: [], reviews: [], activities: [] });
  const [unread, setUnread] = useState(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const seenRef = useRef(null);
  const wrapRef = useRef(null);
  const soundEnabled = business?.notification_settings?.sound_enabled !== false;
  const soundKey = business?.notification_settings?.sound_key;
  const soundVolume = business?.notification_settings?.sound_volume;
  const priority = useMemo(() => priorityOf(unread), [unread]);

  const load = useCallback(async () => {
    try {
      const data = await get('/manage/notifications');
      const list = data.notifications || [];
      setItems(list);
      setLists(data.lists || { orders: [], reviews: [], activities: [] });
      setUnread({ ...EMPTY_COUNTS, ...(data.unread || {}) });
      setFailed(false);

      // Only a newly created order alerts; status changes never make a sound.
      const newestOrder = (data.lists?.orders || []).find((n) => n.type === 'new_order');
      if (newestOrder) {
        if (seenRef.current === null) {
          seenRef.current = newestOrder.id; // first load establishes the baseline
        } else if (newestOrder.id !== seenRef.current) {
          seenRef.current = newestOrder.id;
          // One alert per genuinely new order, whatever the poll interval did.
          if (soundEnabled) playSound(soundKey, soundVolume);
          toast.success(`${t('dash_new_orders')} · ${newestOrder.title || ''}`.trim());
        }
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [soundEnabled, soundKey, soundVolume, t, toast]);

  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (!document.hidden) load();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  // Returning to the tab refreshes immediately instead of waiting for the poll.
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

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

  const markAll = async () => {
    try {
      await post('/manage/notifications/read', {});
      await load();
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
        await post('/manage/notifications/read', { id: item.id });
        await load();
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
          <span className={`hdr-bell__badge hdr-bell__badge--${priority.tone}`} aria-hidden="true">
            {fmtDigits(compactCount(priority.total), locale)}
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
          onMarkAll={markAll}
          locale={locale}
          timeZone={business?.timezone}
          anchorRef={wrapRef}
        />
      ) : null}
    </span>
  );
}
