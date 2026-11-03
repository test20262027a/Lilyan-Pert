import Icon from '../Icon';
import BurningFuseTimer from './BurningFuseTimer';
import useOrderNotification from '../../hooks/useOrderNotification';
import './notificationAlert.css';

/*
 * The in-app new-order alert.
 *
 * It lives at the application root (mounted by NotificationsProvider), so it
 * paints above every page — dashboard, customer menu, settings — with its own
 * fixed stacking layer: no page container can clip it and no header can cover
 * it. Clicking the card opens the order it belongs to.
 *
 * Its countdown is NOT its own: the card joins the shared lifecycle of its
 * order event (`notificationLifecycle`), the same record the large "order
 * received" popup joins. That is what makes the two fuses show identical
 * progress and close in one coordinated transition at 3 seconds. Hover, focus,
 * pointer movement and re-renders never move the deadline.
 */
function AlertCard({ alert, onDismiss, onOpen }) {
  const record = useOrderNotification(alert.orderId || alert.id, () => onDismiss(alert.id));
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
      <div className="notif-alert__row">
        <span className="notif-alert__icon" aria-hidden="true">
          <Icon name="receipt" size={18} />
        </span>
        <span className="notif-alert__main">
          <span className="notif-alert__title">{alert.title}</span>
          {alert.body ? <span className="notif-alert__body">{alert.body}</span> : null}
        </span>
      </div>

      {/* The shared countdown: a glowing thread burning down to its far end. */}
      <BurningFuseTimer
        expiresAt={record?.expiresAt}
        durationMs={record?.durationMs}
        variant="alert"
      />
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
