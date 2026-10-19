/*
 * Illustrated banner for the Promotions & Discounts page: a golden gift box,
 * discount tags and confetti over a warm cream backdrop.
 *
 * Self-contained like the other page artworks, and purely decorative
 * (`aria-hidden`) — the page title and controls live outside it.
 */
export default function PromotionsArtwork() {
  return (
    <svg className="mart" viewBox="0 0 620 150" aria-hidden="true" focusable="false">
      {/* warm backdrop */}
      <circle cx="312" cy="62" r="46" fill="#fdf0cc" />
      <circle cx="312" cy="62" r="30" fill="#f9df9c" opacity="0.6" />

      {/* confetti */}
      <path d="M120 44l4 12 12 4-12 4-4 12-4-12-12-4 12-4z" fill="#f6d87a" />
      <path d="M508 34l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill="#f3c96b" opacity="0.85" />
      <circle cx="176" cy="86" r="4" fill="#f2c76a" opacity="0.7" />
      <circle cx="452" cy="92" r="5" fill="#f4d183" opacity="0.7" />

      {/* soft ground */}
      <path d="M0 118c70 0 96-14 152-14s78 12 128 12 84-16 132-16 108 10 208 10v40H0z" fill="#f7ecd2" />
      <path d="M0 136c70-8 128 6 196 6s132-12 208-8 120 2 216-4v20H0z" fill="#f1e2c0" opacity="0.85" />

      {/* gift box */}
      <g>
        <ellipse cx="312" cy="134" rx="58" ry="8" fill="#e8d9b4" />
        <rect x="252" y="70" width="120" height="62" rx="10" fill="#e9b34b" />
        <rect x="252" y="70" width="120" height="62" rx="10" fill="none" stroke="#d19b32" strokeWidth="2.4" />
        <rect x="252" y="70" width="120" height="18" rx="8" fill="#f7d27a" />
        <rect x="306" y="70" width="12" height="62" fill="#f4c96a" />
        <path d="M312 70c-14-14-34-16-40-4-5 11 14 14 40 4z" fill="#f5cd72" stroke="#d19b32" strokeWidth="2" />
        <path d="M312 70c14-14 34-16 40-4 5 11-14 14-40 4z" fill="#f5cd72" stroke="#d19b32" strokeWidth="2" />
        <circle cx="312" cy="70" r="7" fill="#fbe6ad" stroke="#d19b32" strokeWidth="2" />
        <path d="M262 88h20" stroke="#f7d27a" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* discount tag, left */}
      <g transform="rotate(-16 190 96)">
        <path d="M158 78h52l22 22-28 28-46-46z" fill="#fff6df" stroke="#e2b34e" strokeWidth="2.6" />
        <circle cx="208" cy="104" r="6" fill="#e9b34b" />
        <text x="176" y="100" fontSize="16" fontWeight="700" fill="#c98f24">%</text>
      </g>

      {/* discount tag, right */}
      <g transform="rotate(14 436 94)">
        <path d="M410 76h52l22 22-28 28-46-46z" fill="#fff6df" stroke="#e2b34e" strokeWidth="2.6" />
        <circle cx="460" cy="102" r="6" fill="#e9b34b" />
        <text x="428" y="98" fontSize="16" fontWeight="700" fill="#c98f24">%</text>
      </g>

      {/* ribbon curls */}
      <path d="M240 128c-16 6-30 4-40-4" stroke="#e9b34b" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M384 128c16 6 30 4 40-4" stroke="#e9b34b" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}
