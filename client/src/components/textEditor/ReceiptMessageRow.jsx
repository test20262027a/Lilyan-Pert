import { useEffect, useRef } from 'react';
import Icon from '../Icon';
import LanguageFlag from '../header/LanguageFlag';
import LanguageFieldsGrid from '../language/LanguageFieldsGrid';
import { isRtl, useI18n } from '../../i18n';
import { MESSAGE_LOCALES } from '../../receiptMessages';
import { fmtDigits } from '../../format';

/*
 * One receipt message: a compact accordion header plus one field per enabled
 * language. The row is fully controlled — every keystroke reaches the page's
 * single draft store, so opening another row, searching, switching a language
 * or collapsing never loses what was typed.
 *
 * Only the languages the owner enabled in Language Settings are rendered, so
 * the grid always matches what is shown: four languages make four columns on a
 * wide screen, two on a tablet and one per row on a phone, and switching a
 * language off never leaves an empty slot behind. A disabled language keeps
 * its saved text — it is hidden, never deleted, and reappears when it is
 * switched back on.
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
  const { t, locale, enabledLanguages } = useI18n();
  const refs = useRef({});
  const label = String(number).padStart(2, '0');
  const languages = enabledLanguages.length ? enabledLanguages : ['ku'];
  const enabledKey = languages.join(',');
  const hasPlaceholder = MESSAGE_LOCALES.some((code) => /\{[a-z_]+\}/i.test(values?.[code] || ''));

  // Auto-grow every visible field so a long message is never clipped while it
  // is being edited; the row keeps its own rhythm in each language column.
  useEffect(() => {
    if (!open) return;
    for (const code of enabledKey.split(',')) {
      const el = refs.current[code];
      if (!el) continue;
      el.style.height = 'auto';
      el.style.height = `${Math.min(Math.max(el.scrollHeight, 84), 320)}px`;
    }
  }, [open, enabledKey, values]);

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
            <span className="tx-row__num">#{fmtDigits(label, locale)}</span>
            <span className="tx-row__sep" aria-hidden="true">—</span>
            <span className="tx-row__title">{t('text_editor_message_title', { n: fmtDigits(label, locale) })}</span>
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

      {/*
        The body stays mounted so the collapse can animate its height instead of
        popping in and out. A closed panel is `inert`, so its fields never take
        focus or a tab stop while it is out of sight.
      */}
      <div className={`tx-row__collapse ${open ? 'is-open' : ''}`} id={`tx-message-${number}`}>
        <div className="tx-row__collapse__inner" inert={open ? undefined : ''}>
          <div className="tx-row__body">
            <div className="tx-langs">
              <LanguageFieldsGrid count={languages.length} variant="text">
                {languages.map((code) => (
                  <label className="tx-lang" key={code}>
                    <span className="tx-lang__label">
                      <LanguageFlag code={code} />
                      {t(`menu_lang_name_${code}`)}
                    </span>
                    <textarea
                      ref={(el) => {
                        if (el) refs.current[code] = el;
                      }}
                      className="tx-lang__input"
                      dir={isRtl(code) ? 'rtl' : 'ltr'}
                      lang={code}
                      rows={3}
                      maxLength={MAX_LENGTH}
                      value={values?.[code] || ''}
                      disabled={!canManage}
                      placeholder={t('text_editor_field_placeholder')}
                      onChange={(event) => onChange(code, event.target.value)}
                    />
                  </label>
                ))}
              </LanguageFieldsGrid>
            </div>

            {hasPlaceholder ? <p className="tx-placeholders">{t('text_editor_placeholders_hint')}</p> : null}

            <button type="button" className="tx-translate" onClick={onTranslate} disabled={!canManage || translating}>
              {translating ? <span className="spinner" /> : <Icon name="globe" size={15} />}
              {t('text_editor_translate')}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
