import { useEffect } from 'react';
import Icon from '../Icon';
import './notificationAlert.css';

/*
 * The in-app new-order alert.
 *
 * It lives at the application root (mounted by NotificationsProvider), so it
 * paints above every page — dashboard, customer menu, settings — with its own
 * fixed stacking layer: no page container can clip it and no header can cover
 * it. Clicking the card or the arrow opens the order it belongs to.
 */
const DISMISS_MS = 6500;

function AlertCard({ alert, onDismiss, onOpen }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(alert.id), DISMISS_MS);
    return () => clearTimeout(timer);
  }, [alert.id, onDismiss]);

  const open = () => onOpen(alert);

  return (
    <div
      className="notif-alert"
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
    >
      <span className="notif-alert__icon" aria-hidden="true">
        <Icon name="receipt" size={18} />
      </span>
      <span className="notif-alert__main">
        <span className="notif-alert__title">{alert.title}</span>
        {alert.body ? <span className="notif-alert__body">{alert.body}</span> : null}
      </span>
      <button
        type="button"
        className="notif-alert__close"
        aria-label={alert.closeLabel}
        title={alert.closeLabel}
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(alert.id);
        }}
      >
        <Icon name="close" size={13} />
      </button>
    </div>
  );
}

export default function NotificationAlertHost({ alerts = [], onDismiss, onOpen }) {
  if (!alerts.length) return null;
  return (
    <div className="notif-alert-stack" role="status" aria-live="polite">
      {alerts.map((alert) => (
        <AlertCard key={alert.id} alert={alert} onDismiss={onDismiss} onOpen={onOpen} />
      ))}
    </div>
  );
}
