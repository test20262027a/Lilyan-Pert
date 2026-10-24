/*
 * Illustrated banner for Activity Reports: a golden wall clock over warm
 * sunlight, flanked by two checklist notebooks, a golden pencil, a floating
 * golden check-circle, small green plants, clouds and pale hills.
 *
 * Purely decorative (`aria-hidden`): the page title, subtitle and every control
 * are real DOM outside the picture. The clock sits left of the banner's centre
 * so the heading keeps the physical right side in a right-to-left layout.
 */

/** One notebook row: a ticked box and the ruled line beside it. */
function Row({ x, y, width, done = true, tone = '#43c45b' }) {
  return (
    <>
      <rect
        x={x}
        y={y}
        width="11"
        height="11"
        rx="3"
        fill={done ? '#eaf8ee' : '#ffffff'}
        stroke={done ? tone : '#e3dcc8'}
        strokeWidth="1.3"
      />
      {done ? (
        <path
          d={`M${x + 2.6} ${y + 5.6}l2.1 2.1 3.6-4`}
          fill="none"
          stroke={tone}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      <rect x={x + 17} y={y + 4} width={width} height="3.4" rx="1.7" fill="#e9eddf" />
    </>
  );
}

function Notebook({ x, y, width, height, rotate, rows, tone }) {
  const cx = x + width / 2;
  const cy = y + height / 2;
  return (
    <g transform={`rotate(${rotate} ${cx} ${cy})`}>
      <rect
        x={x + 2}
        y={y + 5}
        width={width}
        height={height}
        rx="12"
        fill="#f4e5bb"
        opacity="0.4"
      />
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx="12"
        fill="#ffffff"
        stroke="#f0e0bd"
        strokeWidth="1.6"
      />
      {/* binding */}
      <rect x={cx - 13} y={y - 4} width="26" height="9" rx="4.5" fill="#f7dc9a" stroke="#eccb84" strokeWidth="1.2" />
      {rows.map((row, i) => (
        <Row key={i} x={x + 12} y={y + 18 + i * 17} width={width - 42} done={row} tone={tone} />
      ))}
    </g>
  );
}

export default function ActivityArtwork() {
  return (
    <svg className="av-art" viewBox="0 0 640 150" aria-hidden="true" focusable="false">
      {/* gentle warm sunlight behind the clock */}
      <circle cx="238" cy="46" r="56" fill="#fdf0c9" />
      <circle cx="238" cy="46" r="34" fill="#f9e2a6" opacity="0.5" />

      {/* soft white clouds */}
      <g fill="#ffffff" opacity="0.88">
        <ellipse cx="470" cy="40" rx="22" ry="8.5" />
        <ellipse cx="484" cy="33" rx="12" ry="7.5" />
        <ellipse cx="118" cy="30" rx="18" ry="7" />
        <ellipse cx="352" cy="112" rx="14" ry="5.5" />
      </g>

      {/* pale hills */}
      <path
        d="M0 116c86 0 132-20 206-20s104 18 166 18 100-20 160-20 76 10 108 10v46H0z"
        fill="#fdf1c6"
      />
      <path d="M0 134c74-9 138 7 216 7s146-13 224-7 138 3 200-4v20H0z" fill="#e9f4dc" />

      {/* the clock platform */}
      <ellipse cx="238" cy="118" rx="62" ry="8" fill="#f3e4bb" opacity="0.85" />
      <ellipse cx="238" cy="122" rx="40" ry="5" fill="#fffbf2" opacity="0.9" />

      {/* left checklist notebook */}
      <Notebook x={112} y={48} width={76} height={68} rotate={-7} rows={[true, true, false]} tone="#43c45b" />

      {/* the golden clock */}
      <g>
        <circle cx="238" cy="74" r="42" fill="#f3e4bb" opacity="0.35" />
        <circle cx="238" cy="70" r="38" fill="#fffdf4" stroke="#e9c979" strokeWidth="3" />
        <circle cx="238" cy="70" r="31" fill="none" stroke="#f4e5c0" strokeWidth="1.4" />
        {/* hour ticks */}
        <g stroke="#e8c473" strokeWidth="2" strokeLinecap="round">
          <path d="M238 40v5M238 95v5M208 70h5M263 70h5" />
        </g>
        <g stroke="#e9c979" strokeWidth="1.2" strokeLinecap="round" opacity="0.75">
          <path d="M259 49h0M217 49h0M217 91h0M259 91h0" strokeWidth="3" />
        </g>
        {/* hands */}
        <g stroke="#e49127" strokeWidth="3.4" strokeLinecap="round" fill="none">
          <path d="M238 70V50" />
          <path d="M238 70h17" stroke="#f0a94a" />
        </g>
        <circle cx="238" cy="70" r="3.4" fill="#dd8b1f" />
      </g>

      {/* right notepad */}
      <Notebook x={314} y={54} width={74} height={62} rotate={6} rows={[true, false]} tone="#43c45b" />

      {/* golden pencil */}
      <g transform="rotate(28 352 28)">
        <rect x="322" y="21" width="54" height="12" rx="3" fill="#f3c65a" stroke="#e0a72c" strokeWidth="1.2" />
        <rect x="322" y="21" width="11" height="12" rx="3" fill="#efb187" stroke="#e0a72c" strokeWidth="1.1" />
        <path d="M376 21l13 6-13 6z" fill="#f9ebc8" stroke="#e0a72c" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M385 25.6l4 1.4-4 1.4z" fill="#d9c6a0" />
      </g>

      {/* floating golden check-circle */}
      <g>
        <circle cx="404" cy="40" r="15" fill="#ffffff" stroke="#f0d28c" strokeWidth="1.6" />
        <circle cx="404" cy="40" r="10.4" fill="#fdf3d8" />
        <path
          d="M399.6 40.4l3 3 5.8-6.2"
          fill="none"
          stroke="#dc9a20"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* small green plants */}
      <g>
        <path d="M104 122c-15-1-25-10-27-24 14 0 25 9 27 24z" fill="#cfe8bd" />
        <path d="M104 122c2 8 8 12 16 14 1-10-6-14-16-14z" fill="#e0efd2" />
        <path d="M436 120c14-1 23-9 25-22-13 0-23 9-25 22z" fill="#cfe8bd" opacity="0.85" />
        <path d="M436 120c-2 7-7 11-14 13-1-9 5-13 14-13z" fill="#e6f2d8" />
      </g>

      {/* floating golden and green circles */}
      <circle cx="462" cy="86" r="5.2" fill="#f6d78a" opacity="0.9" />
      <circle cx="176" cy="96" r="3.6" fill="#f4cf7c" opacity="0.8" />
      <circle cx="404" cy="104" r="4.6" fill="#d9eec6" opacity="0.9" />
      <circle cx="298" cy="34" r="3" fill="#f0cfa0" opacity="0.85" />
      <circle cx="150" cy="34" r="2.6" fill="#f6d78a" opacity="0.8" />
    </svg>
  );
}
