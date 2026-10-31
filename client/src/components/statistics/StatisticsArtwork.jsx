/*
 * Illustrated banner for the Statistics module: a white analytics plaque with
 * green ascending bars and a rising arrow, a green-and-gold pie chart, a small
 * financial document, soft yellow background bars, rolling pale-green hills,
 * sunshine and botanical leaves.
 *
 * Purely decorative (`aria-hidden`): the page title, subtitle and every number
 * are real DOM outside the picture. It sits in the flexible middle column, so
 * in a right-to-left layout the heading keeps the physical right side.
 */

const PIE_GREEN = '#43c45b';
const PIE_PALE = '#a8e6b6';
const PIE_GOLD = '#f6c455';

/** A rounded document with its own text lines. */
function Document({ x, y }) {
  return (
    <g>
      <rect x={x + 3} y={y + 4} width="54" height="72" rx="10" fill="#f3e3bd" opacity="0.45" />
      <rect
        x={x}
        y={y}
        width="54"
        height="72"
        rx="10"
        fill="#ffffff"
        stroke="#f1e3c4"
        strokeWidth="1.4"
      />
      <rect x={x + 10} y={y + 12} width="24" height="4" rx="2" fill="#e8dfc9" />
      <rect x={x + 10} y={y + 22} width="34" height="3" rx="1.5" fill="#efe8d7" />
      <rect x={x + 10} y={y + 29} width="28" height="3" rx="1.5" fill="#efe8d7" />
      <rect x={x + 10} y={y + 40} width="16" height="18" rx="4" fill="#eaf7ee" />
      <rect x={x + 30} y={y + 46} width="14" height="3.4" rx="1.7" fill="#dfe8dc" />
      <rect x={x + 30} y={y + 54} width="10" height="3.4" rx="1.7" fill="#e8eee4" />
    </g>
  );
}

/** The pie chart plaque: a green slice, a pale slice and one golden slice. */
function Pie({ x = 0, y = 0 }) {
  return (
    <g>
      <rect x={x + 2} y={y + 4} width="76" height="66" rx="15" fill="#f0e0ba" opacity="0.4" />
      <rect
        x={x}
        y={y}
        width="76"
        height="66"
        rx="15"
        fill="#ffffff"
        stroke="#f1e3c4"
        strokeWidth="1.4"
      />
      <g transform={`translate(${x + 38} ${y + 33})`}>
        <circle r="19" fill={PIE_PALE} />
        <path d="M0 0V-19A19 19 0 0 1 18.3 5.1z" fill={PIE_GREEN} />
        <path d="M0 0 18.3 5.1A19 19 0 0 1 10.6 16.3z" fill={PIE_GOLD} />
        <circle r="6.4" fill="#ffffff" />
      </g>
    </g>
  );
}

/** Green ascending columns with a thick rising arrow above them. */
function RisingBars() {
  return (
    <g>
      <rect x="0" y="0" width="150" height="86" rx="17" fill="#f0e0ba" opacity="0.4" />
      <rect
        x="0"
        y="-4"
        width="150"
        height="86"
        rx="17"
        fill="#ffffff"
        stroke="#f1e3c4"
        strokeWidth="1.5"
      />
      <g fill={PIE_GREEN}>
        <rect x="18" y="46" width="15" height="22" rx="5" opacity="0.55" />
        <rect x="41" y="36" width="15" height="32" rx="5" opacity="0.7" />
        <rect x="64" y="27" width="15" height="41" rx="5" opacity="0.85" />
        <rect x="87" y="18" width="15" height="50" rx="5" />
      </g>
      <path
        d="M20 50 48 38 70 30 100 15"
        fill="none"
        stroke="#2f9b47"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M100 15h13v13" fill="none" stroke="#2f9b47" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <g stroke="#cbe8d5" strokeWidth="3.4" strokeLinecap="round">
        <path d="M116 58h18" />
        <path d="M116 68h12" />
      </g>
    </g>
  );
}

export default function StatisticsArtwork() {
  return (
    <svg className="start" viewBox="0 0 620 150" aria-hidden="true" focusable="false">
      {/* warm sunshine */}
      <circle cx="286" cy="52" r="58" fill="#fdf1cd" />
      <circle cx="286" cy="52" r="35" fill="#fae4a8" opacity="0.5" />
      <circle cx="430" cy="26" r="17" fill="#fff6dd" opacity="0.85" />

      {/* small white clouds */}
      <g fill="#ffffff" opacity="0.85">
        <ellipse cx="470" cy="44" rx="22" ry="8" />
        <ellipse cx="483" cy="38" rx="12" ry="7" />
        <ellipse cx="142" cy="26" rx="17" ry="7" />
        <ellipse cx="418" cy="104" rx="15" ry="6" />
      </g>

      {/* soft yellow background bars, behind the plaques */}
      <g fill="#fbe6b4">
        <rect x="120" y="74" width="13" height="34" rx="5" opacity="0.7" />
        <rect x="140" y="60" width="13" height="48" rx="5" opacity="0.8" />
        <rect x="160" y="48" width="13" height="60" rx="5" opacity="0.9" />
      </g>

      {/* rolling hills */}
      <path d="M0 112c78 0 122-22 192-22s100 20 160 20 96-22 154-22 78 12 114 12v52H0z" fill="#fdf1c6" />
      <path d="M0 132c70-10 132 8 208 8s140-14 216-8 132 4 196-4v22H0z" fill="#e7f3d8" />
      <path d="M0 140c86-8 158 10 236 8s142-10 214-6 112 2 170-6v16H0z" fill="#dcefcc" opacity="0.8" />

      {/* the platform the analytics graphics float above */}
      <ellipse cx="322" cy="113" rx="96" ry="9" fill="#f4e5bb" opacity="0.8" />
      <ellipse cx="322" cy="118" rx="64" ry="6" fill="#fffbf2" opacity="0.9" />

      {/* the composition */}
      <g transform="translate(192 32)">
        <Document x={0} y={16} />
        <g transform="translate(58 0)">
          <RisingBars />
        </g>
        <g transform="translate(212 26)">
          <Pie />
        </g>
      </g>

      {/* botanical leaves */}
      <g>
        <path d="M104 126c-17-1-28-11-31-27 16 0 28 10 31 27z" fill="#cfe8bd" />
        <path d="M104 126c2 9 9 14 18 16 1-11-7-16-18-16z" fill="#e0efd2" />
        <path d="M492 122c16-1 26-10 29-25-15 0-26 10-29 25z" fill="#cfe8bd" opacity="0.85" />
        <path d="M492 122c-2 8-8 13-16 15-1-10 6-15 16-15z" fill="#e6f2d8" />
      </g>

      {/* small decorative circles and dots */}
      <circle cx="366" cy="34" r="4" fill="#f4cf7c" opacity="0.9" />
      <circle cx="206" cy="30" r="3" fill="#f0cfa0" opacity="0.9" />
      <circle cx="452" cy="120" r="4" fill="#e6cd92" opacity="0.65" />
      <circle cx="520" cy="58" r="3" fill="#efd9a8" opacity="0.9" />
      <circle cx="126" cy="48" r="2.6" fill="#f3d49c" opacity="0.9" />
    </svg>
  );
}
