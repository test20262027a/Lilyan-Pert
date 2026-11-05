import { useEffect, useRef, useState } from 'react';
import '../productTitle.css';

/* How far the type may be reduced from its CSS size before the title is
   allowed to scroll instead, and the floor it never goes below. */
const MIN_SCALE = 0.7;
const MIN_PX = 11.5;

/*
 * The app's ONE product title.
 *
 * Every product name — admin card, customer card, product sheet, cart line,
 * order form — renders through this component so the rule lives in one place:
 * one single line, the complete saved name, no ellipsis and no second line.
 *
 * Before anything is ever cut off, the name is fitted to the width the layout
 * actually gives it: the type is reduced from its CSS size down to a readable
 * minimum, measured on the real rendered text. Only a name that still does not
 * fit at that minimum scrolls horizontally (touch swipe / trackpad / arrow keys)
 * — never the card and never the page. Nothing about the name is ever rewritten
 * or shortened, and the text keeps its own direction with `dir="auto"`, so a
 * Kurdish, Persian, Arabic or English name reads the right way round inside any
 * layout.
 *
 * `data-overflow` is measured on mount and on resize (one ResizeObserver per
 * title) purely to decide focusability; it never updates on scroll or on every
 * animation frame.
 */
export default function ProductTitle({
  as: Tag = 'div',
  name,
  className = '',
  title,
  minScale = MIN_SCALE,
  minPx = MIN_PX,
  ...rest
}) {
  const ref = useRef(null);
  const [overflow, setOverflow] = useState(false);
  const text = name === null || name === undefined ? '' : String(name);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let lastWidth = 0;

    /* Reset to the CSS size first, so a breakpoint change is always honoured
       before the name is re-fitted for the new width. */
    const fit = () => {
      const width = el.clientWidth;
      if (!width) return;
      el.style.fontSize = '';
      const base = parseFloat(getComputedStyle(el).fontSize);
      if (!base) return;
      const min = Math.max(minPx, base * minScale);
      let size = base;
      el.style.fontSize = `${size}px`;
      while (size > min && el.scrollWidth > el.clientWidth + 1) {
        size = Math.max(min, size - 0.75);
        el.style.fontSize = `${size}px`;
      }
      setOverflow(el.scrollWidth > el.clientWidth + 1);
    };

    const measure = () => {
      const width = el.clientWidth;
      if (width !== lastWidth) {
        lastWidth = width;
        fit();
        return;
      }
      setOverflow(el.scrollWidth > el.clientWidth + 1);
    };

    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, minScale, minPx]);

  return (
    <Tag
      ref={ref}
      className={`product-title ${className}`.trim()}
      title={title ?? text}
      dir="auto"
      data-overflow={overflow ? 'true' : 'false'}
      tabIndex={overflow ? 0 : undefined}
      {...rest}
    >
      {text}
    </Tag>
  );
}
