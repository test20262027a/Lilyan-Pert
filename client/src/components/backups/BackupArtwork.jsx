/*
 * Backup & Restore banner: a cloud above three golden data disks, a white
 * document and a golden folder, an orange upload arrow, green sync arrows and a
 * green shield with a check, over soft sunlight, pale green hills and leaves.
 *
 * Decorative only (`aria-hidden`): the title, subtitle and the green database
 * glyph are real DOM outside the picture, so they stay readable and translatable.
 * The illustration keeps the banner's physical left/centre free for the heading.
 */

function Cloud({ x, y, scale = 1, opacity = 0.9 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill="#ffffff" opacity={opacity}>
      <ellipse cx="0" cy="0" rx="20" ry="7" />
      <ellipse cx="11" cy="-6" rx="10.5" ry="6" />
      <ellipse cx="-11" cy="-3" rx="8.5" ry="5" />
    </g>
  );
}

function Leaf({ x, y, scale = 1, flip = false }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}>
      <path d="M0 20C0 12 0 6 3 0" stroke="#a9d38a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M3 6c5-3 9-2 11 2-4 3-8 2-11-2z" fill="#cfe8b8" />
      <path d="M2 13c-5-2-9-1-10 3 4 2 8 1 10-3z" fill="#bde0a2" />
    </g>
  );
}

function Disk({ x, y, w = 62, fill = '#f8d79a', edge = '#e8b45f' }) {
  const half = w / 2;
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={`M${-half} 0v26c0 5 14 9 ${half} 9s${half}-4 ${half}-9V0`} fill={fill} stroke={edge} strokeWidth="1.6" />
      <ellipse cx="0" cy="0" rx={half} ry="8" fill="#fde6b7" stroke={edge} strokeWidth="1.6" />
      <path d={`M${-half} 10c0 4.4 14 8 ${half} 8s${half}-3.6 ${half}-8`} fill="none" stroke={edge} strokeWidth="1.2" opacity="0.7" />
    </g>
  );
}

