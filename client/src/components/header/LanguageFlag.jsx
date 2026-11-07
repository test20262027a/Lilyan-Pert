/*
 * Language flags drawn inline.
 *
 * Emoji flags cannot represent Kurdistan (🇮🇶 is Iraq and would be wrong for
 * Kurdish Sorani), so every flag is an SVG with the same 3:2 geometry. Each
 * language always maps to the same artwork, here and in the dropdown.
 */
const FLAG_TITLES = {
  ku: 'Kurdistan',
  fa: 'Iran',
  ar: 'Iraq',
  en: 'United Kingdom',
};

/** The 21-ray sun of the Kurdistan flag, centred in the white band. */
function KurdistanSun() {
  const rays = Array.from({ length: 21 }, (_, i) => (
    <line key={i} x1="12" y1="7.6" x2="12" y2="9.1" transform={`rotate(${i * (360 / 21)} 12 7.5)`} />
  ));
  return (
    <g fill="none" stroke="#f5c400" strokeWidth="0.45" strokeLinecap="round">
      {rays}
      <circle cx="12" cy="7.5" r="1.5" fill="#f5c400" stroke="none" />
    </g>
  );
}

const FLAGS = {
  ku: (
    <>
      <rect width="24" height="5" y="0" fill="#ed1c24" />
      <rect width="24" height="5" y="5" fill="#ffffff" />
      <rect width="24" height="5" y="10" fill="#1f9d3f" />
      <KurdistanSun />
    </>
  ),
  fa: (
    <>
      <rect width="24" height="5" y="0" fill="#239f40" />
      <rect width="24" height="5" y="5" fill="#ffffff" />
      <rect width="24" height="5" y="10" fill="#da0000" />
      <path
        d="M12 5.6c.75 1.1.75 2.2 0 3.3-.75-1.1-.75-2.2 0-3.3zM10.6 9.4c.6-.5 1.3-.5 1.9 0M13.4 9.4c-.6-.5-1.3-.5-1.9 0"
        fill="#da0000"
      />
      <rect width="24" height="0.5" y="5" fill="#da0000" opacity="0.35" />
      <rect width="24" height="0.5" y="9.5" fill="#239f40" opacity="0.35" />
    </>
  ),
  ar: (
    <>
      <rect width="24" height="5" y="0" fill="#ce1126" />
      <rect width="24" height="5" y="5" fill="#ffffff" />
      <rect width="24" height="5" y="10" fill="#000000" />
      <g fill="#1f9d3f">
        <rect x="7.6" y="6.7" width="1.5" height="0.5" rx="0.2" />
        <rect x="10.2" y="6.7" width="1.5" height="0.5" rx="0.2" />
        <rect x="12.8" y="6.7" width="1.6" height="0.5" rx="0.2" />
        <rect x="15.4" y="6.7" width="1" height="0.5" rx="0.2" />
        <rect x="8.4" y="7.7" width="1.3" height="0.5" rx="0.2" />
        <rect x="12" y="7.7" width="1.4" height="0.5" rx="0.2" />
        <rect x="14.6" y="7.7" width="1.2" height="0.5" rx="0.2" />
      </g>
    </>
  ),
  en: (
    <>
      <rect width="24" height="15" fill="#012169" />
      <path d="M0 0l24 15M24 0L0 15" stroke="#ffffff" strokeWidth="3" />
      <path d="M0 0l24 15M24 0L0 15" stroke="#c8102e" strokeWidth="1.4" />
      <path d="M12 0v15M0 7.5h24" stroke="#ffffff" strokeWidth="5" />
      <path d="M12 0v15M0 7.5h24" stroke="#c8102e" strokeWidth="3" />
    </>
  ),
};

export default function LanguageFlag({ code, className = '' }) {
  if (!FLAGS[code]) return null;
  return (
    <svg
      className={`lang-flag ${className}`.trim()}
      viewBox="0 0 24 15"
      role="img"
      aria-label={FLAG_TITLES[code] || code}
      focusable="false"
    >
      {FLAGS[code]}
      <rect x="0" y="0" width="24" height="15" fill="none" stroke="rgba(20, 30, 25, 0.16)" strokeWidth="0.6" />
    </svg>
  );
}

export { FLAG_TITLES };
