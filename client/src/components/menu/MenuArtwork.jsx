/*
 * The illustrated café scene decorating the Menu banner: warm sunlight, pale
 * green hills, a tall lemonade glass with lemon slices and leaves, a white
 * coffee cup with latte art and a small layered dessert on a plate.
 *
 * It is a separate, self-contained asset drawn inline so it ships with the app.
 * Replacing the Menu banner picture means passing `image` to PageHeroBanner (or
 * swapping this component) — the title and the controls never move, because the
 * artwork only ever fills the flexible middle column of the banner.
 */
export default function MenuArtwork() {
  return (
    <svg className="mart" viewBox="0 0 620 150" aria-hidden="true" focusable="false">
      {/* warm sunlight behind the objects */}
      <circle cx="310" cy="56" r="40" fill="#fbe7b2" />
      <circle cx="310" cy="56" r="26" fill="#f8d98c" opacity="0.55" />

      {/* clouds */}
      <path d="M170 32c6-9 20-9 26-1 8-6 21-1 21 9 0 6-5 11-12 11h-28c-8 0-13-11-7-19z" fill="#fdf4e2" />
      <path d="M430 24c5-8 17-8 22-1 7-5 18-1 18 8 0 5-4 9-10 9h-24c-7 0-10-9-6-16z" fill="#fdf4e2" />

      {/* pale green and golden landscape */}
      <path d="M0 114c62 0 80-20 132-20s70 16 122 16 66-22 116-22 92 14 252 14v48H0z" fill="#dcefdd" />
      <path d="M0 132c58-12 92 6 142 6s76-14 126-14 78 10 128 6v20H0z" fill="#cbe7d3" />
      <path d="M0 144c74-6 132 4 214 4s150-8 226-4 118 2 180-2v8H0z" fill="#f0e3c4" opacity="0.5" />

      {/* decorative leaves at the edges */}
      <path d="M50 122c-10-2-15-10-13-16 8 0 13 6 15 13z" fill="#c9e8d2" />
      <path d="M572 120c10-2 14-10 12-16-8 1-12 7-14 14z" fill="#c9e8d2" />

      {/* tall lemonade glass with lemon slices */}
      <g>
        <ellipse cx="270" cy="132" rx="30" ry="6" fill="#e8dcbb" />
        <path d="M248 54h44l-5 68a10 10 0 0 1-10 9h-14a10 10 0 0 1-10-9z" fill="#fdfbf2" stroke="#e3d7bb" strokeWidth="2.4" />
        <path d="M252 76h36l-4 46a7 7 0 0 1-7 6h-14a7 7 0 0 1-7-6z" fill="#f8e59a" />
        <path d="M248 54h44v6h-44z" fill="#efe2c4" />
        <circle cx="272" cy="66" r="10" fill="#f9d55c" stroke="#f0c23c" strokeWidth="1.6" />
        <path d="M272 58v16M264 66h16M266.5 60.5l11 11M277.5 60.5l-11 11" stroke="#f4cd45" strokeWidth="1.2" />
        <path d="M282 44 274 74" stroke="#8fd0a8" strokeWidth="4" strokeLinecap="round" />
        <path d="M240 70c-8-3-13-10-11-17 8 1 13 8 14 15z" fill="#bfe3c6" />
        <path d="M292 78c8-2 13-9 11-16-8 1-13 8-13 14z" fill="#bfe3c6" />
      </g>

      {/* white coffee cup with latte art */}
      <g>
        <ellipse cx="352" cy="132" rx="34" ry="6" fill="#e8dcbb" />
        <path d="M326 96h52l-6 26a11 11 0 0 1-10.5 8h-19A11 11 0 0 1 332 122z" fill="#ffffff" stroke="#e6d6b8" strokeWidth="2.4" />
        <path d="M380 102a10 10 0 0 1 0 15" fill="none" stroke="#e6d6b8" strokeWidth="2.4" />
        <rect x="324" y="92" width="56" height="6" rx="3" fill="#e2c79a" />
        <ellipse cx="352" cy="92" rx="26" ry="5" fill="#f6ecdb" />
        <path d="M352 88c4-4 8-1 7 3 0 3-3 5-7 6-4-1-7-3-7-6-1-4 3-7 7-3z" fill="#e3cfae" />
        <path d="M344 78c-4-5 4-8 0-13M360 78c-4-5 4-8 0-13" fill="none" stroke="#dcc7a3" strokeWidth="2.2" strokeLinecap="round" />
      </g>

      {/* small layered dessert on a plate */}
      <g>
        <ellipse cx="424" cy="132" rx="34" ry="6" fill="#e8dcbb" />
        <ellipse cx="424" cy="126" rx="30" ry="7" fill="#ffffff" stroke="#e6d6b8" strokeWidth="2.2" />
        <path d="M406 104h36l-3 20h-30z" fill="#fbe3ea" />
        <path d="M406 104h36v7h-36z" fill="#f7cfd9" />
        <path d="M404 96h40l-2 8h-36z" fill="#fff6e2" />
        <circle cx="424" cy="92" r="5" fill="#ef8fa6" />
        <path d="M410 118h28v6h-28z" fill="#f2c68f" opacity="0.85" />
      </g>
    </svg>
  );
}
