/*
 * Illustrated banner for Menu Settings: a floating digital-menu panel (three
 * food thumbnails, green switches and small sliders) beside a golden serving
 * cloche, over pale hills, clouds, leaves and warm sunlight.
 *
 * Purely decorative (`aria-hidden`): the title, subtitle and Save button are
 * real DOM outside the picture, so the heading stays readable on the physical
 * right of a right-to-left page.
 */

function Cloud({ x, y, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill="#ffffff" opacity="0.9">
      <ellipse cx="0" cy="0" rx="20" ry="7" />
      <ellipse cx="11" cy="-5" rx="11" ry="6" />
      <ellipse cx="-12" cy="-3" rx="9" ry="5" />
    </g>
  );
}

function Toggle({ x, y, on = true }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="20" height="11" rx="5.5" fill={on ? '#43c45b' : '#d9e2db'} />
      <circle cx={on ? 14.5 : 5.5} cy="5.5" r="4" fill="#ffffff" />
    </g>
  );
}

function FoodThumb({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="26" height="26" rx="7" fill="#f4faf5" stroke="#e3efe5" strokeWidth="1.2" />
      <circle cx="13" cy="12" r="6.4" fill="#f8e3b6" />
      <path d="M8 15.6c1.6 2 8.4 2 10 0" stroke="#e0b678" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <circle cx="11" cy="10" r="1.1" fill="#e8a75c" />
      <circle cx="15" cy="11" r="1" fill="#7cc88a" />
    </g>
  );
}

export default function MenuSettingsArtwork() {
  return (
    <svg className="set-art ms-art" viewBox="0 0 640 150" aria-hidden="true" focusable="false">
      {/* pale golden sunlight */}
      <circle cx="252" cy="40" r="50" fill="#fdf2cf" />
      <circle cx="252" cy="40" r="30" fill="#f9e6b4" opacity="0.5" />

      {/* soft clouds */}
      <Cloud x={470} y={32} />
      <Cloud x={104} y={30} scale={0.78} />
      <Cloud x={548} y={98} scale={0.66} />

      {/* rolling hills */}
      <path d="M0 116c80 0 126-18 202-18s108 16 170 16 100-18 156-18 78 10 112 10v44H0z" fill="#fdf3cb" />
      <path d="M0 133c74-8 136 6 214 6s140-12 216-6 138 2 210-5v22H0z" fill="#e7f4dc" />

      {/* ---- floating digital menu panel ---- */}
      <g transform="rotate(-3 320 78)">
        <rect x="236" y="22" width="168" height="104" rx="14" fill="#ffffff" stroke="#e6efe7" strokeWidth="1.6" />
        <rect x="236" y="22" width="168" height="20" rx="14" fill="#f2fbf4" />
        <rect x="236" y="35" width="168" height="7" fill="#f2fbf4" />
        <circle cx="250" cy="32" r="3.4" fill="#8fd4a1" />
        <rect x="259" y="30" width="42" height="4" rx="2" fill="#dcebe0" />

        <FoodThumb x={248} y={50} />
        <rect x="281" y="53" width="52" height="4.4" rx="2.2" fill="#dfe9e1" />
        <rect x="281" y="62" width="34" height="3.6" rx="1.8" fill="#eef3ee" />
        <Toggle x={344} y={52} />
        <rect x="371" y="53" width="22" height="9" rx="4.5" fill="#eef7ef" />

        <FoodThumb x={248} y={82} />
        <rect x="281" y="85" width="46" height="4.4" rx="2.2" fill="#dfe9e1" />
        <rect x="281" y="94" width="30" height="3.6" rx="1.8" fill="#eef3ee" />
        <Toggle x={344} y={84} />
        <rect x="371" y="85" width="22" height="9" rx="4.5" fill="#eef7ef" />

        {/* small settings sliders */}
        <g stroke="#bcdcc5" strokeWidth="2" strokeLinecap="round">
          <path d="M250 116h48M306 116h20" />
          <path d="M250 124h26M284 124h42" />
        </g>
        <circle cx="296" cy="116" r="3" fill="#e2b478" />
        <circle cx="278" cy="124" r="3" fill="#8fd4a1" />
      </g>

      {/* ---- golden serving cloche ---- */}
      <g transform="translate(432 58)">
        <ellipse cx="0" cy="42" rx="34" ry="6" fill="#f2e5c4" opacity="0.85" />
        <path d="M-28 34a28 28 0 0 1 56 0z" fill="#f8d795" stroke="#e8be74" strokeWidth="1.6" />
        <path d="M-16 30a16 22 0 0 1 32 0" fill="#fdeccb" opacity="0.75" />
        <circle cx="0" cy="4" r="4" fill="#e8b76a" stroke="#d9a453" strokeWidth="1.2" />
        <rect x="-32" y="34" width="64" height="5" rx="2.5" fill="#efc986" stroke="#dfb672" strokeWidth="1.2" />
      </g>

      {/* decorative plants and leaves */}
      <g fill="#8fd4a1" opacity="0.9">
        <path d="M176 122c-7-10-2-19 5-23 4 7 4 16-5 23z" />
        <path d="M188 122c7-9 3-18-4-22-4 7-3 15 4 22z" />
      </g>
      <rect x="170" y="120" width="22" height="9" rx="2.5" fill="#eec9a1" />
      <g fill="#9ad6a4" opacity="0.85">
        <path d="M512 118c10-6 18-4 22 2-8 5-16 5-22-2z" />
        <path d="M534 110c4-9 12-12 18-9-2 8-10 12-18 9z" />
      </g>
      <g fill="#cde8c8" opacity="0.9">
        <path d="M92 120c-9-5-16-3-20 2 7 5 14 5 20-2z" />
      </g>
    </svg>
  );
}
