import { useId } from 'react';

/*
 * The celebration set behind the order-success popup: twelve hand-drawn,
 * glossy "3D" illustrations — gradients, a soft ground shadow and a top
 * highlight each — so every confirmation carries the same visual language
 * instead of whatever emoji font the guest's operating system happens to
 * install.
 *
 * They are inline SVG (no network request, nothing to break), one 100×100
 * box each, drawn around the same optical centre so the popup's layout never
 * shifts between picks. Gradient ids are namespaced per instance because two
 * of these can be on screen at once (the outgoing and the incoming card).
 */

const STAR =
  'M12 1.6l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.8 5.6 21.2l1.4-7.1-5.3-5 7.2-.9z';

const shadow = <ellipse cx="50" cy="91" rx="23" ry="4.4" fill="#0B2018" opacity="0.15" />;

const ARTS = {
  /* A beaming face with its mouth wide open. */
  party: (u) => (
    <>
      <defs>
        <radialGradient id={`${u}a`} cx="34%" cy="26%" r="82%">
          <stop offset="0%" stopColor="#FFE9A3" />
          <stop offset="52%" stopColor="#FFC93C" />
          <stop offset="100%" stopColor="#EDA200" />
        </radialGradient>
        <linearGradient id={`${u}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7A2E12" />
          <stop offset="100%" stopColor="#41150A" />
        </linearGradient>
      </defs>
      {shadow}
      <circle cx="50" cy="48" r="33" fill={`url(#${u}a)`} />
      <ellipse cx="37" cy="32" rx="11" ry="6.5" fill="#fff" opacity="0.42" transform="rotate(-18 37 32)" />
      <ellipse cx="39" cy="42" rx="4.2" ry="6" fill="#3A2606" />
      <ellipse cx="61" cy="42" rx="4.2" ry="6" fill="#3A2606" />
      <ellipse cx="40.5" cy="40" rx="1.4" ry="1.9" fill="#fff" opacity="0.9" />
      <ellipse cx="62.5" cy="40" rx="1.4" ry="1.9" fill="#fff" opacity="0.9" />
      <path d="M36 55c5 9 23 9 28 0 2 13-8 19-14 19s-16-6-14-19Z" fill={`url(#${u}b)`} />
      <path d="M44 68c2 4 10 4 12 0-2 6-10 6-12 0Z" fill="#F2637A" />
      <circle cx="17" cy="25" r="3" fill="#7C67E4" opacity="0.9" />
      <circle cx="84" cy="20" r="2.4" fill="#F2784B" opacity="0.9" />
      <circle cx="86" cy="58" r="3.2" fill="#16A34A" opacity="0.85" />
      <rect x="15" y="61" width="5" height="5" rx="1.6" fill="#0EA5E9" opacity="0.8" transform="rotate(24 17.5 63.5)" />
    </>
  ),

  /* Star eyes: the "this is amazing" face. */
  starstruck: (u) => (
    <>
      <defs>
        <radialGradient id={`${u}a`} cx="34%" cy="25%" r="84%">
          <stop offset="0%" stopColor="#FFF0B8" />
          <stop offset="55%" stopColor="#FFD24D" />
          <stop offset="100%" stopColor="#F0A70A" />
        </radialGradient>
        <linearGradient id={`${u}s`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE270" />
          <stop offset="100%" stopColor="#F5A623" />
        </linearGradient>
      </defs>
      {shadow}
      <circle cx="50" cy="49" r="32" fill={`url(#${u}a)`} />
      <ellipse cx="38" cy="33" rx="10" ry="6" fill="#fff" opacity="0.42" transform="rotate(-18 38 33)" />
      <path d={STAR} fill="#4A2E08" transform="translate(32 36) scale(0.62)" />
      <path d={STAR} fill="#4A2E08" transform="translate(52 36) scale(0.62)" />
      <path d="M37 60c4 6 22 6 26 0-3 10-23 10-26 0Z" fill="#8C3A18" />
      <path d={STAR} fill={`url(#${u}s)`} transform="translate(4 8) scale(0.42)" />
      <path d={STAR} fill={`url(#${u}s)`} transform="translate(83 16) scale(0.34)" />
      <path d={STAR} fill={`url(#${u}s)`} transform="translate(80 64) scale(0.28)" />
    </>
  ),

  /* A golden cup. */
  trophy: (u) => (
    <>
      <defs>
        <linearGradient id={`${u}a`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#FFEB9E" />
          <stop offset="45%" stopColor="#F5C544" />
          <stop offset="100%" stopColor="#C98A05" />
        </linearGradient>
        <linearGradient id={`${u}b`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#E0A50F" />
          <stop offset="100%" stopColor="#B47A02" />
        </linearGradient>
      </defs>
      {shadow}
      <path d="M33 26h34v9c0 12-7.6 20-17 20s-17-8-17-20z" fill={`url(#${u}a)`} />
      <path
        d="M33 30h-8a7 7 0 0 0 0 14h5M67 30h8a7 7 0 0 1 0 14h-5"
        fill="none"
        stroke={`url(#${u}a)`}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <rect x="46.5" y="52" width="7" height="11" fill={`url(#${u}b)`} />
      <rect x="35" y="62" width="30" height="9" rx="4.5" fill={`url(#${u}a)`} />
      <rect x="31" y="70" width="38" height="6" rx="3" fill={`url(#${u}b)`} />
      <ellipse cx="43" cy="34" rx="4" ry="6" fill="#fff" opacity="0.5" />
      <path d={STAR} fill="#FFF3C4" transform="translate(42 32) scale(0.62)" />
      <circle cx="82" cy="22" r="2.6" fill="#FFC93C" opacity="0.9" />
      <circle cx="18" cy="34" r="2" fill="#FFC93C" opacity="0.8" />
    </>
  ),

  /* A wrapped present. */
  gift: (u) => (
    <>
      <defs>
        <linearGradient id={`${u}a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF8FA8" />
          <stop offset="55%" stopColor="#F0567A" />
          <stop offset="100%" stopColor="#C62F55" />
        </linearGradient>
        <linearGradient id={`${u}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE9A0" />
          <stop offset="100%" stopColor="#E2A90D" />
        </linearGradient>
      </defs>
      {shadow}
      <rect x="25" y="45" width="50" height="38" rx="6" fill={`url(#${u}a)`} />
      <rect x="20" y="34" width="60" height="14" rx="6" fill={`url(#${u}a)`} />
      <rect x="20" y="34" width="60" height="6" rx="3" fill="#fff" opacity="0.22" />
      <rect x="45" y="34" width="10" height="49" fill={`url(#${u}b)`} />
      <path d="M50 34c-9-2-16-6-15-12 1-5 8-5 11-1 2 3 4 8 4 13z" fill={`url(#${u}b)`} />
      <path d="M50 34c9-2 16-6 15-12-1-5-8-5-11-1-2 3-4 8-4 13z" fill={`url(#${u}b)`} />
      <circle cx="50" cy="20" r="4" fill="#FFD75E" />
      <ellipse cx="32" cy="55" rx="4" ry="8" fill="#fff" opacity="0.22" transform="rotate(-14 32 55)" />
    </>
  ),

  /* Lift-off. */
  rocket: (u) => (
    <>
      <defs>
        <linearGradient id={`${u}a`} x1="0.2" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#E7EDF5" />
          <stop offset="100%" stopColor="#B9C6D6" />
        </linearGradient>
        <linearGradient id={`${u}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF9A6B" />
          <stop offset="100%" stopColor="#E8452F" />
        </linearGradient>
        <linearGradient id={`${u}c`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD75E" />
          <stop offset="100%" stopColor="#F07A16" />
        </linearGradient>
      </defs>
      {shadow}
      <path d="M35 58l-9 8v-16zM65 58l9 8v-16z" fill={`url(#${u}b)`} />
      <path d="M50 13c10 8 16 20 16 32 0 8-3 14-8 19H42c-5-5-8-11-8-19 0-12 6-24 16-32z" fill={`url(#${u}a)`} />
      <path d="M50 13c10 8 16 20 16 32 0 4-1 8-2 11H36c-1-3-2-7-2-11 0-12 6-24 16-32z" fill="#F0567A" opacity="0.16" />
      <circle cx="50" cy="42" r="8.5" fill="#243447" />
      <circle cx="50" cy="42" r="6" fill={`url(#${u}c)`} opacity="0.9" />
      <ellipse cx="47.5" cy="39.5" rx="2" ry="2.6" fill="#fff" opacity="0.85" />
      <path d="M43 63c2 8 5 12 7 15 2-3 5-7 7-15-2 3-4 5-7 5s-5-2-7-5z" fill={`url(#${u}c)`} />
      <path d="M31 24l2 5 5 1-4 3 1 5-4-2-4 2 1-5-4-3 5-1z" fill="#FFD75E" opacity="0.9" />
    </>
  ),

  /* A constellation of sparkles. */
  sparkles: (u) => (
    <>
      <defs>
        <linearGradient id={`${u}a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFF2A8" />
          <stop offset="100%" stopColor="#F3B511" />
        </linearGradient>
        <linearGradient id={`${u}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#DCE6FF" />
          <stop offset="100%" stopColor="#8FA8E8" />
        </linearGradient>
      </defs>
      {shadow}
      <path d={STAR} fill={`url(#${u}a)`} transform="translate(22 18) scale(2.4)" />
      <path d={STAR} fill={`url(#${u}b)`} transform="translate(62 40) scale(1.5)" />
      <path d={STAR} fill={`url(#${u}a)`} transform="translate(50 68) scale(1.1)" />
      <circle cx="24" cy="72" r="3" fill="#F0567A" opacity="0.85" />
      <circle cx="78" cy="24" r="2.4" fill="#F5A623" opacity="0.9" />
    </>
  ),

  /* A glossy heart. */
  heart: (u) => (
    <>
      <defs>
        <radialGradient id={`${u}a`} cx="32%" cy="24%" r="86%">
          <stop offset="0%" stopColor="#FF9DB0" />
          <stop offset="55%" stopColor="#F0455F" />
          <stop offset="100%" stopColor="#BC1C3C" />
        </radialGradient>
      </defs>
      {shadow}
      <path
        d="M50 82C32 69 17 58 17 41c0-11 8-19 19-19 6 0 11 3 14 8 3-5 8-8 14-8 11 0 19 8 19 19 0 17-15 28-33 41z"
        fill={`url(#${u}a)`}
      />
      <ellipse cx="35" cy="34" rx="9" ry="5.5" fill="#fff" opacity="0.42" transform="rotate(-28 35 34)" />
      <circle cx="79" cy="24" r="2.6" fill="#FF9DB0" opacity="0.9" />
      <circle cx="20" cy="62" r="2.2" fill="#FF9DB0" opacity="0.75" />
    </>
  ),

  /* Confirmed. */
  check: (u) => (
    <>
      <defs>
        <linearGradient id={`${u}a`} x1="0.2" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#7BEFA3" />
          <stop offset="50%" stopColor="#2FC46B" />
          <stop offset="100%" stopColor="#128A47" />
        </linearGradient>
      </defs>
      {shadow}
      <circle cx="50" cy="47" r="33" fill={`url(#${u}a)`} />
      <circle cx="50" cy="47" r="28" fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="2" />
      <ellipse cx="37" cy="30" rx="11" ry="6" fill="#fff" opacity="0.32" transform="rotate(-20 37 30)" />
      <path d="M36 48l9 9 20-21" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="83" cy="22" r="2.6" fill="#7BEFA3" opacity="0.9" />
      <circle cx="17" cy="66" r="2.2" fill="#7BEFA3" opacity="0.8" />
    </>
  ),

  /* A freshly poured cup. */
  coffee: (u) => (
    <>
      <defs>
        <linearGradient id={`${u}a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#CBD6E2" />
        </linearGradient>
        <linearGradient id={`${u}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A8703F" />
          <stop offset="100%" stopColor="#5A3217" />
        </linearGradient>
      </defs>
      {shadow}
      <path d="M20 76h56l-5 8H25z" fill="#D9E2EC" />
      <path d="M67 48h6a9 9 0 0 1 0 18h-6" fill="none" stroke="#DCE4EE" strokeWidth="5" />
      <path d="M26 44h44l-4 30a6 6 0 0 1-6 5H36a6 6 0 0 1-6-5z" fill={`url(#${u}a)`} />
      <ellipse cx="48" cy="46" rx="22" ry="6.5" fill={`url(#${u}b)`} />
      <ellipse cx="42" cy="45" rx="8" ry="2.4" fill="#D8A57A" opacity="0.55" />
      <path d="M38 32c-4-4 4-7 0-12M50 30c-4-4 4-7 0-12M62 32c-4-4 4-7 0-12" fill="none" stroke="#C9D5E2" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M32 55c2 10 4 16 6 19" stroke="#fff" strokeOpacity="0.7" strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  ),

  /* Something lovely, carried home. */
  bag: (u) => (
    <>
      <defs>
        <linearGradient id={`${u}a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFB27A" />
          <stop offset="55%" stopColor="#F2784B" />
          <stop offset="100%" stopColor="#C64D22" />
        </linearGradient>
      </defs>
      {shadow}
      <path d="M36 38V30a14 14 0 0 1 28 0v8" fill="none" stroke="#E8C9A8" strokeWidth="4" strokeLinecap="round" />
      <path d="M24 38h52l-4 42a6 6 0 0 1-6 5H34a6 6 0 0 1-6-5z" fill={`url(#${u}a)`} />
      <path d="M24 38h52l-1 8H25z" fill="#fff" opacity="0.2" />
      <path
        d="M50 74c-8-5-13-10-13-15 0-4 3-7 7-7 3 0 5 1 6 3 1-2 3-3 6-3 4 0 7 3 7 7 0 5-5 10-13 15z"
        fill="#fff"
        opacity="0.82"
      />
      <path d="M32 48c1 12 2 22 4 31" stroke="#fff" strokeOpacity="0.3" strokeWidth="3.4" fill="none" strokeLinecap="round" />
    </>
  ),

  /* A party popper mid-burst. */
  popper: (u) => (
    <>
      <defs>
        <linearGradient id={`${u}a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFD24D" />
          <stop offset="100%" stopColor="#E88C0B" />
        </linearGradient>
        <linearGradient id={`${u}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8FC4FF" />
          <stop offset="100%" stopColor="#4478E0" />
        </linearGradient>
      </defs>
      {shadow}
      <path d="M22 80l16-30 16 16-30 16z" fill={`url(#${u}a)`} />
      <path d="M26 74l11-20 11 11-20 11z" fill="#fff" opacity="0.18" />
      <circle cx="70" cy="22" r="3.4" fill="#F0567A" />
      <circle cx="84" cy="42" r="2.6" fill="#16A34A" />
      <circle cx="58" cy="14" r="2.2" fill="#7C67E4" />
      <rect x="72" y="52" width="6" height="6" rx="1.6" fill={`url(#${u}b)`} transform="rotate(20 75 55)" />
      <rect x="48" y="38" width="5" height="5" rx="1.4" fill="#F5A623" transform="rotate(-28 50.5 40.5)" />
      <path d="M62 60c6-4 10-10 11-16" stroke="#F0567A" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M68 62c7 0 12-4 15-9" stroke="#16A34A" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </>
  ),

  /* Earned. */
  medal: (u) => (
    <>
      <defs>
        <linearGradient id={`${u}a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFEA9E" />
          <stop offset="50%" stopColor="#F3BF3A" />
          <stop offset="100%" stopColor="#BE8304" />
        </linearGradient>
        <linearGradient id={`${u}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7C9BF5" />
          <stop offset="100%" stopColor="#3B57C4" />
        </linearGradient>
      </defs>
      {shadow}
      <path d="M36 12h12l8 30-12 4z" fill={`url(#${u}b)`} />
      <path d="M64 12H52l-8 30 12 4z" fill="#5A78DE" />
      <circle cx="50" cy="58" r="23" fill={`url(#${u}a)`} />
      <circle cx="50" cy="58" r="17.5" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="2" />
      <path d={STAR} fill="#FFF3C6" transform="translate(39 47) scale(0.92)" />
      <ellipse cx="40" cy="45" rx="6" ry="3.6" fill="#fff" opacity="0.35" transform="rotate(-24 40 45)" />
    </>
  ),
};

export const ORDER_EMOJI_IDS = Object.keys(ARTS);

/** One illustration by id, drawn at `size` px. */
export default function Emoji3D({ id, size = 96 }) {
  const prefix = useId().replace(/[:]/g, '');
  const art = ARTS[id] || ARTS.party;
  return (
    <svg
      className="emoji3d"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      {art(`${prefix}${id}`)}
    </svg>
  );
}
