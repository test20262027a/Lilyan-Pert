import { useEffect, useRef } from 'react';
import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { MESSAGE_LOCALES } from '../../receiptMessages';

/*
 * One receipt message: a compact accordion header plus the four language
 * fields once it is open. The row is fully controlled — every keystroke
 * reaches the page's single draft store, so opening another row, searching or
 * collapsing never loses what was typed.
 */

const FIELDS = [
  { code: 'ku', label: 'کوردی سۆرانی', rtl: true },
  { code: 'fa', label: 'فارسی', rtl: true },
  { code: 'ar', label: 'العربية', rtl: true },
  { code: 'en', label: 'English', rtl: false },
];

const MAX_LENGTH = 1000;

export default function ReceiptMessageRow({
  number,
  open,
  onToggle,
  values,
  custom,
  dirty,
  canManage,
  onChange,
  onTranslate,
  translating,
}) {
  const { t } = useI18n();
  const refs = useRef({});
  const label = String(number).padStart(2, '0');
  const hasPlaceholder = MESSAGE_LOCALES.some((code) => /\{[a-z_]+\}/i.test(values?.[code] || ''));

  // Auto-grow so a long message is never clipped while it is being edited.
  useEffect(() => {
    if (!open) return;
    for (const code of MESSAGE_LOCALES) {
      const el = refs.current[code];
      if (!el) continue;
      el.style.height = 'auto';
      el.style.height = `${Math.min(Math.max(el.scrollHeight, 88), 340)}px`;
    }
  }, [open, values]);

  return (
    <article className={`tx-row ${open ? 'is-open' : ''} ${dirty ? 'is-dirty' : ''}`}>
      <h3 className="tx-row__heading">
        <button
          type="button"
          className="tx-row__head"
          aria-expanded={open}
          aria-controls={`tx-message-${number}`}
          onClick={onToggle}
        >
          <span className="tx-row__label">
            <span className="tx-row__num">#{label}</span>
            <span className="tx-row__sep" aria-hidden="true">—</span>
            <span className="tx-row__title">{t('text_editor_message_title', { n: label })}</span>
            {custom ? <span className="tx-row__badge">{t('text_editor_custom')}</span> : null}
            {dirty ? (
              <span className="tx-row__dot" title={t('settings_unsaved')} aria-label={t('settings_unsaved')} />
            ) : null}
          </span>
          <span className="tx-row__chevron" aria-hidden="true">
            <Icon name="chevronDown" size={16} />
          </span>
        </button>
      </h3>

      {open ? (
        <div className="tx-row__body" id={`tx-message-${number}`}>
          <div className="tx-langs">
            {FIELDS.map((field) => (
              <label className="tx-lang" key={field.code}>
                <span className="tx-lang__label">{field.label}</span>
                <textarea
                  ref={(node) => {
                    refs.current[field.code] = node;
                  }}
                  className="tx-lang__input"
                  dir={field.rtl ? 'rtl' : 'ltr'}
                  rows={3}
                  maxLength={MAX_LENGTH}
                  value={values?.[field.code] || ''}
                  disabled={!canManage}
                  placeholder={t('text_editor_field_placeholder')}
                  onChange={(event) => onChange(field.code, event.target.value)}
                />
              </label>
            ))}
          </div>

          {hasPlaceholder ? <p className="tx-placeholders">{t('text_editor_placeholders_hint')}</p> : null}

          <button type="button" className="tx-translate" onClick={onTranslate} disabled={!canManage || translating}>
            {translating ? <span className="spinner" /> : <Icon name="globe" size={15} />}
            {t('text_editor_translate')}
          </button>
        </div>
      ) : null}
    </article>
  );
}
