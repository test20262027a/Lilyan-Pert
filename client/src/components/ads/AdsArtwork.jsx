/*
 * Illustrated artwork for the Advertisements module: a large golden megaphone
 * over soft cream sunlight, with a gift box, an orange paper airplane,
 * percentage signs, stars, confetti, botanical leaves and pale green hills.
 *
 * Two shapes of the same picture:
 *   - the page banner (`AdsArtwork`, wide),
 *   - the Add / Edit Advertisement modal header (`AdModalArtwork`, compact).
 *
 * Both are purely decorative (`aria-hidden`): titles, dates and controls are
 * rendered as real DOM outside the picture. The right side of the wide banner
 * stays clear so the heading has room in a right-to-left layout.
 */

function Hills({ compact = false }) {
  return (
    <>
      <path d={compact ? 'M0 94c42 0 62-14 96-14s46 12 72 12 44-14 74-14 44 8 58 8v30H0z'
                       : 'M0 110c78 0 122-22 192-22s100 20 160 20 96-22 154-22 78 12 114 12v52H0z'}
        fill="#fdf1c6" />
      <path d={compact ? 'M0 110c34-6 62 8 100 8s58-10 92-6 44 2 68-2v22H0z'
                       : 'M0 132c70-10 132 10 208 10s140-16 216-10 132 4 196-4v22H0z'}
        fill="#e6f2d5" />
    </>
  );
}

function Megaphone({ scale = 1 }) {
  return (
    <g transform={`scale(${scale})`}>
      {/* handle */}
      <path d="M-56 24l-6 30c-1 6 3 10 9 10h11l7-36z" fill="#e8a034" stroke="#cf8822" strokeWidth="2.2" strokeLinejoin="round" />
      {/* back cap */}
      <rect x="-76" y="2" width="21" height="38" rx="9" fill="#f3b64f" stroke="#cf8822" strokeWidth="2.2" />
      {/* horn */}
      <path
        d="M-57 6c0-9 6-16 15-18l58-18c13-4 24 5 24 18v42c0 13-11 22-24 18L-42 25c-9-2-15-9-15-19z"
        fill="#f7b044"
        stroke="#d98f2a"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      {/* bell face */}
      <ellipse cx="26" cy="20" rx="13" ry="34" fill="#ffdf9e" stroke="#d98f2a" strokeWidth="2.4" />
      <ellipse cx="26" cy="20" rx="6" ry="20" fill="#fff2d0" opacity="0.85" />
      {/* highlight */}
      <path d="M-44 2c6-8 16-12 26-15" stroke="#ffd99a" strokeWidth="3" strokeLinecap="round" fill="none" />
    </g>
  );
}

function Gift({ scale = 1 }) {
  return (
    <g transform={`scale(${scale})`}>
      <rect x="-26" y="-24" width="52" height="40" rx="7" fill="#f2b64d" stroke="#d19b32" strokeWidth="2.2" />
      <rect x="-26" y="-24" width="52" height="11" rx="5" fill="#fbdc95" stroke="#d19b32" strokeWidth="2.2" />
      <rect x="-5" y="-24" width="10" height="40" fill="#f9cf7c" />
      <path d="M0-24c-8-8-18-9-21-2-3 6 8 8 21 2z" fill="#fbd98c" stroke="#d19b32" strokeWidth="1.8" />
      <path d="M0-24c8-8 18-9 21-2 3 6-8 8-21 2z" fill="#fbd98c" stroke="#d19b32" strokeWidth="1.8" />
      <circle cx="0" cy="-24" r="4.4" fill="#fdeec4" stroke="#d19b32" strokeWidth="1.8" />
    </g>
  );
}

function Plane({ scale = 1 }) {
  return (
    <g transform={`scale(${scale})`}>
      <path d="M-28 11 26-14 9 15 3 5z" fill="#f7943f" stroke="#e07f2d" strokeWidth="2" strokeLinejoin="round" />
      <path d="M26-14 3 5 0-3z" fill="#ffc07a" />
      <path d="M-28 11 6 1" stroke="#e07f2d" strokeWidth="1.8" strokeLinecap="round" />
    </g>
  );
}

