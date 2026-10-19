import { useEffect, useRef, useState } from 'react';
import { EmptyState, SectionCard } from '../ui';
import { useI18n } from '../../i18n';
import { fmtNumber, fmtWeekday } from '../../format';

const HEIGHT = 170;
const PAD = { top: 12, right: 10, bottom: 24, left: 10 };

/**
 * Order activity over the last seven days: a thin mint area line for views and
 * a dashed line for orders. The drawing width follows the card, so the chart
 * never distorts and stays readable from 320px up.
 */
export default function ActivityChart({ rows = [], locale, timeZone }) {
  const { t } = useI18n();
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(380);

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

  const hasData = rows.some((r) => Number(r.views) > 0 || Number(r.orders) > 0);
  const max = Math.max(1, ...rows.map((r) => Math.max(Number(r.views), Number(r.orders))));
  const innerW = Math.max(120, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const count = rows.length || 1;
  const x = (i) => PAD.left + (count === 1 ? innerW / 2 : (i * innerW) / (count - 1));
  const y = (value) => PAD.top + innerH - (Math.max(0, Number(value)) / max) * innerH;
  const path = (key) =>
    rows.map((row, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(row[key]).toFixed(1)}`).join(' ');
  const baseline = PAD.top + innerH;

  return (
    <SectionCard
      icon="chart"
      iconClass="ic-teal"
      title={t('dash_daily_views_orders')}
      subtitle={`${t('dash_views')} / ${t('dash_orders')}`}
    >
      <div ref={wrapRef}>
        {!hasData ? (
          <EmptyState icon="chart" title={t('dash_no_activity')} />
        ) : (
          <>
            <svg
              className="chart"
              viewBox={`0 0 ${Math.round(width)} ${HEIGHT}`}
              width="100%"
              height={HEIGHT}
              role="img"
              aria-label={t('dash_daily_views_orders')}
            >
              {[0, 1, 2, 3].map((k) => {
                const line = PAD.top + (k * innerH) / 3;
                return (
                  <line
                    key={k}
                    className="chart__grid"
                    x1={PAD.left}
                    x2={width - PAD.right}
                    y1={line}
                    y2={line}
                  />
                );
              })}

              <path className="chart__area" d={`${path('views')} L${x(count - 1)},${baseline} L${x(0)},${baseline} Z`} />
              <path className="chart__line" d={path('views')} />
              <path className="chart__line chart__line--alt" d={path('orders')} />

              {rows.map((row, i) => (
                <g key={String(row.d)}>
                  <circle className="chart__dot" cx={x(i)} cy={y(row.views)} r={3.2}>
                    <title>{`${fmtWeekday(row.d, locale, timeZone)} · ${t('dash_views')}: ${fmtNumber(row.views, locale)}`}</title>
                  </circle>
                  <text className="chart__x" x={x(i)} y={HEIGHT - 7}>
                    {fmtWeekday(row.d, locale, timeZone)}
                  </text>
                </g>
              ))}
            </svg>

            <div className="chart-legend">
              <span className="chart-legend__item">
                <span className="chart-legend__swatch" />
                {t('dash_views')}
              </span>
              <span className="chart-legend__item">
                <span className="chart-legend__swatch chart-legend__swatch--alt" />
                {t('dash_orders')}
              </span>
            </div>
          </>
        )}
      </div>
    </SectionCard>
  );
}
