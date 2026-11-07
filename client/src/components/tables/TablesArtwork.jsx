/*
 * The illustrated café scene decorating the Tables banner: a warm sunrise inside
 * a soft architectural arch, pale green hills, three golden hanging pendant
 * lamps, a small round café table with two cream chairs and coffee cups, and
 * potted plants.
 *
 * It is a separate, self-contained asset drawn inline so it ships with the app,
 * and it is decorative only (`aria-hidden`) — the café table sits toward the
 * left-middle of the scene, exactly where the reference puts it.
 *
 * Replacing the picture means passing `image` to PageHeroBanner (or swapping
 * this component): the title, the subtitle and the Add Table button live outside
 * the artwork and never move, because it only ever fills the flexible middle
 * column of the banner.
 */
export default function TablesArtwork() {
  return (
    <svg className="mart" viewBox="0 0 620 150" aria-hidden="true" focusable="false">
      {/* warm sunrise */}
      <circle cx="214" cy="56" r="42" fill="#fbe7b2" />
      <circle cx="214" cy="56" r="27" fill="#f8d98c" opacity="0.55" />

      {/* soft architectural arch behind the table */}
      <path d="M152 128V76a62 62 0 0 1 124 0v52z" fill="#fdf6e6" stroke="#f0e2c4" strokeWidth="2.4" />

      {/* small white clouds */}
      <path d="M96 30c6-9 20-9 26-1 8-6 21-1 21 9 0 6-5 11-12 11h-28c-8 0-13-11-7-19z" fill="#fdf4e2" />
      <path d="M436 22c5-8 17-8 22-1 7-5 18-1 18 8 0 5-4 9-10 9h-24c-7 0-10-9-6-16z" fill="#fdf4e2" />

      {/* pale green landscape */}
      <path d="M0 118c58 0 78-16 128-16s66 14 118 14 70-18 118-18 96 12 256 12v40H0z" fill="#dcefdd" />
      <path d="M0 134c62-10 96 6 148 6s74-12 124-12 74 8 126 6v16H0z" fill="#cbe7d3" />
      <path d="M0 146c74-6 132 4 214 4s150-8 226-4 118 2 180-2v6H0z" fill="#f0e3c4" opacity="0.45" />

      {/* three hanging golden pendant lamps */}
      <g stroke="#e2cf9f" strokeWidth="2.2" strokeLinecap="round">
        <path d="M178 0v30M214 0v22M250 0v30" />
      </g>
      <g fill="#f6c964">
        <path d="M166 30h24l-4 14h-16z" />
        <path d="M202 22h24l-4 14h-16z" />
        <path d="M238 30h24l-4 14h-16z" />
      </g>
      <g fill="#fbe7b2">
        <circle cx="178" cy="48" r="4" />
        <circle cx="214" cy="40" r="4" />
        <circle cx="250" cy="48" r="4" />
      </g>

      {/* two cream-coloured chairs */}
      <g fill="#fdf7ea" stroke="#e6d6b8" strokeWidth="2.2">
        <path d="M144 122v-32a14 14 0 0 1 28 0v32" />
        <rect x="140" y="112" width="36" height="9" rx="4.5" />
        <path d="M146 121v11M172 121v11" strokeLinecap="round" />
      </g>
      <g fill="#fdf7ea" stroke="#e6d6b8" strokeWidth="2.2">
        <path d="M256 122v-32a14 14 0 0 1 28 0v32" />
        <rect x="252" y="112" width="36" height="9" rx="4.5" />
        <path d="M258 121v11M284 121v11" strokeLinecap="round" />
      </g>

      {/* elegant small round café table */}
      <ellipse cx="214" cy="130" rx="34" ry="5" fill="#e8dcbb" />
      <rect x="210" y="98" width="8" height="28" fill="#f0e3c4" />
      <ellipse cx="214" cy="127" rx="22" ry="5" fill="#e8dcbb" />
      <ellipse cx="214" cy="96" rx="36" ry="9" fill="#fffdf4" stroke="#e8d9b6" strokeWidth="2.4" />

      {/* coffee cups on the table */}
      <g stroke="#e6d6b8" strokeWidth="1.8" fill="#ffffff">
        <ellipse cx="206" cy="94" rx="9" ry="2.6" fill="#f6ecdb" stroke="none" />
        <path d="M199 86h14l-1.6 6.4a4 4 0 0 1-3.9 3.1h-3a4 4 0 0 1-3.9-3.1z" />
        <path d="M213 88.4a3.6 3.6 0 0 1 0 5.4" fill="none" />
        <path d="M202 82c-2.6-2.6 2.6-4 0-6.6M208 82c-2.6-2.6 2.6-4 0-6.6" fill="none" stroke="#dcc7a3" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g stroke="#e6d6b8" strokeWidth="1.8" fill="#ffffff">
        <ellipse cx="231" cy="97" rx="8" ry="2.4" fill="#f6ecdb" stroke="none" />
        <path d="M225 89h13l-1.5 6a3.6 3.6 0 0 1-3.5 2.8h-2.7a3.6 3.6 0 0 1-3.5-2.8z" />
        <path d="M238 91.4a3.3 3.3 0 0 1 0 5" fill="none" />
      </g>

      {/* potted plants */}
      <g>
        <path d="M108 116h26l-4 20h-18z" fill="#e8b98d" />
        <path d="M106 112h30v5h-30z" fill="#d9a877" />
        <path d="M121 112c-8-4-12-12-9-19 8 1 12 9 12 17z" fill="#bfe3c6" />
        <path d="M121 112c8-3 12-11 9-18-8 1-12 8-12 16z" fill="#a8d9b4" />
        <path d="M121 112V90" stroke="#8fc9a1" strokeWidth="2.2" strokeLinecap="round" />
      </g>
      <g>
        <path d="M320 120h22l-3.4 16h-15z" fill="#e8b98d" />
        <path d="M318 116h26v5h-26z" fill="#d9a877" />
        <path d="M331 116c-7-4-10-11-8-17 7 1 11 8 11 15z" fill="#bfe3c6" />
        <path d="M331 116c7-3 10-10 8-16-7 1-11 7-11 14z" fill="#a8d9b4" />
      </g>

      {/* botanical leaves */}
      <path d="M52 126c-10-2-15-10-13-17 8 1 14 7 15 15z" fill="#c9e8d2" />
      <path d="M462 122c10-2 14-10 12-16-8 1-13 7-14 14z" fill="#c9e8d2" />
      <path d="M60 100c-8-1-12-7-10-13 6 1 11 6 12 11z" fill="#dcefdd" />
    </svg>
  );
}
