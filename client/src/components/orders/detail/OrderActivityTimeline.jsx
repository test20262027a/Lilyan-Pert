import { useMemo } from 'react';
import Icon from '../../Icon';
import { Money, StatusBadge } from '../../ui';
import { useI18n } from '../../../i18n';
import { fmtDateTime } from '../../../format';

/*
 * The order's real activity, newest first: the status history the app already
 * writes, the receipt prints and the manual-discount audit. Nothing is
 * synthesized — an order with no records simply shows the empty hint.
 */
export default function OrderActivityTimeline({
  order,
  history = [],
  prints = [],
  discounts = [],
  currency,
  timeZone,
}) {
  const { t, locale } = useI18n();

  const events = useMemo(() => {
    const rows = [];

    for (const h of history) {
      rows.push({
        id: `s-${h.id}`,
        kind: h.from_status ? 'status' : 'created',
        at: h.changed_at,
        actor: h.changed_by_name || h.changed_by_email || null,
        from: h.from_status,
        to: h.to_status,
      });
    }
    for (const p of prints) {
      rows.push({ id: `p-${p.id}`, kind: 'print', at: p.printed_at, actor: p.printed_by_name || null });
    }
    for (const d of discounts) {
      rows.push({
        id: `d-${d.id}`,
        kind: 'discount',
        action: d.action,
        at: d.created_at,
        actor: d.actor_name || null,
        amount: Number(d.discount_amount) || 0,
        type: d.discount_type,
        value: Number(d.discount_value) || 0,
      });
    }

    return rows.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [history, prints, discounts]);

  if (!events.length) {
    return <p className="odm-activity__empty">{t('od_no_activity')}</p>;
  }

  return (
    <ol className="odm-activity">
      {events.map((event) => (
        <li key={event.id} className={`odm-activity__row odm-activity__row--${event.kind}`}>
          <span className="odm-activity__icon" aria-hidden="true">
            <Icon
              name={
                event.kind === 'created'
                  ? 'cart'
                  : event.kind === 'print'
                    ? 'print'
                    : event.kind === 'discount'
                      ? 'percent'
                      : 'refresh'
              }
              size={13}
            />
          </span>

          <div className="odm-activity__body">
            <div className="odm-activity__line">
              {event.kind === 'status' ? (
                <>
                  <StatusBadge status={event.from} />
                  <Icon name="arrowRight" size={12} className="odm-activity__arrow" />
                  <StatusBadge status={event.to} />
                </>
              ) : event.kind === 'created' ? (
                <>
                  <span className="odm-activity__text">{t('od_event_created')}</span>
                  <StatusBadge status={event.to} />
                </>
              ) : event.kind === 'print' ? (
                <span className="odm-activity__text">{t('od_event_printed')}</span>
              ) : (
                <>
                  <span className="odm-activity__text">
                    {t(
                      event.action === 'removed'
                        ? 'od_event_discount_removed'
                        : event.action === 'changed'
                          ? 'od_event_discount_changed'
                          : 'od_event_discount_applied',
                    )}
                  </span>
                  {event.action !== 'removed' && event.amount > 0 ? (
                    <span className="odm-activity__amount">
                      −<Money value={event.amount} currency={currency} />
                      {event.type === 'percent' ? ` (${event.value}%)` : ''}
                    </span>
                  ) : null}
                </>
              )}
            </div>
            <div className="odm-activity__meta">
              {event.actor ? <span>{event.actor}</span> : null}
              <span>{fmtDateTime(event.at, locale, timeZone)}</span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
