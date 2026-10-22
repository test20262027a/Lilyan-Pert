/*
 * The platform marks the contact grid needs, drawn in the same stroke language
 * as the app's own Icon set so a social tile never looks pasted in. Anything
 * that is not one of these falls back to the generic Icon component.
 */
const PATHS = {
  whatsapp: (
    <>
      <path d="M20.4 11.8A8.4 8.4 0 0 1 7.9 19.1L3.6 20.4l1.3-4.3a8.4 8.4 0 1 1 15.5-4.3z" />
      <path d="M9.1 8.1c-.4.4-.6.9-.5 1.6.1 1.2 1.1 2.5 1.9 3.3.9.9 2 1.7 3.1 2 .7.2 1.3 0 1.7-.5l.5-.6c.2-.3.1-.6-.1-.8l-1.3-.9c-.2-.2-.5-.1-.7.1l-.4.4a5.6 5.6 0 0 1-2.6-2.6l.4-.4c.2-.2.2-.5.1-.7l-.9-1.3c-.2-.2-.5-.3-.9-.1z" />
    </>
  ),
  instagram: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="5" />
      <circle cx="12" cy="12" r="3.9" />
      <circle cx="17.1" cy="6.9" r=".95" fill="currentColor" stroke="none" />
    </>
  ),
  facebook: (
    <path
      d="M13.7 20.8v-7.4h2.5l.4-2.9h-2.9V8.6c0-.85.24-1.43 1.46-1.43h1.56V4.58a20 20 0 0 0-2.28-.12c-2.26 0-3.82 1.38-3.82 3.92v2.18H8.3v2.9h2.32v7.34z"
      fill="currentColor"
      stroke="none"
    />
  ),
  tiktok: (
    <path
      d="M16.4 3.2h-2.7v11.1a2.35 2.35 0 1 1-1.8-2.29V9.2a5.1 5.1 0 1 0 4.5 5.06V8.6a5.6 5.6 0 0 0 3.2 1.02V6.86a2.96 2.96 0 0 1-3.2-3.66z"
      fill="currentColor"
      stroke="none"
    />
  ),
};

export const hasBrandIcon = (name) => Object.prototype.hasOwnProperty.call(PATHS, name);

export default function BrandIcon({ name, size = 20 }) {
  const path = PATHS[name];
  if (!path) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="icon brand"
      aria-hidden="true"
      focusable="false"
    >
      {path}
    </svg>
  );
}
