import { useEffect, useRef, useState } from 'react';
import { EmptyState, SectionCard } from '../ui';
import { useI18n } from '../../i18n';
import { fmtDate, fmtDigits, fmtMonth, fmtNumber } from '../../format';

const HEIGHT = 200;
const PAD = { top: 14, right: 12, bottom: 26, left: 30 };

const labelFor = (point, unit, locale, timeZone) => {
  if (unit === 'hour') return fmtDigits(point.t, locale);
  if (unit === 'year') return fmtDigits(String(point.t).slice(0, 4), locale);
  if (unit === 'month') return fmtMonth(point.t, locale, timeZone);
  return fmtDigits(String(Number(String(point.t).slice(8, 10))), locale);
};

const tipFor = (point, unit, locale, timeZone) => {
  if (unit === 'hour') return fmtDigits(`${point.t}:00`, locale);
  if (unit === 'year') return fmtDigits(String(point.t).slice(0, 4), locale);
  if (unit === 'month') return `${fmtMonth(point.t, locale, timeZone)}/${fmtDigits(String(point.t).slice(0, 4), locale)}`;
  return fmtDate(point.t, locale, timeZone);
};

/** Catmull-Rom smoothing; control points are clamped to the plot area so a
 *  peak can never be drawn above the axis or below zero. */
function smoothPath(pts, top, bottom) {
  if (!pts.length) return '';
  if (pts.length < 3) return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const clampY = (v) => Math.min(bottom, Math.max(top, v));
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const t = 0.18;
    const c1x = p1[0] + (p2[0] - p0[0]) * t;
    const c1y = clampY(p1[1] + (p2[1] - p0[1]) * t);
    const c2x = p2[0] - (p3[0] - p1[0]) * t;
    const c2y = clampY(p2[1] - (p3[1] - p1[1]) * t);
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

/**
 * Order flow: real orders per hour, day or month depending on the selected
 * period. The drawing width follows its card, so no axis label is ever clipped
 * and a period with no orders still shows a properly labelled zero baseline.
 */
export default function OrderFlow({ series, locale, timeZone }) {
  const { t } = useI18n();
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(420);
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

  const points = series?.points || [];
  const unit = series?.unit || 'day';
  const max = points.reduce((m, p) => Math.max(m, Number(p.value) || 0), 0);
  const niceMax = Math.max(4, Math.ceil(max / 4) * 4);
  const innerW = Math.max(120, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const count = points.length;
  const x = (i) => PAD.left + (count <= 1 ? innerW / 2 : (i * innerW) / (count - 1));
  const y = (value) => PAD.top + innerH - ((Number(value) || 0) / niceMax) * innerH;
  const baseline = PAD.top + innerH;
  const coords = points.map((p, i) => [x(i), y(p.value)]);
  const line = smoothPath(coords, PAD.top, baseline);
  const area = count > 0 && max > 0 ? `${line} L${x(count - 1).toFixed(1)},${baseline} L${x(0).toFixed(1)},${baseline} Z` : '';
  const step = count > 12 ? Math.ceil(count / 8) : 1;
  const active = hover !== null && points[hover] ? hover : null;

  return (
    <SectionCard icon="trendUp" iconClass="ic-blue" title={t('dash_order_flow')} subtitle={t('dash_order_flow_hint')}>
      <div className="chart-wrap" ref={wrapRef} onMouseLeave={() => setHover(null)}>
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

            {area ? <path className="chart__area" d={area} /> : null}
            <path className="chart__line" d={line} />

            {points.map((point, i) => (
              <circle
                key={`dot-${point.t}-${i}`}
                className={`chart__dot ${active === i ? 'is-active' : ''}`}
                cx={x(i)}
                cy={y(point.value)}
                r={active === i ? 5 : 3}
              />
            ))}

            {/* Larger invisible hit areas sit on top so hovering is comfortable. */}
            {points.map((point, i) => (
              <circle
                key={`hit-${point.t}-${i}`}
                className="chart__hit"
                cx={x(i)}
                cy={y(point.value)}
                r={Math.max(6, innerW / Math.max(count, 1) / 2)}
                tabIndex={0}
                role="img"
                aria-label={`${tipFor(point, unit, locale, timeZone)} · ${t('dash_orders')}: ${fmtNumber(point.value, locale)}`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              />
            ))}

            {points.map((point, i) =>
              i % step === 0 || i === count - 1 ? (
                <text className="chart__x" x={x(i)} y={HEIGHT - 8} key={`label-${point.t}-${i}`}>
                  {labelFor(point, unit, locale, timeZone)}
                </text>
              ) : null,
            )}
          </svg>
        )}

        {active !== null ? (
          <div
            className="chart__tip"
            /* Kept inside the card so a peak point never clips its own tooltip. */
            style={{
              left: Math.min(Math.max(x(active), 48), Math.max(48, width - 48)),
              top: Math.max(38, y(points[active].value)),
            }}
          >
            {tipFor(points[active], unit, locale, timeZone)} · <span>{t('dash_orders')}</span>{' '}
            {fmtNumber(points[active].value, locale)}
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
