import Icon from '../Icon';
import { StatusBadge } from '../ui';
import { useI18n } from '../../i18n';
import { fmtDate, fmtTime } from '../../format';
import { ENTITY_KEYS, activityVisual, badgeTone, entityLabelText } from './activityMeta';

/*
 * One activity record: contextual icon and title on the physical right, the
 * responsible member, date and time underneath, the module badge beside the
 * title and the single red delete affordance on the physical left.
 *
 * A record the API marks as protected (order lifecycle, receipt prints,
 * permission changes, backup history) renders the same button disabled with a
 * lock and a localized explanation instead of an action that would fail.
 */
export default function ActivityCard({ row, locale, timeZone, canManage, busy, onDelete }) {
  const { t } = useI18n();
  const visual = activityVisual(row);
  const moduleLabel = ENTITY_KEYS[row.entity] ? t(ENTITY_KEYS[row.entity]) : t('act_title');
  const actionLabel = t(`act_action_${row.action}`);

  const title =
    row.kind === 'order_status'
      ? t('act_order_status_title')
      : row.kind === 'print'
        ? t('act_print_title')
        : `${moduleLabel} · ${actionLabel}`;

  const deletable = Boolean(canManage && row.deletable);
  const lockHint = canManage ? t('act_protected_hint') : t('act_no_permission');

  return (
    <article className="av-card" data-kind={row.kind}>
      <span className={`av-card__icon is-${visual.tone}`}>
        <Icon name={visual.icon} size={17} />
      </span>

      <div className="av-card__body">
        <div className="av-card__head">
          <h3 className="av-card__title">{title}</h3>
          <span className={`av-badge is-${badgeTone(row.entity)}`}>{moduleLabel}</span>
        </div>

        {row.kind === 'order_status' ? (
          <span className="av-card__flow">
            {row.from_status ? <StatusBadge status={row.from_status} /> : null}
            {row.from_status ? <Icon name="arrowRight" size={12} /> : null}
            <StatusBadge status={row.to_status} />
          </span>
        ) : row.kind === 'print' ? (
          row.order_number ? (
            <span className="av-ref">{t('act_order_ref', { number: row.order_number })}</span>
          ) : null
        ) : row.entity_label ? (
          <p className="av-card__desc">{entityLabelText(t, row)}</p>
        ) : null}

        <div className="av-card__meta">
          <span className="av-meta">
            <Icon name="users" size={13} />
            {row.actor_name || t('act_actor_system')}
          </span>
          <span className="av-meta">
            <Icon name="calendar" size={13} />
            <time dateTime={row.at || undefined}>{fmtDate(row.at, locale, timeZone, { short: true })}</time>
          </span>
          <span className="av-meta">
            <Icon name="clock" size={13} />
            {fmtTime(row.at, locale, timeZone)}
          </span>
          {row.kind === 'order_status' && row.order_number ? (
            <span className="av-ref">{t('act_order_ref', { number: row.order_number })}</span>
          ) : null}
        </div>
      </div>

      <span className="av-card__side" title={deletable ? t('act_delete_title') : lockHint}>
        <button
          type="button"
          className={`av-del ${deletable ? '' : 'is-locked'}`}
          onClick={() => onDelete(row)}
          disabled={!deletable || busy}
          aria-label={deletable ? t('act_delete_title') : lockHint}
        >
          <Icon name={deletable ? 'trash' : 'lock'} size={15} />
        </button>
      </span>
    </article>
  );
}
