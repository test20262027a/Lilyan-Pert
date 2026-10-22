import { useCallback, useEffect, useRef, useState } from 'react';

/*
 * Positioning + dismissal for the category pickers' floating panels.
 *
 * The panel is portalled to <body> and positioned `fixed` from the trigger's
 * rectangle, so the scrolling modal body and the sticky footer can neither clip
 * nor cover it. It opens below the field, flips above when there is not enough
 * room, and is clamped to the viewport in both directions (RTL aligns to the
 * trigger's right edge).
 *
 * Only one picker is open at a time: opening announces itself on a window event
 * and every other open picker closes.
 */

const GAP = 6;
const EDGE = 8;
const EVENT = 'lycat-picker-open';

export function useFloatingPanel({ rtl, width: wanted = 360, height: wantedHeight = 380, minHeight = 180 }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const idRef = useRef(Math.random().toString(36).slice(2));

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const width = Math.min(Math.max(rect.width, wanted), vw - EDGE * 2);
    const below = vh - rect.bottom - EDGE - GAP;
    const above = rect.top - EDGE - GAP;
    const openUp = below < Math.min(wantedHeight, 300) && above > below;
    const room = openUp ? above : below;
    const maxHeight = Math.max(minHeight, Math.min(wantedHeight, room));

    let left = rtl ? rect.right - width : rect.left;
    left = Math.min(Math.max(EDGE, left), Math.max(EDGE, vw - width - EDGE));

    setPos({
      left,
      width,
      maxHeight,
      openUp,
      ...(openUp ? { bottom: Math.max(EDGE, vh - rect.top + GAP) } : { top: rect.bottom + GAP }),
    });
  }, [rtl, wanted, wantedHeight, minHeight]);

  const close = useCallback((refocus = false) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const toggle = useCallback(() => {
    setOpen((value) => {
      if (!value) window.dispatchEvent(new CustomEvent(EVENT, { detail: idRef.current }));
      return !value;
    });
  }, []);

  // Another picker opened → close this one.
  useEffect(() => {
    const onOther = (event) => {
      if (event.detail !== idRef.current) setOpen(false);
    };
    window.addEventListener(EVENT, onOther);
    return () => window.removeEventListener(EVENT, onOther);
  }, []);

  // Anchor to the field while open; follow page / modal scroll and resize.
  useEffect(() => {
    if (!open) return undefined;
    place();
    const onMove = (event) => {
      // Scrolling *inside* the panel must not re-place it.
      if (panelRef.current && event?.target instanceof Node && panelRef.current.contains(event.target)) return;
      place();
    };
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open, place]);

  // Outside press and Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (triggerRef.current?.contains(event.target)) return;
      if (panelRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      // Closing the picker must not also close the surrounding modal.
      event.stopPropagation();
      event.preventDefault();
      close(true);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, close]);

  return { open, pos, triggerRef, panelRef, toggle, close };
}
