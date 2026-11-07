import Icon from '../Icon';
import { useI18n } from '../../i18n';
import { fmtNumber } from '../../format';

/*
 * One data module of the Reset Data page.
 *
 * One identical structure for every module: an integrated coloured header
 * (raised 3D icon, localized name and description, and the selection badge in
 * its reserved slot), the body with the live record count, the safety notes and
 * an optional Details expansion for long dependency lists, and the Delete
 * action pinned to the card's bottom edge.
 *
 * The header lives INSIDE the card's own rounded frame — it inherits the top
 * corners, has no detached shadow or double outline, and each module keeps its
 * own semantic colour. The whole card is the selection control (that is what
 * the bulk toolbar acts on). Nothing is drawn while the module is unselected —
 * the badge slot keeps its space, so turning selection on never moves the
 * layout. The Delete button in the footer opens the confirmation for this
 * module alone.
 */
export default function ResetModuleCard({ card, mode, selected, busy, onToggle, onDelete }) {
  const { t, locale } = useI18n();
  const empty = card.count === 0;
  const disabled = empty || busy;

  const toggle = () => {
    if (!disabled) onToggle();
  };

  return (
    <article
      className={['rs-card', `rs-tone--${card.tone}`, selected ? 'is-on' : '', empty ? 'is-empty' : '']
        .filter(Boolean)
        .join(' ')}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={selected}
      aria-disabled={disabled || undefined}
      onClick={toggle}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggle();
        }
      }}
    >
      <header className="rs-card__head">
        <span className="rs-card__icon" aria-hidden="true">
          <Icon name={card.icon} size={22} />
        </span>
        <span className="rs-card__heading">
          <h3 className="rs-card__name">{card.label}</h3>
          <p className="rs-card__desc">{card.desc}</p>
        </span>
        <span className={`rs-card__badge ${selected ? 'is-on' : ''}`} aria-hidden="true">
          <Icon name="check" size={16} />
        </span>
      </header>

      <div className="rs-card__body">
        <div className="rs-card__meta">
          <span className={`rs-card__count ${card.risk ? 'is-risk' : ''}`}>
            <strong>{fmtNumber(card.count, locale)}</strong>
            <em>{t('reset_records_label')}</em>
          </span>
          {card.kept > 0 ? (
            <span className="rs-card__kept">{t('reset_records_total', { count: fmtNumber(card.kept, locale) })}</span>
          ) : null}
          {card.risk && !empty ? (
            <span className="rs-card__risk">
              <Icon name="shield" size={11} />
              {t('reset_risk_badge')}
            </span>
          ) : null}
        </div>

        <div className="rs-card__notes">
          {empty ? (
            <p className="rs-card__empty">
              <Icon name="checkCircle" size={13} />
              {t('reset_empty_card')}
            </p>
          ) : (
            <>
              {card.warning ? <p className="rs-card__warn">{t(card.warning)}</p> : null}
              {card.blocked > 0 ? (
                <p className="rs-card__warn">
                  {t('reset_blocked_note', { count: fmtNumber(card.blocked, locale) })}
                </p>
              ) : null}
              {card.dependents.length ? (
                <details
                  className="rs-card__more"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <summary>
                    <span>{t('reset_impact_short', { count: card.dependents.length })}</span>
                    <Icon name="chevronDown" size={13} />
                  </summary>
                  <ul>
                    {card.dependents.map((dep) => (
                      <li key={dep.key}>
                        <span>{t(dep.labelKey)}</span>
                        <strong>{fmtNumber(dep.count, locale)}</strong>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </>
          )}
        </div>
      </div>

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
