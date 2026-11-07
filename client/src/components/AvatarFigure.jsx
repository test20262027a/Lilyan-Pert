import { useId } from 'react';

/*
 * The two illustrated fallback avatars — a male and a female portrait.
 *
 * They are drawn, not icon glyphs: soft skin gradients, a shaded neckline, a
 * layered hairstyle and a theme-coloured shoulder shape give the figure real
 * depth inside the small circular frame. The clothing and the background come
 * from the active theme tokens, so every appearance preset and dark mode keeps
 * the same premium look without a second palette.
 *
 * Both are decorative: the label always comes from the surrounding element.
 */
export default function AvatarFigure({ kind = 'male', className = '' }) {
  const uid = useId().replace(/[:]/g, '');
  const skin = `${uid}-skin`;

  return (
    <svg
      className={`avfig avfig--${kind} ${className}`.trim()}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={`${uid}-bg`} cx="30%" cy="18%" r="92%">
          <stop offset="0%" style={{ stopColor: 'var(--theme-primary-soft)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--surface)' }} />
        </radialGradient>
        <linearGradient id={skin} x1="18%" y1="8%" x2="82%" y2="96%">
          <stop offset="0%" stopColor="#ffdfc4" />
          <stop offset="58%" stopColor="#f7c9a4" />
          <stop offset="100%" stopColor="#e8ad83" />
        </linearGradient>
        <linearGradient id={`${uid}-shirt`} x1="12%" y1="0%" x2="88%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'var(--theme-primary)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--theme-primary-strong)' }} />
        </linearGradient>
        <linearGradient id={`${uid}-hair`} x1="24%" y1="0%" x2="76%" y2="100%">
          <stop offset="0%" stopColor="#4a352a" />
          <stop offset="100%" stopColor="#2c1f18" />
        </linearGradient>
        {/* A single warm highlight across the crown: it keeps the hair from
            reading as a flat silhouette at small sizes. */}
        <linearGradient id={`${uid}-sheen`} x1="18%" y1="0%" x2="72%" y2="86%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="100" height="100" fill={`url(#${uid}-bg)`} />

      {kind === 'female' ? (
        <>
          {/* Hair falling behind the shoulders. */}
          <path
            d="M21 100c-3-17-4-29-2-39 3-16 14-26 31-26s28 10 31 26c2 10 1 22-2 39-4-7-6-16-7-24-5 6-13 9-22 9s-17-3-22-9c-1 8-3 17-7 24z"
            fill={`url(#${uid}-hair)`}
          />
          {/* Shoulders and top. */}
          <path d="M13 100c3-16 16-25 37-25s34 9 37 25z" fill={`url(#${uid}-shirt)`} />
          <path d="M50 75c7 0 12 2 16 5-3 3-9 5-16 5s-13-2-16-5c4-3 9-5 16-5z" fill="#000000" opacity="0.14" />
          {/* Neck. */}
          <path d="M44 58h12v14c0 4-12 4-12 0z" fill="#e0a37a" />
          {/* Face. */}
          <ellipse cx="50" cy="43" rx="17.5" ry="19.5" fill={`url(#${skin})`} />
          {/* Fringe framing the face. */}
          <path
            d="M30 45c-2-14 7-24 20-24s22 10 20 24c-1-5-3-9-6-11-4-3-8-3-14-3s-10 0-14 3c-3 2-5 6-6 11z"
            fill={`url(#${uid}-hair)`}
          />
          <path d="M32 42c3-9 8-14 18-14 9 0 15 5 18 14-6-5-11-6-18-6s-12 1-18 6z" fill="#5b4133" opacity="0.55" />
          <path d="M35 33c5-6 10-8 15-8 6 0 11 2 16 8-5-3-10-4-16-4s-11 1-15 4z" fill={`url(#${uid}-sheen)`} />
          {/* Eyes, lashes, blush, smile. */}
          <ellipse cx="43.5" cy="45" rx="2.2" ry="2.7" fill="#3b2c24" />
          <ellipse cx="56.5" cy="45" rx="2.2" ry="2.7" fill="#3b2c24" />
          <circle cx="44.2" cy="44.2" r="0.75" fill="#ffffff" opacity="0.9" />
          <circle cx="57.2" cy="44.2" r="0.75" fill="#ffffff" opacity="0.9" />
          <path d="M40.4 40.4l4.6-1.1M55 39.3l4.6 1.1" stroke="#3b2c24" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <circle cx="38.5" cy="50" r="3.2" fill="#f08a8a" opacity="0.32" />
          <circle cx="61.5" cy="50" r="3.2" fill="#f08a8a" opacity="0.32" />
          <path d="M46 53.4c2 2.2 6 2.2 8 0" stroke="#b96a4d" strokeWidth="1.7" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          {/* Shoulders and top. */}
          <path d="M11 100c3-17 17-27 39-27s36 10 39 27z" fill={`url(#${uid}-shirt)`} />
          <path d="M50 73c8 0 14 2 18 6-4 3-11 5-18 5s-14-2-18-5c4-4 10-6 18-6z" fill="#000000" opacity="0.15" />
          {/* Collar. */}
          <path d="M43 73l7 7 7-7 4 3-11 9-11-9z" fill="#ffffff" opacity="0.22" />
          {/* Neck. */}
          <path d="M43 57h14v15c0 4-14 4-14 0z" fill="#e0a37a" />
          {/* Ears. */}
          <circle cx="30.5" cy="46" r="3.4" fill="#eeb188" />
          <circle cx="69.5" cy="46" r="3.4" fill="#eeb188" />
          {/* Face. */}
          <ellipse cx="50" cy="43" rx="19" ry="21" fill={`url(#${skin})`} />
          {/* Short layered hair. */}
          <path
            d="M30 44c-2-14 7-24 20-24s22 10 20 24c-1-6-3-10-6-12-5-3-9-4-14-4s-9 1-14 4c-3 2-5 6-6 12z"
            fill={`url(#${uid}-hair)`}
          />
          <path d="M33 36c4-7 9-10 17-10 7 0 13 3 17 10-5-4-10-5-17-5s-12 1-17 5z" fill="#5b4133" opacity="0.5" />
          <path d="M35 32c4-5 9-7 15-7 7 0 12 2 16 7-5-2-10-3-16-3s-11 1-15 3z" fill={`url(#${uid}-sheen)`} />
          {/* Eyes and brows. */}
          <ellipse cx="43.5" cy="45" rx="2.3" ry="2.8" fill="#3b2c24" />
          <ellipse cx="56.5" cy="45" rx="2.3" ry="2.8" fill="#3b2c24" />
          <circle cx="44.2" cy="44.2" r="0.75" fill="#ffffff" opacity="0.9" />
          <circle cx="57.2" cy="44.2" r="0.75" fill="#ffffff" opacity="0.9" />
          <path d="M39.8 40h7M53.2 40h7" stroke="#3b2c24" strokeWidth="1.9" strokeLinecap="round" fill="none" />
          <path d="M50 45.5v3.2" stroke="#d99b74" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          <path d="M46 53.6c2 2.3 6 2.3 8 0" stroke="#b96a4d" strokeWidth="1.7" strokeLinecap="round" fill="none" />
        </>
      )}
    </svg>
  );
}
