import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../Icon';
import { useI18n } from '../../i18n';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const STEP = 0.5;
const DOUBLE_TAP_SCALE = 2.25;

/*
 * The product photograph, full size and really magnified.
 *
 * It sits above the product sheet and never closes it: closing the viewer
 * returns to the same product, with the same cart quantity.
 *
 * Zoom is a real transform on the image (1x–4x), and a pan is bounded to the
 * part of the picture that is actually outside the viewport at the current
 * scale — so a 1x image cannot be dragged away and a 3x image cannot be dragged
 * into empty space.
 *
 * Wheel, pointer drag, pinch, double-click/double-tap and the buttons all drive
 * that one state. The gestures are bound natively to the viewer's stage: it is
 * rendered in a portal above the page, and a drag that starts on the picture has
 * to keep tracking the pointer even after it leaves the image.
 */
export default function ProductImageViewer({ src, alt, onClose }) {
  const { t } = useI18n();
  const stageRef = useRef(null);
  const imgRef = useRef(null);
  const pointers = useRef(new Map());
  const drag = useRef(null);
  const pinch = useRef(null);
  const lastTap = useRef(0);

  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  /* The handlers below run outside React's render cycle, so they read the
     current view from here instead of a stale closure. */
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  /* Clamp a requested scale/offset to what the picture can actually show. */
  const clampView = useCallback((scale, x, y) => {
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
    const el = imgRef.current;
    const maxX = el ? (el.offsetWidth * (next - 1)) / 2 : 0;
    const maxY = el ? (el.offsetHeight * (next - 1)) / 2 : 0;
    return {
      scale: next,
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  }, []);

  const reset = useCallback(() => setView({ scale: 1, x: 0, y: 0 }), []);
  const zoomBy = useCallback(
    (delta) => setView((current) => clampView(current.scale + delta, current.x, current.y)),
    [clampView],
  );

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    const onWheel = (event) => {
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.16 : 1 / 1.16;
      setView((current) => clampView(current.scale * factor, current.x, current.y));
    };

    const onDown = (event) => {
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      try {
        stage.setPointerCapture(event.pointerId);
      } catch {
        /* an engine without capture still tracks the drag on the window */
      }

      if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        pinch.current = {
          distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
          scale: viewRef.current.scale,
        };
        drag.current = null;
      } else if (pointers.current.size === 1) {
        drag.current = {
          x: event.clientX,
          y: event.clientY,
          ox: viewRef.current.x,
          oy: viewRef.current.y,
        };
      }
      setDragging(true);
    };

    const onMove = (event) => {
      if (!pointers.current.has(event.pointerId)) return;
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pointers.current.size >= 2 && pinch.current) {
        const [a, b] = [...pointers.current.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const scale = pinch.current.scale * (distance / pinch.current.distance);
        setView((current) => clampView(scale, current.x, current.y));
        return;
      }

      if (drag.current) {
        const { x, y, ox, oy } = drag.current;
        setView((current) =>
          clampView(current.scale, ox + (event.clientX - x), oy + (event.clientY - y)),
        );
      }
    };

    const onUp = (event) => {
      if (!pointers.current.has(event.pointerId)) return;
      const wasSingle = pointers.current.size === 1;
      pointers.current.delete(event.pointerId);
      if (pointers.current.size < 2) pinch.current = null;

      if (pointers.current.size === 0) {
        drag.current = null;
        setDragging(false);
        /* Touch double-tap toggles exactly like the mouse double-click. */
        if (wasSingle && event.pointerType !== 'mouse') {
          const now = Date.now();
          if (now - lastTap.current < 300) {
            if (viewRef.current.scale > 1) reset();
            else setView(() => clampView(DOUBLE_TAP_SCALE, 0, 0));
          }
          lastTap.current = now;
        }
        return;
      }

      const [first] = [...pointers.current.values()];
      drag.current = { x: first.x, y: first.y, ox: viewRef.current.x, oy: viewRef.current.y };
    };

    /* Double-click (and the touch double-tap above) toggles magnification. */
    const onDoubleClick = () => {
      if (viewRef.current.scale > 1) reset();
      else setView(() => clampView(DOUBLE_TAP_SCALE, 0, 0));
    };

    stage.addEventListener('wheel', onWheel, { passive: false });
    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('dblclick', onDoubleClick);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    return () => {
      stage.removeEventListener('wheel', onWheel);
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('dblclick', onDoubleClick);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [clampView, reset]);

  const zoomed = view.scale > 1 || view.x !== 0 || view.y !== 0;

  return createPortal(
    <div
      className="cui-zoom"
      role="dialog"
      aria-modal="true"
      aria-label={alt || t('customer_menu_zoom_open')}
    >
      <div className="cui-zoom__stage" ref={stageRef} style={{ cursor: dragging ? 'grabbing' : view.scale > 1 ? 'grab' : 'zoom-in' }}>
        <img
          ref={imgRef}
          className="cui-zoom__img"
          src={src}
          alt={alt || ''}
          draggable="false"
          style={{
            transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
            transition: dragging ? 'none' : 'transform 160ms cubic-bezier(0.22, 0.78, 0.3, 1)',
          }}
        />
      </div>

      <button
        type="button"
        className="cui-zoom__close"
        onClick={onClose}
        aria-label={t('action_close')}
        title={t('action_close')}
        data-tip-hover-only
        data-tip-side="top"
      >
        <Icon name="close" size={18} />
      </button>

      <div className="cui-zoom__bar">
        <button
          type="button"
          className="cui-zoom__btn"
          onClick={() => zoomBy(-STEP)}
          disabled={view.scale <= MIN_SCALE}
          aria-label={t('customer_menu_zoom_out')}
          title={t('customer_menu_zoom_out')}
        >
          <Icon name="minus" size={18} />
        </button>
        <span className="cui-zoom__level">{Math.round(view.scale * 100)}%</span>
        <button
          type="button"
          className="cui-zoom__btn"
          onClick={() => zoomBy(STEP)}
          disabled={view.scale >= MAX_SCALE}
          aria-label={t('customer_menu_zoom_in')}
          title={t('customer_menu_zoom_in')}
        >
          <Icon name="plus" size={18} />
        </button>
        <span className="cui-zoom__sep" aria-hidden="true" />
        <button
          type="button"
          className="cui-zoom__btn"
          onClick={reset}
          disabled={!zoomed}
          aria-label={t('customer_menu_zoom_reset')}
          title={t('customer_menu_zoom_reset')}
        >
          <Icon name="refresh" size={17} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
