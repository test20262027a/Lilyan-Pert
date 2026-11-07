import Icon from '../Icon';

/*
 * The one visual of a category's identity.
 *
 * Every surface that shows a category — its list row, the selected-category
 * heading, the create/edit preview and the delete dialog — renders this, so the
 * same saved glyph and accent colour never drift apart between locations.
 *
 * The accent arrives as a hex identity colour (see `categoryIcons.js`) and is
 * passed to CSS as `--mcat-ink`; the pastel container is mixed from it against
 * the current surface, so it stays soft in light mode and readable in dark mode
 * without ever borrowing the business theme's primary hue.
 */
export default function CategoryIdentityIcon({
  icon,
  color,
  size = 34,
  variant = 'row',
  title,
  className = '',
}) {
  return (
    <span
      className={`mcat mcat--${variant} ${className}`.trim()}
      style={{ '--mcat-ink': color, '--mcat-size': `${size}px` }}
    >
      <Icon name={icon} size={Math.round(size * 0.52)} title={title} />
    </span>
  );
}
