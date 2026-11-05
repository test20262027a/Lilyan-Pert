import { useEffect, useRef, useState } from 'react';
import '../productTitle.css';

/*
 * The app's ONE product title.
 *
 * Every product name — admin card, customer card, product sheet, cart line,
 * order form — renders through this component so the rule lives in one place:
 * one single line, the complete saved name, no ellipsis and no second line.
 *
 * When the name is wider than the space available, only this element scrolls
 * horizontally (touch swipe / trackpad / arrow keys) — never the card and never
 * the page. Nothing about the name is ever rewritten or shortened, and the text
 * keeps its own direction with `dir="auto"`, so a Kurdish, Persian, Arabic or
 * English name reads the right way round inside any layout.
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
  ...rest
}) {
  const ref = useRef(null);
  const [overflow, setOverflow] = useState(false);
  const text = name === null || name === undefined ? '' : String(name);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => setOverflow(el.scrollWidth > el.clientWidth + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

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
