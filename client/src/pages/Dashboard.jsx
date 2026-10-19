import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import { LiveClock } from '../components/Layout';
import { Alert, Badge, Loading, SectionCard, SwitchRow, useToast } from '../components/ui';
import WelcomeBanner from '../components/dashboard/WelcomeBanner';
import KpiCards from '../components/dashboard/KpiCards';
import FinanceOverview from '../components/dashboard/FinanceOverview';
import ActivityChart from '../components/dashboard/ActivityChart';
import BestSelling from '../components/dashboard/BestSelling';
import StatusBreakdown from '../components/dashboard/StatusBreakdown';
import RecentActivity from '../components/dashboard/RecentActivity';
import { useI18n } from '../i18n';
import { useBusiness } from '../context/BusinessContext';
import { usePush } from '../hooks/usePush';
import { get } from '../api';
import { fmtDate, fmtNumber, zoneFor } from '../format';
import '../dashboard.css';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export default function Dashboard() {
  const { t, locale } = useI18n();
  const { business, save } = useBusiness();
  const toast = useToast();
  const push = usePush();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [range, setRange] = useState('30d');

  // The financial window is a real backend filter: the API recomputes the
  // figures for the requested range, so nothing is recalculated on the client.
  useEffect(() => {
    let alive = true;
    setRefreshing(true);
    (async () => {
      try {
        const res = await get(`/dashboard?range=${range}`);
        if (!alive) return;
        setData(res);
        setFailed(false);
      } catch {
        if (alive) setFailed(true);
      } finally {
        if (alive) {
          setRefreshing(false);
          setLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [range]);

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
    <div className="dash">
      <WelcomeBanner business={business || data.business} />

      {failed ? <Alert kind="error">{t('error_generic')}</Alert> : null}

      {/* ---- Top information row: date & hours, then notification settings ---- */}
      <div className="dash-row dash-row--info">
        <section className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <header className="card__head">
            <span className="card__icon ic-green">
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
        </SectionCard>
      </div>

      {/* ---- Main statistics ---- */}
      <KpiCards data={data} locale={locale} currency={currency} />

      {/* ---- Financial overview ---- */}
      <FinanceOverview
        finance={data.finance}
        range={range}
        onRangeChange={setRange}
        busy={refreshing}
        currency={currency}
        locale={locale}
      />

      {/* ---- Charts and product analytics ---- */}
      <div className="dash-row dash-row--analytics">
        <ActivityChart rows={data.daily || []} locale={locale} timeZone={timeZone} />
        <BestSelling rows={data.best_selling || []} currency={currency} locale={locale} />
      </div>

      {/* ---- Order status ---- */}
      <StatusBreakdown flow={data.order_flow || {}} />

      {/* ---- Recent activity ---- */}
      <RecentActivity data={data} locale={locale} timeZone={timeZone} currency={currency} />
    </div>
  );
}
