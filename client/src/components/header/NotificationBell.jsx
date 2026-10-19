import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../Icon';
import { useToast } from '../ui';
import { useI18n } from '../../i18n';
import { useBusiness } from '../../context/BusinessContext';
import { get, post } from '../../api';
import { playSound } from '../../sound';

/*
 * Bell + panel. The list, the unread count and the alert sound all come from
 * the backend notification feed, so nothing here is faked client-side.
 */
export default function NotificationBell() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const { business } = useBusiness();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const seenRef = useRef(null);
  const wrapRef = useRef(null);
  const soundEnabled = business?.notification_settings?.sound_enabled !== false;
  const soundKey = business?.notification_settings?.sound_key;

  const load = useCallback(async () => {
    try {
      const data = await get('/manage/notifications');
      const list = data.notifications || [];
      setItems(list);
      setUnread(data.unread || 0);

      const newest = list[0];
      if (newest) {
        if (seenRef.current === null) {
          seenRef.current = newest.id; // first load establishes the baseline
        } else if (newest.id !== seenRef.current) {
          seenRef.current = newest.id;
          // In-app alert for the newest event; sound follows the saved setting.
          if (newest.type === 'new_order') {
            if (soundEnabled) playSound(soundKey);
            toast.success(`${t('dash_new_orders')} · #${newest.order_number || ''}`.trim());
          }
        }
      }
    } catch {
      /* silently ignore polling errors */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundEnabled, soundKey, locale]);

  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
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
    await post('/manage/notifications/read', {});
    load();
  };

  return (
    <span className="hdr-bell" ref={wrapRef}>
      <button
        type="button"
        className={`hdr-btn ${unread > 0 ? 'is-on' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('dash_status_notifications')}
        title={t('dash_status_notifications')}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="bell" size={18} />
        {unread > 0 ? <span className="hdr-bell__dot">{unread > 9 ? '9+' : unread}</span> : null}
      </button>
      {open ? (
        <div className="hdr-menu hdr-menu--bell" role="menu">
          <div className="hdr-menu__head">
            <span>{t('dash_status_notifications')}</span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={markAll}>
              {t('action_clear')}
            </button>
          </div>
          <div className="hdr-menu__list">
            {items.length === 0 ? (
              <div className="hdr-menu__event">{t('dash_no_notifications')}</div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`hdr-menu__event ${n.read_at ? '' : 'is-unread'}`}
                  onClick={async () => {
                    setOpen(false);
                    await post('/manage/notifications/read', { id: n.id });
                    load();
                    if (n.order_id) navigate(`/orders/${n.order_id}`);
                  }}
                >
                  <span className="hdr-menu__event-title">
                    <Icon name={n.type === 'new_order' ? 'receipt' : 'refresh'} size={13} />
                    {n.type === 'new_order' ? t('dash_new_orders') : t('status_change')}
                  </span>
                  <span className="hdr-menu__event-body">
                    #{n.order_number} {n.body ? `· ${n.body}` : ''}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </span>
  );
}
