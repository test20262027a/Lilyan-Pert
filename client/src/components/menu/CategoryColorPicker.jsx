import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { COLOR_PALETTE, colorEntry, colorLabel, normalizeHex } from './categoryIconCatalog';
import { useFloatingPanel } from './useFloatingPanel';

/*
 * Category colour dropdown.
 *
 * The swatches are the category's *identity* colours — fixed hex values that
 * never change with the business theme. The control chrome (border, focus ring,
 * hover, selected ring) does follow the theme. A validated custom HEX can be
 * typed; only a plain #rrggbb ever reaches the form state.
 */
export default function CategoryColorPicker({ value, onChange, disabled, id }) {
  const { t, locale, dir } = useI18n();
  const rtl = dir === 'rtl';
  const { open, pos, triggerRef, panelRef, toggle, close } = useFloatingPanel({
    rtl,
    width: 340,
    height: 400,
  });
  const [hex, setHex] = useState('');
  const bodyRef = useRef(null);

  const current = String(value || '').toLowerCase();
  const typed = normalizeHex(hex);
  const invalid = hex.trim() !== '' && !typed;

  useEffect(() => {
    if (!open) return undefined;
    setHex('');
    const frame = requestAnimationFrame(() => {
      const body = bodyRef.current;
      const node = body?.querySelector('[data-current="true"]');
      if (body && node) body.scrollTop = Math.max(0, node.offsetTop - body.clientHeight / 2);
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const pick = (ink) => {
    onChange(ink);
    close(true);
  };

  const applyHex = () => {
    if (typed) pick(typed);
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={`ccpick__trigger ${open ? 'is-open' : ''}`.trim()}
        onClick={toggle}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="ccpick__dot" style={{ '--swatch': value }} aria-hidden="true" />
        <span className="ccpick__value">
          {colorEntry(value) ? colorLabel(value, locale) : t('menu_color_custom_short')}
          <span className="ccpick__hex">{String(value || '').toUpperCase()}</span>
        </span>
        <Icon name="chevronDown" size={16} className="ccpick__chev" />
      </button>

      {open && pos
        ? createPortal(
            <div
              ref={panelRef}
              className={`ccpick__panel ${pos.openUp ? 'is-up' : ''}`.trim()}
              dir={dir}
              role="dialog"
              aria-label={t('menu_category_color')}
              style={{
                left: pos.left,
                width: pos.width,
                maxHeight: pos.maxHeight,
                top: pos.top,
                bottom: pos.bottom,
              }}
            >
              <div className="ccpick__body" ref={bodyRef}>
                <div className="ccpick__swatches" role="group" aria-label={t('menu_category_color')}>
                  {COLOR_PALETTE.map((c) => {
                    const selected = c.hex === current;
                    const name = c.label[locale] || c.label.en;
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        className={`ccpick__swatch ${selected ? 'is-selected' : ''}`.trim()}
                        style={{ '--swatch': c.hex }}
                        onClick={() => pick(c.hex)}
                        aria-pressed={selected}
                        aria-label={`${name} ${c.hex.toUpperCase()}`}
                        title={`${name} · ${c.hex.toUpperCase()}`}
                        data-current={selected ? 'true' : undefined}
                      >
                        {selected ? <Icon name="check" size={13} /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="ccpick__custom">
                <label className="ccpick__custom-label" htmlFor="ccpick-hex">
                  {t('menu_color_custom')}
                </label>
                <div className={`ccpick__hexrow ${invalid ? 'is-invalid' : ''}`.trim()}>
                  <span
                    className="ccpick__dot ccpick__dot--sm"
                    style={{ '--swatch': typed || value }}
                    aria-hidden="true"
                  />
                  <input
                    id="ccpick-hex"
                    dir="ltr"
                    value={hex}
                    maxLength={7}
                    placeholder="#D97706"
                    spellCheck={false}
                    autoComplete="off"
                    aria-invalid={invalid}
                    onChange={(e) => setHex(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyHex();
                      }
                    }}
                  />
                  <button type="button" className="ccpick__apply" onClick={applyHex} disabled={!typed}>
                    {t('menu_color_apply')}
                  </button>
                </div>
                {invalid ? <p className="ccpick__err">{t('menu_color_invalid')}</p> : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
