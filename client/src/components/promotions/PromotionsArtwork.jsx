/*
 * Illustrated artwork for the Promotions module: a golden gift box, discount
 * tags, leaves and confetti over a warm cream backdrop with pale yellow and
 * pale green hills.
 *
 * Two shapes of the same picture:
 *   - the page banner (`PromotionsArtwork`, wide),
 *   - the Add / Edit Promotion modal header (`PromotionModalArtwork`, compact).
 *
 * Both are purely decorative (`aria-hidden`): every title, number and control
 * is rendered as real DOM outside the picture.
 */
export default function PromotionsArtwork() {
  return (
    <svg className="mart" viewBox="0 0 620 150" aria-hidden="true" focusable="false">
      {/* warm glow behind the gift */}
      <circle cx="310" cy="58" r="52" fill="#fdf1cf" />
      <circle cx="310" cy="58" r="33" fill="#f9e2a6" opacity="0.6" />

      {/* soft landscape */}
      <path d="M0 112c74 0 118-18 184-18s96 16 152 16 92-20 150-20 84 12 134 12v48H0z" fill="#fdf2cb" />
      <path d="M0 130c72-9 128 8 200 8s136-14 214-9 132 3 206-3v24H0z" fill="#e9f3d7" />

      {/* leaves */}
      <path d="M104 80c-14-1-23-9-26-22 13 0 22 8 26 22z" fill="#cfe8bd" />
      <path d="M516 86c14-1 23-9 26-22-13 0-22 8-26 22z" fill="#cfe8bd" />
      <path d="M120 96c-11 0-18-6-20-16 10 0 17 6 20 16z" fill="#dff0d0" />
      <path d="M500 100c11 0 18-6 20-16-10 0-17 6-20 16z" fill="#dff0d0" />

      {/* confetti and percentage accents */}
      <path d="M170 40l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill="#f6d87a" />
      <path d="M452 32l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#f3c96b" opacity="0.9" />
      <circle cx="214" cy="60" r="4" fill="#f2c76a" opacity="0.75" />
      <circle cx="412" cy="62" r="5" fill="#f4d183" opacity="0.75" />
      <text x="368" y="52" fontSize="17" fontWeight="800" fill="#e8c375">%</text>
      <text x="234" y="46" fontSize="14" fontWeight="800" fill="#ead0a0">%</text>

      {/* gift box */}
      <g>
        <ellipse cx="310" cy="132" rx="60" ry="8" fill="#ecdcb6" />
        <rect x="250" y="68" width="120" height="62" rx="10" fill="#eab54d" />
        <rect x="250" y="68" width="120" height="62" rx="10" fill="none" stroke="#d19b32" strokeWidth="2.4" />
        <rect x="250" y="68" width="120" height="18" rx="8" fill="#f8d47c" />
        <rect x="304" y="68" width="12" height="62" fill="#f5cb6d" />
        <path d="M310 68c-14-14-34-16-40-4-5 11 14 14 40 4z" fill="#f6ce74" stroke="#d19b32" strokeWidth="2" />
        <path d="M310 68c14-14 34-16 40-4 5 11-14 14-40 4z" fill="#f6ce74" stroke="#d19b32" strokeWidth="2" />
        <circle cx="310" cy="68" r="7" fill="#fbe7ae" stroke="#d19b32" strokeWidth="2" />
        <path d="M260 88h20M340 88h20" stroke="#f8d47c" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* discount tag, left */}
      <g transform="rotate(-15 188 92)">
        <path d="M156 74h52l22 22-28 28-46-46z" fill="#fffaf0" stroke="#e2b34e" strokeWidth="2.6" />
        <circle cx="206" cy="100" r="6" fill="#eab54d" />
        <text x="174" y="96" fontSize="16" fontWeight="800" fill="#c98f24">%</text>
      </g>

      {/* discount tag, right */}
      <g transform="rotate(14 434 90)">
        <path d="M408 72h52l22 22-28 28-46-46z" fill="#fffaf0" stroke="#e2b34e" strokeWidth="2.6" />
        <circle cx="458" cy="98" r="6" fill="#eab54d" />
        <text x="426" y="94" fontSize="16" fontWeight="800" fill="#c98f24">%</text>
      </g>

      {/* ribbon curls */}
      <path d="M240 126c-16 6-30 4-40-4" stroke="#eab54d" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M380 126c16 6 30 4 40-4" stroke="#eab54d" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** The compact version used as the illustrated header of the promotion form. */
export function PromotionModalArtwork() {
  return (
    <svg className="promo-modal__art" viewBox="0 0 260 118" aria-hidden="true" focusable="false">
      <path d="M0 92c36 0 58-12 92-12s50 10 78 10 46-12 74-12 40 6 56 6v34H0z" fill="#fdf2cb" />
      <path d="M0 106c34-7 62 6 98 6s64-10 100-6 40 2 62-2v14H0z" fill="#e9f3d7" />

      <path d="M34 58c-9-1-15-6-17-15 8 0 14 5 17 15z" fill="#cfe8bd" />
      <path d="M226 62c9-1 15-6 17-15-8 0-14 5-17 15z" fill="#cfe8bd" />

      <text x="46" y="34" fontSize="13" fontWeight="800" fill="#ead0a0">%</text>
      <text x="204" y="42" fontSize="15" fontWeight="800" fill="#e8c375">%</text>
      <path d="M186 20l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#f6d87a" />
      <circle cx="70" cy="18" r="3" fill="#f2c76a" opacity="0.8" />

      <g>
        <ellipse cx="130" cy="98" rx="40" ry="5" fill="#ecdcb6" />
        <rect x="92" y="50" width="76" height="46" rx="7" fill="#eab54d" />
        <rect x="92" y="50" width="76" height="46" rx="7" fill="none" stroke="#d19b32" strokeWidth="2" />
        <rect x="92" y="50" width="76" height="13" rx="6" fill="#f8d47c" />
        <rect x="125" y="50" width="9" height="46" fill="#f5cb6d" />
        <path d="M130 50c-9-9-21-10-25-2-3 7 9 9 25 2z" fill="#f6ce74" stroke="#d19b32" strokeWidth="1.8" />
        <path d="M130 50c9-9 21-10 25-2 3 7-9 9-25 2z" fill="#f6ce74" stroke="#d19b32" strokeWidth="1.8" />
        <circle cx="130" cy="50" r="4.5" fill="#fbe7ae" stroke="#d19b32" strokeWidth="1.8" />
      </g>

      <g transform="rotate(-14 66 72)">
        <path d="M44 60h30l14 14-18 18-26-26z" fill="#fffaf0" stroke="#e2b34e" strokeWidth="2" />
        <circle cx="74" cy="76" r="4" fill="#eab54d" />
        <text x="55" y="76" fontSize="11" fontWeight="800" fill="#c98f24">%</text>
      </g>
      <g transform="rotate(13 196 76)">
        <path d="M180 62h30l14 14-18 18-26-26z" fill="#fffaf0" stroke="#e2b34e" strokeWidth="2" />
        <circle cx="210" cy="78" r="4" fill="#eab54d" />
        <text x="191" y="78" fontSize="11" fontWeight="800" fill="#c98f24">%</text>
      </g>
    </svg>
  );
}
