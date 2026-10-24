/*
 * Illustrated banner for the Text Editor: a white writing sheet with golden
 * lines, a large orange pencil resting across it, golden quotation marks,
 * botanical leaves, clouds and rolling mint hills.
 *
 * Purely decorative (`aria-hidden`): the page title, subtitle and Save button
 * are real DOM outside the picture, so the heading stays readable on the
 * physical right of a right-to-left page and the button stays on the left.
 */

function Cloud({ x, y, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill="#ffffff" opacity="0.92">
      <ellipse cx="0" cy="0" rx="20" ry="7" />
      <ellipse cx="11" cy="-5" rx="11" ry="6" />
      <ellipse cx="-12" cy="-3" rx="9" ry="5" />
    </g>
  );
}

function Leaf({ x, y, rotate = 0, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      <path d="M0 0c9-9 22-8 28 0-6 9-19 10-28 0z" fill="#7fc98b" opacity="0.9" />
      <path d="M2 0c8 2 18 1 24-1" stroke="#5faf70" strokeWidth="1.2" fill="none" />
    </g>
  );
}

function TextLine({ y, width }) {
  return <rect x="292" y={y} width={width} height="4.4" rx="2.2" fill="#e9b95f" opacity="0.72" />;
}

export default function TextEditorArtwork() {
  return (
    <svg className="set-art tx-art" viewBox="0 0 640 150" aria-hidden="true" focusable="false">
      {/* warm sunlight behind the sheet */}
      <circle cx="286" cy="42" r="52" fill="#fdf2cf" />
      <circle cx="286" cy="42" r="31" fill="#f9e6b4" opacity="0.45" />

      {/* soft clouds */}
      <Cloud x={470} y={30} />
      <Cloud x={112} y={32} scale={0.78} />
      <Cloud x={556} y={96} scale={0.62} />

      {/* rolling hills */}
      <path d="M0 116c80 0 126-18 202-18s108 16 170 16 100-18 156-18 78 10 112 10v44H0z" fill="#fdf3cb" />
      <path d="M0 133c74-8 136 6 214 6s140-12 216-6 138 2 210-5v22H0z" fill="#e7f4dc" />

      {/* floating golden shapes */}
      <circle cx="196" cy="42" r="6" fill="#f4cf7e" opacity="0.85" />
      <circle cx="404" cy="34" r="4.4" fill="#f4cf7e" opacity="0.7" />
      <circle cx="414" cy="112" r="5" fill="#f0c264" opacity="0.55" />

      {/* ---- the writing sheet ---- */}
      <g transform="rotate(-3 330 78)">
        <rect x="278" y="20" width="112" height="112" rx="10" fill="#ffffff" stroke="#efe6d2" strokeWidth="1.6" />
        <rect x="278" y="20" width="112" height="26" rx="10" fill="#fffaf0" />
        <rect x="278" y="33" width="112" height="13" fill="#fffaf0" />
        <rect x="292" y="30" width="54" height="5" rx="2.5" fill="#e6c98d" />

        <TextLine y={56} width={82} />
        <TextLine y={68} width={70} />
        <TextLine y={80} width={86} />
        <TextLine y={92} width={56} />
        <TextLine y={104} width={74} />
        <TextLine y={116} width={44} />
      </g>

      {/* golden quotation marks */}
      <g fill="#e8b24f" opacity="0.9">
        <path d="M248 48h16v16c0 8-5 13-13 14v-7c4-1 6-3 6-7h-9z" />
        <path d="M270 48h16v16c0 8-5 13-13 14v-7c4-1 6-3 6-7h-9z" />
      </g>

      {/* ---- large orange pencil ---- */}
      <g transform="rotate(-32 402 86)">
        <rect x="352" y="76" width="112" height="19" rx="4" fill="#f2a93b" />
        <rect x="352" y="76" width="112" height="8" rx="4" fill="#f8c36a" opacity="0.85" />
        <path d="M464 76l22 9.5-22 9.5z" fill="#f6e0bb" />
        <path d="M478 82.6l8 2.9-8 3z" fill="#5d5348" />
        <rect x="340" y="76" width="15" height="19" rx="4" fill="#e8902c" />
        <rect x="340" y="76" width="4" height="19" rx="2" fill="#d97f22" />
      </g>

      {/* botanical leaves around the sheet */}
      <Leaf x={262} y={118} rotate={-18} scale={0.9} />
      <Leaf x={396} y={124} rotate={198} scale={0.78} />
      <Leaf x={272} y={30} rotate={-58} scale={0.7} />
      <Leaf x={412} y={40} rotate={150} scale={0.66} />
    </svg>
  );
}
