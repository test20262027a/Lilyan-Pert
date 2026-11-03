import { useEffect, useLayoutEffect, useRef } from 'react';
import Icon from '../Icon';
import './notificationAlert.css';

/*
 * The in-app new-order alert.
 *
 * It lives at the application root (mounted by NotificationsProvider), so it
 * paints above every page — dashboard, customer menu, settings — with its own
 * fixed stacking layer: no page container can clip it and no header can cover
 * it. Clicking the card or the arrow opens the order it belongs to.
 *
 * Each card owns exactly ONE dismissal lifecycle: a deadline fixed on its
 * first render from the monotonic clock (`performance.now`). Hover, focus,
 * pointer movement and tab activation never move that deadline, and the fuse
 * below the text is animated from the same instant for the same duration, so
 * the visible countdown and the removal can never drift apart.
 */
const DISMISS_MS = 4000;

function AlertCard({ alert, onDismiss, onOpen }) {
  const deadlineRef = useRef(null);
  if (deadlineRef.current === null) {
    deadlineRef.current = performance.now() + DISMISS_MS;
  }
  const fuseRef = useRef(null);

  /*
   * Start the fuse from whatever is left of the fixed deadline. The duration is
   * written once (never reset), so the second StrictMode pass cannot restart
   * the burn.
   */
  useLayoutEffect(() => {
    const fuse = fuseRef.current;
    if (!fuse || fuse.dataset.running === '1') return;
    const remaining = Math.max(0, deadlineRef.current - performance.now());
    fuse.style.setProperty('--fuse-ms', `${remaining}ms`);
    fuse.dataset.running = '1';
    fuse.classList.add('is-running');
  }, []);

  useEffect(() => {
    const deadline = deadlineRef.current;
    let done = false;
    let timer = null;

    const dismiss = () => {
      if (done) return;
      done = true;
      onDismiss(alert.id);
    };

    const remaining = deadline - performance.now();
    if (remaining <= 0) dismiss();
    else timer = setTimeout(dismiss, remaining);

    /*
     * A background tab throttles timers, so the deadline can pass unnoticed.
     * Returning to the page dismisses an expired alert immediately; it never
     * restarts the countdown.
     */
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && performance.now() >= deadline) dismiss();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
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
      <div className="notif-alert__row">
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

      {/* The countdown: a glowing thread that burns down to its far end. */}
      <span className="notif-alert__fuse" ref={fuseRef} aria-hidden="true">
        <span className="notif-alert__fuse-track" />
        <span className="notif-alert__fuse-line" />
        <span className="notif-alert__fuse-run">
          <span className="notif-alert__fuse-ember" />
        </span>
      </span>
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
