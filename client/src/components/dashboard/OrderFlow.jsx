import { useEffect, useRef, useState } from 'react';
import { EmptyState, SectionCard } from '../ui';
import { useI18n } from '../../i18n';
import { fmtMonth, fmtNumber } from '../../format';

const HEIGHT = 190;
const PAD = { top: 12, right: 12, bottom: 26, left: 28 };

const labelFor = (point, unit, locale, timeZone) => {
  if (unit === 'hour') return point.t;
  if (unit === 'year') return String(point.t).slice(0, 4);
  if (unit === 'month') return fmtMonth(point.t, locale, timeZone);
  return String(Number(String(point.t).slice(8, 10)));
};

/**
 * Order flow: real orders per hour, day or month depending on the selected
 * period. The drawing width follows its card, so no axis label is ever clipped
 * and a period with no orders still shows a properly labelled zero baseline.
 */
export default function OrderFlow({ series, locale, timeZone }) {
  const { t } = useI18n();
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(420);

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

  const points = series?.points || [];
  const unit = series?.unit || 'day';
  const max = points.reduce((m, p) => Math.max(m, Number(p.value) || 0), 0);
  const niceMax = Math.max(4, Math.ceil(max / 4) * 4);
  const innerW = Math.max(120, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const count = points.length;
  const x = (i) => PAD.left + (count <= 1 ? innerW / 2 : (i * innerW) / (count - 1));
  const y = (value) => PAD.top + innerH - ((Number(value) || 0) / niceMax) * innerH;
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const baseline = PAD.top + innerH;
  const step = count > 12 ? Math.ceil(count / 8) : 1;

  return (
    <SectionCard icon="trendUp" iconClass="ic-blue" title={t('dash_order_flow')} subtitle={t('dash_order_flow_hint')}>
      <div ref={wrapRef}>
        {count === 0 ? (
          <EmptyState icon="chart" title={t('dash_no_data')} />
        ) : (
          <svg
            className="chart"
            viewBox={`0 0 ${Math.round(width)} ${HEIGHT}`}
            width="100%"
            height={HEIGHT}
            role="img"
            aria-label={t('dash_order_flow')}
          >
            {[0, 1, 2, 3, 4].map((k) => {
              const value = (niceMax / 4) * (4 - k);
              const lineY = PAD.top + (k * innerH) / 4;
              return (
                <g key={k}>
                  <line className="chart__grid" x1={PAD.left} x2={width - PAD.right} y1={lineY} y2={lineY} />
                  <text className="chart__y" x={PAD.left - 8} y={lineY + 3.5}>
                    {fmtNumber(value, locale)}
                  </text>
                </g>
              );
            })}

            <line className="chart__axis" x1={PAD.left} x2={width - PAD.right} y1={baseline} y2={baseline} />
            <line className="chart__axis" x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={baseline} />

            {max > 0 ? (
              <path
                className="chart__area"
                d={`${line} L${x(count - 1).toFixed(1)},${baseline} L${x(0).toFixed(1)},${baseline} Z`}
              />
            ) : null}
            <path className="chart__line" d={line} />

            {points.map((point, i) => (
              <g key={`${point.t}-${i}`}>
                {(i % step === 0 || i === count - 1) && (
                  <text className="chart__x" x={x(i)} y={HEIGHT - 8}>
                    {labelFor(point, unit, locale, timeZone)}
                  </text>
                )}
                <circle className="chart__dot" cx={x(i)} cy={y(point.value)} r={3}>
                  <title>{`${labelFor(point, unit, locale, timeZone)} · ${t('dash_orders')}: ${fmtNumber(point.value, locale)}`}</title>
                </circle>
              </g>
            ))}
          </svg>
        )}
      </div>
    </SectionCard>
  );
}
