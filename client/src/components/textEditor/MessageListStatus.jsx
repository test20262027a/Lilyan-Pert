import { Fragment } from 'react';
import Icon from '../Icon';
import { fmtNumber } from '../../format';
import { useI18n } from '../../i18n';

/*
 * The message list's status bar.
 *
 * It reports what the list is showing — "Showing 1 to 3 of 3 messages" — with
 * the numbers localised for the active language, and it offers a way out of an
 * active search. It is purely presentational: the page owns the filtered rows,
 * so the bar can never disagree with what is rendered above it.
 *
 * The bar is a soft card under the messages. Its single row wraps into a stack
 * on a phone, and every colour and spacing value is a theme token or
 * flow-relative, so it follows the selected appearance and mirrors in RTL
 * without extra overrides.
 */
export default function MessageListStatus({ shown, total, filtering, onClear }) {
  const { t, locale } = useI18n();
  const n = (value) => fmtNumber(value, locale);

  /* The template keeps the sentence order of each language; only the numbers
     are wrapped, so a right-to-left rendering still reads naturally. */
  const numbers = { from: n(1), to: n(shown), total: n(total) };
  const sentence = t('text_editor_status_range')
    .split(/(\{\w+\})/)
    .filter(Boolean)
    .map((part, index) => {
      const token = /^\{(\w+)\}$/.exec(part);
      if (token && numbers[token[1]] !== undefined) {
        return (
          <span className="tx-status__num" key={index}>
            {numbers[token[1]]}
          </span>
        );
      }
      return <Fragment key={index}>{part}</Fragment>;
    });

  return (
    <div className="tx-status" role="status" aria-live="polite">
      <span className="tx-status__icon" aria-hidden="true">
        <Icon name="receipt" size={13} />
      </span>
      <p className="tx-status__text">{sentence}</p>
      {filtering ? (
        <button type="button" className="tx-status__clear" onClick={onClear}>
          <Icon name="close" size={12} />
          {t('action_clear')}
        </button>
      ) : null}
    </div>
  );
}
