import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { fmtNumber } from '../../format';

/*
 * One data module of the Reset Data page.
 *
 * Compact by construction: the icon, the localized name and the record count
 * share the first row, the description and the impact notes follow, and the
 * Delete action closes the card. Nothing has a fixed height, so a module with
 * one note is never stretched to the size of a module with four.
 *
 * The whole card toggles selection (that is what the bulk toolbar acts on); the
 * Delete button in the footer opens the confirmation for this module alone.
 */
export default function ResetModuleCard({ card, mode, selected, busy, onToggle, onDelete }) {
  const { t, locale } = useI18n();
  const empty = card.count === 0;
  const disabled = empty || busy;

  const depList = card.dependents
    .map((d) => `${t(d.labelKey)} (${fmtNumber(d.count, locale)})`)
    .join(' · ');

  return (
    <article
      className={[
        'rs-card',
        card.risk ? 'rs-card--risk' : '',
        selected ? 'is-on' : '',
        empty ? 'is-empty' : '',
      ].filter(Boolean).join(' ')}
      onClick={() => !disabled && onToggle()}
    >
      <div className="rs-card__head">
        <span className={`rs-card__icon rs-tone--${card.tone}`} aria-hidden="true">
          <Icon name={card.icon} size={20} />
        </span>
        <div className="rs-card__ident">
          <h3 className="rs-card__name">{card.label}</h3>
          <p className="rs-card__desc">{card.desc}</p>
        </div>
        <button
          type="button"
          className="rs-tick"
          aria-pressed={selected}
          aria-label={`${t('reset_select')} — ${card.label}`}
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
        >
          {selected ? <Icon name="check" size={13} /> : null}
        </button>
      </div>

      <div className="rs-card__meta">
        <span className={`rs-card__count ${card.risk ? 'is-risk' : ''}`}>
          <strong>{fmtNumber(card.count, locale)}</strong>
          <em>{t('reset_records_label')}</em>
        </span>
        {card.kept > 0 ? (
          <span className="rs-card__kept">{t('reset_records_total', { count: fmtNumber(card.kept, locale) })}</span>
        ) : null}
        {card.risk ? (
          <span className="rs-card__risk">
            <Icon name="shield" size={11} />
            {t('reset_risk_badge')}
          </span>
        ) : null}
      </div>

      {empty ? (
        <p className="rs-card__empty">
          <Icon name="checkCircle" size={13} />
          {t('reset_empty_card')}
        </p>
      ) : (
        <>
          {card.warning ? <p className="rs-card__warn">{t(card.warning)}</p> : null}
          {depList ? <p className="rs-card__dep">{t('reset_impact', { list: depList })}</p> : null}
          {card.blocked > 0 ? (
            <p className="rs-card__warn">{t('reset_blocked_note', { count: fmtNumber(card.blocked, locale) })}</p>
          ) : null}
        </>
      )}

      <div className="rs-card__foot">
        <button
          type="button"
          className="rs-del"
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
        >
          <Icon name="trash" size={14} />
          {mode === 'data' ? t('reset_action_delete') : t('reset_action')}
        </button>
      </div>
    </article>
  );
}
