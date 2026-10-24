import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../Icon';
import LanguageFlag from './LanguageFlag';
import { useI18n } from '../../i18n';

/* Collision padding from the viewport edges, and the gap under the trigger. */
const EDGE = 10;
const GAP = 8;
const MENU_MIN_WIDTH = 186;
const ROW = 42;

/*
 * Compact language control: flag, current label and a chevron. The list is a
 * real menu (not a native <select>) so every language can show its own flag —
 * Kurdish gets the Kurdistan flag, never the Iraqi or Iranian one.
 *
 * The list is portalled to <body> and positioned fixed from the trigger's own
 * rectangle: it is never clipped by a card, a scrolling strip or the sticky
 * header, and it can never push the page sideways. It opens towards the inside
 * of the page (its start edge on the trigger's start edge) and clamps to the
 * viewport, so a trigger parked in the top-right corner still shows a complete
 * menu instead of one hanging off the screen.
 *
 * Choosing a language persists it through the i18n provider, which also flips
 * the document direction; nothing else on the page is reset.
 */
export default function LanguageSelect() {
  const { t, locale, setLocale, locales, dir } = useI18n();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const wrapRef = useRef(null);
  const menuRef = useRef(null);
  const current = locales.find((l) => l.code === locale) || locales[0] || { code: locale, label: locale };
  /* One enabled language means one choice: the current language is shown, and
     the control offers no list to open. */
  const single = locales.length <= 1;

  const place = useCallback(() => {
    const trigger = wrapRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(Math.max(rect.width, MENU_MIN_WIDTH), vw - EDGE * 2);
    const need = locales.length * ROW + 14;
    const below = vh - rect.bottom - EDGE;
    const above = rect.top - EDGE;
    const openUp = below < need && above > below;

    /* Align the inner (start) edge of the list with the trigger's, then clamp
       into the viewport — the reference layout's "extend inwards" rule. */
    const preferred = dir === 'rtl' ? rect.right - width : rect.left;
    const left = Math.min(Math.max(EDGE, preferred), Math.max(EDGE, vw - width - EDGE));

    setPos({
      left,
      width,
      maxHeight: Math.min(need, Math.max(ROW, (openUp ? above : below) - GAP)),
      ...(openUp ? { bottom: Math.max(EDGE, vh - rect.top + GAP) } : { top: rect.bottom + GAP }),
    });
  }, [dir, locales.length]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (wrapRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onViewport = () => place();

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    /* Capture-phase scroll catches the page and every inner scrolling strip. */
    window.addEventListener('scroll', onViewport, true);
    window.addEventListener('resize', onViewport);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onViewport, true);
      window.removeEventListener('resize', onViewport);
    };
  }, [open, place]);

  const menu = open && pos
    ? createPortal(
        <div
          ref={menuRef}
          className="hdr-lang__menu hdr-lang__menu--float"
          role="listbox"
          aria-label={t('label_language')}
          style={{
            left: pos.left,
            width: pos.width,
            maxHeight: pos.maxHeight,
            ...(pos.top === undefined ? { bottom: pos.bottom } : { top: pos.top }),
          }}
        >
          {locales.map((l) => {
            const active = l.code === locale;
            return (
              <button
                key={l.code}
                type="button"
                role="option"
                aria-selected={active}
                className={`hdr-lang__option ${active ? 'is-active' : ''}`}
                onClick={() => {
                  setLocale(l.code);
                  setOpen(false);
                }}
              >
                <LanguageFlag code={l.code} />
                <span className="hdr-lang__option-label">{l.label}</span>
                {active ? <Icon name="check" size={15} className="hdr-lang__check" /> : null}
              </button>
            );
          })}
        </div>,
        document.body,
      )
    : null;

  return (
    <span className="hdr-lang" ref={wrapRef}>
      <button
        type="button"
        className={`hdr-lang__btn ${single ? 'is-single' : ''}`.trim()}
        aria-haspopup={single ? undefined : 'listbox'}
        aria-expanded={single ? undefined : open}
        aria-disabled={single || undefined}
        aria-label={t('label_language')}
        title={t('label_language')}
        onClick={() => {
          if (single) return;
          setOpen((v) => !v);
        }}
      >
        <LanguageFlag code={current.code} />
        <span className="hdr-lang__label">{current.label}</span>
        {single ? null : (
          <Icon name="chevronDown" size={14} className={`hdr-lang__caret ${open ? 'is-open' : ''}`} />
        )}
      </button>

      {single ? null : menu}
    </span>
  );
}
