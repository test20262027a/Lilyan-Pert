/*
 * Reset Sample Data banner: a golden database stack with a green reset arrow, a
 * white document, an orange bin with a red warning triangle and botanical
 * leaves, over soft golden sunlight, pale green hills and floating yellow dots.
 *
 * Decorative only (`aria-hidden`): the title, subtitle and the red bin glyph are
 * real DOM outside the picture. The illustration sits left of the banner's
 * centre so the heading keeps the physical right in RTL.
 */

function Cloud({ x, y, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill="#ffffff" opacity="0.9">
      <ellipse cx="0" cy="0" rx="20" ry="7" />
      <ellipse cx="11" cy="-6" rx="10.5" ry="6" />
      <ellipse cx="-11" cy="-3" rx="8.5" ry="5" />
    </g>
  );
}

/** A sprig of two leaves on a stem. */
function Leaf({ x, y, scale = 1, flip = false }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}>
      <path d="M0 20C0 12 0 6 3 0" stroke="#a9d38a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M3 6c5-3 9-2 11 2-4 3-8 2-11-2z" fill="#cfe8b8" />
      <path d="M2 13c-5-2-9-1-10 3 4 2 8 1 10-3z" fill="#bde0a2" />
    </g>
  );
}

export default function ResetArtwork() {
  return (
    <svg className="mart" viewBox="0 0 620 150" aria-hidden="true" focusable="false">
      {/* warm sunlight */}
      <circle cx="244" cy="44" r="50" fill="#fdf0c9" />
      <circle cx="244" cy="44" r="28" fill="#f9e0a0" opacity="0.4" />

      {/* clouds */}
      <Cloud x={112} y={26} />
      <Cloud x={486} y={30} scale={0.8} />
      <Cloud x={552} y={88} scale={0.62} />

      {/* pale green rolling hills */}
      <path d="M0 118c74 0 120-16 196-16s108 14 170 14 96-16 148-16 84 8 106 8v44H0z" fill="#e6f3d9" />
      <path d="M0 134c70-8 132 6 210 6s142-10 218-5 144 2 192-6v23H0z" fill="#d7ecc6" opacity="0.9" />

      {/* botanical leaves behind the objects */}
      <Leaf x={128} y={96} scale={1.05} />
      <Leaf x={452} y={98} scale={0.95} flip />

      {/* golden database stack */}
      <g>
        <ellipse cx="198" cy="128" rx="40" ry="6" fill="#f1e2b7" opacity="0.7" />
        <path d="M168 66v34c0 5.6 13.4 10 30 10s30-4.4 30-10V66" fill="#f8d79a" stroke="#e8b45f" strokeWidth="1.6" />
        <ellipse cx="198" cy="66" rx="30" ry="10" fill="#fde6b7" stroke="#e8b45f" strokeWidth="1.6" />
        <path d="M168 78c0 5.6 13.4 10 30 10s30-4.4 30-10" fill="none" stroke="#e8b45f" strokeWidth="1.3" opacity="0.75" />
        <path d="M168 90c0 5.6 13.4 10 30 10s30-4.4 30-10" fill="none" stroke="#e8b45f" strokeWidth="1.3" opacity="0.75" />
      </g>

      {/* green circular reset arrow over the stack */}
      <g>
        <circle cx="234" cy="58" r="17" fill="#eaf7ec" stroke="#8ed3a2" strokeWidth="1.4" />
        <path
          d="M226 58a8 8 0 1 0 2.9 6.2"
          fill="none"
          stroke="#3fa85c"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path d="M229 51.5 236.5 52l-4.2 6z" fill="#3fa85c" />
      </g>

      {/* white document */}
      <g transform="rotate(-5 300 84)">
        <rect x="272" y="52" width="56" height="66" rx="7" fill="#ffffff" stroke="#f0e3c8" strokeWidth="1.6" />
        <rect x="282" y="64" width="36" height="3.6" rx="1.8" fill="#e9eddf" />
        <rect x="282" y="73" width="28" height="3.4" rx="1.7" fill="#eff2e7" />
        <rect x="282" y="82" width="33" height="3.4" rx="1.7" fill="#eff2e7" />
        <rect x="282" y="96" width="16" height="3.4" rx="1.7" fill="#f4f6ee" />
        <circle cx="314" cy="102" r="7" fill="#eaf7ec" stroke="#b7e2c5" strokeWidth="1.2" />
        <path d="m311 102 2.2 2.2 3.6-4.1" fill="none" stroke="#3fa85c" strokeWidth="1.6" strokeLinecap="round" />
      </g>

      {/* orange bin */}
      <g transform="translate(356 44)">
        <ellipse cx="19" cy="84" rx="20" ry="5" fill="#f1e2b7" opacity="0.7" />
        <path d="M4 16h30l-3.6 39a5 5 0 0 1-5 4.6H12.6a5 5 0 0 1-5-4.6z" fill="#f4a261" stroke="#e08b4a" strokeWidth="1.6" />
        <rect x="0" y="9" width="38" height="7.5" rx="3.7" fill="#f7b780" stroke="#e08b4a" strokeWidth="1.6" />
        <path d="M13 5h12v4.5H13z" fill="none" stroke="#e08b4a" strokeWidth="2" strokeLinejoin="round" />
        <path d="M13 26v24M22 26v24" stroke="#e08b4a" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
      </g>

      {/* red warning triangle */}
      <g transform="translate(392 42)">
        <path d="M15 0 30 26H0z" fill="#f2917a" stroke="#e2705a" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M15 9v8M15 21h.01" stroke="#fff6f2" strokeWidth="2.6" strokeLinecap="round" />
      </g>

      {/* small floating golden particles */}
      <g fill="#f3cf7f">
        <circle cx="160" cy="46" r="2.4" />
        <circle cx="332" cy="32" r="2" />
        <circle cx="424" cy="112" r="2.2" />
        <circle cx="286" cy="126" r="1.8" />
        <circle cx="138" cy="70" r="1.6" />
        <circle cx="470" cy="60" r="1.8" />
      </g>
    </svg>
  );
}
