import express from 'express';
import { q } from '../db.js';
import { requireAuth, withBusiness, perm } from '../auth.js';
import { ah, bad } from '../lib/http.js';
import { openStatus, zonedNow } from '../lib/hours.js';
import {
  safeZone,
  localDay,
  addDays,
  dayCount,
  buckets,
  rangeWindow,
  previousWindow,
  seriesUnit,
  pctChange,
} from '../lib/ranges.js';

const router = express.Router();
router.use(requireAuth);

const RANGE_KEYS = ['today', 'week', 'month', 'year', 'all', 'custom'];
const DEFAULT_RANGE = 'today';

/* Notification settings a member may change from the dashboard. */
const NOTIF_BOOL_KEYS = ['sound_enabled', 'new_order', 'status_changes', 'daily_summary'];
const SOUND_KEYS = ['classic', 'double', 'soft', 'alert'];

/** Every number on the dashboard is aggregated from this business's records. */
router.get(
  '/',
  withBusiness('staff'),
  perm('dashboard.view'),
  ah(async (req, res) => {
    const b = req.businessId;
    const biz = (await q('SELECT * FROM businesses WHERE id = $1', [b])).rows[0];
    const timezone = safeZone(biz.timezone);

    const range = RANGE_KEYS.includes(String(req.query.range)) ? String(req.query.range) : DEFAULT_RANGE;
    const win = rangeWindow(range, timezone, { from: req.query.from, to: req.query.to });
    const prev = previousWindow(win);
    const today = localDay(timezone);
    const yesterday = addDays(today, -1);

    /*
     * One parameter list shared by both windowed queries. $1 is always the
     * business; the current and the previous window each add tz/from/to right
     * after it, so a placeholder can never point at another window's values.
     */
    const params = [b];
    const slots = {};
    if (win.from) {
      params.push(timezone, win.from, win.to);
      slots.cur = params.length - 2;
    }
    if (prev) {
      params.push(timezone, prev.from, prev.to);
      slots.pre = params.length - 2;
    }
    const orderWindow = (slot) =>
      slot
        ? `(created_at AT TIME ZONE $${slot}::text)::date BETWEEN $${slot + 1}::date AND $${slot + 2}::date`
        : null;

    const curOrder = orderWindow(slots.cur);
    const preOrder = orderWindow(slots.pre);

    /*
     * Views are stored per local day, so they need only the date bounds — a
     * separate parameter list keeps every placeholder used and typed.
     */
    const viewParams = [b];
    let curViews = null;
    let preViews = null;
    if (win.from) {
      viewParams.push(win.from, win.to);
      curViews = `viewed_on BETWEEN $${viewParams.length - 1}::date AND $${viewParams.length}::date`;
    }
    if (prev) {
      viewParams.push(prev.from, prev.to);
      preViews = `viewed_on BETWEEN $${viewParams.length - 1}::date AND $${viewParams.length}::date`;
    }

    /*
     * The insight queries reuse the window placeholders above. "All time" has
     * no window placeholders, so its own parameter list is built explicitly —
     * every placeholder is typed exactly once.
     */
    /* Each insight query gets exactly the placeholders it references — pg
       rejects a statement that receives parameters it never uses. */
    const windowParams = win.from ? [b, timezone, win.from, win.to] : [b];
    const hourParams = win.from ? [b, timezone, win.from, win.to] : [b, timezone];

    const [flow, bestSelling, newOrders, kpiRow, financeRow, viewsRow, firstRow, topProductRow, peakHourRow] = await Promise.all([
      q(`SELECT status, count(*)::int AS c FROM orders WHERE business_id = $1 GROUP BY status`, [b]),
      q(
        `SELECT i.name, sum(i.quantity)::int AS units, sum(i.line_total)::numeric(12,2) AS revenue
           FROM order_items i JOIN orders o ON o.id = i.order_id
          WHERE i.business_id = $1 AND o.status <> 'cancelled'
          GROUP BY i.name ORDER BY units DESC LIMIT 5`,
        [b],
      ),
      /*
       * "New orders" are the ones still in the kitchen pipeline: pending,
       * preparing and ready. A finished or cancelled order is history, so it
       * never appears as new — the same three statuses mark a table as busy in
       * the tables route, so both screens agree on what "active" means.
       */
      q(
        `SELECT o.id, o.order_number, o.status, o.total, o.created_at, o.customer_name,
                t.name AS table_name,
                (SELECT coalesce(sum(i.quantity), 0)::int FROM order_items i WHERE i.order_id = o.id) AS item_count
           FROM orders o LEFT JOIN tables t ON t.id = o.table_id
          WHERE o.business_id = $1 AND o.status IN ('pending', 'preparing', 'ready')
          ORDER BY o.created_at DESC, o.id DESC LIMIT 6`,
        [b],
      ),
      q(
        `SELECT count(*)::int AS total_orders,
                count(*) FILTER (WHERE (created_at AT TIME ZONE $2::text)::date = $3::date)::int AS today_orders,
                count(*) FILTER (WHERE (created_at AT TIME ZONE $2::text)::date = $4::date)::int AS yesterday_orders,
                count(*) FILTER (WHERE status = 'completed')::int AS completed_orders,
                count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_orders
           FROM orders WHERE business_id = $1`,
        [b, timezone, today, yesterday],
      ),
      q(
        `SELECT
           coalesce(sum(total) FILTER (WHERE status <> 'cancelled' ${curOrder ? `AND ${curOrder}` : ''}), 0)::numeric(12,2) AS revenue,
           count(*) FILTER (WHERE status <> 'cancelled' ${curOrder ? `AND ${curOrder}` : ''})::int AS orders,
           ${preOrder
             ? `coalesce(sum(total) FILTER (WHERE status <> 'cancelled' AND ${preOrder}), 0)::numeric(12,2) AS revenue_prev,
                count(*) FILTER (WHERE status <> 'cancelled' AND ${preOrder})::int AS orders_prev`
             : `NULL::numeric(12,2) AS revenue_prev, NULL::int AS orders_prev`}
         FROM orders WHERE business_id = $1`,
        params,
      ),
      q(
        `SELECT count(*) FILTER (WHERE ${curViews || 'true'})::int AS views,
                ${preViews ? `count(*) FILTER (WHERE ${preViews})::int` : 'NULL::int'} AS views_prev
           FROM business_views WHERE business_id = $1`,
        viewParams,
      ),
      q(
        `SELECT min((created_at AT TIME ZONE $2::text)::date)::text AS first_day FROM orders WHERE business_id = $1`,
        [b, timezone],
      ),
      /* Insights are grounded in the same window as the financial cards. */
      q(
        `SELECT i.name, sum(i.quantity)::int AS units
           FROM order_items i JOIN orders o ON o.id = i.order_id
          WHERE i.business_id = $1 AND o.status <> 'cancelled'
            ${curOrder ? `AND ${curOrder}` : ''}
          GROUP BY i.name ORDER BY units DESC, i.name ASC LIMIT 1`,
        windowParams,
      ),
      q(
        `SELECT extract(hour FROM created_at AT TIME ZONE $2::text)::int AS hour, count(*)::int AS c
           FROM orders
          WHERE business_id = $1 AND status <> 'cancelled'
            ${curOrder ? `AND ${curOrder}` : ''}
          GROUP BY 1 ORDER BY c DESC, hour ASC LIMIT 1`,
        hourParams,
      ),
    ]);

    const finance = financeRow.rows[0];
    const orderCount = Number(finance.orders) || 0;

    /*
     * Revenue per recorded currency. IQD, Toman and USD orders are never added
     * together — each currency keeps its own total, and the headline figure is
     * the business's own currency (or the only currency there is). Nothing is
     * converted and no exchange rate is invented.
     */
    const byCurrencyParams = [...params, biz.currency || 'IQD'];
    const byCurrency = await q(
      `SELECT coalesce(currency, $${byCurrencyParams.length}::text) AS currency,
              count(*) FILTER (WHERE status <> 'cancelled' ${curOrder ? `AND ${curOrder}` : ''})::int AS orders,
              coalesce(sum(total) FILTER (WHERE status <> 'cancelled' ${curOrder ? `AND ${curOrder}` : ''}), 0)::numeric(12,2) AS amount
         FROM orders WHERE business_id = $1
        GROUP BY 1 ORDER BY amount DESC`,
      byCurrencyParams,
    );
    const currencyTotals = byCurrency.rows
      .map((row) => ({
        currency: row.currency || biz.currency || 'IQD',
        orders: Number(row.orders) || 0,
        amount: Number(row.amount) || 0,
      }))
      .filter((row) => row.orders > 0);
    const primaryCurrency = biz.currency || 'IQD';
    const primaryTotal = currencyTotals.find((row) => row.currency === primaryCurrency);
    const revenue = currencyTotals.length > 1
      ? primaryTotal?.amount || 0
      : currencyTotals[0]?.amount ?? Number(finance.revenue) || 0;

    /* ---- order-flow series: real orders, bucketed in the business zone ---- */
    const seriesFrom = win.from || firstRow.rows[0]?.first_day || null;
    const seriesTo = win.to || today;
    const spanDays = seriesFrom ? dayCount(seriesFrom, seriesTo) : 0;
    const unit = seriesUnit(win, spanDays);

    let points = [];
    if (seriesFrom) {
      const bucketExpr = {
        hour: `extract(hour FROM created_at AT TIME ZONE $2::text)::int`,
        month: `to_char(date_trunc('month', created_at AT TIME ZONE $2::text), 'YYYY-MM-DD')`,
        year: `to_char(date_trunc('year', created_at AT TIME ZONE $2::text), 'YYYY-01-01')`,
        day: `to_char((created_at AT TIME ZONE $2::text)::date, 'YYYY-MM-DD')`,
      }[unit];

      const byHour = unit === 'hour';
      const seriesParams = byHour ? [b, timezone, today] : [b, timezone, seriesFrom, seriesTo];
      const seriesWhere = byHour
        ? `AND (created_at AT TIME ZONE $2::text)::date = $3::date`
        : `AND (created_at AT TIME ZONE $2::text)::date BETWEEN $3::date AND $4::date`;

      const { rows } = await q(
        `SELECT ${bucketExpr} AS bucket, count(*)::int AS c
           FROM orders WHERE business_id = $1 ${seriesWhere}
          GROUP BY 1 ORDER BY 1`,
        seriesParams,
      );

      const counts = new Map(
        rows.map((r) => [byHour ? String(Number(r.bucket)) : String(r.bucket), Number(r.c)]),
      );
      points = byHour
        ? Array.from({ length: 24 }, (_, h) => {
            const label = String(h).padStart(2, '0');
            return { t: label, value: counts.get(String(h)) || 0 };
          })
        : buckets(unit, seriesFrom, seriesTo).map((t) => ({ t, value: counts.get(t) || 0 }));
    }

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
        dashboard_settings: biz.dashboard_settings,
        socials: biz.socials,
        logo_url: biz.logo_url,
      },
      notification_settings: biz.notification_settings,
      order_flow: Object.fromEntries(flow.rows.map((r) => [r.status, r.c])),
      order_flow_total: flow.rows.reduce((s, r) => s + r.c, 0),
      best_selling: bestSelling.rows,
      new_orders: newOrders.rows,
      kpi: kpiRow.rows[0],
      finance: {
        range: win.key,
        from: win.from,
        to: win.to,
        revenue,
        currency: primaryCurrency,
        // One entry per currency actually used — never a mixed sum.
        revenue_by_currency: currencyTotals,
        orders: orderCount,
        avg_order: (primaryTotal?.orders || 0) > 0
          ? Number((revenue / primaryTotal.orders).toFixed(2))
          : orderCount > 0 && currencyTotals.length <= 1
            ? Number((revenue / orderCount).toFixed(2))
            : 0,
        views: Number(viewsRow.rows[0].views) || 0,
        views_prev: viewsRow.rows[0].views_prev === null ? null : Number(viewsRow.rows[0].views_prev) || 0,
        views_pct: pctChange(viewsRow.rows[0].views, viewsRow.rows[0].views_prev),
        revenue_prev: finance.revenue_prev === null ? null : Number(finance.revenue_prev) || 0,
        revenue_pct: pctChange(finance.revenue, finance.revenue_prev),
        orders_prev: finance.orders_prev === null ? null : Number(finance.orders_prev) || 0,
        orders_pct: pctChange(finance.orders, finance.orders_prev),
      },
      series: { unit, points },
      /*
       * Only the raw, verified facts of the selected window are returned here;
       * the dashboard turns them into localized sentences. Nothing is invented
       * when a figure is missing — the client omits that insight instead.
       */
      insights: {
        top_product: topProductRow.rows[0]
          ? { name: topProductRow.rows[0].name, units: Number(topProductRow.rows[0].units) || 0 }
          : null,
        busiest_hour: peakHourRow.rows[0]
          ? { hour: Number(peakHourRow.rows[0].hour), count: Number(peakHourRow.rows[0].c) || 0 }
          : null,
      },
      hours: (() => {
        const now = zonedNow(biz.timezone);
        return {
          ...openStatus(biz.working_hours, biz.timezone),
          now,
          // Today's raw schedule, so the card can show the hours even when the
          // business is closed right now.
          today: now ? biz.working_hours?.[now.dayKey] || null : null,
        };
      })(),
    });
  }),
);

