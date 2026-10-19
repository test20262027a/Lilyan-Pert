import { Link } from 'react-router-dom';
import Icon from '../Icon';
import { EmptyState, SectionCard, StatusBadge } from '../ui';
import { useI18n } from '../../i18n';
import { fmtDateTime, fmtMoney, fmtNumber } from '../../format';

/** Full-width card: the newest orders, the latest status changes and reviews. */
export default function RecentActivity({ data, locale, timeZone, currency }) {
  const { t } = useI18n();
  const orders = data.new_orders || [];
  const changes = data.status_notifications || [];
  const reviews = data.reviews || {};

  return (
    <SectionCard
      icon="refresh"
      iconClass="ic-teal"
      title={t('dash_recent_activity')}
      actions={
        <Link className="btn btn--sm" to="/orders">
          {t('action_view')}
        </Link>
      }
    >
      <div className="recent-grid">
        <div className="recent-col">
          <div className="recent-col__title">
            <Icon name="receipt" size={13} />
            {t('dash_new_orders')}
          </div>
          {orders.length === 0 ? (
            <EmptyState icon="receipt" title={t('dash_no_orders')} />
          ) : (
            orders.map((o) => (
              <Link key={o.id} to={`/orders/${o.id}`} className="recent-order">
                <span className="recent-order__no">#{o.order_number}</span>
                <span className="recent-order__meta">
                  {o.table_name || o.customer_name || '—'} · {fmtDateTime(o.created_at, locale, timeZone)}
                </span>
                <StatusBadge status={o.status} />
                <strong style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                  {fmtMoney(o.total, currency, locale)}
                </strong>
              </Link>
            ))
          )}
        </div>

        <div className="recent-col">
          <div className="recent-col__title">
            <Icon name="refresh" size={13} />
            {t('status_change')}
          </div>
          {changes.length === 0 ? (
            <EmptyState icon="refresh" title={t('dash_no_status_changes')} />
          ) : (
            changes.map((row) => (
              <div className="recent-order" key={row.id}>
                <span className="recent-order__no">#{row.order_number}</span>
                <span className="recent-order__meta">{fmtDateTime(row.changed_at, locale, timeZone)}</span>
                {row.from_status ? <StatusBadge status={row.from_status} /> : null}
                <Icon name="arrowRight" size={13} />
                <StatusBadge status={row.to_status} />
              </div>
            ))
          )}
        </div>

        <div className="recent-col">
          <div className="recent-col__title">
            <Icon name="star" size={13} />
            {t('dash_reviews_summary')}
          </div>
          <div className="recent-stat">
            <span className="recent-stat__label">{t('label_total')}</span>
            <span className="recent-stat__value">{fmtNumber(reviews.total || 0, locale)}</span>
          </div>
          <div className="recent-stat">
            <span className="recent-stat__label">{t('dash_rating_average')}</span>
            <span className="recent-stat__value">{Number(reviews.average || 0).toFixed(1)}</span>
          </div>
          <div className="recent-stat">
            <span className="recent-stat__label">{t('dash_review_pending')}</span>
            <span className="recent-stat__value">{fmtNumber(reviews.pending || 0, locale)}</span>
          </div>
          <div style={{ marginTop: 10 }}>
            <Link className="btn btn--sm" to="/reviews">
              {t('action_view')}
            </Link>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
