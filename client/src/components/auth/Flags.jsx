/*
 * Vector flags for the language switcher. Inline SVG keeps them sharp at any
 * pixel density without shipping extra image assets, and the wrapper renders
 * them as a small rounded chip wherever a language is listed.
 */

const FLAGS = {
  /* Kurdistan — red, white and green bands with the golden sun. */
  ku: (
    <>
      <rect width="24" height="5.33" fill="#ED2024" />
      <rect y="5.33" width="24" height="5.34" fill="#FFFFFF" />
      <rect y="10.67" width="24" height="5.33" fill="#278E43" />
      <circle cx="12" cy="8" r="2.1" fill="#FEBD11" />
      <g stroke="#FEBD11" strokeWidth="0.7" strokeLinecap="round">
        <path d="M12 5.2V4.2M12 10.8v1M9.2 8H8.2M14.8 8h1" />
        <path d="M10.05 6.05 9.35 5.35M13.95 6.05l.7-.7M10.05 9.95l-.7.7M13.95 9.95l.7.7" />
      </g>
    </>
  ),
  /* English — United Kingdom. */
  en: (
    <>
      <rect width="24" height="16" fill="#012169" />
      <path d="M0 0 24 16M24 0 0 16" stroke="#FFFFFF" strokeWidth="3.2" />
      <path d="M0 0 24 16M24 0 0 16" stroke="#C8102E" strokeWidth="1.5" />
      <path d="M12 0v16M0 8h24" stroke="#FFFFFF" strokeWidth="5.2" />
      <path d="M12 0v16M0 8h24" stroke="#C8102E" strokeWidth="3" />
    </>
  ),
  /* Persian — Iran. */
  fa: (
    <>
      <rect width="24" height="5.33" fill="#239F40" />
      <rect y="5.33" width="24" height="5.34" fill="#FFFFFF" />
      <rect y="10.67" width="24" height="5.33" fill="#DA0000" />
      <circle cx="12" cy="8" r="1.5" fill="none" stroke="#DA0000" strokeWidth="0.7" />
      <path d="M12 6.9c-.7.5-.7 1.7 0 2.2.7-.5.7-1.7 0-2.2z" fill="#DA0000" />
    </>
  ),
  /* Arabic — Egypt. */
  ar: (
    <>
      <rect width="24" height="5.33" fill="#CE1126" />
      <rect y="5.33" width="24" height="5.34" fill="#FFFFFF" />
      <rect y="10.67" width="24" height="5.33" fill="#1B1B1B" />
      <circle cx="12" cy="8" r="1.15" fill="#C09300" />
    </>
  ),
};

export default function Flag({ code }) {
  return (
    <span className="au-flag" aria-hidden="true">
      <svg viewBox="0 0 24 16" focusable="false">
        {FLAGS[code] || FLAGS.en}
      </svg>
    </span>
  );
}
