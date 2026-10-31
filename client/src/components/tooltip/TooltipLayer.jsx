/*
 * Global tooltip layer — ONE bubble for the whole application.
 *
 * Every tooltip in the app (admin rail, header, tables, action buttons, forms,
 * modals, the customer menu) is drawn by this single component. An element
 * opts in either by carrying `data-tip="…"` or by keeping its ordinary `title`
 * attribute: the layer picks the text up on hover/focus, suppresses the
 * browser's own bubble for the duration, and paints the premium theme-aware
 * bubble instead. Nothing else has to change at the call site, and no element
 * ever gets two tooltips.
 *
 * The bubble is portalled to <body> and positioned with fixed coordinates, so
 * a scroll container, a modal body or the collapsed rail can never clip it. It
 * flips to whichever side still has room, stays inside the viewport, mirrors
 * for RTL and mirrors its preferred side for `data-tip-side="inline-start"` /
 * `"inline-end"`.
 *
 * A dialog's close X is pointer-hover only (`data-tip-hover-only`): opening a
 * dialog focuses that button, so a focus-triggered bubble would appear on its
 * own, and a touch screen has no hover to explain. Such a bubble waits
 * `CLOSE_DELAY` and disappears the moment the pointer leaves. `data-tip-delay`
 * overrides the hover delay for a single control.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './tooltip.css';

const GAP = 10; // distance between the bubble and its target
const EDGE = 8; // keep-out margin from the viewport edges
const ARROW_INSET = 16; // the arrow never reaches the rounded corners
const SHOW_DELAY = 120; // hover delay, so passing over a row never flickers
const CLOSE_DELAY = 300; // a close X waits a beat before it explains itself
const TOUCH_LINGER = 2200; // how long a tapped tooltip stays on a touch screen
const SIDES = ['top', 'bottom', 'right', 'left'];
const OPPOSITE = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
// Elements whose `title` is not a tooltip at all, or is spoken natively.
const SKIP = new Set(['IFRAME', 'OPTION', 'OPTGROUP', 'SELECT', 'HTML']);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const isRtl = () => document.documentElement.getAttribute('dir') === 'rtl';

/** Resolves the logical sides against the current writing direction. */
function resolveSide(side) {
  if (side === 'inline-start') return isRtl() ? 'right' : 'left';
  if (side === 'inline-end') return isRtl() ? 'left' : 'right';
  return SIDES.includes(side) ? side : null;
}

/** Free space on one side of the target, in the viewport. */
function room(side, rect, vw, vh) {
  if (side === 'top') return rect.top - EDGE;
  if (side === 'bottom') return vh - rect.bottom - EDGE;
  if (side === 'left') return rect.left - EDGE;
  return vw - rect.right - EDGE;
}

/** Picks the preferred side when the bubble fits there, otherwise the best one. */
function chooseSide(rect, size, vw, vh, preferred) {
  const order = preferred
    ? [preferred, OPPOSITE[preferred], ...SIDES.filter((s) => s !== preferred && s !== OPPOSITE[preferred])]
    : SIDES;
  const needs = { top: size.height + GAP, bottom: size.height + GAP, left: size.width + GAP, right: size.width + GAP };
  const fitting = order.find((side) => room(side, rect, vw, vh) >= needs[side]);
  if (fitting) return fitting;
  return order.reduce((best, side) => (room(side, rect, vw, vh) > room(best, rect, vw, vh) ? side : best), order[0]);
}

/** Final coordinates plus the arrow offset along the bubble edge. */
function coordinates(side, rect, size, vw, vh) {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let x = side === 'left' || side === 'right'
    ? (side === 'left' ? rect.left - GAP - size.width : rect.right + GAP)
    : cx - size.width / 2;
  let y = side === 'top' || side === 'bottom'
    ? (side === 'top' ? rect.top - GAP - size.height : rect.bottom + GAP)
    : cy - size.height / 2;

  x = clamp(x, EDGE, Math.max(EDGE, vw - size.width - EDGE));
  y = clamp(y, EDGE, Math.max(EDGE, vh - size.height - EDGE));

  // The arrow keeps pointing at the middle of the target, even once clamped.
  const arrowX = clamp(cx - x, ARROW_INSET, Math.max(ARROW_INSET, size.width - ARROW_INSET));
  const arrowY = clamp(cy - y, ARROW_INSET, Math.max(ARROW_INSET, size.height - ARROW_INSET));
  return { x, y, arrowX, arrowY };
}

/**
 * A control whose bubble is explained by the mouse alone — the close X of a
 * dialog: focus must never open it, and a touch tap must never open it either.
 */
const isHoverOnly = (el) => el.dataset.tipHoverOnly !== undefined;

/** How long the pointer must rest on `el` before its bubble appears. */
function delayFor(el) {
  const own = Number(el.dataset.tipDelay);
  if (own > 0) return own;
  return isHoverOnly(el) ? CLOSE_DELAY : SHOW_DELAY;
}

/** The nearest element that owns a tooltip, if any. */
function tipHost(node) {
  if (!(node instanceof Element)) return null;
  const host = node.closest('[data-tip], [title]');
  return host && !SKIP.has(host.tagName) ? host : null;
}

