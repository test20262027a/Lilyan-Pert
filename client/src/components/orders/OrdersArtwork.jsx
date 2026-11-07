/*
 * The illustrated café scene that decorates the Orders banner: warm sunshine,
 * pale green hills, a coffee cup, a green iced drink, a croissant and a small
 * plant. It is a separate, self-contained asset — replacing the Orders banner
 * picture later means swapping this component (or the `art` prop of
 * OrdersBanner) and nothing else on the page moves.
 *
 * Drawn inline so it ships with the app instead of depending on a file.
 */
export default function OrdersArtwork() {
  return (
    <svg className="oart" viewBox="0 0 620 150" aria-hidden="true" focusable="false">
      {/* warm sunshine */}
      <circle cx="310" cy="52" r="31" fill="#fbe7b2" />
      <circle cx="310" cy="52" r="20" fill="#f8d98c" opacity="0.6" />

      {/* clouds */}
      <path d="M186 34c6-9 19-9 25-1 8-6 20-1 20 9 0 6-5 10-11 10h-27c-8 0-12-11-7-18z" fill="#fdf4e2" />
      <path d="M432 26c5-8 17-8 22-1 7-5 18-1 18 8 0 5-4 9-10 9h-24c-7 0-10-10-6-16z" fill="#fdf4e2" />

      {/* pale green and golden landscape */}
      <path d="M0 116c60 0 78-20 130-20s70 16 122 16 66-22 116-22 92 14 252 14v46H0z" fill="#dcefdd" />
      <path d="M0 133c58-12 92 6 142 6s76-14 126-14 78 10 128 6v19H0z" fill="#cbe7d3" />
      <path d="M0 143c74-6 132 4 214 4s150-8 226-4 118 2 180-2v11H0z" fill="#f0e3c4" opacity="0.55" />

      {/* soft leaves at the edges */}
      <path d="M58 120c-9-2-14-9-12-15 7 0 12 6 14 12z" fill="#c9e8d2" />
      <path d="M560 118c9-2 13-9 11-15-7 1-11 7-13 13z" fill="#c9e8d2" />

      {/* coffee cup */}
      <g>
        <ellipse cx="140" cy="130" rx="36" ry="7" fill="#f0d59a" />
        <path d="M114 98h52l-7 24a11 11 0 0 1-10.5 8h-17A11 11 0 0 1 121 122z" fill="#ffffff" stroke="#e6d6b8" strokeWidth="2.4" />
        <path d="M168 104a10 10 0 0 1 0 15" fill="none" stroke="#e6d6b8" strokeWidth="2.4" />
        <rect x="112" y="94" width="56" height="6" rx="3" fill="#e2c79a" />
        <path d="M132 84c-4-5 4-8 0-13M150 84c-4-5 4-8 0-13" fill="none" stroke="#dcc7a3" strokeWidth="2.4" strokeLinecap="round" />
      </g>

      {/* croissant */}
      <g>
        <path d="M206 116c6-16 24-26 43-22 9 2 18 7 23 15-8 1-15 7-18 15-4 12-16 19-28 17-14-3-23-14-20-25z" fill="#f0cf8e" stroke="#e0b96a" strokeWidth="2" />
        <path d="M232 101c4 6 5 14 3 22M249 105c3 6 3 13 0 19" fill="none" stroke="#e0b96a" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* small plant */}
      <g>
        <path d="M398 116c-2-14 8-26 22-27 0 15-9 26-22 27z" fill="#bfe3c6" />
        <path d="M418 122c-10-2-17-11-14-21 10 2 17 11 14 21z" fill="#a7d9b6" />
        <path d="M410 118v-15" stroke="#8fbfa2" strokeWidth="2" />
        <path d="M392 126h30l-4 14a5 5 0 0 1-5 4h-12a5 5 0 0 1-5-4z" fill="#f0d59a" />
      </g>

      {/* green iced drink */}
      <g>
        <path d="M462 78h44l-5 50a8 8 0 0 1-8 7h-18a8 8 0 0 1-8-7z" fill="#f2fbf8" stroke="#cfe4dd" strokeWidth="2.4" />
        <path d="M466 96h36l-3 32a6 6 0 0 1-6 5h-18a6 6 0 0 1-6-5z" fill="#a9dcb6" />
        <rect x="462" y="76" width="44" height="5" rx="2.5" fill="#cfe4dd" />
        <path d="M492 62 484 100" stroke="#f0a2c5" strokeWidth="5" strokeLinecap="round" />
        <rect x="472" y="102" width="11" height="9" rx="3" fill="#ffffff" opacity="0.75" />
        <rect x="487" y="112" width="10" height="8" rx="3" fill="#ffffff" opacity="0.6" />
        <path d="M458 74c-6-3-10-8-9-13 5 0 9 4 11 9z" fill="#bfe3c6" />
      </g>
    </svg>
  );
}