export default function BackupArtwork() {
  return (
    <svg className="mart" viewBox="0 0 620 150" aria-hidden="true" focusable="false">
      {/* warm sunlight */}
      <circle cx="222" cy="42" r="48" fill="#fdf0c9" />
      <circle cx="222" cy="42" r="26" fill="#f9e0a0" opacity="0.4" />

      {/* light decorative clouds */}
      <Cloud x={104} y={24} />
      <Cloud x={468} y={26} scale={0.78} opacity={0.8} />
      <Cloud x={548} y={84} scale={0.6} opacity={0.7} />

      {/* pale green rolling hills */}
      <path d="M0 116c74 0 120-15 196-15s108 13 170 13 96-15 148-15 84 8 106 8v43H0z" fill="#e9f4dd" />
      <path d="M0 132c70-8 132 6 210 6s142-9 218-4 144 1 192-6v22H0z" fill="#dbeecb" opacity="0.9" />

      {/* botanical details */}
      <Leaf x={120} y={92} scale={1.02} />
      <Leaf x={444} y={94} scale={0.92} flip />
      <Leaf x={402} y={102} scale={0.7} />

      {/* golden floating circles */}
      <circle cx="338" cy="30" r="4" fill="#f6d78e" opacity="0.9" />
      <circle cx="368" cy="52" r="2.6" fill="#f8e2ac" />
      <circle cx="300" cy="20" r="2.4" fill="#f8e2ac" />

      {/* large cloud behind the objects */}
      <g transform="translate(210 44)">
        <ellipse cx="0" cy="0" rx="52" ry="17" fill="#ffffff" opacity="0.88" />
        <ellipse cx="26" cy="-12" rx="24" ry="14" fill="#ffffff" opacity="0.9" />
        <ellipse cx="-24" cy="-8" rx="20" ry="12" fill="#ffffff" opacity="0.82" />
      </g>

      {/* three golden data disks */}
      <ellipse cx="176" cy="126" rx="40" ry="6" fill="#f1e2b7" opacity="0.65" />
      <g opacity="0.95">
        <Disk x={176} y={86} w={58} fill="#f7dbab" />
        <Disk x={176} y={72} w={58} fill="#fae3b9" />
        <Disk x={176} y={58} w={58} />
      </g>

      {/* green sync arrows over the stack */}
      <g>
        <circle cx="214" cy="52" r="16" fill="#eaf7ec" stroke="#8ed3a2" strokeWidth="1.4" />
        <path d="M206 52a8 8 0 1 0 2.9 6.2" fill="none" stroke="#3fa85c" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M209 45.5 216.5 46l-4.2 6z" fill="#3fa85c" />
      </g>

      {/* golden folder */}
      <g transform="translate(286 74)">
        <path d="M-26 0h16l5 6h31v36a6 6 0 0 1-6 6h-46a6 6 0 0 1-6-6V6a6 6 0 0 1 6-6z" fill="#f9dfae" stroke="#e6b569" strokeWidth="1.5" />
        <path d="M-26 18h52v26a5 5 0 0 1-5 5h-42a5 5 0 0 1-5-5z" fill="#fdf0cf" stroke="#e6b569" strokeWidth="1.3" />
        <rect x="-14" y="28" width="28" height="3" rx="1.5" fill="#eccf9c" />
        <rect x="-14" y="36" width="18" height="3" rx="1.5" fill="#f1dcb4" />
      </g>

      {/* white document floating in front */}
      <g transform="rotate(-4 342 74)">
        <rect x="318" y="42" width="50" height="60" rx="7" fill="#ffffff" stroke="#efe4cd" strokeWidth="1.6" />
        <rect x="327" y="54" width="32" height="3.4" rx="1.7" fill="#e9eddf" />
        <rect x="327" y="63" width="24" height="3.2" rx="1.6" fill="#eff2e7" />
        <rect x="327" y="72" width="29" height="3.2" rx="1.6" fill="#eff2e7" />
        <rect x="327" y="84" width="14" height="3.2" rx="1.6" fill="#f4f6ee" />
      </g>

      {/* smaller floating document behind */}
      <g transform="rotate(7 392 62)" opacity="0.85">
        <rect x="374" y="34" width="34" height="42" rx="6" fill="#ffffff" stroke="#f1e7d4" strokeWidth="1.4" />
        <rect x="381" y="44" width="20" height="3" rx="1.5" fill="#edf1e6" />
        <rect x="381" y="51" width="14" height="3" rx="1.5" fill="#f2f5ec" />
      </g>

      {/* orange upload arrow rising out of the stack */}
      <g transform="translate(238 96)">
        <path d="M0 22V0" stroke="#f0a44b" strokeWidth="7" strokeLinecap="round" />
        <path d="M-11 9 0-2l11 11" fill="none" stroke="#f0a44b" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* green shield with a white check — protected archive */}
      <g transform="translate(410 84)">
        <path d="M0-18 16-11v12C16 9 9 16 0 20-9 16-16 9-16 2v-13z" fill="#e8f7ec" stroke="#7fcb98" strokeWidth="1.6" />
        <path d="m-7 1 5 5 10-11" fill="none" stroke="#3fa85c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* orange circular sync arrows */}
      <g transform="translate(348 106)">
        <path d="M-9 0a9 9 0 0 1 15-6.4" fill="none" stroke="#ef9a4a" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M7 0a9 9 0 0 1-15 6.4" fill="none" stroke="#ef9a4a" strokeWidth="2.4" strokeLinecap="round" opacity="0.75" />
        <path d="M4.6-10.6 8-7l-4.8.8z" fill="#ef9a4a" />
        <path d="M-4.6 10.6-8 7l4.8-.8z" fill="#ef9a4a" opacity="0.75" />
      </g>
    </svg>
  );
}
