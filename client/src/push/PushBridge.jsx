import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * The service worker has no router and no session, so it hands two jobs back to
 * the open panel:
 *   lilyan:open-order → a tapped notification opens that order in the existing
 *                       details modal (same route the bell uses, no reload);
 *   lilyan:new-order  → the root notification listener refreshes the feed and
 *                       raises the one in-app alert for that order.
 *
 * The arriving event carries its order id, so the alert and the feed share one
 * identity and a push plus a poll can never announce the same order twice.
 */
export default function PushBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return undefined;

    const onMessage = (event) => {
      const data = event.data || {};
      if (data.type === 'lilyan:open-order') {
        // Authorization is the app's own: the orders route is permission-gated,
        // and a signed-out visitor lands on the sign-in page first.
        if (data.orderId) navigate(`/orders?order=${data.orderId}`);
        else navigate(data.url || '/orders');
        return;
      }
      if (data.type === 'lilyan:new-order') {
        window.dispatchEvent(
          new CustomEvent(data.quiet ? 'lilyan:order-arrived' : 'lilyan:new-order', {
            detail: { orderId: data.orderId || null },
          }),
        );
      }
    };

    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [navigate]);

  return null;
}
