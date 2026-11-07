/*
 * Illustrated banner for the Business Settings workspace: a small café
 * storefront with a cream-and-golden striped awning, plants, a floating
 * customer/profile card, a rating card with golden stars and an orange map
 * marker, over pastel hills, clouds and warm sunlight.
 *
 * Purely decorative (`aria-hidden`): the page title, subtitle and Save control
 * are real DOM outside the picture. The storefront sits left of the banner's
 * centre so the heading keeps the physical right side in a right-to-left layout.
 */

function Cloud({ x, y, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill="#ffffff" opacity="0.9">
      <ellipse cx="0" cy="0" rx="22" ry="8" />
      <ellipse cx="12" cy="-6" rx="12" ry="7" />
      <ellipse cx="-13" cy="-3" rx="10" ry="6" />
    </g>
  );
}

function Star({ x, y, size = 5, fill = '#f2b53c' }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${size / 10})`}
      d="M0 -10 2.9 -3.4 10 -2.6 4.7 2.2 6.2 9.2 0 5.6 -6.2 9.2 -4.7 2.2 -10 -2.6 -2.9 -3.4z"
      fill={fill}
    />
  );
}

export default function SettingsArtwork() {
  return (
    <svg className="set-art" viewBox="0 0 640 150" aria-hidden="true" focusable="false">
      {/* warm sunlight */}
      <circle cx="226" cy="44" r="54" fill="#fdf0c9" />
      <circle cx="226" cy="44" r="32" fill="#f9e2a6" opacity="0.45" />

      {/* clouds */}
      <Cloud x={452} y={34} />
      <Cloud x={96} y={28} scale={0.8} />
      <Cloud x={520} y={96} scale={0.7} />

      {/* pastel hills */}
      <path d="M0 118c74 0 120-18 196-18s106 16 168 16 96-18 152-18 84 10 124 10v42H0z" fill="#fdf1c6" />
      <path d="M0 134c70-8 132 6 210 6s142-12 218-6 144 2 212-5v21H0z" fill="#e9f4dc" />

      {/* ---- the café storefront ---- */}
      <g>
        <ellipse cx="196" cy="130" rx="86" ry="7" fill="#f3e4bb" opacity="0.7" />
        <rect x="132" y="66" width="128" height="62" rx="5" fill="#fffdf6" stroke="#ecd9b4" strokeWidth="2" />
        {/* awning: cream and golden stripes */}
        <path d="M126 66h140l-10 15H136z" fill="#fdf3dc" stroke="#eccf93" strokeWidth="1.6" />
        <g fill="#f6cf86">
          <path d="M139 66h14l-4 15h-14z" />
          <path d="M169 66h14l-2 15h-14z" />
          <path d="M199 66h14l0 15h-14z" />
          <path d="M229 66h14l2 15h-14z" />
        </g>
        <path d="M126 66h140l-10 15H136z" fill="none" stroke="#eccf93" strokeWidth="1.4" />
        {/* shop sign */}
        <rect x="158" y="52" width="76" height="13" rx="6.5" fill="#fff9ea" stroke="#e8cf9d" strokeWidth="1.4" />
        <rect x="170" y="57" width="52" height="3" rx="1.5" fill="#e5b972" />
        {/* door */}
        <rect x="184" y="92" width="26" height="36" rx="3" fill="#f7e6bf" stroke="#e6cd9c" strokeWidth="1.4" />
        <circle cx="205" cy="111" r="1.6" fill="#c9a469" />
        {/* windows */}
        <rect x="142" y="88" width="30" height="26" rx="3" fill="#eaf6ee" stroke="#dfe8d5" strokeWidth="1.4" />
        <rect x="220" y="88" width="30" height="26" rx="3" fill="#eaf6ee" stroke="#dfe8d5" strokeWidth="1.4" />
        {/* plants beside the door */}
        <g fill="#7cc88a">
          <path d="M166 122c-6-8-2-16 4-20 4 6 4 14-4 20z" />
          <path d="M230 122c6-8 2-16-4-20-4 6-4 14 4 20z" />
        </g>
        <rect x="160" y="120" width="14" height="9" rx="2" fill="#e8b984" />
        <rect x="222" y="120" width="14" height="9" rx="2" fill="#e8b984" />
      </g>

      {/* floating customer / profile card */}
      <g transform="rotate(-5 320 82)">
        <rect x="292" y="60" width="66" height="46" rx="8" fill="#ffffff" stroke="#f0e3c8" strokeWidth="1.6" />
        <circle cx="308" cy="76" r="8" fill="#fdeccb" />
        <circle cx="308" cy="74" r="3" fill="#e2b56f" />
        <path d="M302 82c1.6-3 4-4.4 6-4.4s4.4 1.4 6 4.4z" fill="#e2b56f" />
        <rect x="320" y="70" width="30" height="3.4" rx="1.7" fill="#e9eddf" />
        <rect x="320" y="78" width="22" height="3.4" rx="1.7" fill="#eef1e6" />
        <rect x="300" y="92" width="48" height="3" rx="1.5" fill="#eef1e6" />
      </g>

      {/* rating card */}
      <g transform="rotate(6 386 84)">
        <rect x="360" y="66" width="56" height="34" rx="7" fill="#ffffff" stroke="#f0e3c8" strokeWidth="1.6" />
        <g transform="translate(370 78)">
          <Star x={0} y={0} size={4.4} />
          <Star x={12} y={0} size={4.4} />
          <Star x={24} y={0} size={4.4} />
          <Star x={36} y={0} size={4.4} />
          <Star x={48} y={0} size={4.4} fill="#f0e3c8" />
        </g>
        <rect x="370" y="88" width="36" height="3" rx="1.5" fill="#eef1e6" />
      </g>

      {/* orange map marker */}
      <g transform="translate(436 52)">
        <path
          d="M0 22c0 0 13-12 13-22A13 13 0 0 0-13 0c0 10 13 22 13 22z"
          fill="#f08a3c"
          stroke="#e2772a"
          strokeWidth="1.5"
        />
        <circle cx="0" cy="0" r="5" fill="#fffaf0" />
      </g>

      {/* small leaves */}
      <g fill="#9ad6a4" opacity="0.9">
        <path d="M540 116c10-6 18-4 22 2-8 5-16 5-22-2z" />
        <path d="M560 108c4-9 12-12 18-9-2 8-10 12-18 9z" />
      </g>
      <g fill="#c9e6c4" opacity="0.9">
        <path d="M80 118c-9-5-16-3-20 2 7 5 14 5 20-2z" />
      </g>
    </svg>
  );
}
