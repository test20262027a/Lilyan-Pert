import { useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import LanguageFlag from './LanguageFlag';
import { useI18n } from '../../i18n';

/*
 * Compact language control: flag, current label and a chevron. The list is a
 * real menu (not a native <select>) so every language can show its own flag —
 * Kurdish gets the Kurdistan flag, never the Iraqi or Iranian one.
 *
 * Choosing a language persists it through the i18n provider, which also flips
 * the document direction; nothing else on the page is reset.
 */
export default function LanguageSelect() {
  const { t, locale, setLocale, LOCALES } = useI18n();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const current = LOCALES.find((l) => l.code === locale) || LOCALES[0];

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span className="hdr-lang" ref={wrapRef}>
      <button
        type="button"
        className="hdr-lang__btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('label_language')}
        title={t('label_language')}
        onClick={() => setOpen((v) => !v)}
      >
        <LanguageFlag code={current.code} />
        <span className="hdr-lang__label">{current.label}</span>
        <Icon name="chevronDown" size={14} className={`hdr-lang__caret ${open ? 'is-open' : ''}`} />
      </button>

      {open ? (
        <div className="hdr-lang__menu" role="listbox" aria-label={t('label_language')}>
          {LOCALES.map((l) => {
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
        </div>
      ) : null}
    </span>
  );
}
