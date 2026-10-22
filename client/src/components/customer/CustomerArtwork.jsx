/*
 * Illustrated headers for the customer-facing modals.
 *
 * Same visual language as the menu and review banners already in the app: warm
 * pastel sun, pale hills, botanical leaves and softly lit café objects drawn
 * inline, so the artwork ships with the app and needs no image request.
 *
 * Both are purely decorative (`aria-hidden`): the modal title and every control
 * are real DOM above the picture.
 */

/** Shopping basket, receipt, coffee cup and croissant over pastel hills. */
export function CartArtwork() {
  return (
    <svg
      className="cui-art"
      viewBox="0 0 420 150"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* warm light behind the objects */}
      <circle cx="210" cy="54" r="46" fill="#fbe7b2" opacity="0.85" />
      <circle cx="210" cy="54" r="30" fill="#f8d98c" opacity="0.5" />

      {/* rolling pale hills */}
      <path d="M0 112c58 0 78-18 128-18s70 14 120 14 64-20 114-20 58 10 58 10v52H0z" fill="#dcefdd" />
      <path d="M0 132c56-10 90 6 138 6s74-12 122-12 72 8 116 6v18H0z" fill="#cbe7d3" />
      <path d="M0 143c74-6 132 4 214 4s150-6 206-4v7H0z" fill="#f0e3c4" opacity="0.55" />

      {/* leaves at the edges */}
      <path d="M52 122c-11-2-16-10-14-17 9 0 14 7 16 14z" fill="#c9e8d2" />
      <path d="M366 120c11-2 16-10 14-17-9 1-14 7-16 14z" fill="#c9e8d2" />

      <ellipse cx="212" cy="136" rx="96" ry="8" fill="#e3d9bd" opacity="0.6" />

      {/* the receipt standing behind the basket */}
      <g>
        <path
          d="M198 34h44v52l-5.5-3.4-5.5 3.4-5.5-3.4-5.5 3.4-5.5-3.4-5.5 3.4-5.5-3.4-5.5 3.4z"
          fill="#fdfbf3"
          stroke="#e6d6b8"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <g stroke="#dccfae" strokeWidth="2" strokeLinecap="round">
          <path d="M206 46h28M206 54h28M206 62h18" />
        </g>
        <circle cx="224" cy="72" r="3.4" fill="#8fd0a8" />
      </g>

      {/* the shopping basket */}
      <g>
        <path
          d="M166 74h92l-9 44a8 8 0 0 1-8 6.6h-58a8 8 0 0 1-8-6.6z"
          fill="#fdfbf2"
          stroke="#e3d7bb"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <g stroke="#e6d9bd" strokeWidth="2" strokeLinecap="round" opacity="0.9">
          <path d="M184 84v30M202 84v32M220 84v32M238 84v30" />
        </g>
        <path
          d="M182 74c0-16 13-25 30-25s30 9 30 25"
          fill="none"
          stroke="#e0caa4"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <rect x="160" y="70" width="104" height="10" rx="5" fill="#f7ecd7" stroke="#e3d7bb" strokeWidth="2" />
        <path d="M176 100h72" stroke="#8fd0a8" strokeWidth="2.4" strokeLinecap="round" opacity="0.5" />
      </g>

      {/* white coffee cup with latte art */}
      <g>
        <ellipse cx="120" cy="130" rx="30" ry="5" fill="#e8dcbb" />
        <path
          d="M96 96h48l-5.5 24a10 10 0 0 1-9.7 7.6h-17.6A10 10 0 0 1 101.5 120z"
          fill="#ffffff"
          stroke="#e6d6b8"
          strokeWidth="2.2"
        />
        <path d="M144 101a9 9 0 0 1 0 13" fill="none" stroke="#e6d6b8" strokeWidth="2.2" />
        <rect x="94" y="92" width="52" height="6" rx="3" fill="#e2c79a" />
        <ellipse cx="120" cy="92" rx="24" ry="4.6" fill="#f6ecdb" />
        <path d="M114 86c2-4 8-4 10 0" fill="none" stroke="#dcc9a6" strokeWidth="1.8" strokeLinecap="round" />
      </g>

      {/* croissant */}
      <g>
        <path
          d="M300 112c-8 0-14-5-14-11 0-6 7-9 14-9 4-4 10-6 16-6 10 0 18 6 18 13 0 7-9 13-20 13z"
          fill="#f5cd8b"
          stroke="#e0af63"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <g stroke="#e0af63" strokeWidth="1.8" strokeLinecap="round">
          <path d="M304 98c1 5 1 9 0 13M316 96c1 6 1 11 0 16M326 98c0 5 0 9-1 13" />
        </g>
      </g>

      {/* small floating sparkles */}
      <g fill="#f6c86a" opacity="0.9">
        <circle cx="352" cy="42" r="3" />
        <circle cx="76" cy="50" r="2.4" />
        <circle cx="70" cy="78" r="1.8" />
      </g>
    </svg>
  );
}

