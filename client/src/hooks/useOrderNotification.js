import { useEffect, useRef, useState } from 'react';
import {
  ORDER_NOTIFICATION_MS,
  ensureOrderNotification,
  watchOrderNotification,
} from '../notificationLifecycle';

/*
 * Joins the shared lifecycle of one order event.
 *
 * Mounting this hook never starts a countdown: `ensureOrderNotification` returns
 * the event's existing record when there is one, so the second surface of the
 * pair always receives the deadline the first one created. It hands back that
 * record (for the fuse's timing) and calls `onExpire` once, when the single
 * shared deadline ends.
 *
 * A component using this must be mounted per event — the alert card is keyed by
 * its alert id and the success popup by its order id — so a new event always
 * gets a new record.
 */
export default function useOrderNotification(orderId, onExpire, durationMs = ORDER_NOTIFICATION_MS) {
  const [record] = useState(() => ensureOrderNotification(orderId, durationMs));
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  useEffect(() => {
    if (!record) return undefined;
    return watchOrderNotification(record.id, () => expireRef.current?.());
  }, [record]);

  return record;
}