function Leaves() {
  return (
    <g>
      <path d="M86 92c-15-1-25-10-28-24 14 0 25 9 28 24z" fill="#cfe8bd" />
      <path d="M86 92c2 10 8 16 17 19 1-12-6-19-17-19z" fill="#dfefd1" />
      <path d="M470 96c15-1 25-10 28-24-14 0-25 9-28 24z" fill="#cfe8bd" opacity="0.75" />
    </g>
  );
}

function Confetti({ stars = true }) {
  return (
    <g>
      {stars ? (
        <>
          <path d="M176 38l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill="#f7da82" />
          <path d="M392 26l2.5 8 8 2.5-8 2.5-2.5 8-2.5-8-8-2.5 8-2.5z" fill="#f4cd6f" opacity="0.9" />
        </>
      ) : null}
      <circle cx="212" cy="58" r="4" fill="#f2c76a" opacity="0.7" />
      <circle cx="330" cy="34" r="3.4" fill="#f5d489" opacity="0.8" />
      <circle cx="150" cy="46" r="3" fill="#efc9a0" opacity="0.8" />
      <circle cx="368" cy="106" r="4.5" fill="#e7c78a" opacity="0.55" />
    </g>
  );
}

export default function AdsArtwork() {
  return (
    <svg className="aart" viewBox="0 0 620 150" aria-hidden="true" focusable="false">
      {/* pale golden sunlight */}
      <circle cx="268" cy="52" r="58" fill="#fdf0c9" />
      <circle cx="268" cy="52" r="36" fill="#fae3a5" opacity="0.55" />
      <circle cx="410" cy="30" r="20" fill="#fff6dd" opacity="0.75" />

      {/* clouds */}
      <g fill="#ffffff" opacity="0.85">
        <ellipse cx="452" cy="46" rx="22" ry="9" />
        <ellipse cx="466" cy="40" rx="13" ry="8" />
        <ellipse cx="176" cy="26" rx="17" ry="7" />
      </g>

      <Hills />

      <g transform="translate(268 78) rotate(-13)">
        <Megaphone />
      </g>
      {/* sound waves from the horn */}
      <path d="M340 54c9 12 9 30 0 42" stroke="#f0c470" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M356 44c13 18 13 44 0 62" stroke="#f5d79b" strokeWidth="3" fill="none" strokeLinecap="round" />

      <g transform="translate(136 104)">
        <Gift />
      </g>

      <g transform="translate(414 52) rotate(-8)">
        <Plane />
      </g>

      <text x="382" y="70" fontSize="18" fontWeight="800" fill="#e8c375">%</text>
      <text x="196" y="42" fontSize="14" fontWeight="800" fill="#ead0a0">%</text>

      <Leaves />
      <Confetti />
    </svg>
  );
}

/** The compact version used as the illustrated header of the advertisement form. */
export function AdModalArtwork() {
  return (
    <svg className="ad-modal__art" viewBox="0 0 300 120" aria-hidden="true" focusable="false">
      <circle cx="168" cy="44" r="38" fill="#fdf0c9" />
      <circle cx="168" cy="44" r="24" fill="#fae3a5" opacity="0.5" />

      <g fill="#ffffff" opacity="0.85">
        <ellipse cx="238" cy="30" rx="16" ry="7" />
        <ellipse cx="248" cy="25" rx="9" ry="6" />
      </g>

      <Hills compact />

      <g transform="translate(170 62) rotate(-13) scale(0.62)">
        <Megaphone />
      </g>
      <path d="M212 40c6 8 6 20 0 28" stroke="#f0c470" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M222 32c9 12 9 30 0 42" stroke="#f5d79b" strokeWidth="2.6" fill="none" strokeLinecap="round" />

      <g transform="translate(74 92) scale(0.72)">
        <Gift />
      </g>

      <g transform="translate(256 48) rotate(-8) scale(0.7)">
        <Plane />
      </g>

      <path d="M40 30l2.5 7 7 2.5-7 2.5-2.5 7-2.5-7-7-2.5 7-2.5z" fill="#f7da82" />
      <text x="132" y="28" fontSize="13" fontWeight="800" fill="#ead0a0">%</text>
      <circle cx="96" cy="26" r="3" fill="#f2c76a" opacity="0.8" />
      <circle cx="208" cy="88" r="3.4" fill="#e7c78a" opacity="0.55" />
      <path d="M44 74c-11-1-18-7-20-17 10 0 18 6 20 17z" fill="#cfe8bd" />
    </svg>
  );
}