const STAR_PATH = 'm12 3.5 2.7 5.6 6.1.85-4.4 4.3 1.05 6.1L12 17.5l-5.45 2.85L7.6 14.25 3.2 9.95l6.1-.85z';

function Star({ x, y, size, fill = '#f6b92b', stroke = '#dea018' }) {
  return (
    <path
      d={STAR_PATH}
      transform={`translate(${x} ${y}) scale(${size / 24})`}
      fill={fill}
      stroke={stroke}
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
  );
}

/** A notebook with golden stars, a coffee cup and a croissant on warm pastels. */
export function ReviewArtwork() {
  return (
    <svg
      className="cui-art"
      viewBox="0 0 420 150"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid slice"
    >
      <circle cx="196" cy="56" r="46" fill="#fdf1cd" opacity="0.9" />
      <circle cx="196" cy="56" r="28" fill="#fae4a8" opacity="0.55" />

      <g fill="#ffffff" opacity="0.8">
        <ellipse cx="330" cy="34" rx="22" ry="9" />
        <ellipse cx="344" cy="28" rx="12" ry="7" />
        <ellipse cx="96" cy="26" rx="16" ry="7" />
      </g>

      <path d="M0 112c58 0 82-20 134-20s72 16 124 16 66-20 116-20 46 8 46 8v54H0z" fill="#fdf1c6" />
      <path d="M0 132c60-10 96 6 144 6s72-12 120-12 88 6 156 2v22H0z" fill="#e7f3d8" />
      <ellipse cx="196" cy="122" rx="76" ry="8" fill="#f4e5bb" opacity="0.75" />

      {/* the review notebook with five golden stars */}
      <g>
        <rect x="146" y="26" width="112" height="86" rx="16" fill="#f0e0ba" opacity="0.45" />
        <rect
          x="146"
          y="22"
          width="112"
          height="86"
          rx="16"
          fill="#ffffff"
          stroke="#f1e3c4"
          strokeWidth="1.6"
        />
        <path d="M146 44h112" stroke="#f4e8cf" strokeWidth="1.6" />
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} x={156 + i * 20} y={52} size={17} />
        ))}
        <g stroke="#eadcba" strokeWidth="3" strokeLinecap="round">
          <path d="M162 84h58M162 94h38" />
        </g>
        <g fill="#8fd0a8">
          <circle cx="238" cy="94" r="4.4" />
          <path d="m235.8 94 1.7 1.8 3.2-3.6" stroke="#ffffff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </g>
      </g>

      {/* coffee cup */}
      <g>
        <ellipse cx="322" cy="132" rx="30" ry="5" fill="#e8dcbb" />
        <path
          d="M298 98h48l-5.5 24a10 10 0 0 1-9.7 7.6h-17.6A10 10 0 0 1 303.5 122z"
          fill="#ffffff"
          stroke="#e6d6b8"
          strokeWidth="2.2"
        />
        <path d="M346 103a9 9 0 0 1 0 13" fill="none" stroke="#e6d6b8" strokeWidth="2.2" />
        <rect x="296" y="94" width="52" height="6" rx="3" fill="#e2c79a" />
        <ellipse cx="322" cy="94" rx="24" ry="4.6" fill="#f6ecdb" />
        <path d="M316 88c2-4 8-4 10 0" fill="none" stroke="#dcc9a6" strokeWidth="1.8" strokeLinecap="round" />
      </g>

      {/* a small croissant on the left */}
      <g>
        <path
          d="M72 112c-8 0-13-5-13-10 0-6 6-9 13-9 4-4 9-6 15-6 9 0 16 6 16 12s-8 13-18 13z"
          fill="#f5cd8b"
          stroke="#e0af63"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <g stroke="#e0af63" strokeWidth="1.7" strokeLinecap="round">
          <path d="M76 99c1 5 1 9 0 12M87 97c1 6 1 11 0 15M96 99c0 5 0 9-1 12" />
        </g>
      </g>

      <g fill="#f6c86a" opacity="0.9">
        <circle cx="120" cy="46" r="2.6" />
        <circle cx="362" cy="60" r="2.2" />
      </g>
    </svg>
  );
}
