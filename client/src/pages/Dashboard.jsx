import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import { LiveClock } from '../components/Layout';
import { Alert, Badge, Card, EmptyState, Loading, Money, SectionCard, StatusBadge, SwitchRow, useToast } from '../components/ui';
import { localized, useI18n } from '../i18n';
import { useBusiness } from '../context/BusinessContext';
import { usePush } from '../hooks/usePush';
import { get } from '../api';
import { fmtDate, fmtDateTime, fmtNumber, fmtWeekday, zoneFor } from '../format';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function Bars({ rows, locale, timeZone }) {
  const max = Math.max(1, ...rows.map((r) => Math.max(Number(r.views), Number(r.orders))));
  return (
    <div className="bars">
      {rows.map((r) => (
        <div className="bar-col" key={String(r.d)}>
          <div className="bar-col__bars">
            <div className="bar" style={{ height: `${(Number(r.views) / max) * 100}%` }} title={`${r.views}`} />
            <div className="bar bar--alt" style={{ height: `${(Number(r.orders) / max) * 100}%` }} title={`${r.orders}`} />
          </div>
          <span className="bar-col__label">{fmtWeekday(r.d, locale, timeZone)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { t, locale } = useI18n();
  const { business, save } = useBusiness();
  const toast = useToast();
  const push = usePush();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await get('/dashboard');
        if (alive) setData(res);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const timeZone = zoneFor(locale, business?.timezone);
  const currency = data?.business?.currency || business?.currency;

  const todayHours = useMemo(() => {
    const hours = data?.business?.working_hours || {};
    const now = data?.hours?.now;
    const day = now ? hours[now.dayKey] : null;
    const dayKey = now?.dayKey || DAY_KEYS[new Date().getDay()];
    return { day, dayKey };
  }, [data]);

  if (loading) return <Loading />;
  if (!data) return <Alert kind="error">{t('error_generic')}</Alert>;

  const flow = data.order_flow || {};
  const flowTotal = data.order_flow_total || 1;
  const notif = data.notification_settings || {};
  const openStatus = data.hours || {};

  const updateNotification = async (key, value) => {
    const next = { ...notif, [key]: value };
    try {
      await save({ notification_settings: next });
      setData((d) => ({ ...d, notification_settings: next, business: { ...d.business, notification_settings: next } }));
    } catch {
      toast.error(t('error_generic'));
    }
  };

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <h1>{t('dash_title')}</h1>
          <p>{t('dash_subtitle')}</p>
        </div>
      </div>

      <div className="grid grid--2" style={{ alignItems: 'stretch' }}>
        {/* ---- Date and Working Hours: header carries the open/closed state ---- */}
        <section className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <header className="card__head">
            <span className="card__icon ic-indigo">
              <Icon name="clock" size={18} />
            </span>
            <div className="card__titles">
              <div className="card__title">{t('dash_date_hours')}</div>
              <div className="card__subtitle">{fmtDate(new Date(), locale, timeZone, { weekday: true })}</div>
            </div>
            {openStatus.valid ? (
              <Badge kind={openStatus.is_open ? 'active' : 'inactive'}>
                <span className={`live-dot ${openStatus.is_open ? '' : 'live-dot--off'}`} />
                {openStatus.is_open ? t('dash_open_now') : t('dash_closed_now')}
              </Badge>
            ) : (
              <Badge kind="inactive">{t('dash_hours_unknown')}</Badge>
            )}
          </header>
          <div className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: '1 1 auto' }}>
            <div className="grid grid--2">
              <div className="stat">
                <div className="stat__label">
                  <Icon name="clock" size={13} /> {t('dash_live_time')}
                </div>
                <div className="stat__value">
                  <LiveClock timeZone={timeZone} />
                </div>
              </div>
              <div className="stat">
                <div className="stat__label">
                  <Icon name="calendar" size={13} /> {t('dash_working_hours')}
                </div>
                <div className="stat__value" style={{ fontSize: 16 }}>
                  {todayHours.day && !todayHours.day.closed
                    ? `${todayHours.day.open} – ${todayHours.day.close}`
                    : t('settings_closed_today')}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 'auto' }}>
              <Link className="btn btn--sm" to="/settings">
                <Icon name="settings" size={14} />
                {t('sec_hours')}
              </Link>
            </div>
          </div>
        </section>

        {/* ---- Notification Settings ---- */}
        <SectionCard
          icon="bell"
          iconClass="ic-amber"
          title={t('dash_notification_settings')}
          subtitle={t('dash_notification_hint')}
        >
          <SwitchRow
            title={t('dash_sound')}
            checked={notif.sound_enabled !== false}
            onChange={(v) => updateNotification('sound_enabled', v)}
          />
          <SwitchRow
            title={t('settings_new_order_alerts')}
            hint={t('dash_new_orders_only')}
            checked={notif.new_order !== false}
            onChange={(v) => updateNotification('new_order', v)}
          />
          <SwitchRow
            title={t('settings_status_alerts')}
            checked={Boolean(notif.status_changes)}
            onChange={(v) => updateNotification('status_changes', v)}
          />
          <SwitchRow
            title={t('settings_daily_summary')}
            checked={Boolean(notif.daily_summary)}
            onChange={(v) => updateNotification('daily_summary', v)}
          />

          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="switch-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <div className="switch-row__text">
                <div className="switch-row__title">{t('dash_push')}</div>
                <div className="switch-row__hint">
                  {push.supported
                    ? `${t('dash_push_devices')}: ${fmtNumber(push.devices, locale)}`
                    : t('dash_push_unsupported')}
                </div>
              </div>
              {push.supported ? (
                <button
                  className={`btn btn--sm ${push.subscribed ? '' : 'btn--primary'}`}
                  disabled={push.busy}
                  onClick={async () => {
                    const res = push.subscribed ? await push.disable() : await push.enable();
                    if (res.ok) toast.success(push.subscribed ? t('action_saved') : t('dash_push_enabled'));
                    else if (res.reason === 'denied') toast.error(t('dash_push_denied'));
                    else if (res.reason === 'unsupported') toast.error(t('dash_push_unsupported'));
                    else toast.error(t('error_generic'));
                  }}
                >
                  {push.busy ? <span className="spinner" /> : <Icon name="bell" size={15} />}
                  {push.subscribed ? t('action_clear') : t('dash_enable_push')}
                </button>
              ) : null}
            </div>
          </div>
        </SectionCard>

        {/* ---- Business Views ---- */}
        <SectionCard icon="eye" iconClass="ic-blue" title={t('dash_business_views')}>
          <div className="stat-row">
            <div className="stat">
              <div className="stat__label">{t('dash_views_total')}</div>
              <div className="stat__value">{fmtNumber(data.views?.total || 0, locale)}</div>
            </div>
            <div className="stat">
              <div className="stat__label">{t('dash_views_today')}</div>
              <div className="stat__value">{fmtNumber(data.views?.today || 0, locale)}</div>
            </div>
          </div>
        </SectionCard>

        {/* ---- Revenue Statistics ---- */}
        <SectionCard icon="wallet" iconClass="ic-green" title={t('dash_revenue')}>
          <div className="stat-row">
            <div className="stat">
              <div className="stat__label">{t('dash_revenue_today')}</div>
              <div className="stat__value" style={{ fontSize: 17 }}>
                <Money value={data.revenue?.today} currency={currency} />
              </div>
            </div>
            <div className="stat">
              <div className="stat__label">{t('dash_revenue_week')}</div>
              <div className="stat__value" style={{ fontSize: 17 }}>
                <Money value={data.revenue?.week} currency={currency} />
              </div>
            </div>
            <div className="stat">
              <div className="stat__label">{t('dash_revenue_month')}</div>
              <div className="stat__value" style={{ fontSize: 17 }}>
                <Money value={data.revenue?.month} currency={currency} />
              </div>
            </div>
            <div className="stat">
              <div className="stat__label">{t('dash_avg_order')}</div>
              <div className="stat__value" style={{ fontSize: 17 }}>
                <Money value={data.revenue?.avg_order} currency={currency} />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ---- Order Flow ---- */}
        <SectionCard icon="chart" iconClass="ic-purple" title={t('dash_order_flow')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['pending', 'preparing', 'ready', 'completed', 'cancelled'].map((status) => {
              const count = Number(flow[status] || 0);
              return (
                <div key={status}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
                    <StatusBadge status={status} />
                    <strong style={{ fontSize: 13.5 }}>{fmtNumber(count, locale)}</strong>
                  </div>
                  <div className="progress">
                    <div className="progress__fill" style={{ width: `${(count / flowTotal) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* ---- Daily views and orders ---- */}
        <SectionCard
          icon="calendar"
          iconClass="ic-teal"
          title={t('dash_daily_views_orders')}
          subtitle={`${t('dash_views')} / ${t('dash_orders')}`}
        >
          <Bars rows={data.daily || []} locale={locale} timeZone={timeZone} />
        </SectionCard>

        {/* ---- Best selling ---- */}
        <SectionCard icon="star" iconClass="ic-amber" title={t('dash_best_selling')}>
          {(data.best_selling || []).length === 0 ? (
            <EmptyState icon="chart" title={t('dash_no_products')} />
          ) : (
            data.best_selling.map((row, i) => (
              <div className="rank-row" key={row.name}>
                <span className="rank-row__num">{i + 1}</span>
                <span className="rank-row__name" title={row.name}>{row.name}</span>
                <span className="rank-row__value">
                  {fmtNumber(row.units, locale)} {t('dash_units')}
                </span>
              </div>
            ))
          )}
        </SectionCard>

        {/* ---- Most ordered ---- */}
        <SectionCard icon="coffee" iconClass="ic-coral" title={t('dash_most_ordered')}>
          {(data.best_selling || []).length === 0 ? (
            <EmptyState icon="coffee" title={t('dash_no_products')} />
          ) : (
            data.best_selling.map((row, i) => (
              <div className="rank-row" key={`most-${row.name}`}>
                <span className="rank-row__num">{i + 1}</span>
                <span className="rank-row__name" title={row.name}>{row.name}</span>
                <span className="rank-row__value">
                  <Money value={row.revenue} currency={currency} />
                </span>
              </div>
            ))
          )}
        </SectionCard>

        {/* ---- Order status notifications ---- */}
        <SectionCard icon="bell" iconClass="ic-blue" title={t('dash_status_notifications')}>
          {(data.status_notifications || []).length === 0 ? (
            <EmptyState icon="bell" title={t('dash_no_status_changes')} />
          ) : (
            data.status_notifications.map((row) => (
              <div className="rank-row" key={row.id}>
                <span className="rank-row__name">#{row.order_number}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {row.from_status ? <StatusBadge status={row.from_status} /> : null}
                  <Icon name="arrowRight" size={14} />
                  <StatusBadge status={row.to_status} />
                </span>
              </div>
            ))
          )}
        </SectionCard>

        {/* ---- New orders ---- */}
        <SectionCard
          icon="receipt"
          iconClass="ic-purple"
          title={t('dash_new_orders')}
          actions={
            <Link className="btn btn--sm" to="/orders">
              {t('action_view')}
            </Link>
          }
        >
          {(data.new_orders || []).length === 0 ? (
            <EmptyState icon="receipt" title={t('dash_no_orders')} />
          ) : (
            data.new_orders.map((o) => (
              <Link
                key={o.id}
                to={`/orders/${o.id}`}
                className="rank-row"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <span className="rank-row__name">#{o.order_number}</span>
                <span className="rank-row__value">
                  {o.table_name || o.customer_name || '—'} · {fmtDateTime(o.created_at, locale, timeZone)}
                </span>
                <StatusBadge status={o.status} />
                <strong style={{ fontSize: 13 }}>
                  <Money value={o.total} currency={currency} />
                </strong>
              </Link>
            ))
          )}
        </SectionCard>

        {/* ---- Reviews summary ---- */}
        <SectionCard icon="star" iconClass="ic-pink" title={t('dash_reviews_summary')}>
          <div className="stat-row">
            <div className="stat">
              <div className="stat__label">{t('label_total')}</div>
              <div className="stat__value">{fmtNumber(data.reviews?.total || 0, locale)}</div>
            </div>
            <div className="stat">
              <div className="stat__label">{t('dash_rating_average')}</div>
              <div className="stat__value">{Number(data.reviews?.average || 0).toFixed(1)}</div>
            </div>
            <div className="stat">
              <div className="stat__label">{t('dash_review_pending')}</div>
              <div className="stat__value">{fmtNumber(data.reviews?.pending || 0, locale)}</div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <Link className="btn btn--sm" to="/reviews">
              {t('action_view')}
            </Link>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
