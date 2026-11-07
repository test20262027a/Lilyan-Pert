import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import { fmtNumber } from '../../format';

const HEIGHT = 238;
const VISITS = '#43c45b';
const ORDERS = '#8fd7a6';

/* The app's approved weekday names, Sunday first. */
const DAY_KEYS = [
  'settings_day_sun',
  'settings_day_mon',
  'settings_day_tue',
  'settings_day_wed',
  'settings_day_thu',
  'settings_day_fri',
  'settings_day_sat',
];

/** A soft but readable upper bound, always divisible by four. */
const niceCeiling = (max) => Math.max(4, Math.ceil(max / 4) * 4);

/**
 * Daily visits and orders as two grouped green series over the seven most
 * recent business days. The days arrive zero-filled and in chronological order
 * from the server, so an empty day shows a real zero and is never dropped.
 */
export default function VisitsOrdersChart({ days = [], locale }) {
  const { t, rtl } = useI18n();
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(520);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => {
      const next = Math.round(entries[0].contentRect.width);
      if (next > 0) setWidth(next);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const count = days.length;
  const max = days.reduce((m, d) => Math.max(m, Number(d.visits) || 0, Number(d.orders) || 0), 0);
  const top = niceCeiling(max);
  const pad = { top: 12, bottom: 26, start: 12, end: 34 };
  const plotLeft = rtl ? pad.start : pad.end;
  const plotRight = width - (rtl ? pad.end : pad.start);
  const innerW = Math.max(100, plotRight - plotLeft);
  const innerH = HEIGHT - pad.top - pad.bottom;
  const baseline = pad.top + innerH;
  const slot = count > 0 ? innerW / count : innerW;
  const group = Math.min(40, slot * 0.62);
  const barW = Math.min(16, Math.max(5, group / 2 - 2));
  const y = (value) => pad.top + innerH - ((Number(value) || 0) / top) * innerH;
  const centre = (i) => plotLeft + slot * i + slot / 2;
  const active = hover !== null && days[hover] ? hover : null;
  const dayName = (ymd) => {
    const d = new Date(`${ymd}T12:00:00Z`);
    return t(DAY_KEYS[d.getUTCDay()] || DAY_KEYS[0]);
  };
  /* Narrow charts drop every other weekday label so none ever overlap. */
  const labelStep = slot >= 48 ? 1 : 2;

  return (
    <div className="stat-chart">
      <div className="stat-chart__legend">
        <span className="stat-chart__key">
          <span className="stat-chart__dot" style={{ background: VISITS }} />
          {t('dash_menu_views')}
        </span>
        <span className="stat-chart__key">
          <span className="stat-chart__dot" style={{ background: ORDERS }} />
          {t('dash_orders')}
        </span>
      </div>

      <div className="stat-chart__plot" ref={wrapRef} onMouseLeave={() => setHover(null)}>
        <svg
          className="stat-chart__svg"
          viewBox={`0 0 ${Math.round(width)} ${HEIGHT}`}
          width="100%"
          height={HEIGHT}
          role="img"
          aria-label={t('statistics_visits_orders')}
        >
          {[0, 1, 2, 3, 4].map((k) => {
            const value = (top / 4) * (4 - k);
            const lineY = pad.top + (k * innerH) / 4;
            return (
              <g key={k}>
                <line
                  className="stat-chart__grid"
                  x1={plotLeft}
                  x2={plotRight}
                  y1={lineY}
                  y2={lineY}
                />
                <text
                  className="stat-chart__y"
                  x={rtl ? plotRight + 8 : plotLeft - 8}
                  y={lineY + 3.5}
                  textAnchor={rtl ? 'start' : 'end'}
                >
                  {fmtNumber(value, locale)}
                </text>
              </g>
            );
          })}

          <line
            className="stat-chart__axis"
            x1={plotLeft}
            x2={plotRight}
            y1={baseline}
            y2={baseline}
          />

          {days.map((day, i) => {
            const cx = centre(i);
            const visits = Number(day.visits) || 0;
            const orders = Number(day.orders) || 0;
            return (
              <g key={day.day}>
                {visits > 0 ? (
                  <rect
                    x={cx - barW - 2}
                    y={y(visits)}
                    width={barW}
                    height={Math.max(2, baseline - y(visits))}
                    rx={4}
                    fill={VISITS}
                    opacity={active === null || active === i ? 1 : 0.45}
                  />
                ) : null}
                {orders > 0 ? (
                  <rect
                    x={cx + 2}
                    y={y(orders)}
                    width={barW}
                    height={Math.max(2, baseline - y(orders))}
                    rx={4}
                    fill={ORDERS}
                    opacity={active === null || active === i ? 1 : 0.45}
                  />
                ) : null}
                {i % labelStep === 0 || i === count - 1 ? (
                  <text className="stat-chart__x" x={cx} y={HEIGHT - 8}>
                    {dayName(day.day)}
                  </text>
                ) : null}
              </g>
            );
          })}

          {/* Comfortable hover targets, one per day, drawn above the bars. */}
          {days.map((day, i) => (
            <rect
              key={`hit-${day.day}`}
              className="stat-chart__hit"
              x={plotLeft + slot * i}
              y={pad.top}
              width={slot}
              height={innerH}
              role="img"
              tabIndex={0}
              aria-label={`${dayName(day.day)} · ${t('dash_menu_views')}: ${fmtNumber(
                day.visits,
                locale,
              )} · ${t('dash_orders')}: ${fmtNumber(day.orders, locale)}`}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
            />
          ))}
        </svg>

        {active !== null ? (
          <div
            className="stat-chart__tip"
            style={{
              left: Math.min(Math.max(centre(active), 78), Math.max(78, width - 78)),
              top: 4,
            }}
          >
            <span className="stat-chart__tip-day">{dayName(days[active].day)}</span>
            <span className="stat-chart__tip-row">
              <span className="stat-chart__dot" style={{ background: VISITS }} />
              {t('dash_menu_views')}
              <strong>{fmtNumber(days[active].visits, locale)}</strong>
            </span>
            <span className="stat-chart__tip-row">
              <span className="stat-chart__dot" style={{ background: ORDERS }} />
              {t('dash_orders')}
              <strong>{fmtNumber(days[active].orders, locale)}</strong>
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
