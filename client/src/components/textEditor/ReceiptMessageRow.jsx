import { useEffect, useRef } from 'react';
import Icon from '../Icon';
import LanguageFlag from '../header/LanguageFlag';
import { useI18n } from '../../i18n';
import { MESSAGE_LOCALES } from '../../receiptMessages';

/*
 * One receipt message: a compact accordion header plus the field of the
 * language that is active in the interface right now. The row is fully
 * controlled — every keystroke reaches the page's single draft store, so
 * opening another row, searching, switching the interface language or
 * collapsing never loses what was typed.
 *
 * Only the active language is rendered and editable: the message the customer
 * reads depends on the menu they opened, so editing it in one language at a
 * time keeps the field wide enough to read, and a disabled language can never
 * leave an empty slot behind.
 */

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
  const { t, locale, rtl } = useI18n();
  const ref = useRef(null);
  const label = String(number).padStart(2, '0');
  const languageLabel = t(`menu_lang_name_${locale}`);
  const hasPlaceholder = MESSAGE_LOCALES.some((code) => /\{[a-z_]+\}/i.test(values?.[code] || ''));

  // Auto-grow so a long message is never clipped while it is being edited.
  useEffect(() => {
    const el = ref.current;
    if (!open || !el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 88), 340)}px`;
  }, [open, locale, values]);

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
          <div className="tx-langs" data-lang={locale}>
            <label className="tx-lang">
              <span className="tx-lang__label">
                <LanguageFlag code={locale} />
                {languageLabel}
              </span>
              <textarea
                ref={ref}
                className="tx-lang__input"
                dir={rtl ? 'rtl' : 'ltr'}
                rows={3}
                maxLength={MAX_LENGTH}
                value={values?.[locale] || ''}
                disabled={!canManage}
                placeholder={t('text_editor_field_placeholder')}
                onChange={(event) => onChange(locale, event.target.value)}
              />
            </label>
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
