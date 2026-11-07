/*
 * Illustrated banner for the Reviews module: a floating five-star rating plaque
 * over warm sunlight, golden and pale-green rolling hills, white speech bubbles
 * holding a green message icon and a green heart, botanical leaves, clouds and
 * small golden stars.
 *
 * Purely decorative (`aria-hidden`): the page title, subtitle and every control
 * are real DOM outside the picture. The illustration sits toward the left of
 * the flexible middle column so the heading keeps the physical right side in a
 * right-to-left layout.
 */

const STAR_PATH =
  'm12 3.5 2.7 5.6 6.1.85-4.4 4.3 1.05 6.1L12 17.5l-5.45 2.85L7.6 14.25 3.2 9.95l6.1-.85z';

function Star({ x, y, size = 20, fill = '#f6b92b', stroke = '#dea018' }) {
  return (
    <path
      d={STAR_PATH}
      transform={`translate(${x} ${y}) scale(${size / 24})`}
      fill={fill}
      stroke={stroke}
      strokeWidth={1.1}
      strokeLinejoin="round"
    />
  );
}

/** A white speech bubble with a small tail, positioned on the banner. */
function Bubble({ x, y, width, height, tail = 'start' }) {
  const tailPath =
    tail === 'start'
      ? `M${x + 16} ${y + height - 1}c-1 7-5 11-11 13 3-5 4-9 4-13z`
      : `M${x + width - 20} ${y + height - 1}c1 7 5 11 11 13-3-5-4-9-4-13z`;
  return (
    <>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={15}
        fill="#ffffff"
        stroke="#f0e3c8"
        strokeWidth="1.4"
      />
      <path d={tailPath} fill="#ffffff" stroke="#f0e3c8" strokeWidth="1.4" strokeLinejoin="round" />
      <rect x={x + 6} y={y + 6} width={width - 12} height={12} fill="#ffffff" />
    </>
  );
}

function Leaves() {
  return (
    <g>
      <path d="M96 124c-17-1-28-11-31-27 16 0 28 10 31 27z" fill="#cfe8bd" />
      <path d="M96 124c2 9 9 14 18 16 1-11-7-16-18-16z" fill="#e0efd2" />
      <path d="M470 122c16-1 26-10 29-25-15 0-26 10-29 25z" fill="#cfe8bd" opacity="0.8" />
      <path d="M470 122c-2 8-8 13-16 15-1-10 6-15 16-15z" fill="#e6f2d8" />
    </g>
  );
}

export default function ReviewsArtwork() {
  return (
    <svg className="rart" viewBox="0 0 620 150" aria-hidden="true" focusable="false">
      {/* warm sunlight */}
      <circle cx="246" cy="50" r="58" fill="#fdf1cd" />
      <circle cx="246" cy="50" r="36" fill="#fae4a8" opacity="0.55" />
      <circle cx="392" cy="28" r="18" fill="#fff6dd" opacity="0.8" />

      {/* small white clouds */}
      <g fill="#ffffff" opacity="0.85">
        <ellipse cx="432" cy="46" rx="23" ry="9" />
        <ellipse cx="446" cy="39" rx="13" ry="8" />
        <ellipse cx="148" cy="24" rx="17" ry="7" />
        <ellipse cx="392" cy="104" rx="15" ry="6" />
      </g>

      {/* rolling hills */}
      <path
        d="M0 112c78 0 122-22 192-22s100 20 160 20 96-22 154-22 78 12 114 12v52H0z"
        fill="#fdf1c6"
      />
      <path d="M0 132c70-10 132 8 208 8s140-14 216-8 132 4 196-4v22H0z" fill="#e7f3d8" />

      {/* the rounded platform the rating graphic floats above */}
      <ellipse cx="246" cy="112" rx="72" ry="9" fill="#f4e5bb" opacity="0.85" />
      <ellipse cx="246" cy="117" rx="48" ry="6" fill="#fffbf2" opacity="0.9" />

      {/* rating plaque with the five golden stars */}
      <g>
        <rect x="166" y="31" width="164" height="76" rx="24" fill="#f0e0ba" opacity="0.45" />
        <rect
          x="166"
          y="27"
          width="164"
          height="76"
          rx="24"
          fill="#ffffff"
          stroke="#f1e3c4"
          strokeWidth="1.6"
        />
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} x={188 + i * 25} y={50} size={22} />
        ))}
        <path
          d="M231 84h30"
          stroke="#eadcba"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
      </g>

      {/* left speech bubble with a green message icon */}
      <g>
        <Bubble x={92} y={44} width={62} height={44} tail="start" />
        <circle cx="123" cy="66" r="11" fill="#43c45b" />
        <g fill="#ffffff">
          <circle cx="118.2" cy="66" r="1.7" />
          <circle cx="123" cy="66" r="1.7" />
          <circle cx="127.8" cy="66" r="1.7" />
        </g>
      </g>

      {/* right speech bubble with a green heart */}
      <g>
        <Bubble x={352} y={56} width={58} height={42} tail="end" />
        <path
          d="M0 7.4C-3.6 4.7-6 2.6-6 0-6-2.1-4.3-3.8-2.2-3.8-1.1-3.8 0-3.3 0-2.5 0-3.3 1.1-3.8 2.2-3.8 4.3-3.8 6-2.1 6 0 6 2.6 3.6 4.7 0 7.4z"
          transform="translate(381 74) scale(1.55)"
          fill="#43c45b"
        />
      </g>

      {/* small green message badge */}
      <g>
        <circle cx="330" cy="106" r="8.5" fill="#eaf8ee" stroke="#cfe8d8" strokeWidth="1.4" />
        <g fill="#43c45b">
          <circle cx="327" cy="106" r="1.3" />
          <circle cx="330.5" cy="106" r="1.3" />
          <circle cx="334" cy="106" r="1.3" />
        </g>
      </g>

      {/* decorative golden stars and dots */}
      <Star x={338} y={20} size={12} fill="#f8dc94" stroke="#edc86e" />
      <Star x={148} y={86} size={10} fill="#f9e3ae" stroke="#eecf89" />
      <Star x={444} y={86} size={9} fill="#f8dc94" stroke="#edc86e" />
      <circle cx="306" cy="34" r="3.4" fill="#f4cf7c" opacity="0.85" />
      <circle cx="178" cy="30" r="2.8" fill="#f0cfa0" opacity="0.85" />
      <circle cx="416" cy="120" r="4" fill="#e6cd92" opacity="0.6" />

      <Leaves />
    </svg>
  );
}
