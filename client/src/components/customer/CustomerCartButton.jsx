import './customerCartButton.css';

/*
 * The menu's basket control.
 *
 * Its contents follow the reading direction (`dir` is passed in), so a Kurdish,
 * Persian or Arabic guest reads count → label → basket while an English guest
 * reads basket → label → count. The row around it stays physical (basket on one
 * side of the banner), which is why the direction lives on this button alone.
 *
 * The cart is one SVG in two states: a clean outline while empty, and the same
 * silhouette with the basket tinted and packages sitting inside it once the
 * cart holds something. The transition is a CSS fade of the goods group, so the
 * glyph never remounts; only the count badge (keyed) replays its pop, and a
 * small package drops into the basket on every addition.
 */
function CartGlyph({ filled, dropKey }) {
  return (
    <svg
      className={`cui-nav__cartglyph ${filled ? 'is-filled' : ''}`.trim()}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {/* handle + wheels: the silhouette stays recognizable in both states */}
      <path className="cg-frame" d="M2.7 3.5h2.5l2.3 10.9" />
      <path
        className="cg-basket"
        d="M7.3 6.6h13.9l-1.55 7.35a2.1 2.1 0 0 1-2.06 1.66H10.9a2.1 2.1 0 0 1-2.06-1.68z"
      />
      <circle className="cg-frame" cx="10.4" cy="19.9" r="1.4" />
      <circle className="cg-frame" cx="17.4" cy="19.9" r="1.4" />

      {/* the products sitting in the basket — present while the cart is filled */}
      <g className="cg-good">
        <rect x="9.4" y="8.2" width="4" height="4" rx="1.1" />
        <rect className="cg-good--alt" x="14.1" y="8.9" width="3.4" height="3.2" rx="1" />
      </g>

      {/* one quick drop per addition; keyed so only this shape replays */}
      {filled ? (
        <rect key={dropKey} className="cg-drop" x="10.1" y="4.4" width="3.6" height="3.6" rx="1" />
      ) : null}
    </svg>
  );
}

export default function CustomerCartButton({ count = 0, label, onClick, disabled = false, dir }) {
  const filled = count > 0;
  const display = count > 99 ? '99+' : String(count);

  return (
    <button
      type="button"
      className={`cui-nav__cart ${filled ? 'is-filled' : ''}`.trim()}
      onClick={onClick}
      disabled={disabled}
      dir={dir}
      aria-label={label}
      title={label}
    >
      <CartGlyph filled={filled} dropKey={count} />
      <span className="cui-nav__cartlabel">{label}</span>
      {filled ? (
        <span key={count} className={`cui-nav__count ${display.length > 2 ? 'is-wide' : ''}`.trim()}>
          {display}
        </span>
      ) : null}
    </button>
  );
}
