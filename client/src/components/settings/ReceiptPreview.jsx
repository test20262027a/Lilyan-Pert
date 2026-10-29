import { useLayoutEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import { LOCALES } from '../../i18n';
import { printGeometry, ReceiptPaper } from '../Receipt';
import Select from '../select/Select';
import LanguageFlag from '../header/LanguageFlag';

const MM_TO_PX = 96 / 25.4; // a CSS millimetre, exactly as the browser resolves it
const MIN_FIT_WIDTH = 110;

/**
 * The live receipt preview.
 *
 * It renders the real `ReceiptPaper` — the same component the thermal printer
 * receives — with the settings currently in the editor, saved or not. Everything
 * the paper shows comes from props, so an unsaved change repaints it in the same
 * render: no save, no reload, no second static template that could drift.
 *
 * The sheet is drawn at the real paper width in millimetres and only shrunk to
 * fit its stage, so proportions and line breaks match the printed receipt and
 * nothing is ever clipped or scrolled sideways — 58 mm and 80 mm alike.
 */
export default function ReceiptPreview({ data, settings, locale, onLocaleChange, footerPick, t }) {
  const stageRef = useRef(null);
  const [stageWidth, setStageWidth] = useState(0);
  const [open, setOpen] = useState(true);

  /*
   * The stage's real content width decides how much of a 1:1 sheet fits.
   * Measured with a ResizeObserver (not a guess), so a narrower column shrinks
   * the paper instead of overflowing it and a resize re-fits it immediately.
   */
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    setStageWidth(stage.clientWidth);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => setStageWidth(entry.contentRect.width));
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const geometry = printGeometry(settings);
  const available = Math.max(stageWidth, MIN_FIT_WIDTH);
  // 1:1 whenever the column is wide enough; smaller only to keep the paper whole.
  const fit = Math.min(1, available / (geometry.paper * MM_TO_PX));
  const { top, right, bottom, left } = geometry.margins;

  /* The receipt's own language, in the same styled dropdown as the rest of the
     admin panel, with each language's flag as its marker. */
  const languageOptions = LOCALES.map((item) => ({
    value: item.code,
    label: item.label,
    leading: <LanguageFlag code={item.code} />,
  }));

  return (
    <div className={`rcp-preview ${open ? 'is-open' : 'is-closed'}`}>
      <header className="rcp-preview__head">
        <span className="rcp-preview__icon" aria-hidden="true">
          <Icon name="receipt" size={15} />
        </span>
        <span className="rcp-preview__title">{t('settings_receipt_preview')}</span>
        <span className="rcp-preview__badge">{t('settings_receipt_sample_badge')}</span>
        {/* Stacked layouts only: lets the paper be folded away while the
            controls below it are edited. */}
        <button
          type="button"
          className="rcp-preview__fold"
          aria-expanded={open}
          aria-label={t('settings_receipt_preview')}
          onClick={() => setOpen((value) => !value)}
        >
          <Icon name={open ? 'eyeOff' : 'eye'} size={15} />
        </button>
      </header>

      <div className="rcp-preview__lang">
        <span className="rcp-preview__lang-label">
          <Icon name="globe" size={13} />
          {t('settings_receipt_preview_language')}
        </span>
        <Select
          value={locale}
          onChange={(value) => onLocaleChange(value)}
          options={languageOptions}
          ariaLabel={t('settings_receipt_preview_language')}
        />
      </div>

      <div className="rcp-preview__stage" ref={stageRef}>
        {/*
         * The sheet is the paper itself, drawn exactly as the print stylesheet
         * draws it: the width is the paper width divided by the print scale, and
         * the calibration margins are padding of the same compensated size — so
         * the printable area inside them is the printable width divided by the
         * scale, just as on the printer. `zoom` then carries the print scale,
         * and the fit factor only keeps the paper inside the stage.
         */}
        <div
          className="rcp-preview__sheet"
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

      <footer className="rcp-preview__foot">
        <div className="rcp-preview__meta">
          <span className="rcp-preview__chip">{geometry.paper}mm</span>
          <span className="rcp-preview__chip">{Math.round(geometry.scale * 100)}%</span>
        </div>
        <p className="rcp-preview__note">{t('settings_receipt_preview_hint')}</p>
      </footer>
    </div>
  );
}
