import express from 'express';
import { q } from '../db.js';
import { requireAuth, withBusiness } from '../auth.js';
import { ah } from '../lib/http.js';
import { openStatus, zonedNow } from '../lib/hours.js';

const router = express.Router();
router.use(requireAuth);

/*
 * Whitelisted date windows for the financial overview. The SQL fragment is
 * taken from this table only, so the client can never inject a clause.
 */
const FINANCE_RANGES = {
  today: "AND created_at::date = CURRENT_DATE",
  '7d': "AND created_at >= CURRENT_DATE - interval '6 days'",
  '30d': "AND created_at >= CURRENT_DATE - interval '29 days'",
  all: '',
};
const DEFAULT_RANGE = '30d';

/** Every number on the dashboard is aggregated from stored records. */
router.get(
  '/',
  withBusiness('staff'),
  ah(async (req, res) => {
    const b = req.businessId;
    const range = Object.prototype.hasOwnProperty.call(FINANCE_RANGES, String(req.query.range))
      ? String(req.query.range)
      : DEFAULT_RANGE;

    const [
      business,
      views,
      flow,
      bestSelling,
      recentNotifications,
      newOrders,
      daily,
      revenue,
      recentStatusChanges,
      reviewSummary,
      finance,
    ] = await Promise.all([
      q('SELECT * FROM businesses WHERE id = $1', [b]),
      q(
        `SELECT count(*)::int AS total,
                count(*) FILTER (WHERE viewed_on = CURRENT_DATE)::int AS today
           FROM business_views WHERE business_id = $1`,
        [b],
      ),
      q(`SELECT status, count(*)::int AS c FROM orders WHERE business_id = $1 GROUP BY status`, [b]),
      q(
        `SELECT i.name, sum(i.quantity)::int AS units, sum(i.line_total)::numeric(12,2) AS revenue
           FROM order_items i JOIN orders o ON o.id = i.order_id
          WHERE i.business_id = $1 AND o.status <> 'cancelled'
          GROUP BY i.name ORDER BY units DESC LIMIT 5`,
        [b],
      ),
      q(
        `SELECT n.*, o.order_number FROM notifications n
           LEFT JOIN orders o ON o.id = n.order_id
          WHERE n.business_id = $1 ORDER BY n.created_at DESC LIMIT 8`,
        [b],
      ),
      q(
        `SELECT o.id, o.order_number, o.status, o.total, o.created_at, o.customer_name, t.name AS table_name
           FROM orders o LEFT JOIN tables t ON t.id = o.table_id
          WHERE o.business_id = $1 ORDER BY o.created_at DESC LIMIT 6`,
        [b],
      ),
      q(
        `WITH days AS (
           SELECT generate_series(CURRENT_DATE - interval '6 days', CURRENT_DATE, interval '1 day')::date AS d
         )
         SELECT days.d,
                (SELECT count(*)::int FROM business_views v WHERE v.business_id = $1 AND v.viewed_on = days.d) AS views,
                (SELECT count(*)::int FROM orders o WHERE o.business_id = $1 AND o.created_at::date = days.d) AS orders,
                (SELECT coalesce(sum(o.total),0)::numeric(12,2) FROM orders o
                  WHERE o.business_id = $1 AND o.created_at::date = days.d AND o.status <> 'cancelled') AS revenue
           FROM days ORDER BY days.d`,
        [b],
      ),
      q(
        `SELECT
           coalesce(sum(total) FILTER (WHERE created_at::date = CURRENT_DATE AND status <> 'cancelled'),0)::numeric(12,2) AS today,
           coalesce(sum(total) FILTER (WHERE created_at >= CURRENT_DATE - interval '6 days' AND status <> 'cancelled'),0)::numeric(12,2) AS week,
           coalesce(sum(total) FILTER (WHERE created_at >= CURRENT_DATE - interval '29 days' AND status <> 'cancelled'),0)::numeric(12,2) AS month,
           coalesce(sum(total) FILTER (WHERE status <> 'cancelled'),0)::numeric(12,2) AS total,
           coalesce(avg(total) FILTER (WHERE status <> 'cancelled'),0)::numeric(12,2) AS avg_order,
           count(*) FILTER (WHERE created_at::date = CURRENT_DATE)::int AS orders_today
         FROM orders WHERE business_id = $1`,
        [b],
      ),
      q(
        `SELECT h.id, h.from_status, h.to_status, h.changed_by_name, h.changed_at, o.order_number
           FROM order_status_history h JOIN orders o ON o.id = h.order_id
          WHERE h.business_id = $1 ORDER BY h.changed_at DESC LIMIT 8`,
        [b],
      ),
      q(
        `SELECT count(*)::int AS total,
                coalesce(avg(rating),0)::numeric(3,2) AS average,
                count(*) FILTER (WHERE status = 'pending')::int AS pending
           FROM reviews WHERE business_id = $1`,
        [b],
      ),
      q(
        `SELECT coalesce(sum(total) FILTER (WHERE status <> 'cancelled'),0)::numeric(12,2) AS revenue,
                count(*)::int AS orders,
                count(*) FILTER (WHERE status = 'completed')::int AS completed,
                coalesce(avg(total) FILTER (WHERE status <> 'cancelled'),0)::numeric(12,2) AS avg_order,
                coalesce(sum(tax) FILTER (WHERE status <> 'cancelled'),0)::numeric(12,2) AS tax,
                coalesce(sum(service_charge) FILTER (WHERE status <> 'cancelled'),0)::numeric(12,2) AS service_charge
           FROM orders WHERE business_id = $1 ${FINANCE_RANGES[range]}`,
        [b],
      ),
    ]);

    const biz = business.rows[0];
    res.json({
      business: {
        id: biz.id,
        name: biz.name,
        name_ku: biz.name_ku,
        name_fa: biz.name_fa,
        name_ar: biz.name_ar,
        name_en: biz.name_en,
        currency: biz.currency,
        timezone: biz.timezone,
        working_hours: biz.working_hours,
        notification_settings: biz.notification_settings,
        socials: biz.socials,
        logo_url: biz.logo_url,
      },
      notification_settings: biz.notification_settings,
      views: views.rows[0],
      order_flow: Object.fromEntries(flow.rows.map((r) => [r.status, r.c])),
      order_flow_total: flow.rows.reduce((s, r) => s + r.c, 0),
      best_selling: bestSelling.rows,
      status_notifications: recentStatusChanges.rows,
      new_orders: newOrders.rows,
      daily: daily.rows,
      revenue: revenue.rows[0],
      finance: { range, ...finance.rows[0] },
      reviews: reviewSummary.rows[0],
      hours: {
        ...openStatus(biz.working_hours, biz.timezone),
        now: zonedNow(biz.timezone),
      },
    });
  }),
);

export default router;
