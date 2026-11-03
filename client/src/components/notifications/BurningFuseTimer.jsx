import { useLayoutEffect, useRef } from 'react';
import './burningFuseTimer.css';

/*
 * The countdown of an order notification pair — the SAME visual for the small
 * alert and the large popup, driven by the shared deadline of
 * `notificationLifecycle` instead of its own animation clock.
 *
 * The element is told the full duration plus how much of it has already passed,
 * so a surface that appears mid-lifecycle starts at the same relative progress
 * as the one already on screen: both threads always show the same fraction of
 * the same event, burn at the same speed, in the same direction, and reach the
 * end at the same instant. Only the physical width of the line differs, and
 * that is decided by the container (`variant`).
 *
 * The burn is two transforms, so it stays on the compositor: no React state per
 * frame and no layout work.
 */
export default function BurningFuseTimer({
  expiresAt,
  durationMs,
  variant = 'alert',
  className = '',
}) {
  const fuseRef = useRef(null);

  useLayoutEffect(() => {
    const fuse = fuseRef.current;
    const ready = Number.isFinite(expiresAt) && Number.isFinite(durationMs) && durationMs > 0;
    if (!fuse || !ready) return undefined;
    const spent = Math.min(Math.max(0, durationMs - (expiresAt - performance.now())), durationMs);
    fuse.style.setProperty('--fuse-ms', `${durationMs}ms`);
    // Negative delay: the burn begins already `spent` milliseconds in.
    fuse.style.setProperty('--fuse-offset', `${-spent}ms`);
    fuse.classList.add('is-running');
    return () => fuse.classList.remove('is-running');
  }, [expiresAt, durationMs]);

  return (
    <span
      ref={fuseRef}
      className={`fuse-timer fuse-timer--${variant} ${className}`.trim()}
      aria-hidden="true"
    >
      <span className="fuse-timer__track" />
      <span className="fuse-timer__line" />
      <span className="fuse-timer__run">
        <span className="fuse-timer__ember" />
      </span>
    </span>
  );
}
