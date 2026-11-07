import Icon from '../Icon';
import '../../dashboardIcons.css';

/**
 * The dashboard's multicolor 3D icon tile.
 *
 * `tone` picks the category colour (see dashboardIcons.css for the table) and
 * is the ONLY thing that decides it — a category keeps its colour everywhere on
 * the dashboard, so the same blue always means "orders" and the same gold
 * "best sellers".
 *
 * The tile is decorative by default. `hover` adds the lift + matching glow that
 * runs while its metric card is hovered; icons that are not part of a hoverable
 * card must never pass it, so nothing looks clickable that is not.
 */
export default function DashIcon({
  name,
  tone = 'blue',
  size = 40,
  shape = 'squircle',
  hover = false,
  className = '',
}) {
  return (
    <span
      className={`dash-ic dash-ic--${tone} dash-ic--${shape} ${hover ? 'dash-ic--hover' : ''} ${className}`
        .replace(/\s+/g, ' ')
        .trim()}
      style={{ '--ic-size': `${size}px` }}
      aria-hidden="true"
    >
      <Icon name={name} size={Math.round(size * 0.46)} />
    </span>
  );
}
