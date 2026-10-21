/*
 * User Management banner: a golden 3D user avatar and two cream silhouettes
 * around an identification card, a permission checklist and a small gear, over
 * soft golden sunlight, pale green hills and floating yellow dots.
 *
 * Decorative only (`aria-hidden`) — the page title, subtitle and Add User
 * control are real DOM outside the picture, and the illustration sits left of
 * the banner's centre so the heading keeps the physical right in RTL.
 */

function Cloud({ x, y, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill="#ffffff" opacity="0.92">
      <ellipse cx="0" cy="0" rx="21" ry="7.5" />
      <ellipse cx="12" cy="-6" rx="11" ry="6.5" />
      <ellipse cx="-12" cy="-3" rx="9" ry="5.5" />
    </g>
  );
}

function UserSilhouette({ x, y, scale = 1, fill }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <circle cx="0" cy="-9" r="7" fill={fill} />
      <path d="M-13 14c0-8 5.8-13 13-13s13 5 13 13z" fill={fill} />
    </g>
  );
}

export default function UsersArtwork() {
  return (
    <svg className="mart" viewBox="0 0 620 150" aria-hidden="true" focusable="false">
      {/* warm sunlight */}
      <circle cx="250" cy="46" r="52" fill="#fdf0c9" />
      <circle cx="250" cy="46" r="30" fill="#f9e0a0" opacity="0.42" />

      {/* clouds */}
      <Cloud x={118} y={26} />
      <Cloud x={470} y={32} scale={0.82} />
      <Cloud x={540} y={92} scale={0.66} />

      {/* pale green rolling hills */}
      <path d="M0 116c76 0 122-16 198-16s108 14 170 14 96-16 148-16 84 8 104 8v44H0z" fill="#e6f3d9" />
      <path d="M0 132c70-8 132 6 210 6s142-10 218-5 144 2 192-6v23H0z" fill="#d7ecc6" opacity="0.9" />

      {/* golden user-group illustration + main avatar */}
      <g>
        <ellipse cx="252" cy="130" rx="92" ry="8" fill="#f1e2b7" opacity="0.75" />
        {/* group arc behind the avatar */}
        <path d="M186 118c0-36 30-62 66-62s66 26 66 62" fill="none" stroke="#f3d192" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
        {/* main golden 3D avatar */}
        <circle cx="252" cy="70" r="21" fill="#f6c563" />
        <circle cx="252" cy="70" r="21" fill="none" stroke="#eab04a" strokeWidth="1.6" />
        <circle cx="252" cy="65" r="7.5" fill="#fff6e3" />
        <path d="M239 84c2.6-7.5 7.6-11.5 13-11.5s10.4 4 13 11.5z" fill="#fff6e3" />
        <path d="M252 49c11.6 0 21 9.4 21 21" fill="none" stroke="#fbe3ae" strokeWidth="5" strokeLinecap="round" />
        {/* two smaller cream silhouettes */}
        <UserSilhouette x={205} y={86} scale={0.86} fill="#fdeccb" />
        <UserSilhouette x={299} y={86} scale={0.86} fill="#fdeccb" />
        <g stroke="#eccf93" strokeWidth="1.2" fill="none">
          <circle cx="205" cy="77" r="6" />
          <circle cx="299" cy="77" r="6" />
        </g>
      </g>

      {/* identification card */}
      <g transform="rotate(-4 356 92)">
        <rect x="322" y="66" width="76" height="50" rx="9" fill="#ffffff" stroke="#f0e3c8" strokeWidth="1.6" />
        <circle cx="340" cy="82" r="9" fill="#fdeccb" />
        <circle cx="340" cy="80" r="3.4" fill="#e2b56f" />
        <path d="M333 88c1.8-3.4 4.4-5 7-5s5.2 1.6 7 5z" fill="#e2b56f" />
        <rect x="354" y="76" width="34" height="3.6" rx="1.8" fill="#e9eddf" />
        <rect x="354" y="84" width="24" height="3.4" rx="1.7" fill="#eef1e6" />
        <rect x="332" y="100" width="56" height="3.2" rx="1.6" fill="#eef1e6" />
        <rect x="332" y="106" width="40" height="3.2" rx="1.6" fill="#f2f4ec" />
        <rect x="332" y="72" width="10" height="10" rx="2.4" fill="#f7dca8" />
      </g>

      {/* permission checklist card */}
      <g transform="rotate(5 424 78)">
        <rect x="396" y="46" width="62" height="46" rx="8" fill="#ffffff" stroke="#f0e3c8" strokeWidth="1.6" />
        <rect x="404" y="55" width="14" height="14" rx="3.4" fill="#e8f5ea" stroke="#bfe3c6" strokeWidth="1.2" />
        <path d="m407.5 62 2.6 2.6 4.4-4.6" fill="none" stroke="#4caf6b" strokeWidth="1.6" strokeLinecap="round" />
        <rect x="423" y="58" width="28" height="3.4" rx="1.7" fill="#e9eddf" />
        <rect x="404" y="76" width="12" height="12" rx="3" fill="#fdf1d4" stroke="#ecd9b4" strokeWidth="1.2" />
        <rect x="422" y="79" width="24" height="3.2" rx="1.6" fill="#eef1e6" />
      </g>

      {/* small golden gear */}
      <g transform="translate(486 106)">
        <circle cx="0" cy="0" r="9" fill="#f8d488" stroke="#eec06d" strokeWidth="1.4" />
        <circle cx="0" cy="0" r="3.4" fill="#fffaf0" stroke="#eec06d" strokeWidth="1.2" />
        <g stroke="#eec06d" strokeWidth="2.2" strokeLinecap="round">
          <path d="M0-13v2.6M0 10.4V13M-13 0h2.6M10.4 0H13M-9.2-9.2l1.8 1.8M7.4 7.4l1.8 1.8M9.2-9.2 7.4-7.4M-7.4 7.4-9.2 9.2" />
        </g>
      </g>

      {/* decorative botanical leaves */}
      <g fill="#a9d9ae" opacity="0.92">
        <path d="M566 118c10-7 19-5 23 1-8 6-17 6-23-1z" />
        <path d="M584 108c3-9 11-13 17-10-1 8-9 13-17 10z" />
        <path d="M120 120c-10-6-18-3-22 3 8 5 16 5 22-3z" />
      </g>
      <g fill="#c8e6c0" opacity="0.95">
        <path d="M96 108c-3-8-10-11-15-9 1 7 8 11 15 9z" />
        <path d="M548 128c8-4 15-2 18 2-6 4-13 4-18-2z" />
      </g>

      {/* floating yellow dots */}
      <g fill="#f6cf6b">
        <circle cx="160" cy="52" r="4.4" opacity="0.9" />
        <circle cx="336" cy="40" r="3.2" opacity="0.85" />
        <circle cx="516" cy="60" r="3.6" opacity="0.8" />
        <circle cx="92" cy="78" r="2.6" opacity="0.75" />
      </g>
    </svg>
  );
}