/*
 * Statistics page summary. It reads the same tables and applies the same
 * definitions as the dashboard above — revenue only counts orders that were not
 * cancelled, visits are unique sessions per local day, and every boundary is a
 * business-timezone calendar day. Nothing is calculated on the client.
 *
 *   totals   lifetime visits / revenue plus today's and this week's visits
 *   revenue  the fixed today / this week / this month windows
 *   daily    the seven most recent local days, zero-filled, oldest first
 *   best     the five most ordered products by units sold
 */
router.get(
  '/statistics',
  withBusiness('staff'),
  perm('statistics.view'),
  ah(async (req, res) => {
    const b = req.businessId;
    const biz = (await q('SELECT currency, timezone FROM businesses WHERE id = $1', [b])).rows[0];
    const timezone = safeZone(biz.timezone);
    const today = localDay(timezone);
    const weekFrom = rangeWindow('week', timezone).from;
    const monthFrom = rangeWindow('month', timezone).from;
    const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
    const from = days[0];

    const [viewsRow, revenueRow, dayOrders, dayViews, best] = await Promise.all([
      q(
        `SELECT count(*)::int AS views,
                count(*) FILTER (WHERE viewed_on = $2::date)::int AS today,
                count(*) FILTER (WHERE viewed_on BETWEEN $3::date AND $2::date)::int AS week
           FROM business_views WHERE business_id = $1`,
        [b, today, weekFrom],
      ),
      q(
        `SELECT coalesce(sum(total) FILTER (WHERE status <> 'cancelled'), 0)::numeric(12,2) AS total,
                coalesce(sum(total) FILTER (WHERE status <> 'cancelled'
                  AND (created_at AT TIME ZONE $2::text)::date = $3::date), 0)::numeric(12,2) AS today,
                coalesce(sum(total) FILTER (WHERE status <> 'cancelled'
                  AND (created_at AT TIME ZONE $2::text)::date BETWEEN $4::date AND $3::date), 0)::numeric(12,2) AS week,
                coalesce(sum(total) FILTER (WHERE status <> 'cancelled'
                  AND (created_at AT TIME ZONE $2::text)::date BETWEEN $5::date AND $3::date), 0)::numeric(12,2) AS month
           FROM orders WHERE business_id = $1`,
        [b, timezone, today, weekFrom, monthFrom],
      ),
      q(
        `SELECT to_char((created_at AT TIME ZONE $2::text)::date, 'YYYY-MM-DD') AS day, count(*)::int AS c
           FROM orders
          WHERE business_id = $1
            AND (created_at AT TIME ZONE $2::text)::date BETWEEN $3::date AND $4::date
          GROUP BY 1`,
        [b, timezone, from, today],
      ),
      q(
        `SELECT viewed_on::text AS day, count(*)::int AS c
           FROM business_views
          WHERE business_id = $1 AND viewed_on BETWEEN $2::date AND $3::date
          GROUP BY 1`,
        [b, from, today],
      ),
      q(
        `SELECT i.name, sum(i.quantity)::int AS units
           FROM order_items i JOIN orders o ON o.id = i.order_id
          WHERE i.business_id = $1 AND o.status <> 'cancelled'
          GROUP BY i.name ORDER BY units DESC, i.name ASC LIMIT 5`,
        [b],
      ),
    ]);

    const views = viewsRow.rows[0] || {};
    const money = revenueRow.rows[0] || {};
    const ordersByDay = new Map(dayOrders.rows.map((r) => [r.day, Number(r.c) || 0]));
    const viewsByDay = new Map(dayViews.rows.map((r) => [r.day, Number(r.c) || 0]));

    res.json({
      business: { currency: biz.currency, timezone: biz.timezone },
      totals: {
        views: Number(views.views) || 0,
        views_today: Number(views.today) || 0,
        views_week: Number(views.week) || 0,
        revenue: Number(money.total) || 0,
      },
      revenue: {
        today: Number(money.today) || 0,
        week: Number(money.week) || 0,
        month: Number(money.month) || 0,
      },
      daily: days.map((day) => ({
        day,
        visits: viewsByDay.get(day) || 0,
        orders: ordersByDay.get(day) || 0,
      })),
      best_selling: best.rows,
    });
  }),
);

/**
 * Notification preferences are per business but editable by every member, so
 * they get their own whitelisted endpoint instead of the manager-only profile
 * update. Unlisted keys are preserved, never written by the client.
 */
router.put(
  '/notification-settings',
  withBusiness('staff'),
  ah(async (req, res) => {
    const body = req.body || {};
    const patch = {};
    for (const key of NOTIF_BOOL_KEYS) {
      if (key in body) patch[key] = Boolean(body[key]);
    }
    if ('sound_key' in body) {
      const key = String(body.sound_key);
      if (!SOUND_KEYS.includes(key)) throw bad('INVALID_SOUND', 'sound_key');
      patch.sound_key = key;
    }
    if (!Object.keys(patch).length) throw bad('NO_FIELDS');

    const { rows } = await q(
      `UPDATE businesses
          SET notification_settings = notification_settings || $2::jsonb, updated_at = now()
        WHERE id = $1
      RETURNING notification_settings`,
      [req.businessId, JSON.stringify(patch)],
    );
    res.json({ notification_settings: rows[0].notification_settings });
  }),
);

export default router;
