import { useLayoutEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import { LOCALES } from '../../i18n';
import { printGeometry, ReceiptPaper } from '../Receipt';

const MM_TO_PX = 96 / 25.4; // a CSS millimetre, exactly as the browser resolves it
const PANEL_PAD = 26; // the panel's own padding, kept out of the fit calculation
const MIN_FIT_WIDTH = 120;

/**
 * The live receipt preview.
 *
 * It renders the real `ReceiptPaper` — the same component the thermal printer
 * receives — with the settings currently in the editor, saved or not. Everything
 * the paper shows comes from props, so an unsaved change repaints it in the same
 * render: no save, no reload, no second static template that could drift.
 *
 * The sheet is drawn at the real paper width in millimetres and only shrunk to
 * fit its column, so proportions and line breaks match the printed receipt and
 * nothing is ever clipped or scrolled sideways.
 */
export default function ReceiptPreview({ data, settings, locale, onLocaleChange, footerPick, t }) {
  const hostRef = useRef(null);
  const [hostWidth, setHostWidth] = useState(0);
  const [open, setOpen] = useState(true);

  /*
   * The panel's real width decides how much of a 1:1 sheet fits. Measured with a
   * ResizeObserver (not a guess), so a narrow column shrinks the paper instead
   * of overflowing it and a resized window re-fits it immediately.
   */
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    setHostWidth(host.clientWidth);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => setHostWidth(entry.contentRect.width));
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const geometry = printGeometry(settings);
  const available = Math.max(hostWidth - PANEL_PAD, MIN_FIT_WIDTH);
  // 1:1 whenever the column is wide enough; smaller only to keep the paper whole.
  const fit = Math.min(1, available / (geometry.paper * MM_TO_PX));
  const { top, right, bottom, left } = geometry.margins;

  return (
    <div className={`set-preview ${open ? 'is-open' : 'is-closed'}`} ref={hostRef}>
      <div className="set-preview__bar">
        <span className="set-preview__title">
          <Icon name="receipt" size={14} />
          {t('settings_receipt_preview')}
        </span>
        <span className="set-preview__badge">{t('settings_receipt_sample_badge')}</span>
        <label className="set-preview__lang">
          <span>{t('settings_receipt_preview_language')}</span>
          <select
            className="select"
            value={locale}
            onChange={(event) => onLocaleChange(event.target.value)}
            aria-label={t('settings_receipt_preview_language')}
          >
            {LOCALES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        {/* Phones only: lets the paper be folded away while the controls move. */}
        <button
          type="button"
          className="set-preview__toggle"
          aria-expanded={open}
          aria-label={t('settings_receipt_preview')}
          onClick={() => setOpen((value) => !value)}
        >
          <Icon name={open ? 'eyeOff' : 'eye'} size={15} />
        </button>
      </div>

      <div className="set-preview__stage">
        {/*
         * The sheet is the paper itself, drawn exactly as the print stylesheet
         * draws it: the width is the paper width divided by the print scale, and
         * the calibration margins are padding of the same compensated size — so
         * the printable area inside them is the printable width divided by the
         * scale, just as on the printer. `zoom` then carries the print scale,
         * and the fit factor only keeps the paper inside the column.
         */}
        <div
          className="set-preview__sheet"
          style={{
            width: `${(geometry.paper / geometry.scale).toFixed(2)}mm`,
            padding: `${(top / geometry.scale).toFixed(2)}mm ${(right / geometry.scale).toFixed(2)}mm ${
              (bottom / geometry.scale).toFixed(2)
            }mm ${(left / geometry.scale).toFixed(2)}mm`,
            zoom: geometry.scale * fit,
          }}
        >
          <ReceiptPaper data={data} locale={locale} footerPick={footerPick} />
        </div>
      </div>

      <p className="set-preview__note">{t('settings_receipt_preview_hint')}</p>
    </div>
  );
}