export default function TooltipLayer() {
  const [tip, setTip] = useState(null); // { text, preferred }
  const bubbleRef = useRef(null);
  const targetRef = useRef(null);
  const timerRef = useRef(0);
  // Elements whose native `title` is parked while the premium bubble shows.
  const parkedTitles = useRef(new Map());

  // Hands every parked native `title` back to its element.
  const releaseTitles = useCallback(() => {
    parkedTitles.current.forEach((value, el) => {
      if (el.isConnected && !el.hasAttribute('title')) el.setAttribute('title', value);
    });
    parkedTitles.current.clear();
  }, []);

  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = 0;
    releaseTitles();
    targetRef.current = null;
    setTip(null);
  }, [releaseTitles]);

  const show = useCallback((el, immediate = false) => {
    const text = (el.dataset.tip || el.getAttribute('title') || '').trim();
    if (!text) return;
    clearTimeout(timerRef.current);
    timerRef.current = 0;

    // One bubble at a time: the previous target gets its native title back.
    if (targetRef.current && targetRef.current !== el) releaseTitles();

    // The browser's own bubble would otherwise appear on top of this one.
    if (!el.dataset.tip) {
      const title = el.getAttribute('title');
      if (title) {
        parkedTitles.current.set(el, title);
        el.removeAttribute('title');
      }
    }

    targetRef.current = el;
    const preferred = resolveSide(el.dataset.tipSide) || 'top';
    if (immediate) setTip({ text, preferred });
    else timerRef.current = setTimeout(() => setTip({ text, preferred }), delayFor(el));
  }, [releaseTitles]);

  useEffect(() => {
    const onOver = (e) => {
      if (e.pointerType === 'touch') return;
      const el = tipHost(e.target);
      if (!el || el === targetRef.current) return;
      show(el);
    };

    const onOut = (e) => {
      // Compare against the remembered target, never a fresh `[title]` lookup:
      // the native title is parked while the bubble shows, so the element no
      // longer matches the selector it was found with.
      const el = targetRef.current;
      const node = e.target instanceof Node ? e.target : null;
      if (!el || !node || (node !== el && !el.contains(node))) return;
      if (e.relatedTarget instanceof Node && el.contains(e.relatedTarget)) return;
      hide();
    };

    const onFocusIn = (e) => {
      const el = tipHost(e.target);
      if (!el || isHoverOnly(el)) return;
      // Only a keyboard focus earns a bubble: a dialog that focuses its own
      // first control on open must never pop one up by itself.
      if (!el.matches(':focus-visible')) return;
      show(el, true);
    };

    const onFocusOut = (e) => {
      const el = targetRef.current;
      if (!el) return;
      if (e.relatedTarget instanceof Node && el.contains(e.relatedTarget)) return;
      hide();
    };

    // Touch has no hover: a tap shows the same bubble briefly.
    const onDown = (e) => {
      if (e.pointerType !== 'touch') {
        hide();
        return;
      }
      const el = tipHost(e.target);
      if (!el || isHoverOnly(el)) return;
      show(el, true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(hide, TOUCH_LINGER);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') hide();
    };

    // A surface whose tooltips stop being valid (the admin rail expanding, for
    // one) retires the bubble at once instead of leaving it floating there.
    const onDismiss = () => hide();

    document.addEventListener('pointerover', onOver, true);
    document.addEventListener('pointerout', onOut, true);
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('base44:tooltip-hide', onDismiss);
    window.addEventListener('blur', hide);
    return () => {
      document.removeEventListener('pointerover', onOver, true);
      document.removeEventListener('pointerout', onOut, true);
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('focusout', onFocusOut, true);
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('base44:tooltip-hide', onDismiss);
      window.removeEventListener('blur', hide);
      clearTimeout(timerRef.current);
      parkedTitles.current.forEach((value, el) => {
        if (el.isConnected && !el.hasAttribute('title')) el.setAttribute('title', value);
      });
      parkedTitles.current.clear();
    };
  }, [show, hide]);

  // Measure, place, then reveal — one frame after mount, so no jump is seen.
  useLayoutEffect(() => {
    if (!tip) return undefined;
    const bubble = bubbleRef.current;
    const target = targetRef.current;
    if (!bubble || !target) return undefined;

    if (!target.isConnected) {
      hide();
      return undefined;
    }

    const rect = target.getBoundingClientRect();
    const size = { width: bubble.offsetWidth, height: bubble.offsetHeight };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const side = chooseSide(rect, size, vw, vh, tip.preferred);
    const pos = coordinates(side, rect, size, vw, vh);

    bubble.dataset.side = side;
    bubble.style.left = `${Math.round(pos.x)}px`;
    bubble.style.top = `${Math.round(pos.y)}px`;
    bubble.style.setProperty('--ttip-ax', `${Math.round(pos.arrowX)}px`);
    bubble.style.setProperty('--ttip-ay', `${Math.round(pos.arrowY)}px`);
    bubble.dataset.placed = 'true';

    // A scrolled or resized target no longer lines up: never leave it drifting.
    window.addEventListener('scroll', hide, { capture: true, passive: true });
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [tip, hide]);

  if (!tip) return null;

  return createPortal(
    <div className="ttip" role="tooltip" data-side="top" ref={bubbleRef}>
      {tip.text}
    </div>,
    document.body,
  );
}
